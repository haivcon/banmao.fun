// API route to fetch advanced token info from OKX DEX API
// GET /api/okx/advanced-info
// Returns: top10HoldPercent, lpBurnedPercent, riskControlLevel, tokenTags, etc.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/market/token/advanced-info";

// Token config for BANMAO on X Layer
const TOKEN_CONFIG = {
    chainIndex: "196",
    tokenContractAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
};

export interface AdvancedInfoData {
    top10HoldPercent: string;
    lpBurnedPercent: string;
    riskControlLevel: string;
    tokenTags: string[];
    devHoldingPercent: string;
    bundleHoldingPercent: string;
    suspiciousHoldingPercent: string;
    sniperHoldingPercent: string;
    creatorAddress: string;
    createTime: string;
    totalFee: string;
}

interface AdvancedInfoResponse {
    success: boolean;
    data: AdvancedInfoData;
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

// Fetch from OKX API
async function fetchFromOKX(): Promise<AdvancedInfoResponse> {
    const timestamp = new Date().toISOString();
    const queryString = `?chainIndex=${TOKEN_CONFIG.chainIndex}&tokenContractAddress=${TOKEN_CONFIG.tokenContractAddress}`;
    const requestPath = "/api/v6/dex/market/token/advanced-info" + queryString;
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

    if (data.code === "0" && data.data) {
        const d = data.data;
        return {
            success: true,
            data: {
                top10HoldPercent: d.top10HoldPercent || "",
                lpBurnedPercent: d.lpBurnedPercent || "",
                riskControlLevel: d.riskControlLevel || "0",
                tokenTags: Array.isArray(d.tokenTags) ? d.tokenTags : [],
                devHoldingPercent: d.devHoldingPercent || "",
                bundleHoldingPercent: d.bundleHoldingPercent || "",
                suspiciousHoldingPercent: d.suspiciousHoldingPercent || "",
                sniperHoldingPercent: d.sniperHoldingPercent || "",
                creatorAddress: d.creatorAddress || "",
                createTime: d.createTime || "",
                totalFee: d.totalFee || "",
            },
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Invalid OKX response");
}

// Mock data for fallback
const MOCK_DATA: AdvancedInfoResponse = {
    success: true,
    data: {
        top10HoldPercent: "45.23",
        lpBurnedPercent: "0",
        riskControlLevel: "1",
        tokenTags: ["communityRecognized"],
        devHoldingPercent: "",
        bundleHoldingPercent: "",
        suspiciousHoldingPercent: "",
        sniperHoldingPercent: "",
        creatorAddress: "",
        createTime: "",
        totalFee: "",
    },
};

export async function GET() {
    const addCacheHeaders = (response: NextResponse) => {
        response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return response;
    };

    try {
        // Check cache first
        const cached = apiCache.get<AdvancedInfoResponse>(CACHE_KEYS.ADVANCED_INFO);
        if (cached) {
            console.log("[Advanced Info API] ✅ Returning cached data (age:", apiCache.getAge(CACHE_KEYS.ADVANCED_INFO), "s)");
            return addCacheHeaders(NextResponse.json({
                ...cached,
                fromCache: true,
                cacheAge: apiCache.getAge(CACHE_KEYS.ADVANCED_INFO),
            }));
        }

        // Check pending request
        const pendingRequest = apiCache.getPendingRequest<AdvancedInfoResponse>(CACHE_KEYS.ADVANCED_INFO);
        if (pendingRequest) {
            console.log("[Advanced Info API] ⏳ Waiting for pending request...");
            const result = await pendingRequest;
            return addCacheHeaders(NextResponse.json({ ...result, fromCache: true }));
        }

        // Fetch fresh
        console.log("[Advanced Info API] 🔄 Fetching fresh data from OKX...");
        const fetchPromise = fetchFromOKX();
        apiCache.setPendingRequest(CACHE_KEYS.ADVANCED_INFO, fetchPromise);

        const data = await fetchPromise;
        apiCache.set(CACHE_KEYS.ADVANCED_INFO, data, CACHE_TTL.ADVANCED_INFO);
        console.log("[Advanced Info API] ✅ Fresh data cached for", CACHE_TTL.ADVANCED_INFO / 1000, "seconds");

        return addCacheHeaders(NextResponse.json(data));

    } catch (error) {
        console.error("[Advanced Info API] ❌ Error:", error);

        const staleCache = apiCache.get<AdvancedInfoResponse>(CACHE_KEYS.ADVANCED_INFO);
        if (staleCache) {
            return addCacheHeaders(NextResponse.json({ ...staleCache, fromCache: true, stale: true }));
        }

        return addCacheHeaders(NextResponse.json({
            ...MOCK_DATA,
            isMock: true,
            error: error instanceof Error ? error.message : "Unknown error",
        }));
    }
}
