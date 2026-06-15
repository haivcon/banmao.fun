import { okxFetch } from "../../../../lib/okx/okxClient";
// API route to search tokens by name/symbol/address via OKX DEX API
// GET /api/okx/token-search?search=USDT&chains=196
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CACHE_TTL = 30 * 1000; // 30 seconds
const cache: Record<string, { data: any; timestamp: number }> = {};



export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const chains = searchParams.get("chains") || "196";

    if (!search || search.length < 2) {
        return NextResponse.json({ success: false, error: "Search query too short (min 2 chars)" }, { status: 400 });
    }

    const cacheKey = `token_search_${chains}_${search.toLowerCase()}`;

    // Check cache
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
        return NextResponse.json({ ...cache[cacheKey].data, fromCache: true });
    }

    try {
        const requestPath = `/api/v6/dex/market/token/search?chains=${encodeURIComponent(chains)}&search=${encodeURIComponent(search)}`;
        const url = `https://web3.okx.com${requestPath}`;
        const timestamp = new Date().toISOString();

        const headers: Record<string, string> = { "Content-Type": "application/json" };

        

        const response = await okxFetch("GET", requestPath, {  headers, signal: AbortSignal.timeout(10000)  });
        const data = await response.json();

        if (data.code === "0" && data.data && Array.isArray(data.data)) {
            const result = {
                success: true,
                tokens: data.data.slice(0, 20).map((t: any) => ({
                    tokenContractAddress: t.tokenContractAddress || "",
                    tokenSymbol: t.tokenSymbol || "???",
                    tokenName: t.tokenName || "",
                    tokenLogoUrl: t.tokenLogoUrl || "",
                    decimals: t.decimals || "18",
                    chainIndex: t.chainIndex || chains,
                    // Include price info if available
                    price: t.price || "0",
                    liquidity: t.liquidity || "0",
                    holders: t.holders || t.holderCount || "0",
                    totalSupply: t.totalSupply || "0",
                })),
                total: data.data.length,
            };

            cache[cacheKey] = { data: result, timestamp: Date.now() };
            return NextResponse.json(result);
        }

        return NextResponse.json({
            success: false,
            tokens: [],
            error: data.msg || "No results",
        });

    } catch (error) {
        console.error("[Token Search API] Error:", error);

        // Return stale cache if available
        if (cache[cacheKey]) {
            return NextResponse.json({ ...cache[cacheKey].data, fromCache: true, stale: true });
        }

        return NextResponse.json({
            success: false,
            tokens: [],
            error: error instanceof Error ? error.message : "Search failed",
        }, { status: 500 });
    }
}
