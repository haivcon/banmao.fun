// API route to fetch total portfolio value (USD) for a wallet address
// GET /api/okx/wallet-total-value?address=0x...&chains=196
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CACHE_TTL = 60 * 1000; // 60 seconds
const cache: Record<string, { data: any; timestamp: number }> = {};

function generateSignature(timestamp: string, method: string, requestPath: string): string {
    const secretKey = process.env.OKX_SECRET_KEY || "";
    const prehash = timestamp + method.toUpperCase() + requestPath;
    return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    const chains = searchParams.get("chains") || "196";
    const assetType = searchParams.get("assetType") || "0"; // 0=all, 1=tokens, 2=defi

    if (!address || !address.startsWith("0x") || address.length !== 42) {
        return NextResponse.json({ success: false, error: "Invalid address" }, { status: 400 });
    }

    const cacheKey = `wallet_total_${chains}_${address.toLowerCase()}_${assetType}`;

    // Check cache
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
        return NextResponse.json({ ...cache[cacheKey].data, fromCache: true });
    }

    try {
        const requestPath = `/api/v5/wallet/asset/total-value-by-address?address=${address}&chains=${encodeURIComponent(chains)}&assetType=${assetType}&excludeRiskToken=true`;
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

        const response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
        const data = await response.json();

        if (data.code === "0" && data.data) {
            const dataArr = Array.isArray(data.data) ? data.data : [data.data];
            let totalValue = 0;

            for (const d of dataArr) {
                totalValue += parseFloat(d.totalValue || "0");
            }

            const result = {
                success: true,
                totalValue: totalValue.toFixed(2),
                address,
                chains,
            };

            cache[cacheKey] = { data: result, timestamp: Date.now() };
            return NextResponse.json(result);
        }

        return NextResponse.json({
            success: true,
            totalValue: "0",
            address,
            chains,
            note: data.msg || "No value data",
        });

    } catch (error) {
        console.error("[Wallet Total Value API] Error:", error);

        // Return stale cache if available
        if (cache[cacheKey]) {
            return NextResponse.json({ ...cache[cacheKey].data, fromCache: true, stale: true });
        }

        return NextResponse.json({
            success: false,
            totalValue: "0",
            error: error instanceof Error ? error.message : "Failed to fetch total value",
        }, { status: 500 });
    }
}
