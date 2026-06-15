import { okxFetch } from "../../../../lib/okx/okxClient";
// API route to fetch real-time token price from OKX DEX API
// GET /api/okx/price?chainIndex=196&tokenAddress=0x...
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../../lib/apiCache";

const BANMAO_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";



interface PriceResponse {
    success: boolean;
    price: string;
    priceChange24h: string;
    volume24h: string;
    marketCap: string;
    liquidity: string;
    holders: string;
    cachedAt?: number;
    fromCache?: boolean;
}

async function fetchPrice(chainIndex: string, tokenAddress: string): Promise<PriceResponse> {
    const timestamp = new Date().toISOString();
    const requestPath = "/api/v6/dex/market/price";
    const body = JSON.stringify([{ chainIndex, tokenContractAddress: tokenAddress }]);
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    

    const response = await okxFetch("POST", requestPath, {  headers, body, signal: AbortSignal.timeout(10000)  });
    const data = await response.json();

    if (data.code === "0" && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const d = data.data[0];
        return {
            success: true,
            price: d.price || "0",
            priceChange24h: d.priceChange24h || "0",
            volume24h: d.volume24h || "0",
            marketCap: d.marketCap || "0",
            liquidity: d.liquidity || "0",
            holders: d.holders || "0",
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Price fetch failed");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";
    const tokenAddress = searchParams.get("tokenAddress") || BANMAO_ADDRESS;
    const cacheKey = `${CACHE_KEYS.PRICE}_${chainIndex}_${tokenAddress}`;

    const addHeaders = (r: NextResponse) => { r.headers.set("Cache-Control", "s-maxage=10, stale-while-revalidate=30"); return r; };

    try {
        const cached = apiCache.get<PriceResponse>(cacheKey);
        if (cached) return addHeaders(NextResponse.json({ ...cached, fromCache: true, cacheAge: apiCache.getAge(cacheKey) }));

        const pending = apiCache.getPendingRequest<PriceResponse>(cacheKey);
        if (pending) { const r = await pending; return addHeaders(NextResponse.json({ ...r, fromCache: true })); }

        const promise = fetchPrice(chainIndex, tokenAddress);
        apiCache.setPendingRequest(cacheKey, promise);
        const data = await promise;
        apiCache.set(cacheKey, data, CACHE_TTL.PRICE);
        return addHeaders(NextResponse.json(data));
    } catch (error) {
        console.error("[Price API] ❌", error);
        const stale = apiCache.get<PriceResponse>(cacheKey);
        if (stale) return addHeaders(NextResponse.json({ ...stale, fromCache: true, stale: true }));
        return addHeaders(NextResponse.json({ success: false, price: "0", error: error instanceof Error ? error.message : "Unknown" }, { status: 500 }));
    }
}
