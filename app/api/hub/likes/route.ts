// app/api/hub/likes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { toggleHubLike, getHubLikers } from '@/lib/db';

// GET: list who liked a post
export async function GET(req: NextRequest) {
    const postId = Number(req.nextUrl.searchParams.get('postId') || '0');
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });
    const likers = await getHubLikers(postId);
    return NextResponse.json({ likers });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { postId, address } = body;
        if (!postId || !address) return NextResponse.json({ error: 'postId and address required' }, { status: 400 });

        const liked = await toggleHubLike(Number(postId), address);
        return NextResponse.json({ success: true, liked });
    } catch (error) {
        console.error('Hub like error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
