// API route to fetch basic token info from OKX DEX API
// GET /api/okx/token-info?chainIndex=196&tokenAddress=0x...
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache } from "../../../lib/apiCache";

function generateSignature(timestamp: string, method: string, requestPath: string): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

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
    const queryString = `?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
    const requestPath = "/api/v6/dex/market/token/basic-info" + queryString;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
        const prehash = timestamp + "POST" + requestPath;
        const signature = crypto.createHmac("sha256", process.env.OKX_SECRET_KEY).update(prehash).digest("base64");
        headers["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
        headers["OK-ACCESS-SIGN"] = signature;
        headers["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
        headers["OK-ACCESS-TIMESTAMP"] = timestamp;
        if (process.env.OKX_PROJECT_ID) headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
    }

    const response = await fetch(`https://web3.okx.com${requestPath}`, { method: "POST", headers, signal: AbortSignal.timeout(10000) });
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
        if (pending) { const r = await pending; return addHeaders(NextResponse.json({ ...r, fromCache: true })); }

        const promise = fetchTokenInfo(chainIndex, tokenAddress);
        apiCache.setPendingRequest(cacheKey, promise);
        const data = await promise;
        apiCache.set(cacheKey, data, 60000); // 1 min
        return addHeaders(NextResponse.json(data));
    } catch (error) {
        console.error("[Token Info API] ❌", error);
        return addHeaders(NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown" }, { status: 500 }));
    }
}
