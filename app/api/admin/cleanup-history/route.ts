// app/api/admin/cleanup-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cleanupOldSlotsHistory, cleanupRateLimits } from "../../../../lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30');
        const key = searchParams.get('key');

        // Auth check: Check for CRON_SECRET header (Vercel Cron) or key param
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        const admKey = process.env.ADM_KEY; // Alternative simple key

        const isAuthorized =
            (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
            (admKey && key === admKey) ||
            process.env.NODE_ENV === 'development'; // Allow in dev without key

        if (!isAuthorized) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const deletedHistory = await cleanupOldSlotsHistory(days);
        const deletedRateLimits = await cleanupRateLimits();

        return NextResponse.json({
            success: true,
            message: `Cleanup complete`,
            deletedHistory,
            deletedRateLimits,
            daysKept: days
        });
    } catch (error) {
        console.error('Cleanup failed:', error);
        return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
    }
}
