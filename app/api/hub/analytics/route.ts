// app/api/hub/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const address = req.nextUrl.searchParams.get('address');
        const period = req.nextUrl.searchParams.get('period') || '7d';
        if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
        await initializeDatabase();

        const addr = address.toLowerCase();
        const now = Date.now();
        const periodMs = period === '7d' ? 7 * 86400000 : period === '30d' ? 30 * 86400000 : now;
        const since = now - periodMs;

        // All queries wrapped in try/catch for missing tables
        let totalPosts = 0, totalLikes = 0, totalComments = 0, totalTips = '0', followerCount = 0;
        const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];

        try {
            const r = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_posts WHERE LOWER(author_address) = ? AND created_at >= ?`, args: [addr, since] });
            totalPosts = Number(r.rows[0]?.cnt || 0);
        } catch { }

        try {
            const r = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_likes WHERE post_id IN (SELECT id FROM hub_posts WHERE LOWER(author_address) = ?) AND created_at >= ?`, args: [addr, since] });
            totalLikes = Number(r.rows[0]?.cnt || 0);
        } catch { }

        try {
            const r = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_comments WHERE post_id IN (SELECT id FROM hub_posts WHERE LOWER(author_address) = ?) AND created_at >= ?`, args: [addr, since] });
            totalComments = Number(r.rows[0]?.cnt || 0);
        } catch { }

        try {
            const r = await db.execute({ sql: `SELECT COALESCE(SUM(amount), 0) as total FROM hub_tips WHERE LOWER(creator_address) = ? AND created_at >= ?`, args: [addr, since] });
            totalTips = String(r.rows[0]?.total || '0');
        } catch { }

        try {
            const r = await db.execute({ sql: `SELECT COUNT(DISTINCT user_address) as cnt FROM hub_likes WHERE post_id IN (SELECT id FROM hub_posts WHERE LOWER(author_address) = ?)`, args: [addr] });
            followerCount = Number(r.rows[0]?.cnt || 0);
        } catch { }

        // Weekly activity: posts by day of week in last 7 days
        try {
            const sevenDaysAgo = now - 7 * 86400000;
            const r = await db.execute({ sql: `SELECT created_at FROM hub_posts WHERE LOWER(author_address) = ? AND created_at >= ?`, args: [addr, sevenDaysAgo] });
            for (const row of r.rows) {
                const d = new Date(Number(row.created_at));
                const dayIdx = (d.getDay() + 6) % 7; // Mon=0, Sun=6
                weeklyActivity[dayIdx]++;
            }
        } catch { }

        const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts) * 100 : 0;

        return NextResponse.json({
            totalPosts,
            totalLikes,
            totalComments,
            totalTips,
            topPost: null,
            weeklyActivity,
            followerCount,
            engagementRate: Math.round(engagementRate * 10) / 10,
        });
    } catch (error) {
        console.error('Analytics GET error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
