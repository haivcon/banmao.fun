import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

export async function POST(request: Request) {
    try {
        await initializeDatabase();
        const { follower_address, following_address } = await request.json();

        if (!follower_address || !following_address) {
            return NextResponse.json({ error: 'Missing required addresses' }, { status: 400 });
        }

        if (follower_address.toLowerCase() === following_address.toLowerCase()) {
            return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
        }

        const lowercaseFollower = follower_address.toLowerCase();
        const lowercaseFollowing = following_address.toLowerCase();

        // Check if already following
        const checkResult = await db.execute({
            sql: `SELECT 1 FROM hub_follows WHERE follower_address = ? AND following_address = ?`,
            args: [lowercaseFollower, lowercaseFollowing]
        });

        if (checkResult.rows.length > 0) {
            // Unfollow
            await db.execute({
                sql: `DELETE FROM hub_follows WHERE follower_address = ? AND following_address = ?`,
                args: [lowercaseFollower, lowercaseFollowing]
            });
            return NextResponse.json({ success: true, isFollowing: false });
        } else {
            // Follow
            await db.execute({
                sql: `INSERT INTO hub_follows (follower_address, following_address, created_at) VALUES (?, ?, ?)`,
                args: [lowercaseFollower, lowercaseFollowing, Date.now()]
            });

            // Generate a notification for the person being followed
            await db.execute({
                sql: `INSERT INTO hub_notifications (user_address, actor_address, type, created_at) VALUES (?, ?, ?, ?)`,
                args: [lowercaseFollowing, lowercaseFollower, 'follow', Date.now()]
            });

            return NextResponse.json({ success: true, isFollowing: true });
        }
    } catch (error: any) {
        console.error('Follow error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        await initializeDatabase();
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address')?.toLowerCase();
        const viewerStr = searchParams.get('viewer')?.toLowerCase();

        if (!address) {
            return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
        }

        // Get follower count
        const followersResult = await db.execute({
            sql: `SELECT COUNT(*) as count FROM hub_follows WHERE following_address = ?`,
            args: [address]
        });
        const followers = Number(followersResult.rows[0].count);

        // Get following count
        const followingResult = await db.execute({
            sql: `SELECT COUNT(*) as count FROM hub_follows WHERE follower_address = ?`,
            args: [address]
        });
        const following = Number(followingResult.rows[0].count);

        let isFollowing = false;
        if (viewerStr) {
            const checkRes = await db.execute({
                sql: `SELECT 1 FROM hub_follows WHERE follower_address = ? AND following_address = ?`,
                args: [viewerStr, address]
            });
            isFollowing = checkRes.rows.length > 0;
        }

        return NextResponse.json({
            success: true,
            followers,
            following,
            isFollowing
        });
    } catch (error: any) {
        console.error('Fetch follows error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
