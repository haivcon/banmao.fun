import { okxFetch } from "../../../lib/okx/okxClient";
// API route to fetch token stats from OKX DEX API
// GET /api/token-stats
// Uses server-side caching to respect OKX rate limits

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/market/price-info";

// Token config for BANMAO on X Layer
const TOKEN_CONFIG = {
    chainIndex: "196",
    tokenContractAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
};

// Generate OKX signature


// Fetch token stats from OKX API
async function fetchFromOKX(): Promise<Record<string, unknown>> {
    const timestamp = new Date().toISOString();
    const requestPath = "/api/v6/dex/market/price-info";
    const method = "POST";
    const bodyData = JSON.stringify([TOKEN_CONFIG]);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    

    const response = await okxFetch("POST", requestPath, { 
        headers,
        body: bodyData,
     });

    if (!response.ok) {
        throw new Error(`OKX API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code === "0" && data.data && data.data.length > 0) {
        const tokenData = data.data[0];
        return {
            success: true,
            price: tokenData.price || "0",
            marketCap: tokenData.marketCap || "0",
            liquidity: tokenData.liquidity || "0",
            holders: tokenData.holders || "0",
            circSupply: tokenData.circSupply || "0",
            volume24H: tokenData.volume24H || "0",
            volume1H: tokenData.volume1H || "0",
            priceChange24H: tokenData.priceChange24H || "0",
            priceChange1H: tokenData.priceChange1H || "0",
            priceChange5M: tokenData.priceChange5M || "0",
            maxPrice: tokenData.maxPrice || "0",
            minPrice: tokenData.minPrice || "0",
            txs24H: tokenData.txs24H || "0",
            tradeNum: tokenData.tradeNum || "0",
            time: tokenData.time,
            chainIndex: tokenData.chainIndex,
            tokenContractAddress: tokenData.tokenContractAddress,
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Invalid OKX response");
}

// Mock data for fallback
const MOCK_DATA = {
    success: true,
    price: "0.00003",
    marketCap: "30000",
    liquidity: "16000",
    holders: "2000",
    circSupply: "998000000",
    volume24H: "500",
    volume1H: "50",
    priceChange24H: "-1",
    priceChange1H: "0",
    priceChange5M: "0",
    maxPrice: "0.00003",
    minPrice: "0.00003",
    txs24H: "20",
    tradeNum: "18000000",
    time: Date.now().toString(),
    isMock: true,
};

export async function GET() {
    // Helper to add cache headers
    const addCacheHeaders = (response: NextResponse) => {
        response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        return response;
    };

    try {
        // Check cache first
        const cached = apiCache.get<Record<string, unknown>>(CACHE_KEYS.TOKEN_STATS);
        if (cached) {
            console.log("[Token Stats API] ✅ Returning cached data (age:", apiCache.getAge(CACHE_KEYS.TOKEN_STATS), "s)");
            return addCacheHeaders(NextResponse.json({
                ...cached,
                fromCache: true,
                cacheAge: apiCache.getAge(CACHE_KEYS.TOKEN_STATS),
            }));
        }

        // Check if there's already a pending request
        const pendingRequest = apiCache.getPendingRequest<Record<string, unknown>>(CACHE_KEYS.TOKEN_STATS);
        if (pendingRequest) {
            console.log("[Token Stats API] ⏳ Waiting for pending request...");
            const result = await pendingRequest;
            return addCacheHeaders(NextResponse.json({ ...result, fromCache: true }));
        }

        // Make new request
        console.log("[Token Stats API] 🔄 Fetching fresh data from OKX...");
        const fetchPromise = fetchFromOKX();
        apiCache.setPendingRequest(CACHE_KEYS.TOKEN_STATS, fetchPromise);

        const data = await fetchPromise;

        // Cache the result
        apiCache.set(CACHE_KEYS.TOKEN_STATS, data, CACHE_TTL.TOKEN_STATS);
        console.log("[Token Stats API] ✅ Fresh data cached for", CACHE_TTL.TOKEN_STATS / 1000, "seconds");

        return addCacheHeaders(NextResponse.json(data));

    } catch (error) {
        console.error("[Token Stats API] ❌ Error:", error);

        // Try to return stale cache if available
        const staleCache = apiCache.get<Record<string, unknown>>(CACHE_KEYS.TOKEN_STATS);
        if (staleCache) {
            return addCacheHeaders(NextResponse.json({
                ...staleCache,
                fromCache: true,
                stale: true,
            }));
        }

        return addCacheHeaders(NextResponse.json({
            ...MOCK_DATA,
            error: error instanceof Error ? error.message : "Unknown error",
        }));
    }
}
