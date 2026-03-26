// app/api/hub/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addHubComment, addHubCommentReply, deleteHubComment, toggleCommentLike, getCommentLikedByUser } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { postId, address, text, parentId, action } = body;

        // Comment like toggle
        if (action === 'like_comment') {
            if (!body.commentId || !address) return NextResponse.json({ error: 'commentId and address required' }, { status: 400 });
            const liked = await toggleCommentLike(Number(body.commentId), address);
            return NextResponse.json({ success: true, liked });
        }

        // Get which comments user liked (for rendering)
        if (action === 'get_liked') {
            if (!postId || !address) return NextResponse.json({ error: 'postId and address required' }, { status: 400 });
            const likedIds = await getCommentLikedByUser(Number(postId), address);
            return NextResponse.json({ likedIds });
        }

        // Add comment or reply
        if (!postId || !address || !text) return NextResponse.json({ error: 'postId, address, and text required' }, { status: 400 });
        const sanitized = text.trim().slice(0, 500);
        if (!sanitized) return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });

        if (parentId) {
            await addHubCommentReply(Number(postId), address, sanitized, Number(parentId));
        } else {
            await addHubComment(Number(postId), address, sanitized);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Hub comment error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const commentId = Number(req.nextUrl.searchParams.get('id'));
        const address = req.nextUrl.searchParams.get('address');
        if (!commentId || !address) return NextResponse.json({ error: 'id and address required' }, { status: 400 });

        const deleted = await deleteHubComment(commentId, address);
        return NextResponse.json({ success: deleted });
    } catch (error) {
        console.error('Hub comment delete error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
