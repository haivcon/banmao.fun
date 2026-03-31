// API route to fetch top traders for a token from OKX DEX API
// GET /api/okx/top-traders?chainIndex=196&tokenAddress=0x...
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache, CACHE_TTL } from "../../../lib/apiCache";

function generateSignature(timestamp: string, method: string, requestPath: string): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

interface TopTrader {
    walletAddress: string;
    pnl: string;
    pnlPercent: string;
    buyAmount: string;
    sellAmount: string;
    buyTxCount: string;
    sellTxCount: string;
}

interface TopTradersResponse {
    success: boolean;
    traders: TopTrader[];
    cachedAt?: number;
    fromCache?: boolean;
}

async function fetchTopTraders(chainIndex: string, tokenAddress: string): Promise<TopTradersResponse> {
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v6/dex/market/token/top-trader?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
        const signature = generateSignature(timestamp, "GET", requestPath);
        headers["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
        headers["OK-ACCESS-SIGN"] = signature;
        headers["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
        headers["OK-ACCESS-TIMESTAMP"] = timestamp;
        if (process.env.OKX_PROJECT_ID) headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
    }

    const response = await fetch(`https://web3.okx.com${requestPath}`, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (data.code === "0" && data.data && Array.isArray(data.data)) {
        return {
            success: true,
            traders: data.data.slice(0, 20).map((t: any) => ({
                walletAddress: t.walletAddress || t.traderAddress || "",
                pnl: t.pnl || "0",
                pnlPercent: t.pnlPercent || "0",
                buyAmount: t.buyAmount || "0",
                sellAmount: t.sellAmount || "0",
                buyTxCount: t.buyTxCount || "0",
                sellTxCount: t.sellTxCount || "0",
            })),
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Top traders fetch failed");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";
    const tokenAddress = searchParams.get("tokenAddress") || "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
    const cacheKey = `okx_top_traders_${chainIndex}_${tokenAddress}`;

    const addHeaders = (r: NextResponse) => { r.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=600"); return r; };

    try {
        const cached = apiCache.get<TopTradersResponse>(cacheKey);
        if (cached) return addHeaders(NextResponse.json({ ...cached, fromCache: true, cacheAge: apiCache.getAge(cacheKey) }));

        const pending = apiCache.getPendingRequest<TopTradersResponse>(cacheKey);
        if (pending) { const r = await pending; return addHeaders(NextResponse.json({ ...r, fromCache: true })); }

        const promise = fetchTopTraders(chainIndex, tokenAddress);
        apiCache.setPendingRequest(cacheKey, promise);
        const data = await promise;
        apiCache.set(cacheKey, data, 300000); // 5 min cache
        return addHeaders(NextResponse.json(data));
    } catch (error) {
        console.error("[Top Traders API] ❌", error);
        return addHeaders(NextResponse.json({ success: false, traders: [], error: error instanceof Error ? error.message : "Unknown" }, { status: 500 }));
    }
}
