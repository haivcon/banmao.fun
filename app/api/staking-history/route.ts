import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';

const STAKING_CONTRACT = '0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172';

// XLayer chain configuration
const xlayerChain = {
    id: 196,
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://xlayerrpc.okx.com'] }
    }
};

const client = createPublicClient({
    chain: xlayerChain,
    transport: http()
});

// Correct ABIs
const EVENTS = {
    Staked: parseAbiItem('event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 shares, uint256 lockDays)'),
    Unstaked: parseAbiItem('event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 penalty)'),
    RewardClaimed: parseAbiItem('event RewardClaimed(address indexed user, uint256 amount)'),
    Compounded: parseAbiItem('event Compounded(address indexed user, uint256 amount, uint256 newStakeId)')
};

// Helper: Fetch logs with batching/retry
async function fetchLogsInBatches(event: any, user: `0x${string}`, fromBlock: bigint, toBlock: bigint) {
    const logs = [];
    const BATCH_SIZE = 100n; // XLayer strict limit

    // We'll process in parallel chunks to speed up
    const ranges = [];
    for (let current = fromBlock; current <= toBlock; current += BATCH_SIZE) {
        const end = current + BATCH_SIZE - 1n > toBlock ? toBlock : current + BATCH_SIZE - 1n;
        ranges.push({ from: current, to: end });
    }

    // Process most recent first -> reverse
    ranges.reverse();

    // Limit to max 50 batches (5000 blocks) to prevent timeout
    const limitedRanges = ranges.slice(0, 50);

    const promises = limitedRanges.map(async (range) => {
        try {
            return await client.getLogs({
                address: STAKING_CONTRACT,
                event: event,
                args: { user },
                fromBlock: range.from,
                toBlock: range.to
            });
        } catch (e) {
            console.error(`Error fetching range ${range.from}-${range.to}`, e);
            return [];
        }
    });

    const results = await Promise.all(promises);
    return results.flat();
}


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address required' }, { status: 400 });
        }

        const userAddress = address as `0x${string}`;

        // Get current block
        const latestBlock = await client.getBlockNumber();
        const SCAN_RANGE = 5000n; // Scan last 5000 blocks (~4 hours)
        const fromBlock = latestBlock - SCAN_RANGE > 0n ? latestBlock - SCAN_RANGE : 0n;

        // Parallel fetch for all 4 event types
        const [stakedLogs, unstakedLogs, claimedLogs, compoundedLogs] = await Promise.all([
            fetchLogsInBatches(EVENTS.Staked, userAddress, fromBlock, latestBlock),
            fetchLogsInBatches(EVENTS.Unstaked, userAddress, fromBlock, latestBlock),
            fetchLogsInBatches(EVENTS.RewardClaimed, userAddress, fromBlock, latestBlock),
            fetchLogsInBatches(EVENTS.Compounded, userAddress, fromBlock, latestBlock)
        ]);

        // Deduplicate block numbers to fetch timestamps efficiency
        const blockNumbers = new Set<bigint>();
        [...stakedLogs, ...unstakedLogs, ...claimedLogs, ...compoundedLogs].forEach(log => {
            blockNumbers.add(log.blockNumber);
        });

        // Fetch blocks in parallel (limited)
        const blockMap = new Map<string, number>();
        const blockErrors = new Set<string>();

        // Limit block fetches to avoid rate limits 
        // Max 50 distinct blocks should be fine after scanning 5000 blocks filter
        const blocksToFetch = Array.from(blockNumbers).slice(0, 50);

        await Promise.all(blocksToFetch.map(async (bn) => {
            try {
                const block = await client.getBlock({ blockNumber: bn });
                blockMap.set(bn.toString(), Number(block.timestamp) * 1000); // ms
            } catch (e) {
                console.error('Failed to fetch block', bn);
                blockErrors.add(bn.toString());
            }
        }));

        const transactions = [
            ...stakedLogs.map(log => {
                const ts = blockMap.get(log.blockNumber.toString()) || Date.now();
                const lockDays = (log.args as any).lockDays ? Number((log.args as any).lockDays) : 0;
                // Expiry = timestamp + lockDays * 24h
                const expiry = lockDays > 0 ? ts + (lockDays * 24 * 60 * 60 * 1000) : undefined;

                return {
                    type: 'stake',
                    amount: (log.args as any).amount?.toString() || '0',
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber.toString(),
                    timestamp: ts,
                    lockDays: lockDays,
                    expiry: expiry
                };
            }),
            ...unstakedLogs.map(log => ({
                type: 'unstake',
                amount: (log.args as any).amount?.toString() || '0',
                txHash: log.transactionHash,
                blockNumber: log.blockNumber.toString(),
                timestamp: blockMap.get(log.blockNumber.toString()) || Date.now()
            })),
            ...claimedLogs.map(log => ({
                type: 'claim',
                amount: (log.args as any).amount?.toString() || '0',
                txHash: log.transactionHash,
                blockNumber: log.blockNumber.toString(),
                timestamp: blockMap.get(log.blockNumber.toString()) || Date.now()
            })),
            ...compoundedLogs.map(log => ({
                type: 'compound',
                amount: (log.args as any).amount?.toString() || '0',
                txHash: log.transactionHash,
                blockNumber: log.blockNumber.toString(),
                timestamp: blockMap.get(log.blockNumber.toString()) || Date.now()
            }))
        ];

        // Sort by block number descending (newest first)
        transactions.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));

        return NextResponse.json({ success: true, transactions, scannedRange: Number(SCAN_RANGE) });

    } catch (error: any) {
        console.error('Failed to fetch staking history:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch history', details: error.message }, { status: 500 });
    }
}
