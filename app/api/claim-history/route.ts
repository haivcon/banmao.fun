import { NextRequest, NextResponse } from 'next/server';

const STAKING_CONTRACT = '0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172';
const XLAYER_RPC = 'https://rpc.xlayer.tech';
const REWARD_CLAIMED_TOPIC = '0x106f923f993c2149d49b4255ff723acafa1f2d94393f561d3eda32ae348f7241';

// Cache for claim history
let cachedClaims: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 300000; // 5 minute cache
let isFetching = false; // Prevent concurrent fetches

async function fetchRecentClaims(maxTimeMs: number = 15000) {
    const startTime = Date.now();

    try {
        // Get current block
        const blockRes = await fetch(XLAYER_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1,
            }),
        });
        const blockData = await blockRes.json();
        const currentBlock = parseInt(blockData.result, 16);

        // XLayer RPC limits to 100 blocks per query!
        const allClaims: any[] = [];
        const BLOCKS_PER_QUERY = 99;
        const TARGET_CLAIMS = 20;

        let endBlock = currentBlock;
        let queries = 0;

        // Cache for block timestamps to avoid redundant calls
        const blockTimestamps: Map<number, number> = new Map();

        // Stop early if taking too long
        while (allClaims.length < TARGET_CLAIMS && endBlock > 0 && (Date.now() - startTime) < maxTimeMs) {
            const fromBlock = Math.max(0, endBlock - BLOCKS_PER_QUERY);

            try {
                const logsRes = await fetch(XLAYER_RPC, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getLogs',
                        params: [{
                            address: STAKING_CONTRACT,
                            fromBlock: '0x' + fromBlock.toString(16),
                            toBlock: '0x' + endBlock.toString(16),
                            topics: [REWARD_CLAIMED_TOPIC],
                        }],
                        id: queries,
                    }),
                });

                const logsData = await logsRes.json();

                if (logsData.result && Array.isArray(logsData.result)) {
                    for (const log of logsData.result) {
                        const user = log.topics[1]
                            ? ('0x' + log.topics[1].slice(26)).toLowerCase()
                            : '0x0';
                        const amount = log.data ? BigInt(log.data).toString() : '0';
                        const blockNumber = parseInt(log.blockNumber, 16);

                        // Fetch block timestamp if not cached
                        let timestamp = blockTimestamps.get(blockNumber);
                        if (timestamp === undefined) {
                            try {
                                const blockInfoRes = await fetch(XLAYER_RPC, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        jsonrpc: '2.0',
                                        method: 'eth_getBlockByNumber',
                                        params: ['0x' + blockNumber.toString(16), false],
                                        id: 999,
                                    }),
                                });
                                const blockInfo = await blockInfoRes.json();
                                timestamp = blockInfo.result?.timestamp
                                    ? parseInt(blockInfo.result.timestamp, 16)
                                    : Math.floor(Date.now() / 1000);
                                blockTimestamps.set(blockNumber, timestamp);
                            } catch {
                                timestamp = Math.floor(Date.now() / 1000);
                            }
                        }

                        allClaims.push({
                            user,
                            amount,
                            blockNumber,
                            transactionHash: log.transactionHash,
                            timestamp,
                        });
                    }
                }
            } catch {
                // Silent fail for individual query
            }

            endBlock = fromBlock - 1;
            queries++;
        }

        // Sort by block descending
        allClaims.sort((a, b) => b.blockNumber - a.blockNumber);
        return allClaims.slice(0, 50);
    } catch {
        return [];
    }
}

export async function GET(request: NextRequest) {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedClaims.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
        return NextResponse.json({
            claims: cachedClaims,
            cached: true,
            cachedAt: lastFetchTime,
            count: cachedClaims.length,
        });
    }

    // If already fetching, return current cache or empty
    if (isFetching) {
        return NextResponse.json({
            claims: cachedClaims,
            cached: true,
            cachedAt: lastFetchTime,
            count: cachedClaims.length,
            status: 'fetching',
        });
    }

    isFetching = true;

    try {
        // Fast timeout - return what we can in 15 seconds
        const claims = await fetchRecentClaims(15000);

        if (claims.length > 0) {
            cachedClaims = claims;
            lastFetchTime = now;
        }

        return NextResponse.json({
            claims: claims.length > 0 ? claims : cachedClaims,
            cached: false,
            cachedAt: lastFetchTime,
            count: claims.length,
        });
    } finally {
        isFetching = false;
    }
}
