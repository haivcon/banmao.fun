// API: Verify token balances on-chain (server-side to avoid CORS)
// POST /api/verify-balances { tokenAddress, addresses, chainIndex }
import { NextRequest, NextResponse } from "next/server";

const CHAIN_RPCS: Record<string, string> = {
    "196": "https://rpc.xlayer.tech",
    "1": "https://eth.llamarpc.com",
    "56": "https://bsc-dataseed1.binance.org",
    "137": "https://polygon-rpc.com",
    "42161": "https://arb1.arbitrum.io/rpc",
    "8453": "https://mainnet.base.org",
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tokenAddress, addresses, chainIndex = "196" } = body;

        if (!tokenAddress || !addresses || !Array.isArray(addresses)) {
            return NextResponse.json({ success: false, error: "tokenAddress and addresses[] required" }, { status: 400 });
        }

        const rpc = CHAIN_RPCS[chainIndex];
        if (!rpc) return NextResponse.json({ success: false, error: "Unsupported chain" }, { status: 400 });

        const tokenLower = tokenAddress.toLowerCase();
        const results: { address: string; balance: string }[] = [];

        // Check up to 50 at a time
        const batch = addresses.slice(0, 50);
        const checks = await Promise.all(batch.map(async (addr: string) => {
            try {
                const callData = "0x70a08231" + addr.slice(2).padStart(64, "0");
                const r = await fetch(rpc, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: tokenLower, data: callData }, "latest"], id: 1 }),
                    signal: AbortSignal.timeout(10000),
                });
                const j = await r.json();
                const bal = BigInt(j.result || "0x0");
                return { address: addr, balance: bal.toString() };
            } catch {
                return { address: addr, balance: "0" };
            }
        }));

        for (const c of checks) {
            if (c.balance !== "0") results.push(c);
        }

        return NextResponse.json({ success: true, results, checked: batch.length });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown" });
    }
}
