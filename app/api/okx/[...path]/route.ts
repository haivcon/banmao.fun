import { NextRequest, NextResponse } from "next/server";
import { okxFetch } from "../../../../lib/okx/okxClient";

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

    const query = req.nextUrl.search || "";
    const requestPath = `${upstreamPath}${query}`;
    const cacheKey = requestPath;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        return NextResponse.json(cached.body, { status: cached.status });
    }

    const res = await okxFetch("GET", requestPath, { cache: "no-store" });
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
