// app/api/slots/history/route.ts
// API for fetching slots spin history
import { NextRequest, NextResponse } from "next/server";
import { getSlotsHistory } from "../../../../lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get('address') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');
        const poolIdParam = searchParams.get('poolId');
        const poolId = poolIdParam ? parseInt(poolIdParam) : undefined;

        const history = await getSlotsHistory(address, Math.min(limit, 100), poolId);

        return NextResponse.json({
            success: true,
            history: history.map((spin: any) => ({
                id: spin.id,
                player: spin.player_address, // Alias for frontend compatibility
                playerAddress: spin.player_address,
                betAmount: spin.bet_amount,
                payout: spin.payout,
                multiplier: spin.multiplier,
                symbols: spin.symbols,
                result: spin.symbols ? spin.symbols.split(',').map(Number) : [],
                isJackpot: spin.is_jackpot === 1,
                txHash: spin.tx_hash,
                seed: spin.seed,
                poolId: spin.pool_id,
                poolName: spin.pool_name,
                timestamp: spin.timestamp,
                playerName: spin.player_name || `Spinner ${(spin.player_address || '').slice(0, 6)}`,
                playerAvatar: spin.player_avatar || 0
            }))
        });
    } catch (error) {
        console.error('Error fetching slots history:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
    }
}
