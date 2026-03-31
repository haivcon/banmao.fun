// API route to fetch trending/hot tokens from OKX DEX API
// GET /api/okx/hot-tokens?chainIndex=196
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache } from "../../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/market/token/hot-token";
const CACHE_PREFIX = "okx_hot_tokens_";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Supported chains
const SUPPORTED_CHAINS: Record<string, string> = {
    "196": "XLayer",
    "1": "Ethereum",
    "56": "BSC",
    "137": "Polygon",
    "42161": "Arbitrum",
    "8453": "Base",
    "10": "Optimism",
    "43114": "Avalanche",
};

function generateSignature(timestamp: string, method: string, requestPath: string): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";

    if (!SUPPORTED_CHAINS[chainIndex]) {
        return NextResponse.json({ success: false, error: "Unsupported chain" }, { status: 400 });
    }

    const cacheKey = CACHE_PREFIX + chainIndex;

    try {
        // Check cache
        const cached = apiCache.get<any>(cacheKey);
        if (cached) {
            return NextResponse.json({ ...cached, fromCache: true, cacheAge: apiCache.getAge(cacheKey) });
        }

        // Dedup pending requests
        const pending = apiCache.getPendingRequest<any>(cacheKey);
        if (pending) {
            const result = await pending;
            return NextResponse.json({ ...result, fromCache: true });
        }

        const timestamp = new Date().toISOString();
        const queryString = `?chainIndex=${chainIndex}`;
        const requestPath = "/api/v6/dex/market/token/hot-token" + queryString;

        const headers: Record<string, string> = { "Content-Type": "application/json" };

        if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
            const signature = generateSignature(timestamp, "GET", requestPath);
            headers["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
            headers["OK-ACCESS-SIGN"] = signature;
            headers["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
            headers["OK-ACCESS-TIMESTAMP"] = timestamp;
            if (process.env.OKX_PROJECT_ID) {
                headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
            }
        }

        const fetchPromise = (async () => {
            // Try multiple OKX endpoints as fallback
            const endpoints = [
                { url: "https://web3.okx.com/api/v6/dex/market/token/hot-token", path: "/api/v6/dex/market/token/hot-token" },
                { url: "https://web3.okx.com/api/v6/dex/market/token/toplist", path: "/api/v6/dex/market/token/toplist" },
                { url: "https://web3.okx.com/api/v6/dex/market/token/top-liquidity", path: "/api/v6/dex/market/token/top-liquidity" },
            ];

            for (const ep of endpoints) {
                try {
                    const localTimestamp = new Date().toISOString();
                    const qs = `?chainIndex=${chainIndex}`;
                    const rp = ep.path + qs;
                    const hdrs: Record<string, string> = { "Content-Type": "application/json" };

                    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
                        const sig = generateSignature(localTimestamp, "GET", rp);
                        hdrs["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
                        hdrs["OK-ACCESS-SIGN"] = sig;
                        hdrs["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
                        hdrs["OK-ACCESS-TIMESTAMP"] = localTimestamp;
                        if (process.env.OKX_PROJECT_ID) hdrs["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
                    }

                    const response = await fetch(ep.url + qs, { method: "GET", headers: hdrs });
                    if (!response.ok) continue;
                    const data = await response.json();

                    if (data.code === "0" && data.data && Array.isArray(data.data) && data.data.length > 0) {
                        return {
                            success: true,
                            tokens: data.data.slice(0, 20).map((t: any) => ({
                                tokenContractAddress: t.tokenContractAddress || t.address || "",
                                tokenSymbol: t.tokenSymbol || t.symbol || "???",
                                tokenName: t.tokenName || t.name || "",
                                price: t.price || t.lastPrice || "0",
                                volume24h: t.volume24h || t.volume || "0",
                                holders: t.holders || t.holderCount || "0",
                                priceChange24h: t.priceChange24h || t.change24h || "0",
                                liquidity: t.liquidity || "0",
                                marketCap: t.marketCap || "0",
                            })),
                            chainIndex,
                            chainName: SUPPORTED_CHAINS[chainIndex],
                            source: ep.path.split("/").pop(),
                            cachedAt: Date.now(),
                        };
                    }
                } catch { continue; }
            }
            throw new Error("No data from any OKX endpoint for chain " + chainIndex);
        })();

        apiCache.setPendingRequest(cacheKey, fetchPromise);
        const result = await fetchPromise;
        apiCache.set(cacheKey, result, CACHE_TTL);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Hot Tokens API] Error:", error);

        // Return stale cache if available
        const stale = apiCache.get<any>(cacheKey);
        if (stale) {
            return NextResponse.json({ ...stale, fromCache: true, stale: true });
        }

        return NextResponse.json({
            success: false,
            tokens: [],
            chainIndex,
            chainName: SUPPORTED_CHAINS[chainIndex] || chainIndex,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
