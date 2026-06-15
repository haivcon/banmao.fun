// API: Discover airdrop-worthy tokens from multiple OKX DEX data sources
// GET /api/okx/discover-tokens?chainIndex=196&source=trending|leaderboard|memepump
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

function sign(timestamp: string, method: string, path: string) {
    const sk = process.env.OKX_SECRET_KEY || "";
    return crypto.createHmac("sha256", sk).update(timestamp + method.toUpperCase() + path).digest("base64");
}

function getHeaders(path: string) {
    const ts = new Date().toISOString();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    
    return h;
}

async function fetchOKX(path: string) {
    const url = `https://web3.okx.com${path}`;
    const res = await fetch(url, { method: "GET", headers: getHeaders(path), signal: AbortSignal.timeout(15000) });
    return res.json();
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";
    const source = searchParams.get("source") || "trending";

    const cacheKey = `discover_${source}_${chainIndex}`;
    if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
        return NextResponse.json({ ...cache[cacheKey].data, fromCache: true });
    }

    try {
        let tokens: any[] = [];

        if (source === "trending") {
            // /dex/market/token/hot-token
            const data = await fetchOKX(`/api/v6/dex/market/token/hot-token?chainIndex=${chainIndex}`);
            if (data.code === "0" && data.data) {
                tokens = (Array.isArray(data.data) ? data.data : [data.data]).flat().map((t: any) => ({
                    address: t.tokenContractAddress || t.address || "",
                    symbol: t.tokenSymbol || t.symbol || "???",
                    name: t.tokenName || t.name || "",
                    logo: t.tokenLogoUrl || t.logoUrl || "",
                    price: t.price || "0",
                    change24h: t.priceChange24h || t.change24h || "0",
                    volume: t.volume24h || t.tradingVolume || "0",
                    holders: t.holders || "0",
                    source: "trending",
                }));
            }
        } else if (source === "leaderboard") {
            // /dex/market/leaderboard/list — returns top trader wallets
            const data = await fetchOKX(`/api/v6/dex/market/leaderboard/list?chainIndex=${chainIndex}`);
            if (data.code === "0" && data.data) {
                const traders = (Array.isArray(data.data) ? data.data : [data.data]).flat();
                // Extract wallets with their PnL info
                tokens = traders.slice(0, 30).map((t: any) => ({
                    address: t.walletAddress || t.address || "",
                    symbol: t.walletTag || t.tag || "",
                    name: `PnL: $${parseFloat(t.pnl || t.totalPnl || "0").toLocaleString(undefined, {maximumFractionDigits: 0})}`,
                    logo: "",
                    pnl: t.pnl || t.totalPnl || "0",
                    winRate: t.winRate || "0",
                    trades: t.tradeCount || t.txCount || "0",
                    source: "leaderboard",
                }));
            }
        } else if (source === "memepump") {
            // /dex/market/memepump/tokenList
            const data = await fetchOKX(`/api/v6/dex/market/memepump/tokenList?chainIndex=${chainIndex}`);
            if (data.code === "0" && data.data) {
                const list = (Array.isArray(data.data) ? data.data : [data.data]).flat();
                tokens = list.slice(0, 30).map((t: any) => ({
                    address: t.tokenContractAddress || t.tokenAddress || t.address || "",
                    symbol: t.tokenSymbol || t.symbol || "???",
                    name: t.tokenName || t.name || "",
                    logo: t.tokenLogoUrl || t.logoUrl || "",
                    price: t.price || "0",
                    marketCap: t.marketCap || "0",
                    holders: t.holders || "0",
                    source: "memepump",
                }));
            }
        }

        const result = { success: true, tokens, source, chainIndex, count: tokens.length };
        cache[cacheKey] = { data: result, ts: Date.now() };
        return NextResponse.json(result);
    } catch (error) {
        console.error(`[Discover Tokens] ❌ ${source}:`, error instanceof Error ? error.message : error);
        if (cache[cacheKey]) return NextResponse.json({ ...cache[cacheKey].data, fromCache: true, stale: true });
        return NextResponse.json({ success: false, tokens: [], error: error instanceof Error ? error.message : "Failed" });
    }
}
