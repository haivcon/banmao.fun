import { NextRequest, NextResponse } from "next/server";

// Vercel serverless config
export const maxDuration = 25;
export const dynamic = "force-dynamic";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xlayer.tech";
const DEFAULT_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";

const KNOWN_TOKENS: Record<string, { address: string; decimals: number; symbol: string }> = {
    OKB: { address: "native", decimals: 18, symbol: "OKB" },
    USDT: { address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d", decimals: 6, symbol: "USDT" },
    WOKB: { address: "0xe538905cf8410324e03a5a23c1c177a474d59b2b", decimals: 18, symbol: "WOKB" },
};

// ---------- RPC helpers with timeout ----------
async function rpcCall(method: string, params: any[], timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
            signal: controller.signal,
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || "RPC failed");
        return data.result;
    } finally {
        clearTimeout(timer);
    }
}

async function isContract(address: string): Promise<boolean> {
    try {
        const code = await rpcCall("eth_getCode", [address, "latest"], 3000);
        return code !== "0x" && code !== "0x0" && code !== null;
    } catch { return false; }
}

async function getOKBBalance(addr: string): Promise<string> {
    try { return await rpcCall("eth_getBalance", [addr, "latest"], 3000) || "0x0"; } catch { return "0x0"; }
}

async function getTokenBalance(token: string, wallet: string): Promise<string> {
    try {
        const data = `0x70a08231${wallet.slice(2).toLowerCase().padStart(64, "0")}`;
        return await rpcCall("eth_call", [{ to: token, data }, "latest"], 3000) || "0x0";
    } catch { return "0x0"; }
}

function formatBalance(hex: string, decimals: number): string {
    const big = BigInt(hex || "0x0");
    const div = BigInt(10 ** decimals);
    const w = big / div;
    const f = (big % div).toString().padStart(decimals, "0").slice(0, 4);
    return `${w}.${f}`;
}

// ---------- PAGINATED SCAN ----------
// Each call scans a small block range (chunk), returns results + cursor for next call
// Frontend calls repeatedly until cursor is null or enough wallets found

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor"); // "endBlock" from previous call, or null for first call
        const skipAddrs = searchParams.get("skip")?.split(",").filter(Boolean) || []; // already found addresses
        const filterToken = (searchParams.get("tokenAddress") || DEFAULT_TOKEN).toLowerCase(); // token to filter holders
        const filterDecimals = parseInt(searchParams.get("tokenDecimals") || "18");

        // Config: scan 2000 blocks per call, 100-block batches, 3 parallel
        const CHUNK_SIZE = 2000;
        const BATCH_SIZE = 100;
        const PARALLEL = 3;
        const MAX_ADDRESSES = 200;
        const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

        const tokensToScan = [
            DEFAULT_TOKEN,
            KNOWN_TOKENS.USDT.address,
            KNOWN_TOKENS.WOKB.address,
        ].filter(a => a !== "native");

        // Get latest block
        const latestHex = await rpcCall("eth_blockNumber", []);
        const latestBlockNum = parseInt(latestHex, 16);

        // Determine scan range
        const scanEnd = cursor ? parseInt(cursor) : latestBlockNum;
        const scanStart = Math.max(0, scanEnd - CHUNK_SIZE);

        // Don't scan below block 0 or too far back (max 50000 blocks from latest)
        if (scanEnd <= 0 || latestBlockNum - scanEnd > 50000) {
            return NextResponse.json({
                success: true,
                wallets: [],
                totalFound: 0,
                cursor: null, // No more pages
                latestBlock: latestBlockNum,
                scannedRange: { from: scanStart, to: scanEnd },
                message: "Reached scan limit",
            });
        }

        // ---------- Phase 1: Collect addresses from Transfer events ----------
        const addresses = new Set<string>();
        const skipSet = new Set(skipAddrs.map(a => a.toLowerCase()));

        for (const tokenAddr of tokensToScan) {
            const totalBatches = Math.ceil(CHUNK_SIZE / BATCH_SIZE);

            for (let batchStart = 0; batchStart < totalBatches; batchStart += PARALLEL) {
                const promises = [];
                for (let i = batchStart; i < Math.min(batchStart + PARALLEL, totalBatches); i++) {
                    const endBlock = scanEnd - (i * BATCH_SIZE);
                    const startBlock = Math.max(scanStart, endBlock - BATCH_SIZE + 1);
                    if (startBlock >= endBlock) continue;

                    promises.push(
                        rpcCall("eth_getLogs", [{
                            fromBlock: `0x${startBlock.toString(16)}`,
                            toBlock: `0x${endBlock.toString(16)}`,
                            address: tokenAddr,
                            topics: [TRANSFER_TOPIC],
                        }], 4000).catch(() => null)
                    );
                }

                const results = await Promise.all(promises);
                for (const logs of results) {
                    if (!Array.isArray(logs)) continue;
                    for (const log of logs) {
                        if (log.topics?.[1]) {
                            const from = `0x${log.topics[1].slice(26)}`.toLowerCase();
                            if (from !== "0x0000000000000000000000000000000000000000" && !skipSet.has(from))
                                addresses.add(from);
                        }
                        if (log.topics?.[2]) {
                            const to = `0x${log.topics[2].slice(26)}`.toLowerCase();
                            if (to !== "0x0000000000000000000000000000000000000000" && !skipSet.has(to))
                                addresses.add(to);
                        }
                    }
                }
                if (addresses.size >= MAX_ADDRESSES) break;
            }
            if (addresses.size >= MAX_ADDRESSES) break;
        }

        if (addresses.size === 0) {
            return NextResponse.json({
                success: true,
                wallets: [],
                totalFound: 0,
                cursor: scanStart > 0 ? String(scanStart) : null,
                latestBlock: latestBlockNum,
                scannedRange: { from: scanStart, to: scanEnd },
            });
        }

        // ---------- Phase 2: Filter contracts (batch 10) ----------
        const addrList = Array.from(addresses).slice(0, 50);
        const contractResults: { addr: string; isC: boolean }[] = [];
        for (let i = 0; i < addrList.length; i += 10) {
            const batch = addrList.slice(i, i + 10);
            const res = await Promise.all(batch.map(async a => ({ addr: a, isC: await isContract(a) })));
            contractResults.push(...res);
        }
        const eoaAddresses = contractResults.filter(c => !c.isC).map(c => c.addr);

        // ---------- Phase 3: Get balances & filter (batch 10) ----------
        const walletsToEnrich = eoaAddresses.slice(0, 30);
        const enriched: any[] = [];

        for (let i = 0; i < walletsToEnrich.length; i += 10) {
            const batch = walletsToEnrich.slice(i, i + 10);
            const res = await Promise.all(batch.map(async addr => {
                const [okbHex, usdtHex, tokenHex] = await Promise.all([
                    getOKBBalance(addr),
                    getTokenBalance(KNOWN_TOKENS.USDT.address, addr),
                    getTokenBalance(filterToken, addr),
                ]);
                const okbBal = formatBalance(okbHex, 18);
                const usdtBal = formatBalance(usdtHex, 6);
                return {
                    address: addr,
                    shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    balances: { OKB: okbBal, USDT: usdtBal, TOKEN: formatBalance(tokenHex, filterDecimals) },
                    hasBalance: parseFloat(okbBal) > 0.001 || parseFloat(usdtBal) > 0.01,
                    hasToken: BigInt(tokenHex || "0x0") > BigInt(0),
                };
            }));
            enriched.push(...res);
        }

        const activeWallets = enriched.filter(w => w.hasBalance && !w.hasToken);

        // Next cursor: start of this chunk (for next page to continue backwards)
        const nextCursor = scanStart > 0 ? String(scanStart) : null;

        return NextResponse.json({
            success: true,
            wallets: activeWallets,
            totalFound: activeWallets.length,
            totalScanned: Array.from(addresses).length,
            cursor: nextCursor,
            latestBlock: latestBlockNum,
            scannedRange: { from: scanStart, to: scanEnd },
            scanTimestamp: Date.now(),
        });
    } catch (err) {
        console.error("Scan wallets error:", err);
        return NextResponse.json({ success: false, error: "Failed to scan wallets" }, { status: 500 });
    }
}
