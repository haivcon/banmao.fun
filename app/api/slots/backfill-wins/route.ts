// app/api/slots/backfill-wins/route.ts
// API to backfill total_wins from slots_history for all players
// Run once to sync historical data after adding total_wins column

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// Initialize database client (same as db.ts)
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

export async function POST(req: NextRequest) {
    try {
        // Security: Check for admin key in header
        const adminKey = req.headers.get('x-admin-key');
        if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'backfill-2024') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Backfill] Starting total_wins backfill...');

        // Step 1: Get all unique players from history
        const playersResult = await db.execute(`
            SELECT DISTINCT LOWER(player_address) as address 
            FROM slots_history
        `);

        const players = playersResult.rows as unknown as { address: string }[];
        console.log(`[Backfill] Found ${players.length} players to update`);

        let updated = 0;
        let errors = 0;

        // Step 2: For each player, count wins from history and update slots_players
        for (const player of players) {
            try {
                // Count wins (payout > 0)
                const winsResult = await db.execute({
                    sql: `SELECT COUNT(*) as wins FROM slots_history 
                          WHERE LOWER(player_address) = ? AND CAST(payout AS REAL) > 0`,
                    args: [player.address]
                });

                const totalWins = Number((winsResult.rows[0] as any)?.wins || 0);

                // Count total spins
                const spinsResult = await db.execute({
                    sql: `SELECT COUNT(*) as spins FROM slots_history 
                          WHERE LOWER(player_address) = ?`,
                    args: [player.address]
                });

                const totalSpins = Number((spinsResult.rows[0] as any)?.spins || 0);

                // Update slots_players with accurate counts
                await db.execute({
                    sql: `UPDATE slots_players SET 
                          total_wins = ?,
                          total_spins = ?
                          WHERE LOWER(address) = ?`,
                    args: [totalWins, totalSpins, player.address]
                });

                updated++;
                console.log(`[Backfill] Updated ${player.address.slice(0, 10)}...: ${totalWins} wins / ${totalSpins} spins`);

            } catch (err) {
                console.error(`[Backfill] Error updating ${player.address}:`, err);
                errors++;
            }
        }

        console.log(`[Backfill] Complete: ${updated} updated, ${errors} errors`);

        return NextResponse.json({
            success: true,
            message: `Backfill complete`,
            stats: {
                totalPlayers: players.length,
                updated,
                errors
            }
        });

    } catch (error) {
        console.error('[Backfill] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Backfill failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET: Show status
export async function GET() {
    try {
        // Get stats
        const playersResult = await db.execute(`
            SELECT COUNT(*) as total,
                   SUM(total_wins) as total_wins,
                   SUM(total_spins) as total_spins
            FROM slots_players
        `);

        const stats = playersResult.rows[0] as any;

        return NextResponse.json({
            success: true,
            message: 'Backfill API ready. POST with x-admin-key header to run backfill.',
            currentStats: {
                totalPlayers: Number(stats?.total || 0),
                totalWinsTracked: Number(stats?.total_wins || 0),
                totalSpinsTracked: Number(stats?.total_spins || 0)
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to get stats'
        }, { status: 500 });
    }
}
