// app/api/slots/record-batch/route.ts
// API for batch recording multiple slots spin results (multi-spin)
import { NextRequest, NextResponse } from "next/server";
import { recordSlotsSpin, isSlotsTxHashUsed, checkRateLimitDB } from "../../../../lib/db";

interface SpinRecord {
    address: string;
    betAmount: string;
    payout: string;
    symbols: string;
    isJackpot: boolean;
    txHash: string;
    seed?: string;
    poolId?: number;
    poolName?: string;
    logIndex?: number;
}

export async function POST(req: NextRequest) {
    try {
        const { spins } = await req.json() as { spins: SpinRecord[] };

        // Validate input
        if (!spins || !Array.isArray(spins) || spins.length === 0) {
            return NextResponse.json({ success: false, error: 'Spins array required' }, { status: 400 });
        }

        if (spins.length > 50) {
            return NextResponse.json({ success: false, error: 'Maximum 50 spins per batch' }, { status: 400 });
        }

        // Validate first spin has address (all should be same address)
        const firstSpin = spins[0];
        if (!firstSpin.address || typeof firstSpin.address !== 'string' || !firstSpin.address.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
        }

        const normalizedAddress = firstSpin.address.toLowerCase();

        // Rate limiting (1 batch = 1 request, limit 20 batches per minute)
        const rateLimit = await checkRateLimitDB(
            `slots-batch:${normalizedAddress}`,
            60000, // 1 minute
            20     // 20 batches per minute
        );
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
        }

        // Process all spins
        const results: { index: number; success: boolean; error?: string }[] = [];
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < spins.length; i++) {
            const spin = spins[i];

            // Basic validation
            if (!spin.betAmount || !spin.payout || !spin.txHash || !spin.symbols) {
                results.push({ index: i, success: false, error: 'Missing required fields' });
                continue;
            }

            if (!spin.txHash.startsWith('0x')) {
                results.push({ index: i, success: false, error: 'Invalid txHash format' });
                continue;
            }

            const safeLogIndex = Number(spin.logIndex || 0);

            // Check for duplicate txHash + logIndex
            const alreadyUsed = await isSlotsTxHashUsed(spin.txHash, safeLogIndex);
            if (alreadyUsed) {
                results.push({ index: i, success: false, error: 'Already recorded' });
                skipCount++;
                continue;
            }

            // Record the spin
            try {
                const success = await recordSlotsSpin(
                    normalizedAddress,
                    spin.betAmount,
                    spin.payout,
                    spin.symbols,
                    spin.isJackpot === true,
                    spin.txHash,
                    spin.seed || undefined,
                    spin.poolId || undefined,
                    spin.poolName || undefined,
                    safeLogIndex
                );

                if (success) {
                    results.push({ index: i, success: true });
                    successCount++;
                } else {
                    results.push({ index: i, success: false, error: 'DB insert failed' });
                }
            } catch (err) {
                console.error(`[record-batch] Error recording spin ${i}:`, err);
                results.push({ index: i, success: false, error: 'Internal error' });
            }
        }

        return NextResponse.json({
            success: true,
            total: spins.length,
            recorded: successCount,
            skipped: skipCount,
            failed: spins.length - successCount - skipCount,
            results
        });
    } catch (error) {
        console.error('Error in batch record:', error);
        return NextResponse.json({ success: false, error: 'Failed to process batch' }, { status: 500 });
    }
}
