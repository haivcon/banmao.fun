// app/api/donors/sync/route.ts
// Sync donations from XLayer blockchain using batch block fetching
// SECURITY: POST requires admin API key authentication
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { upsertDonor } from "../../../../lib/db";

// Admin authentication check
function verifyAdminAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (!apiKey) {
        console.error('ADMIN_API_KEY not set in environment');
        return false;
    }

    const providedKey = authHeader?.replace('Bearer ', '').trim();
    return providedKey === apiKey;
}

// XLayer configuration
const XLAYER_RPC = "https://rpc.xlayer.tech";
const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
const DONATION_CONTRACT = "0x986dE458302005890d708B3930ce57cD1E1E3BaF";

// Create XLayer client with timeout
const client = createPublicClient({
    transport: http(XLAYER_RPC, {
        timeout: 30_000, // 30 second timeout
        retryCount: 3,
        retryDelay: 1000,
    }),
});

// ERC20 Transfer event ABI
const transferEventAbi = parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// Batch size for block fetching (smaller = more reliable)
const BATCH_SIZE = BigInt(5_000);
const MAX_BATCHES = 200; // Maximum batches to process (1M blocks total)

interface DonationSummary {
    address: string;
    totalDonated: bigint;
    donationCount: number;
    firstDonation: number;
    lastDonation: number;
}

async function fetchLogsInBatches(fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const allLogs: any[] = [];
    let currentFrom = fromBlock;
    let batchCount = 0;

    while (currentFrom < toBlock && batchCount < MAX_BATCHES) {
        const currentTo = currentFrom + BATCH_SIZE > toBlock ? toBlock : currentFrom + BATCH_SIZE;

        console.log(`Fetching batch ${batchCount + 1}: blocks ${currentFrom} to ${currentTo}`);

        try {
            const logs = await client.getLogs({
                address: BANMAO_TOKEN as `0x${string}`,
                event: transferEventAbi,
                args: {
                    to: DONATION_CONTRACT as `0x${string}`,
                },
                fromBlock: currentFrom,
                toBlock: currentTo,
            });

            allLogs.push(...logs);
            console.log(`Batch ${batchCount + 1}: found ${logs.length} transfers`);
        } catch (err) {
            console.error(`Batch ${batchCount + 1} failed:`, err);
            // Continue with next batch even if one fails
        }

        currentFrom = currentTo + BigInt(1);
        batchCount++;

        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return allLogs;
}

export async function POST(request: NextRequest) {
    // SECURITY: Verify admin authentication
    if (!verifyAdminAuth(request)) {
        return NextResponse.json({
            success: false,
            error: 'Unauthorized. Admin API key required.'
        }, { status: 401 });
    }

    try {
        // Check for manual donor data first
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            try {
                const body = await request.json();
                if (body.donors && Array.isArray(body.donors)) {
                    let synced = 0;
                    for (const donor of body.donors) {
                        if (donor.address && donor.totalDonated) {
                            await upsertDonor(
                                donor.address.toLowerCase(),
                                donor.totalDonated,
                                donor.donationCount || 1,
                                donor.firstDonation || Date.now(),
                                donor.lastDonation || Date.now()
                            );
                            synced++;
                        }
                    }
                    return NextResponse.json({
                        success: true,
                        message: `Manually added ${synced} donors`,
                        donors: synced,
                    });
                }
            } catch (e) {
                // Not JSON or no donors array, continue with auto-sync
            }
        }

        console.log("Starting donor auto-sync from XLayer...");

        // Get current block
        let currentBlock: bigint;
        try {
            currentBlock = await client.getBlockNumber();
            console.log("Current block:", currentBlock.toString());
        } catch (rpcErr) {
            console.error("Failed to get block number:", rpcErr);
            return NextResponse.json(
                { success: false, error: "Failed to connect to XLayer RPC. Try again later." },
                { status: 503 }
            );
        }

        // Scan from 1 million blocks ago to find donations
        // (scanning from genesis would be too slow)
        const blocksToScan = BigInt(1_000_000);
        const startBlock = currentBlock > blocksToScan ? currentBlock - blocksToScan : BigInt(1);

        console.log(`Scanning blocks ${startBlock} to ${currentBlock} in batches of ${BATCH_SIZE}...`);
        console.log(`Max batches: ${MAX_BATCHES}, this may take ~${MAX_BATCHES / 2} seconds`);

        // Fetch logs in smaller batches
        const logs = await fetchLogsInBatches(startBlock, currentBlock);

        console.log(`Total found: ${logs.length} donation transfers`);

        if (logs.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No donations found in scanned block range",
                donors: 0,
                transactions: 0,
                blockRange: {
                    from: startBlock.toString(),
                    to: currentBlock.toString()
                }
            });
        }

        // Aggregate by sender
        const donationMap = new Map<string, DonationSummary>();

        for (const log of logs) {
            const from = log.args.from?.toLowerCase();
            const value = log.args.value || BigInt(0);
            const blockNumber = log.blockNumber || BigInt(0);

            if (!from) continue;

            const existing = donationMap.get(from);
            const timestamp = Number(blockNumber);

            if (existing) {
                existing.totalDonated += value;
                existing.donationCount += 1;
                existing.firstDonation = Math.min(existing.firstDonation, timestamp);
                existing.lastDonation = Math.max(existing.lastDonation, timestamp);
            } else {
                donationMap.set(from, {
                    address: from,
                    totalDonated: value,
                    donationCount: 1,
                    firstDonation: timestamp,
                    lastDonation: timestamp,
                });
            }
        }

        console.log(`Aggregated donations from ${donationMap.size} unique addresses`);

        // Upsert all donors to database
        let synced = 0;
        for (const [address, summary] of donationMap) {
            try {
                await upsertDonor(
                    address,
                    summary.totalDonated.toString(),
                    summary.donationCount,
                    summary.firstDonation,
                    summary.lastDonation
                );
                synced++;
                console.log(`Synced donor ${address}: ${summary.totalDonated.toString()} wei (${summary.donationCount} donations)`);
            } catch (err) {
                console.error(`Failed to upsert donor ${address}:`, err);
            }
        }

        console.log(`Successfully synced ${synced} donors to database`);

        return NextResponse.json({
            success: true,
            message: `Synced ${synced} donors from ${logs.length} transactions`,
            donors: synced,
            transactions: logs.length,
            blockRange: {
                from: startBlock.toString(),
                to: currentBlock.toString()
            }
        });
    } catch (error) {
        console.error("Error syncing donors:", error);
        return NextResponse.json(
            { success: false, error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}

// GET endpoint
export async function GET() {
    try {
        const currentBlock = await client.getBlockNumber();
        return NextResponse.json({
            message: "POST to sync donors from blockchain",
            currentBlock: currentBlock.toString(),
            config: {
                token: BANMAO_TOKEN,
                contract: DONATION_CONTRACT,
                rpc: XLAYER_RPC,
                batchSize: BATCH_SIZE.toString(),
                maxBatches: MAX_BATCHES
            },
        });
    } catch {
        return NextResponse.json({
            message: "POST to sync donors from blockchain",
            error: "Could not fetch current block - RPC may be slow",
            config: {
                token: BANMAO_TOKEN,
                contract: DONATION_CONTRACT,
                rpc: XLAYER_RPC,
            },
        });
    }
}
