// API route for token holder count + details
// Strategy: token-search (for holders field) → holders list (for count) → memepump/tokenDetails (for pump tokens)
// GET /api/okx/memepump-details?chainIndex=196&tokenAddress=0x...
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { apiCache } from "../../../lib/apiCache";



function buildHeaders(timestamp: string, requestPath: string): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    return headers;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";
    const tokenAddress = searchParams.get("tokenAddress");
    if (!tokenAddress) {
        return NextResponse.json({ success: false, error: "tokenAddress required" }, { status: 400 });
    }

    const cacheKey = `okx_token_holders_${chainIndex}_${tokenAddress.toLowerCase()}`;
    const addHeaders = (r: NextResponse) => { r.headers.set("Cache-Control", "s-maxage=120, stale-while-revalidate=300"); return r; };

    try {
        const cached = apiCache.get<any>(cacheKey);
        if (cached) return addHeaders(NextResponse.json({ ...cached, fromCache: true, cacheAge: apiCache.getAge(cacheKey) }));

        let holders = "0";
        const timestamp = new Date().toISOString();

        // Method 1: Try holder list API (always works, returns top 20)
        try {
            const qStr = `?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
            const rPath = "/api/v6/dex/market/token/holder" + qStr;
            const headers = buildHeaders(timestamp, rPath);
            const res = await fetch(`https://web3.okx.com${rPath}`, { method: "GET", headers, signal: AbortSignal.timeout(8000) });
            const data = await res.json();
            if (data.code === "0" && data.data && Array.isArray(data.data)) {
                const count = data.data.length;
                holders = count >= 20 ? "20+" : String(count);
            }
        } catch (e) {
            console.log("[Token Holders] holder list failed:", e instanceof Error ? e.message : e);
        }

        // Method 2: If on supported chain, try memepump/tokenDetails for exact count
        if (holders === "0" || holders === "20+") {
            try {
                const dummyWallet = "0x0000000000000000000000000000000000000001";
                const qStr2 = `?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&walletAddress=${dummyWallet}`;
                const rPath2 = "/api/v6/dex/market/memepump/tokenDetails" + qStr2;
                const ts2 = new Date().toISOString();
                const headers2 = buildHeaders(ts2, rPath2);
                const res2 = await fetch(`https://web3.okx.com${rPath2}`, { method: "GET", headers: headers2, signal: AbortSignal.timeout(8000) });
                const data2 = await res2.json();
                if (data2.code === "0" && data2.data) {
                    const d = Array.isArray(data2.data) ? data2.data[0] : data2.data;
                    if (d?.tags?.totalHolders && d.tags.totalHolders !== "0") {
                        holders = d.tags.totalHolders; // exact count from memepump
                    }
                }
            } catch {
                // memepump not available for this chain — that's fine
            }
        }

        const result = { success: true, holders, cachedAt: Date.now() };
        if (holders !== "0") apiCache.set(cacheKey, result, 120000);
        return addHeaders(NextResponse.json(result));

    } catch (error) {
        console.error("[Token Holders API] ❌", error instanceof Error ? error.message : error);
        return addHeaders(NextResponse.json({ success: false, holders: "0" }));
    }
}
