// API: Scan ALL token holders via Transfer event logs (ERC-20)
// Designed for XLayer RPC which limits eth_getLogs to 100 blocks per call
// GET /api/scan-all-holders?tokenAddress=0x...&chainIndex=196&fromBlock=0&batchSize=5000
import { NextRequest, NextResponse } from "next/server";

const CHAIN_RPCS: Record<string, { rpc: string; maxLogRange: number }> = {
    "196": { rpc: "https://rpc.xlayer.tech", maxLogRange: 99 },
    "1": { rpc: "https://eth.llamarpc.com", maxLogRange: 2000 },
    "56": { rpc: "https://bsc-dataseed1.binance.org", maxLogRange: 5000 },
    "137": { rpc: "https://polygon-rpc.com", maxLogRange: 3500 },
    "42161": { rpc: "https://arb1.arbitrum.io/rpc", maxLogRange: 10000 },
    "8453": { rpc: "https://mainnet.base.org", maxLogRange: 10000 },
};

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function rpcCall(rpc: string, method: string, params: any[]) {
    const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "RPC error");
    return data.result;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tokenAddress = searchParams.get("tokenAddress");
    const chainIndex = searchParams.get("chainIndex") || "196";
    const fromBlock = parseInt(searchParams.get("fromBlock") || "0");
    const batchSize = Math.min(parseInt(searchParams.get("batchSize") || "5000"), 20000);
    const findFirst = searchParams.get("findFirstTransfer") === "true";

    if (!tokenAddress) {
        return NextResponse.json({ success: false, error: "tokenAddress required" }, { status: 400 });
    }

    const chainConfig = CHAIN_RPCS[chainIndex];
    if (!chainConfig) {
        return NextResponse.json({ success: false, error: `Chain ${chainIndex} not supported` }, { status: 400 });
    }

    const { rpc, maxLogRange } = chainConfig;

    try {
        const latestHex = await rpcCall(rpc, "eth_blockNumber", []);
        const latestBlock = parseInt(latestHex, 16);

        // Smart Scan: Coarse search backwards from latest to find first Transfer
        if (findFirst) {
            // Start from 2M blocks back max, scan in large jumps
            const searchStart = Math.max(0, latestBlock - 2000000);
            const JUMP = 50000; // Check every 50K blocks
            let firstFound = latestBlock;
            let attempts = 0;

            // Phase 1: Coarse scan — find approximate range (jump by 50K blocks)
            for (let block = searchStart; block <= latestBlock && attempts < 30; block += JUMP) {
                attempts++;
                const checkFrom = block;
                const checkTo = Math.min(block + maxLogRange, latestBlock);
                try {
                    const logs = await rpcCall(rpc, "eth_getLogs", [{
                        address: tokenAddress.toLowerCase(),
                        topics: [TRANSFER_TOPIC],
                        fromBlock: "0x" + checkFrom.toString(16),
                        toBlock: "0x" + checkTo.toString(16),
                    }]);
                    if (logs && logs.length > 0) {
                        firstFound = block;
                        break;
                    }
                } catch { /* skip */ }
                await new Promise(r => setTimeout(r, 100));
            }

            // Phase 2: Fine-tune — binary search within the 50K range before firstFound
            if (firstFound > searchStart) {
                let low = Math.max(searchStart, firstFound - JUMP);
                let high = firstFound;
                while (low < high && attempts < 40) {
                    attempts++;
                    const mid = Math.floor((low + high) / 2);
                    const checkTo = Math.min(mid + maxLogRange, latestBlock);
                    try {
                        const logs = await rpcCall(rpc, "eth_getLogs", [{
                            address: tokenAddress.toLowerCase(),
                            topics: [TRANSFER_TOPIC],
                            fromBlock: "0x" + mid.toString(16),
                            toBlock: "0x" + checkTo.toString(16),
                        }]);
                        if (logs && logs.length > 0) {
                            high = mid;
                        } else {
                            low = checkTo + 1;
                        }
                    } catch { low = mid + 1000; }
                    await new Promise(r => setTimeout(r, 100));
                }
                firstFound = high;
            }

            return NextResponse.json({
                success: true,
                firstBlock: firstFound,
                latestBlock,
                attempts,
            });
        }

        const startBlock = fromBlock || Math.max(0, latestBlock - 500000);
        const endBlock = Math.min(startBlock + batchSize, latestBlock);

        // Scan in small chunks respecting RPC limits
        const holdersSet = new Set<string>();
        let totalTransfers = 0;
        let currentFrom = startBlock;

        while (currentFrom <= endBlock) {
            const currentTo = Math.min(currentFrom + maxLogRange, endBlock);
            try {
                const logs = await rpcCall(rpc, "eth_getLogs", [{
                    address: tokenAddress.toLowerCase(),
                    topics: [TRANSFER_TOPIC],
                    fromBlock: "0x" + currentFrom.toString(16),
                    toBlock: "0x" + currentTo.toString(16),
                }]);

                const ZERO = "0x0000000000000000000000000000000000000000";
                for (const log of (logs || [])) {
                    if (log.topics && log.topics.length >= 3) {
                        const from = "0x" + (log.topics[1] as string).slice(26).toLowerCase();
                        const to = "0x" + (log.topics[2] as string).slice(26).toLowerCase();
                        if (to !== ZERO) holdersSet.add(to);
                        if (from !== ZERO) holdersSet.add(from);
                    }
                }
                totalTransfers += (logs || []).length;
            } catch (e) {
                // Skip failed chunks, continue scanning
                console.warn(`[Scan Holders] Chunk ${currentFrom}-${currentTo} failed:`, e instanceof Error ? e.message : e);
            }
            currentFrom = currentTo + 1;
        }

        const hasMore = endBlock < latestBlock;
        const nextFromBlock = hasMore ? endBlock + 1 : null;

        return NextResponse.json({
            success: true,
            holders: Array.from(holdersSet),
            holderCount: holdersSet.size,
            transferCount: totalTransfers,
            scannedRange: { from: startBlock, to: endBlock },
            latestBlock,
            nextFromBlock,
            hasMore,
        });

    } catch (error) {
        console.error("[Scan All Holders] ❌", error instanceof Error ? error.message : error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "RPC scan failed",
        });
    }
}
