// app/api/snake-claims/route.ts
// Fetch claim history for a specific player
import { NextRequest, NextResponse } from "next/server";
import { db, initializeDatabase } from "../../../lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const player = searchParams.get('player');
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

        if (!player || !player.startsWith('0x')) {
            return NextResponse.json({ error: 'Invalid player address' }, { status: 400 });
        }

        await initializeDatabase();
        const result = await db.execute({
            sql: `SELECT tx_hash, amount, timestamp FROM claim_history 
                  WHERE player = ? 
                  ORDER BY timestamp DESC 
                  LIMIT ?`,
            args: [player.toLowerCase(), limit]
        });

        const claims = result.rows.map((row: any) => ({
            txHash: row.tx_hash,
            amount: row.amount,
            timestamp: row.timestamp
        }));

        return NextResponse.json({ success: true, claims });
    } catch (error) {
        console.error('Error fetching claims:', error);
        return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }
}
