// API route to fetch trending/hot tokens from OKX DEX API
// GET /api/okx/hot-tokens?chainIndex=196
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CACHE_PREFIX = "okx_hot_tokens_";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Supported chains
const SUPPORTED_CHAINS: Record<string, string> = {
    "196": "XLayer",
    "1": "Ethereum",
    "56": "BSC",
    "137": "Polygon",
    "42161": "Arbitrum",
    "8453": "Base",
    "10": "Optimism",
    "43114": "Avalanche",
};

// Popular token symbols to prioritize per chain
const POPULAR_SYMBOLS = new Set([
    "USDT", "USDC", "WETH", "WBTC", "DAI", "LINK", "UNI", "AAVE", "MKR",
    "PEPE", "SHIB", "DOGE", "ARB", "OP", "MATIC", "AVAX", "BNB", "WBNB",
    "CAKE", "SOL", "WSOL", "TRUMP", "WLD", "RENDER", "FET", "BONK", "WIF",
    "BRETT", "TOSHI", "DEGEN", "BANMAO", "OKB", "WOKB",
]);

// Simple in-memory cache
const cache: Record<string, { data: any; timestamp: number }> = {};

function generateSignature(timestamp: string, method: string, requestPath: string): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chainIndex = searchParams.get("chainIndex") || "196";

    if (!SUPPORTED_CHAINS[chainIndex]) {
        return NextResponse.json({ success: false, error: "Unsupported chain" }, { status: 400 });
    }

    const cacheKey = CACHE_PREFIX + chainIndex;

    // Check cache
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
        return NextResponse.json({ ...cache[cacheKey].data, fromCache: true });
    }

    try {
        const requestPath = `/api/v6/dex/aggregator/all-tokens?chainIndex=${chainIndex}`;
        const url = `https://web3.okx.com${requestPath}`;
        const timestamp = new Date().toISOString();

        const headers: Record<string, string> = { "Content-Type": "application/json" };

        if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
            const signature = generateSignature(timestamp, "GET", requestPath);
            headers["OK-ACCESS-KEY"] = process.env.OKX_API_KEY;
            headers["OK-ACCESS-SIGN"] = signature;
            headers["OK-ACCESS-PASSPHRASE"] = process.env.OKX_PASSPHRASE;
            headers["OK-ACCESS-TIMESTAMP"] = timestamp;
            if (process.env.OKX_PROJECT_ID) headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
        }

        const response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(15000) });
        const data = await response.json();

        if (data.code === "0" && data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Prioritize popular/well-known tokens, then fill with others
            const popular: any[] = [];
            const others: any[] = [];

            for (const t of data.data) {
                const sym = (t.tokenSymbol || "").toUpperCase();
                if (POPULAR_SYMBOLS.has(sym)) {
                    popular.push(t);
                } else if (others.length < 30) {
                    others.push(t);
                }
            }

            // Combine: popular first, then others, take top 20
            const combined = [...popular, ...others].slice(0, 20);

            const result = {
                success: true,
                tokens: combined.map((t: any) => ({
                    tokenContractAddress: t.tokenContractAddress || "",
                    tokenSymbol: t.tokenSymbol || "???",
                    tokenName: t.tokenName || "",
                    tokenLogoUrl: t.tokenLogoUrl || "",
                    decimals: t.decimals || "18",
                    price: "0",
                    volume24h: "0",
                    holders: "0",
                    priceChange24h: "0",
                    liquidity: "0",
                    marketCap: "0",
                })),
                chainIndex,
                chainName: SUPPORTED_CHAINS[chainIndex],
                totalAvailable: data.data.length,
                source: "all-tokens",
            };

            cache[cacheKey] = { data: result, timestamp: Date.now() };
            return NextResponse.json(result);
        }

        return NextResponse.json({
            success: false,
            tokens: [],
            chainIndex,
            chainName: SUPPORTED_CHAINS[chainIndex],
            error: data.msg || "No tokens returned",
        }, { status: 500 });

    } catch (error) {
        console.error("[Hot Tokens API] Error:", error);

        // Return stale cache if available
        if (cache[cacheKey]) {
            return NextResponse.json({ ...cache[cacheKey].data, fromCache: true, stale: true });
        }

        return NextResponse.json({
            success: false,
            tokens: [],
            chainIndex,
            chainName: SUPPORTED_CHAINS[chainIndex],
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
