// app/api/hub/badges/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserBadges, checkAndAwardBadges, getAllBadgeDefinitions } from '@/lib/db';

// GET: get badges for a user or all badge definitions
export async function GET(req: NextRequest) {
    try {
        const address = req.nextUrl.searchParams.get('address');
        const definitions = req.nextUrl.searchParams.get('definitions');

        if (definitions === 'true') {
            const defs = await getAllBadgeDefinitions();
            return NextResponse.json({ badges: defs });
        }

        if (!address) {
            return NextResponse.json({ error: 'address required' }, { status: 400 });
        }

        // Check and award any new badges
        await checkAndAwardBadges(address);
        const badges = await getUserBadges(address);
        return NextResponse.json({ badges });
    } catch (error) {
        console.error('Badges fetch error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
