// API route to fetch top token holders from OKX DEX API
// GET /api/okx/holders
// Uses server-side caching to respect OKX rate limits

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/market/token/holder";

// Default token config (BANMAO on X Layer)
const DEFAULT_CHAIN = "196";
const DEFAULT_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";

interface HolderData {
    holderWalletAddress: string;
    holdAmount: string;
}

interface HoldersResponse {
    success: boolean;
    holders: HolderData[];
    cachedAt?: number;
    fromCache?: boolean;
    cacheAge?: number;
}

// Generate OKX signature
function generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    queryString: string
): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath + queryString;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

// Fetch holders from OKX API
async function fetchFromOKX(chainIndex: string, tokenAddr: string, tagFilter?: string): Promise<HoldersResponse> {
    const timestamp = new Date().toISOString();
    let queryString = `?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddr}`;
    if (tagFilter) queryString += `&tagFilter=${tagFilter}`;
    const requestPath = "/api/v6/dex/market/token/holder" + queryString;
    const method = "GET";

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
        const signature = generateSignature(timestamp, method, requestPath, "");
        headers["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
        headers["OK-ACCESS-SIGN"] = signature;
        headers["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
        headers["OK-ACCESS-TIMESTAMP"] = timestamp;

        if (process.env.OKX_PROJECT_ID) {
            headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
        }
    }

    const response = await fetch(OKX_API_URL + queryString, {
        method: "GET",
        headers,
    });

    if (!response.ok) {
        throw new Error(`OKX API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code === "0" && data.data && Array.isArray(data.data)) {
        return {
            success: true,
            holders: data.data.slice(0, 20).map((h: { holderWalletAddress: string; holdAmount: string }) => ({
                holderWalletAddress: h.holderWalletAddress,
                holdAmount: h.holdAmount,
            })),
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Invalid OKX response");
}

// Mock data for fallback
const MOCK_HOLDERS: HolderData[] = Array.from({ length: 20 }, (_, i) => ({
    holderWalletAddress: `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('')}`,
    holdAmount: String(Math.floor((50000000 - i * 2000000) + Math.random() * 1000000)),
}));

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || DEFAULT_CHAIN;
    const tokenAddr = searchParams.get("tokenContractAddress") || DEFAULT_TOKEN;
    const tagFilter = searchParams.get("tagFilter") || undefined;

    // Dynamic cache key based on params
    const cacheKey = `${CACHE_KEYS.HOLDERS}_${chainIndex}_${tokenAddr}_${tagFilter || "all"}`;

    // Helper to add cache headers
    const addCacheHeaders = (response: NextResponse) => {
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return response;
    };

    try {
        // Check cache first
        const cached = apiCache.get<HoldersResponse>(cacheKey);
        if (cached) {
            return addCacheHeaders(NextResponse.json({
                ...cached,
                fromCache: true,
                cacheAge: apiCache.getAge(cacheKey),
            }));
        }

        // Check if there's already a pending request
        const pendingRequest = apiCache.getPendingRequest<HoldersResponse>(cacheKey);
        if (pendingRequest) {
            const result = await pendingRequest;
            return addCacheHeaders(NextResponse.json({ ...result, fromCache: true }));
        }

        // Make new request
        console.log(`[Holders API] 🔄 Fetching: chain=${chainIndex} token=${tokenAddr.slice(0,10)}... tag=${tagFilter || "all"}`);
        const fetchPromise = fetchFromOKX(chainIndex, tokenAddr, tagFilter);
        apiCache.setPendingRequest(cacheKey, fetchPromise);

        const data = await fetchPromise;

        // Cache the result
        apiCache.set(cacheKey, data, CACHE_TTL.HOLDERS);

        return addCacheHeaders(NextResponse.json(data));

    } catch (error) {
        console.error("[Holders API] ❌ Error:", error);

        // Try to return stale cache if available
        const staleCache = apiCache.get<HoldersResponse>(cacheKey);
        if (staleCache) {
            return addCacheHeaders(NextResponse.json({
                ...staleCache,
                fromCache: true,
                stale: true,
            }));
        }

        // Return mock data
        return addCacheHeaders(NextResponse.json({
            success: true,
            holders: MOCK_HOLDERS,
            isMock: true,
            error: error instanceof Error ? error.message : "Unknown error",
        }));
    }
}
