// API endpoint to fetch burned $BANMAO token amount
// Uses direct RPC call with hardcoded dead wallet address
import { NextResponse } from "next/server";

// Contract addresses
const BANMAO_ADDRESS = process.env.NEXT_PUBLIC_BANMAO as string;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xlayer.tech";

// Common burn addresses - tokens sent here are considered burned
const DEAD_WALLETS = [
    "0x000000000000000000000000000000000000dEaD", // Common burn address
    "0x0000000000000000000000000000000000000000", // Zero address
];

// Function signatures (keccak256 hashes)
const BALANCE_OF_SELECTOR = "0x70a08231"; // balanceOf(address)

// Format token amount with commas
function formatTokenAmount(value: bigint, decimals: number): string {
    try {
        const divisor = BigInt(10 ** decimals);
        const whole = value / divisor;
        const fraction = value % divisor;

        const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        if (fraction === BigInt(0)) return wholeStr;

        const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
        return fractionStr ? `${wholeStr}.${fractionStr}` : wholeStr;
    } catch {
        return value.toString();
    }
}

// Make JSON-RPC call
async function rpcCall(method: string, params: unknown[]) {
    const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
        }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
}

// Pad address to 32 bytes
function padAddress(address: string): string {
    return "0x" + address.slice(2).toLowerCase().padStart(64, "0");
}

// In-memory cache for burn stats (60 second TTL)
let burnCache: { data: any; expires: number } | null = null;
const BURN_CACHE_TTL = 60_000; // 60 seconds

export async function GET() {
    try {
        // Check in-memory cache first
        if (burnCache && Date.now() < burnCache.expires) {
            const response = NextResponse.json({ ...burnCache.data, fromCache: true });
            response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
            return response;
        }

        if (!BANMAO_ADDRESS) {
            return NextResponse.json({
                burnedAmount: "N/A",
                burnedRaw: "0",
                error: "BANMAO address not configured"
            });
        }

        // Get balance from all dead wallets and sum them
        let totalBurned = BigInt(0);

        for (const deadWallet of DEAD_WALLETS) {
            try {
                const paddedWallet = padAddress(deadWallet);
                const balanceResult = await rpcCall("eth_call", [
                    { to: BANMAO_ADDRESS, data: BALANCE_OF_SELECTOR + paddedWallet.slice(2) },
                    "latest"
                ]);

                if (balanceResult && balanceResult !== "0x") {
                    totalBurned += BigInt(balanceResult);
                }
            } catch (e) {
                console.log(`[burn-stats] Could not get balance from ${deadWallet}:`, e);
                // Continue with other addresses
            }
        }

        const decimals = 18;
        const formattedAmount = formatTokenAmount(totalBurned, decimals);

        const data = {
            burnedAmount: formattedAmount,
            burnedRaw: totalBurned.toString(),
            timestamp: Date.now(),
        };

        // Cache the result
        burnCache = { data, expires: Date.now() + BURN_CACHE_TTL };

        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return response;
    } catch (error) {
        console.error("[burn-stats API] Error:", error);
        // Return stale cache on error
        if (burnCache) {
            const response = NextResponse.json({ ...burnCache.data, fromCache: true, stale: true });
            response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
            return response;
        }
        return NextResponse.json({
            burnedAmount: "Error",
            burnedRaw: "0",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
