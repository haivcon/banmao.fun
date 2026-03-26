// API route to fetch token price from OKX Web3 DEX API
// GET /api/price
// Uses server-side caching to respect OKX rate limits

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/index/current-price";

// Token config for BANMAO on X Layer  
const TOKEN_CONFIG = {
    chainIndex: "196",
    tokenContractAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
};

// Generate OKX signature
function generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string
): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

// Fetch price data from OKX API
async function fetchFromOKX(): Promise<Record<string, unknown>> {
    const timestamp = new Date().toISOString();
    const requestPath = "/api/v6/dex/index/current-price";
    const method = "POST";
    const bodyData = JSON.stringify([TOKEN_CONFIG]);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
        const signature = generateSignature(timestamp, method, requestPath, bodyData);
        headers["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
        headers["OK-ACCESS-SIGN"] = signature;
        headers["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
        headers["OK-ACCESS-TIMESTAMP"] = timestamp;

        if (process.env.OKX_PROJECT_ID) {
            headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
        }
    }

    const response = await fetch(OKX_API_URL, {
        method: "POST",
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
            price: tokenData.price,
            time: tokenData.time,
            chainIndex: tokenData.chainIndex,
            tokenContractAddress: tokenData.tokenContractAddress,
            network: "X LAYER",
            symbol: "$BANMAO",
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Invalid OKX response");
}

// Mock data for fallback
const MOCK_DATA = {
    success: true,
    price: "0.00003",
    time: Date.now().toString(),
    chainIndex: "196",
    tokenContractAddress: TOKEN_CONFIG.tokenContractAddress,
    network: "X LAYER",
    symbol: "$BANMAO",
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
        const cached = apiCache.get<Record<string, unknown>>(CACHE_KEYS.PRICE);
        if (cached) {
            console.log("[Price API] ✅ Returning cached data (age:", apiCache.getAge(CACHE_KEYS.PRICE), "s)");
            return addCacheHeaders(NextResponse.json({
                ...cached,
                fromCache: true,
                cacheAge: apiCache.getAge(CACHE_KEYS.PRICE),
            }));
        }

        // Check if there's already a pending request
        const pendingRequest = apiCache.getPendingRequest<Record<string, unknown>>(CACHE_KEYS.PRICE);
        if (pendingRequest) {
            console.log("[Price API] ⏳ Waiting for pending request...");
            const result = await pendingRequest;
            return addCacheHeaders(NextResponse.json({ ...result, fromCache: true }));
        }

        // Make new request
        console.log("[Price API] 🔄 Fetching fresh data from OKX...");
        const fetchPromise = fetchFromOKX();
        apiCache.setPendingRequest(CACHE_KEYS.PRICE, fetchPromise);

        const data = await fetchPromise;

        // Cache the result
        apiCache.set(CACHE_KEYS.PRICE, data, CACHE_TTL.PRICE);
        console.log("[Price API] ✅ Fresh data cached for", CACHE_TTL.PRICE / 1000, "seconds");

        return addCacheHeaders(NextResponse.json(data));

    } catch (error) {
        console.error("[Price API] ❌ Error:", error);

        // Try to return stale cache if available
        const staleCache = apiCache.get<Record<string, unknown>>(CACHE_KEYS.PRICE);
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
