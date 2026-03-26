// app/api/hub/bookmarks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { toggleBookmark, getUserBookmarkIds } from '@/lib/db';

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address') || '';
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
    const ids = await getUserBookmarkIds(address);
    return NextResponse.json({ bookmarks: ids });
}

export async function POST(req: NextRequest) {
    try {
        const { postId, address } = await req.json();
        if (!postId || !address) return NextResponse.json({ error: 'postId and address required' }, { status: 400 });
        const bookmarked = await toggleBookmark(Number(postId), address);
        return NextResponse.json({ success: true, bookmarked });
    } catch (error) {
        console.error('Bookmark error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
