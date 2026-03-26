// app/api/hub/tips/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { insertHubTip, isHubTipTxUsed, getTopCreators, getTipHistory } from '@/lib/db';

export async function GET(req: NextRequest) {
    const postId = req.nextUrl.searchParams.get('postId');
    if (postId) {
        // Tip history for a specific post
        const history = await getTipHistory(Number(postId));
        return NextResponse.json({ history });
    }
    // Default: top creators
    const creators = await getTopCreators(50);
    return NextResponse.json({ creators });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { txHash, postId, tipperAddress, creatorAddress, amount, feeAmount } = body;

        if (!txHash || !postId || !tipperAddress || !creatorAddress || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check for duplicate
        const used = await isHubTipTxUsed(txHash);
        if (used) return NextResponse.json({ error: 'Transaction already recorded' }, { status: 409 });

        const result = await insertHubTip(txHash, Number(postId), tipperAddress, creatorAddress, amount, feeAmount || '0');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Hub tip error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
