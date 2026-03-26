// app/api/slots/history-chain/route.ts
// API for fetching slots spin history from blockchain events
// Uses viem to query SpinRevealed logs + database fallback for reliability

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatEther } from 'viem';
import { getSlotsPlayerByAddress, getSlotsHistory } from "../../../../lib/db";

// X Layer mainnet configuration
const XLAYER_RPC = "https://rpc.xlayer.tech";
const SLOTS_CONTRACT_ADDRESS = "0x9c64c18D792Eab435d1d921efaC978F6A62da2d2" as `0x${string}`;

// SpinRevealed event ABI for decoding
const SPIN_REVEALED_ABI = [
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint8[5]", name: "result", type: "uint8[5]" },
            { indexed: false, internalType: "uint256", name: "payout", type: "uint256" },
            { indexed: false, internalType: "bool", name: "isJackpot", type: "bool" },
        ],
        name: "SpinRevealed",
        type: "event",
    },
] as const;

// ========== SERVER-SIDE CACHING ==========
// Cache to reduce database reads (30 second TTL)
const CACHE_TTL_MS = 30 * 1000; // 30 seconds
interface CacheEntry {
    data: any;
    expires: number;
}
const historyCache = new Map<string, CacheEntry>();

function getCacheKey(address?: string, poolId?: bigint, limit?: number): string {
    return `${address || 'all'}-${poolId?.toString() || 'all'}-${limit || 50}`;
}

function getCachedHistory(key: string): any | null {
    const entry = historyCache.get(key);
    if (entry && entry.expires > Date.now()) {
        console.log(`[history-chain] Cache HIT: ${key}`);
        return entry.data;
    }
    if (entry) {
        historyCache.delete(key); // Expired
    }
    return null;
}

function setCachedHistory(key: string, data: any): void {
    historyCache.set(key, {
        data,
        expires: Date.now() + CACHE_TTL_MS
    });

    // Cleanup old entries (keep max 100)
    if (historyCache.size > 100) {
        const oldestKey = historyCache.keys().next().value;
        if (oldestKey) historyCache.delete(oldestKey);
    }
}

// Helper to get player profile from database
async function getPlayerProfile(address: string) {
    try {
        const player = await getSlotsPlayerByAddress(address);
        if (player) {
            return {
                name: player.name || `Spinner ${address.slice(0, 8)}`,
                avatar: player.avatar || 0,
            };
        }
    } catch (e) {
        console.error('[history-chain] Failed to get player profile:', e);
    }
    return {
        name: `Spinner ${address.slice(0, 8)}`,
        avatar: 0,
    };
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get('address')?.toLowerCase() || undefined;
        const limitParam = parseInt(searchParams.get('limit') || '50');
        const limit = Math.min(limitParam, 200);
        const poolIdParam = searchParams.get('poolId');
        const poolId = poolIdParam ? BigInt(poolIdParam) : undefined;
        const fromBlockParam = searchParams.get('fromBlock');
        const skipCache = searchParams.get('fresh') === 'true';

        // Check cache first (unless fresh=true)
        const cacheKey = getCacheKey(address, poolId, limit);
        if (!skipCache) {
            const cached = getCachedHistory(cacheKey);
            if (cached) {
                return NextResponse.json(cached);
            }
        }

        // Create client per-request to avoid stale connections
        const publicClient = createPublicClient({
            chain: {
                id: 196,
                name: 'X Layer',
                nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
                rpcUrls: {
                    default: { http: [XLAYER_RPC] },
                    public: { http: [XLAYER_RPC] },
                },
            },
            transport: http(XLAYER_RPC, {
                timeout: 30000,
                retryCount: 2,
            }),
        });

        // Get current block number
        const currentBlock = await publicClient.getBlockNumber();
        console.log(`[history-chain] Current block: ${currentBlock}`);

        // X Layer RPC only allows max 100 blocks per query!
        // For more history, we paginate or use database
        const blocksToQuery = BigInt(100);
        const fromBlock = fromBlockParam
            ? BigInt(fromBlockParam)
            : (currentBlock > blocksToQuery ? currentBlock - blocksToQuery : BigInt(0));

        console.log(`[history-chain] Querying blocks ${fromBlock} to ${currentBlock} (${Number(currentBlock - fromBlock)} blocks)`);
        console.log(`[history-chain] Filters: poolId=${poolId}, address=${address}`);

        // Query logs using getContractEvents (proper viem API for ABI-based filtering)
        let logs;
        try {
            logs = await publicClient.getContractEvents({
                address: SLOTS_CONTRACT_ADDRESS,
                abi: SPIN_REVEALED_ABI,
                eventName: 'SpinRevealed',
                fromBlock,
                toBlock: currentBlock,
                args: poolId !== undefined || address ? {
                    ...(poolId !== undefined ? { poolId } : {}),
                    ...(address ? { player: address as `0x${string}` } : {}),
                } : undefined,
            });
            console.log(`[history-chain] Found ${logs.length} SpinRevealed events from blockchain`);
        } catch (rpcError: any) {
            console.error('[history-chain] RPC error:', rpcError?.message || rpcError);
            // Fallback to database
            return fallbackToDatabase(address, limit, poolId, cacheKey);
        }

        // If no events found, fallback to database for older data
        if (logs.length === 0) {
            console.log('[history-chain] No events in recent blocks, using database');
            return fallbackToDatabase(address, limit, poolId, cacheKey);
        }

        // Sort by block number descending (newest first)
        logs.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

        // Limit results
        const limitedLogs = logs.slice(0, limit);

        // Get unique player addresses for profile lookup
        const playerAddresses = new Set<string>();

        // Decode logs
        const decodedLogs = limitedLogs.map(log => {
            try {
                // logs from abi-based getLogs already have args decoded
                const args = (log as any).args as {
                    poolId: bigint;
                    player: `0x${string}`;
                    result: readonly number[];
                    payout: bigint;
                    isJackpot: boolean;
                };
                if (args?.player) {
                    playerAddresses.add(args.player.toLowerCase());
                }
                return {
                    ...log,
                    decodedArgs: args,
                };
            } catch (e) {
                console.error('[history-chain] Failed to decode log:', e);
                return null;
            }
        }).filter(Boolean);

        // Batch fetch player profiles
        const profilePromises = [...playerAddresses].map(addr => getPlayerProfile(addr));
        const profiles = await Promise.all(profilePromises);
        const profileMap = new Map([...playerAddresses].map((addr, i) => [addr, profiles[i]]));

        // Format logs to match existing history format
        const history = decodedLogs.map((log: any) => {
            if (!log || !log.decodedArgs) return null;

            const args = log.decodedArgs;
            const playerAddr = args.player?.toLowerCase() || '';
            const profile = profileMap.get(playerAddr) || { name: `Spinner ${playerAddr.slice(0, 8)}`, avatar: 0 };
            const payoutNum = Number(formatEther(args.payout));

            return {
                id: `chain-${log.transactionHash}-${log.logIndex}`,
                player: args.player,
                playerAddress: args.player,
                betAmount: '0', // Not available in SpinRevealed event
                payout: args.payout.toString(),
                payoutFormatted: payoutNum.toFixed(2),
                multiplier: 0,
                symbols: [...args.result].join(','),
                result: [...args.result],
                isJackpot: args.isJackpot,
                txHash: log.transactionHash,
                poolId: Number(args.poolId),
                poolName: `Pool #${Number(args.poolId)}`,
                timestamp: Date.now(), // Block timestamp would require extra RPC calls
                blockNumber: Number(log.blockNumber),
                logIndex: log.logIndex,
                playerName: profile.name,
                playerAvatar: profile.avatar,
                source: 'blockchain',
            };
        }).filter(Boolean);

        const response = {
            success: true,
            source: 'blockchain',
            cached: false,
            fromBlock: fromBlock.toString(),
            toBlock: currentBlock.toString(),
            totalEvents: logs.length,
            history,
        };

        // Cache the response
        setCachedHistory(cacheKey, { ...response, cached: true });

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('[history-chain] Error:', error?.message || error);

        // Fallback to database
        const { searchParams } = new URL(req.url);
        const address = searchParams.get('address')?.toLowerCase() || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');
        const poolIdParam = searchParams.get('poolId');
        const poolId = poolIdParam ? BigInt(poolIdParam) : undefined;

        return fallbackToDatabase(address, limit, poolId);
    }
}

// Helper function for database fallback
async function fallbackToDatabase(address: string | undefined, limit: number, poolId: bigint | undefined, cacheKey?: string) {
    try {
        const dbHistory = await getSlotsHistory(address, Math.min(limit, 100), poolId ? Number(poolId) : undefined);

        const response = {
            success: true,
            source: 'database_fallback',
            cached: false,
            history: dbHistory.map((spin: any) => ({
                id: spin.id,
                player: spin.player_address,
                playerAddress: spin.player_address,
                betAmount: spin.bet_amount,
                payout: spin.payout,
                multiplier: spin.multiplier,
                symbols: spin.symbols,
                result: spin.symbols ? spin.symbols.split(',').map(Number) : [],
                isJackpot: spin.is_jackpot === 1,
                txHash: spin.tx_hash,
                poolId: spin.pool_id,
                poolName: spin.pool_name,
                timestamp: spin.timestamp,
                playerName: spin.player_name || `Spinner ${(spin.player_address || '').slice(0, 8)}`,
                playerAvatar: spin.player_avatar || 0,
            }))
        };

        // Cache the response
        if (cacheKey) {
            setCachedHistory(cacheKey, { ...response, cached: true });
        }

        return NextResponse.json(response);
    } catch (dbError) {
        console.error('[history-chain] Database fallback also failed:', dbError);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch history'
        }, { status: 500 });
    }
}
