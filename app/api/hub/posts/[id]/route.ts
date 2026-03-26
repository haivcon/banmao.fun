// app/api/hub/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHubPost, deleteHubPost, getHubComments } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const post = await getHubPost(postId);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const comments = await getHubComments(postId);
    return NextResponse.json({ post, comments });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const postId = Number(id);
    const address = req.nextUrl.searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

    const deleted = await deleteHubPost(postId, address);
    return NextResponse.json({ success: deleted });
}
