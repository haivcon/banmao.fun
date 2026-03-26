// app/api/hub/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHubPosts, createHubPost, getHubPostCount, getHubLikedPosts, getHubProfile, upsertHubProfile } from '@/lib/db';

export async function GET(req: NextRequest) {
    const limit = Number(req.nextUrl.searchParams.get('limit') || '20');
    const offset = Number(req.nextUrl.searchParams.get('offset') || '0');
    const author = req.nextUrl.searchParams.get('author') || undefined;
    const viewer = req.nextUrl.searchParams.get('viewer') || undefined;
    const sort = (req.nextUrl.searchParams.get('sort') || 'newest') as 'newest' | 'trending' | 'top_tipped' | 'following';

    // Call getHubPosts with the viewer param required for tracking follows
    const posts = await getHubPosts(limit, offset, author, sort, false, viewer);
    const total = await getHubPostCount();

    // If viewer is provided, mark which posts they liked
    let likedPostIds: number[] = [];
    if (viewer) {
        likedPostIds = await getHubLikedPosts(viewer);
    }

    const postsWithLiked = posts.map(p => ({
        ...p,
        liked: likedPostIds.includes(Number(p.id)),
    }));

    return NextResponse.json({ posts: postsWithLiked, total });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { authorAddress, mediaUrl, thumbUrl, mediaType, caption, hashtags } = body;

        if (!authorAddress || !mediaUrl) {
            return NextResponse.json({ error: 'authorAddress and mediaUrl required' }, { status: 400 });
        }

        // Auto-create profile if not exists
        const profile = await getHubProfile(authorAddress);
        if (!profile) {
            const shortAddr = authorAddress.slice(0, 6) + '...' + authorAddress.slice(-4);
            await upsertHubProfile(authorAddress, shortAddr);
        }

        const postId = await createHubPost(
            authorAddress,
            mediaUrl,
            thumbUrl || '',
            mediaType || 'image',
            caption || '',
            hashtags || ''
        );

        return NextResponse.json({ success: true, postId: Number(postId) });
    } catch (error) {
        console.error('Hub post create error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
