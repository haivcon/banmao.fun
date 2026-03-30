// API route to fetch recent trades from OKX DEX API
// GET /api/okx/trades
// Returns recent buy/sell transactions for BANMAO

import { NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_KEYS, CACHE_TTL } from "../../../lib/apiCache";

const OKX_API_URL = "https://web3.okx.com/api/v6/dex/market/trades";

// Token config for BANMAO on X Layer
const TOKEN_CONFIG = {
    chainIndex: "196",
    tokenContractAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
};

export interface TradeItem {
    id: string;
    type: "buy" | "sell";
    volume: string;
    price: string;
    time: string;
    userAddress: string;
    dexName: string;
}

interface TradesResponse {
    success: boolean;
    trades: TradeItem[];
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
async function fetchFromOKX(): Promise<TradesResponse> {
    const timestamp = new Date().toISOString();
    const queryString = `?chainIndex=${TOKEN_CONFIG.chainIndex}&tokenContractAddress=${TOKEN_CONFIG.tokenContractAddress}&limit=5`;
    const requestPath = "/api/v6/dex/market/trades" + queryString;
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
            trades: data.data.slice(0, 5).map((t: Record<string, unknown>) => ({
                id: (t.id as string) || "",
                type: (t.type as string) || "buy",
                volume: (t.volume as string) || "0",
                price: (t.price as string) || "0",
                time: (t.time as string) || "",
                userAddress: (t.userAddress as string) || "",
                dexName: (t.dexName as string) || "",
            })),
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Invalid OKX response");
}

// Mock data for fallback
const MOCK_TRADES: TradeItem[] = [
    { id: "1", type: "buy", volume: "12.50", price: "0.00003", time: String(Date.now() - 60000), userAddress: "0x1a2b...3c4d", dexName: "SwapX" },
    { id: "2", type: "sell", volume: "5.20", price: "0.000029", time: String(Date.now() - 180000), userAddress: "0x5e6f...7g8h", dexName: "SwapX" },
    { id: "3", type: "buy", volume: "25.00", price: "0.000031", time: String(Date.now() - 300000), userAddress: "0x9i0j...1k2l", dexName: "SwapX" },
];

export async function GET() {
    const addCacheHeaders = (response: NextResponse) => {
        response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
        return response;
    };

    try {
        // Check cache first
        const cached = apiCache.get<TradesResponse>(CACHE_KEYS.TRADES);
        if (cached) {
            return addCacheHeaders(NextResponse.json({
                ...cached,
                fromCache: true,
                cacheAge: apiCache.getAge(CACHE_KEYS.TRADES),
            }));
        }

        // Check pending request
        const pendingRequest = apiCache.getPendingRequest<TradesResponse>(CACHE_KEYS.TRADES);
        if (pendingRequest) {
            const result = await pendingRequest;
            return addCacheHeaders(NextResponse.json({ ...result, fromCache: true }));
        }

        // Fetch fresh
        console.log("[Trades API] 🔄 Fetching recent trades from OKX...");
        const fetchPromise = fetchFromOKX();
        apiCache.setPendingRequest(CACHE_KEYS.TRADES, fetchPromise);

        const data = await fetchPromise;
        apiCache.set(CACHE_KEYS.TRADES, data, CACHE_TTL.TRADES);

        return addCacheHeaders(NextResponse.json(data));

    } catch (error) {
        console.error("[Trades API] ❌ Error:", error);

        const staleCache = apiCache.get<TradesResponse>(CACHE_KEYS.TRADES);
        if (staleCache) {
            return addCacheHeaders(NextResponse.json({ ...staleCache, fromCache: true, stale: true }));
        }

        return addCacheHeaders(NextResponse.json({
            success: true,
            trades: MOCK_TRADES,
            isMock: true,
            error: error instanceof Error ? error.message : "Unknown error",
        }));
    }
}
