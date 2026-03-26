import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

export async function GET(request: Request) {
    try {
        await initializeDatabase();
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address')?.toLowerCase();

        if (!address) {
            return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
        }

        const limit = Number(searchParams.get('limit') || '30');

        // Fetch notifications and join with actor profile to get name/avatar
        // Also fetch the post thumbnail if applicable
        const sql = `
            SELECT 
                n.*, 
                hp.username as actor_name, 
                hp.avatar_url as actor_avatar,
                p.thumb_url as post_thumb,
                p.media_url as post_media
            FROM hub_notifications n
            LEFT JOIN hub_profiles hp ON LOWER(n.actor_address) = LOWER(hp.address)
            LEFT JOIN hub_posts p ON n.post_id = p.id
            WHERE LOWER(n.user_address) = ?
            ORDER BY n.created_at DESC
            LIMIT ?
        `;

        const result = await db.execute({
            sql,
            args: [address, limit]
        });

        // Count unread
        const unreadRes = await db.execute({
            sql: `SELECT COUNT(*) as unread FROM hub_notifications WHERE LOWER(user_address) = ? AND read_status = 0`,
            args: [address]
        });

        const unreadCount = Number(unreadRes.rows[0]?.unread || 0);

        return NextResponse.json({
            success: true,
            notifications: result.rows,
            unreadCount
        });
    } catch (error: any) {
        console.error('Fetch notifications error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await initializeDatabase();
        const { address, markAll, notificationIds } = await request.json();

        if (!address) {
            return NextResponse.json({ error: 'Missing address' }, { status: 400 });
        }

        if (markAll) {
            await db.execute({
                sql: `UPDATE hub_notifications SET read_status = 1 WHERE LOWER(user_address) = ? AND read_status = 0`,
                args: [address.toLowerCase()]
            });
        } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
            // Update specific ids (SQLite driver array logic workaround)
            const placeholders = notificationIds.map(() => '?').join(',');
            await db.execute({
                sql: `UPDATE hub_notifications SET read_status = 1 WHERE LOWER(user_address) = ? AND id IN (${placeholders})`,
                args: [address.toLowerCase(), ...notificationIds]
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update notifications error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
