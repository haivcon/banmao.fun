// API route to fetch top token holders from OKX DEX API
// GET /api/okx/holders
// Uses server-side caching to respect OKX rate limits

import { NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/market/token/holder";

// Token config for BANMAO on X Layer
const TOKEN_CONFIG = {
    chainIndex: "196",
    tokenContractAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
};

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
async function fetchFromOKX(): Promise<HoldersResponse> {
    const timestamp = new Date().toISOString();
    const queryString = `?chainIndex=${TOKEN_CONFIG.chainIndex}&tokenContractAddress=${TOKEN_CONFIG.tokenContractAddress}`;
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

export async function GET() {
    // Helper to add cache headers
    const addCacheHeaders = (response: NextResponse) => {
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return response;
    };

    try {
        // Check cache first
        const cached = apiCache.get<HoldersResponse>(CACHE_KEYS.HOLDERS);
        if (cached) {
            console.log("[Holders API] ✅ Returning cached data (age:", apiCache.getAge(CACHE_KEYS.HOLDERS), "s)");
            return addCacheHeaders(NextResponse.json({
                ...cached,
                fromCache: true,
                cacheAge: apiCache.getAge(CACHE_KEYS.HOLDERS),
            }));
        }

        // Check if there's already a pending request
        const pendingRequest = apiCache.getPendingRequest<HoldersResponse>(CACHE_KEYS.HOLDERS);
        if (pendingRequest) {
            console.log("[Holders API] ⏳ Waiting for pending request...");
            const result = await pendingRequest;
            return addCacheHeaders(NextResponse.json({ ...result, fromCache: true }));
        }

        // Make new request
        console.log("[Holders API] 🔄 Fetching fresh data from OKX...");
        const fetchPromise = fetchFromOKX();
        apiCache.setPendingRequest(CACHE_KEYS.HOLDERS, fetchPromise);

        const data = await fetchPromise;

        // Cache the result
        apiCache.set(CACHE_KEYS.HOLDERS, data, CACHE_TTL.HOLDERS);
        console.log("[Holders API] ✅ Fresh data cached for", CACHE_TTL.HOLDERS / 1000, "seconds");

        return addCacheHeaders(NextResponse.json(data));

    } catch (error) {
        console.error("[Holders API] ❌ Error:", error);

        // Try to return stale cache if available
        const staleCache = apiCache.get<HoldersResponse>(CACHE_KEYS.HOLDERS);
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
