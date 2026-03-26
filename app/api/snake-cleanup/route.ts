// app/api/snake-cleanup/route.ts
// Cleanup old rate_limit_logs and game_sessions to prevent DB bloat.
// Should be called periodically (e.g., Vercel Cron or manual).

import { NextRequest, NextResponse } from "next/server";
import { db, initializeDatabase, getConfig } from "../../../lib/db";

const CLEANUP_SECRET = process.env.CLEANUP_SECRET || process.env.SIGNER_PRIVATE_KEY;

// 🔒 FIX: If no secret is configured, all requests must be admin-authenticated

export async function POST(req: NextRequest) {
    try {
        // Auth: require secret token
        const auth = req.headers.get('authorization');
        if (!CLEANUP_SECRET || auth !== `Bearer ${CLEANUP_SECRET}`) {
            // Also check if admin wallet
            const body = await req.json().catch(() => ({}));
            if (!body.adminAddress) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // Verify admin
            const adminCheck = await getConfig('ADMIN_WALLET');
            if (!adminCheck || adminCheck.toLowerCase() !== body.adminAddress.toLowerCase()) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        await initializeDatabase();
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

        // Clean rate limit logs older than 24h
        const rateLimitResult = await db.execute({
            sql: `DELETE FROM rate_limit_logs WHERE timestamp < ?`,
            args: [oneDayAgo]
        });

        // Clean claimed sessions older than 7 days
        const sessionResult = await db.execute({
            sql: `DELETE FROM game_sessions WHERE created_at < ? AND claimed = 1`,
            args: [oneWeekAgo]
        });

        // Clean unclaimed (abandoned) sessions older than 24h
        const abandonedResult = await db.execute({
            sql: `DELETE FROM game_sessions WHERE created_at < ? AND claimed = 0`,
            args: [oneDayAgo]
        });

        const summary = {
            rateLimitLogsDeleted: rateLimitResult.rowsAffected,
            claimedSessionsDeleted: sessionResult.rowsAffected,
            abandonedSessionsDeleted: abandonedResult.rowsAffected,
            timestamp: new Date().toISOString()
        };

        console.log('[CLEANUP]', summary);
        return NextResponse.json({ success: true, ...summary });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
