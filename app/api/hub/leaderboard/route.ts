// app/api/hub/leaderboard/route.ts
import { NextResponse } from 'next/server';
import { getHubLeaderboard, getHubRewardPool } from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
    try {
        const [leaderboard, rewardPool] = await Promise.all([
            getHubLeaderboard(50),
            getHubRewardPool()
        ]);

        return NextResponse.json({
            success: true,
            leaderboard,
            rewardPool
        });
    } catch (error: any) {
        console.error('Hub Leaderboard API Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
