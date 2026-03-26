// app/api/hub/reactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { toggleReaction, getPostReactions, getBulkReactions } from '@/lib/db';

// GET: get reaction counts for one or many posts
export async function GET(req: NextRequest) {
    try {
        const postId = req.nextUrl.searchParams.get('postId');
        const postIds = req.nextUrl.searchParams.get('postIds'); // comma-separated

        if (postIds) {
            const ids = postIds.split(',').map(Number).filter(Boolean);
            const reactions = await getBulkReactions(ids);
            return NextResponse.json({ reactions });
        }

        if (postId) {
            const reactions = await getPostReactions(Number(postId));
            return NextResponse.json({ reactions });
        }

        return NextResponse.json({ error: 'postId or postIds required' }, { status: 400 });
    } catch (error) {
        console.error('Reactions fetch error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST: toggle a reaction
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { postId, address, emoji } = body;

        if (!postId || !address || !emoji) {
            return NextResponse.json({ error: 'postId, address, emoji required' }, { status: 400 });
        }

        const result = await toggleReaction(Number(postId), address, emoji);
        const counts = await getPostReactions(Number(postId));

        return NextResponse.json({ success: true, ...result, counts });
    } catch (error) {
        console.error('Reaction toggle error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
