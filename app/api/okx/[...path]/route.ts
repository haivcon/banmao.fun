import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const OKX_BASE_URL = process.env.OKX_DEX_BASE_URL || "https://web3.okx.com";
const TTL_MS = 20_000;

const ALLOWED_PATHS = new Set([
    "/api/v6/dex/balance/token-balances-by-address",
    "/api/v6/dex/balance/total-value-by-address",
    "/api/v6/dex/market/price",
    "/api/v6/dex/market/price-info",
    "/api/v6/dex/market/candles",
    "/api/v6/dex/aggregator/all-tokens",
    "/api/v6/dex/aggregator/get-liquidity",
    "/api/v6/dex/aggregator/supported/chain",
    "/api/v6/dex/market/social/news/latest",
    "/api/v6/dex/market/social/news/by-symbol",
    "/api/v6/dex/market/social/sentiment/symbol",
]);

type CacheEntry = { expires: number; status: number; body: unknown };
const cache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
    const { path = [] } = await ctx.params;
    const upstreamPath = `/${path.join("/")}`;
    if (!ALLOWED_PATHS.has(upstreamPath)) {
        return NextResponse.json({ error: "OKX endpoint is not allowed" }, { status: 403 });
    }

    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const passphrase = process.env.OKX_API_PASSPHRASE || process.env.OKX_PASSPHRASE;
    const projectId = process.env.OKX_PROJECT_ID;
    if (!apiKey || !secretKey || !passphrase) {
        return NextResponse.json({
            disabled: true,
            reason: "OKX API credentials are not configured",
        });
    }

    const query = req.nextUrl.search || "";
    const requestPath = `${upstreamPath}${query}`;
    const cacheKey = requestPath;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        return NextResponse.json(cached.body, { status: cached.status });
    }

    const timestamp = new Date().toISOString();
    const prehash = `${timestamp}GET${requestPath}`;
    const signature = crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
    const headers: HeadersInit = {
        "OK-ACCESS-KEY": apiKey,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": passphrase,
        "Content-Type": "application/json",
    };
    if (projectId) headers["OK-ACCESS-PROJECT"] = projectId;

    const res = await fetch(`${OKX_BASE_URL}${requestPath}`, { method: "GET", headers, cache: "no-store" });
    const text = await res.text();
    let body: unknown;
    try {
        body = JSON.parse(text);
    } catch {
        body = { error: text || "Empty OKX response" };
    }

    cache.set(cacheKey, { expires: Date.now() + TTL_MS, status: res.status, body });
    return NextResponse.json(body, { status: res.status });
}
