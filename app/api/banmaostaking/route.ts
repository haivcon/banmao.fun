import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import {
    insertStakeDonation,
    getStakeDonationsByAddress,
    getAllStakeDonations,
    isStakeDonationTxUsed
} from '../../../lib/db';

// Contract addresses
const STAKING_CONTRACT = '0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172';
const BANMAO_TOKEN = '0x16d91d1615fc55b76d5f92365bd60c069b46ef78';

// XLayer chain configuration
const xlayerChain = {
    id: 196,
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://xlayerrpc.okx.com'] }
    }
};

// Create viem client
const client = createPublicClient({
    chain: xlayerChain,
    transport: http()
});

// Transfer event ABI
const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

// Known donation blocks (for faster querying on first sync)
const KNOWN_DONATION_BLOCKS: bigint[] = [
    51085210n, // 0x92809f28... - 11,111 BANMAO
    51045707n, // 0x6d89ce8c... - 1,000,000 BANMAO
    50940998n, // 0x7e404f83... - 1,000,000 BANMAO
    50866766n, // 0xd17994327... - 10,000 BANMAO
];

interface DonationRecord {
    address: string;
    txHash: string;
    amount: string;
    blockNumber: string;
}

// In-memory cache (supplements DB for fast responses)
let donationsCache: DonationRecord[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

// GET /api/banmaostaking - HYBRID: DB first, then blockchain scan
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const forceRefresh = searchParams.get('refresh') === 'true';

        const now = Date.now();

        // ===== STEP 1: Return from cache if valid =====
        if (!forceRefresh && donationsCache && (now - lastCacheTime) < CACHE_TTL) {
            let donations = donationsCache;
            if (address) {
                donations = donations.filter(
                    d => d.address.toLowerCase() === address.toLowerCase()
                );
            }
            return NextResponse.json({ success: true, donations, cached: true, source: 'memory' });
        }

        // ===== STEP 2: Load from Turso DB =====
        const dbDonations = await getAllStakeDonations();
        const donations: DonationRecord[] = (dbDonations as any[]).map(row => ({
            address: row.donor_address,
            txHash: row.tx_hash,
            amount: row.amount,
            blockNumber: row.block_number
        }));

        // ===== STEP 3: Scan blockchain for NEW donations (last 5000 blocks) =====
        // Only scan recent blocks to sync new donations to DB
        try {
            const latestBlock = await client.getBlockNumber();
            const recentBlocks = 5000n; // ~12 hours on XLayer
            const batchSize = 200n;

            // Also scan known historical blocks if DB is empty
            const blocksToScan = donations.length === 0
                ? [...KNOWN_DONATION_BLOCKS]
                : [];

            // Add recent block ranges
            for (let i = 0n; i < recentBlocks; i += batchSize) {
                const fromBlock = latestBlock - recentBlocks + i;
                const toBlock = fromBlock + batchSize - 1n;

                // Skip if overlaps with known blocks (already queued)
                if (!KNOWN_DONATION_BLOCKS.some(b => b >= fromBlock && b <= toBlock)) {
                    blocksToScan.push(fromBlock);
                }
            }

            // Scan blocks
            for (const block of blocksToScan) {
                try {
                    const fromBlock = KNOWN_DONATION_BLOCKS.includes(block) ? block : block;
                    const toBlock = KNOWN_DONATION_BLOCKS.includes(block) ? block : block + batchSize - 1n;

                    const logs = await client.getLogs({
                        address: BANMAO_TOKEN as `0x${string}`,
                        event: transferEvent,
                        args: { to: STAKING_CONTRACT as `0x${string}` },
                        fromBlock,
                        toBlock
                    });

                    for (const log of logs) {
                        const txHash = log.transactionHash;

                        // Check if already in donations list
                        const exists = donations.some(d => d.txHash.toLowerCase() === txHash.toLowerCase());
                        if (!exists) {
                            const newDonation: DonationRecord = {
                                address: (log.args.from as string).toLowerCase(),
                                txHash,
                                amount: (log.args.value as bigint).toString(),
                                blockNumber: log.blockNumber.toString()
                            };

                            donations.push(newDonation);

                            // Save to DB (async, don't wait)
                            insertStakeDonation(
                                txHash,
                                newDonation.address,
                                newDonation.amount,
                                newDonation.blockNumber,
                                Date.now()
                            ).catch(err => console.error('Failed to save donation to DB:', err));
                        }
                    }
                } catch {
                    // Ignore individual batch errors
                }
            }
        } catch (err) {
            console.error('Error during blockchain sync:', err);
        }

        // Sort by block number descending (newest first)
        donations.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));

        // Update memory cache
        donationsCache = donations;
        lastCacheTime = now;

        // Filter by address if provided
        let result = donations;
        if (address) {
            result = donations.filter(
                d => d.address.toLowerCase() === address.toLowerCase()
            );
        }

        return NextResponse.json({
            success: true,
            donations: result,
            cached: false,
            source: 'db+blockchain',
            total: donations.length
        });
    } catch (error) {
        console.error('Failed to fetch donations:', error);
        return NextResponse.json({ success: false, donations: [], error: 'Failed to fetch donations' }, { status: 500 });
    }
}

// POST /api/banmaostaking - Save a new donation to DB
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { txHash, address, amount, blockNumber } = body;

        if (!txHash || !address || !amount) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: txHash, address, amount'
            }, { status: 400 });
        }

        // Check if tx already exists
        const exists = await isStakeDonationTxUsed(txHash);
        if (exists) {
            return NextResponse.json({
                success: true,
                message: 'Donation already recorded'
            });
        }

        // Insert to DB
        const result = await insertStakeDonation(
            txHash,
            address,
            amount,
            blockNumber || '0',
            Date.now()
        );

        if (result.success) {
            // Invalidate cache so next GET fetches fresh data
            donationsCache = null;
            lastCacheTime = 0;

            return NextResponse.json({
                success: true,
                message: 'Donation saved successfully'
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Failed to save donation:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to save donation'
        }, { status: 500 });
    }
}
