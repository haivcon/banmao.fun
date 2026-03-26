// app/api/slots/record/route.ts
// API for recording slots spin results
import { NextRequest, NextResponse } from "next/server";
import { recordSlotsSpin, isSlotsTxHashUsed, checkRateLimitDB } from "../../../../lib/db";

export async function POST(req: NextRequest) {
    try {
        const { address, betAmount, payout, symbols, isJackpot, txHash, seed, poolId, poolName, logIndex } = await req.json();

        // Validate inputs
        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
        }
        if (!betAmount || !payout) {
            return NextResponse.json({ success: false, error: 'Invalid bet/payout amounts' }, { status: 400 });
        }
        if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Transaction hash required' }, { status: 400 });
        }
        if (!symbols || typeof symbols !== 'string') {
            return NextResponse.json({ success: false, error: 'Symbols required' }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();
        const safeLogIndex = Number(logIndex || 0);

        // Rate limiting
        const rateLimit = await checkRateLimitDB(
            `slots:${normalizedAddress}`,
            60000, // 1 minute
            100    // Increased limit for multi-spin batching (or sequential requests)
        );
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
        }

        // Check for duplicate txHash + logIndex
        const alreadyUsed = await isSlotsTxHashUsed(txHash, safeLogIndex);
        if (alreadyUsed) {
            return NextResponse.json({
                success: false,
                error: 'Transaction already recorded'
            }, { status: 409 });
        }

        // Record the spin
        const success = await recordSlotsSpin(
            normalizedAddress,
            betAmount,
            payout,
            symbols,
            isJackpot === true,
            txHash,
            seed || undefined,
            poolId || undefined,
            poolName || undefined,
            safeLogIndex
        );

        if (!success) {
            return NextResponse.json({ success: false, error: 'Failed to record spin' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error recording slots spin:', error);
        return NextResponse.json({ success: false, error: 'Failed to record' }, { status: 500 });
    }
}
