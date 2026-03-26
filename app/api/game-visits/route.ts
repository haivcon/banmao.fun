// app/api/game-visits/route.ts
// API for global game visit tracking (synced across all users)

import { NextRequest, NextResponse } from 'next/server';
import { recordGameVisitDB, getGameVisitStatsDB, cleanupOldGameVisits } from '../../../lib/db';

// GET - Fetch visit stats for all games
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const gameIds = searchParams.get('gameIds')?.split(',').filter(Boolean) || [];

        if (gameIds.length === 0) {
            return NextResponse.json({ error: 'Missing gameIds parameter' }, { status: 400 });
        }

        // Cleanup old visits periodically (1% chance per request)
        if (Math.random() < 0.01) {
            cleanupOldGameVisits().catch(console.error);
        }

        const stats = await getGameVisitStatsDB(gameIds);

        // Add cache headers for faster subsequent loads
        // Cache for 10 seconds, revalidate in background
        const response = NextResponse.json({
            success: true,
            stats,
            timestamp: Date.now()
        });

        response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

        return response;
    } catch (error) {
        console.error('GET /api/game-visits error:', error);
        return NextResponse.json({
            error: 'Failed to fetch visit stats',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// POST - Record a new visit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { gameId, visitorId } = body;

        if (!gameId) {
            return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
        }

        // Generate visitor ID from IP if not provided
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const finalVisitorId = visitorId || `ip-${ip}`;

        await recordGameVisitDB(gameId, finalVisitorId);

        return NextResponse.json({
            success: true,
            gameId,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('POST /api/game-visits error:', error);
        return NextResponse.json({
            error: 'Failed to record visit',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
