// app/api/hub/quests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

const DAILY_QUESTS = [
    { id: 'post_today', title: 'Share a Post', icon: '📸', description: 'Create a post today', target: 1, reward: 20, query: 'posts_today' },
    { id: 'like_3', title: 'Show Love', icon: '❤️', description: 'Like 3 posts', target: 3, reward: 10, query: 'likes_today' },
    { id: 'comment_1', title: 'Join the Chat', icon: '💬', description: 'Leave a comment', target: 1, reward: 15, query: 'comments_today' },
    { id: 'checkin', title: 'Daily Check-in', icon: '📅', description: 'Complete daily check-in', target: 1, reward: 10, query: 'checkin_today' },
];

const WEEKLY_QUESTS = [
    { id: 'post_5_week', title: 'Weekly Creator', icon: '🌟', description: 'Create 5 posts this week', target: 5, reward: 100, query: 'posts_week' },
    { id: 'like_20_week', title: 'Community Champion', icon: '🏅', description: 'Like 20 posts this week', target: 20, reward: 50, query: 'likes_week' },
    { id: 'tip_1_week', title: 'Generous Tipper', icon: '💰', description: 'Send a tip this week', target: 1, reward: 75, query: 'tips_week' },
    { id: 'streak_7', title: '7-Day Streak', icon: '🔥', description: 'Maintain a 7-day check-in streak', target: 7, reward: 200, query: 'streak' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function weekStart() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
    try {
        const address = req.nextUrl.searchParams.get('address');
        if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
        await initializeDatabase();

        const addr = address.toLowerCase();
        const today = todayStr();
        const weekStartDate = weekStart();

        // Gather stats
        const stats: Record<string, number> = {};
        try {
            const r1 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_posts WHERE LOWER(author_address) = ? AND created_at >= ?`, args: [addr, new Date(today).getTime()] });
            stats.posts_today = Number(r1.rows[0]?.cnt || 0);
        } catch { stats.posts_today = 0; }

        try {
            const r2 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_likes WHERE LOWER(user_address) = ? AND created_at >= ?`, args: [addr, new Date(today).getTime()] });
            stats.likes_today = Number(r2.rows[0]?.cnt || 0);
        } catch { stats.likes_today = 0; }

        try {
            const r3 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_comments WHERE LOWER(author_address) = ? AND created_at >= ?`, args: [addr, new Date(today).getTime()] });
            stats.comments_today = Number(r3.rows[0]?.cnt || 0);
        } catch { stats.comments_today = 0; }

        try {
            const r4 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_checkins WHERE LOWER(user_address) = ? AND checkin_date = ?`, args: [addr, today] });
            stats.checkin_today = Number(r4.rows[0]?.cnt || 0);
        } catch { stats.checkin_today = 0; }

        try {
            const r5 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_posts WHERE LOWER(author_address) = ? AND created_at >= ?`, args: [addr, new Date(weekStartDate).getTime()] });
            stats.posts_week = Number(r5.rows[0]?.cnt || 0);
        } catch { stats.posts_week = 0; }

        try {
            const r6 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_likes WHERE LOWER(user_address) = ? AND created_at >= ?`, args: [addr, new Date(weekStartDate).getTime()] });
            stats.likes_week = Number(r6.rows[0]?.cnt || 0);
        } catch { stats.likes_week = 0; }

        try {
            const r7 = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_tips WHERE LOWER(tipper_address) = ? AND created_at >= ?`, args: [addr, new Date(weekStartDate).getTime()] });
            stats.tips_week = Number(r7.rows[0]?.cnt || 0);
        } catch { stats.tips_week = 0; }

        try {
            const r8 = await db.execute({ sql: `SELECT MAX(streak) as max_streak FROM hub_checkins WHERE LOWER(user_address) = ?`, args: [addr] });
            stats.streak = Number(r8.rows[0]?.max_streak || 0);
        } catch { stats.streak = 0; }

        // Build quest responses
        const allQuests = [
            ...DAILY_QUESTS.map(q => ({
                ...q, type: 'daily' as const,
                progress: Math.min(stats[q.query] || 0, q.target),
                completed: (stats[q.query] || 0) >= q.target,
            })),
            ...WEEKLY_QUESTS.map(q => ({
                ...q, type: 'weekly' as const,
                progress: Math.min(stats[q.query] || 0, q.target),
                completed: (stats[q.query] || 0) >= q.target,
            })),
        ];

        return NextResponse.json({ quests: allQuests });
    } catch (error) {
        console.error('Quests GET error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
