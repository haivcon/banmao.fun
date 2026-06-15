import { okxFetch } from "../../../../lib/okx/okxClient";
// API route to fetch basic token info from OKX DEX API
// GET /api/okx/token-info?chainIndex=196&tokenAddress=0x...
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache } from "../../../lib/apiCache";



interface TokenInfoResponse {
    success: boolean;
    tokenName: string;
    tokenSymbol: string;
    decimals: string;
    logoUrl: string;
    price: string;
    marketCap: string;
    volume24h: string;
    totalSupply: string;
    holders: string;
    cachedAt?: number;
    fromCache?: boolean;
}

async function fetchTokenInfo(chainIndex: string, tokenAddress: string): Promise<TokenInfoResponse> {
    const timestamp = new Date().toISOString();
    const requestPath = "/api/v6/dex/market/token/basic-info";
    const bodyStr = JSON.stringify({ chainIndex, tokenContractAddress: tokenAddress });
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    

    const response = await okxFetch("POST", requestPath, {  headers, body: bodyStr, signal: AbortSignal.timeout(10000)  });
    const data = await response.json();

    if (data.code === "0" && data.data) {
        const d = Array.isArray(data.data) ? data.data[0] : data.data;
        return {
            success: true,
            tokenName: d.tokenName || "",
            tokenSymbol: d.tokenSymbol || "",
            decimals: d.decimals || "18",
            logoUrl: d.tokenLogoUrl || d.logoUrl || "",
            price: d.price || "0",
            marketCap: d.marketCap || "0",
            volume24h: d.volume24h || "0",
            totalSupply: d.totalSupply || "0",
            holders: d.holders || "0",
            cachedAt: Date.now(),
        };
    }

    throw new Error(data.msg || "Token info fetch failed");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";
    const tokenAddress = searchParams.get("tokenAddress") || "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
    const cacheKey = `okx_token_info_${chainIndex}_${tokenAddress}`;

    const addHeaders = (r: NextResponse) => { r.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120"); return r; };

    try {
        const cached = apiCache.get<TokenInfoResponse>(cacheKey);
        if (cached) return addHeaders(NextResponse.json({ ...cached, fromCache: true, cacheAge: apiCache.getAge(cacheKey) }));

        const pending = apiCache.getPendingRequest<TokenInfoResponse>(cacheKey);
        if (pending) {
            try { const r = await pending; return addHeaders(NextResponse.json({ ...r, fromCache: true })); }
            catch { return addHeaders(NextResponse.json({ success: false, error: "Pending request failed" }, { status: 500 })); }
        }

        const promise = fetchTokenInfo(chainIndex, tokenAddress).catch(err => {
            throw err;
        });
        apiCache.setPendingRequest(cacheKey, promise);
        try {
            const data = await promise;
            apiCache.set(cacheKey, data, 60000); // 1 min
            return addHeaders(NextResponse.json(data));
        } finally {
            apiCache.setPendingRequest(cacheKey, null as any);
        }
    } catch (error) {
        console.error("[Token Info API] ❌", error instanceof Error ? error.message : error);
        return addHeaders(NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown" }, { status: 500 }));
    }
}
