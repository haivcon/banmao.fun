import { okxFetch } from "../../../../lib/okx/okxClient";
// API route to fetch all token balances for a wallet address
// GET /api/okx/wallet-balances?address=0x...&chains=196
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CACHE_TTL = 60 * 1000; // 60 seconds
const cache: Record<string, { data: any; timestamp: number }> = {};



export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    const chains = searchParams.get("chains") || "196";

    if (!address || !address.startsWith("0x") || address.length !== 42) {
        return NextResponse.json({ success: false, error: "Invalid address" }, { status: 400 });
    }

    const cacheKey = `wallet_balances_${chains}_${address.toLowerCase()}`;

    // Check cache
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
        return NextResponse.json({ ...cache[cacheKey].data, fromCache: true });
    }

    try {
        const requestPath = `/api/v5/wallet/asset/all-token-balances-by-address?address=${address}&chains=${encodeURIComponent(chains)}&filter=0`;
        const url = `https://web3.okx.com${requestPath}`;
        const timestamp = new Date().toISOString();

        const headers: Record<string, string> = { "Content-Type": "application/json" };

        

        const response = await okxFetch("GET", requestPath, {  headers, signal: AbortSignal.timeout(15000)  });
        const data = await response.json();

        if (data.code === "0" && data.data) {
            // data.data is an array of chain-grouped balances
            const allTokens: any[] = [];

            const dataArr = Array.isArray(data.data) ? data.data : [data.data];
            for (const chainData of dataArr) {
                const tokenAssets = chainData?.tokenAssets || [];
                for (const t of tokenAssets) {
                    const balance = parseFloat(t.balance || t.holdingAmount || "0");
                    const price = parseFloat(t.tokenPrice || t.price || "0");
                    if (balance > 0) {
                        allTokens.push({
                            symbol: t.symbol || t.tokenSymbol || "???",
                            tokenAddress: t.tokenAddress || t.tokenContractAddress || "",
                            balance: balance.toString(),
                            price: price.toString(),
                            valueUsd: (balance * price).toFixed(4),
                            logoUrl: t.logoUrl || t.tokenLogoUrl || "",
                            chainIndex: t.chainIndex || chainData?.chainIndex || chains,
                            isNative: !t.tokenAddress || t.tokenAddress === "",
                        });
                    }
                }
            }

            // Sort by USD value descending
            allTokens.sort((a, b) => parseFloat(b.valueUsd) - parseFloat(a.valueUsd));

            const result = {
                success: true,
                tokens: allTokens,
                totalTokens: allTokens.length,
            };

            cache[cacheKey] = { data: result, timestamp: Date.now() };
            return NextResponse.json(result);
        }

        return NextResponse.json({
            success: true,
            tokens: [],
            totalTokens: 0,
            note: data.msg || "No balances found",
        });

    } catch (error) {
        console.error("[Wallet Balances API] Error:", error);

        // Return stale cache if available
        if (cache[cacheKey]) {
            return NextResponse.json({ ...cache[cacheKey].data, fromCache: true, stale: true });
        }

        return NextResponse.json({
            success: false,
            tokens: [],
            error: error instanceof Error ? error.message : "Failed to fetch balances",
        }, { status: 500 });
    }
}
