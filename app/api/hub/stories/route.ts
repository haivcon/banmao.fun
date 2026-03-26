// app/api/hub/stories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createStory, getActiveStories, markStoryViewed, deleteExpiredStories, getUserStories } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const viewer = req.nextUrl.searchParams.get('viewer') || undefined;
        const author = req.nextUrl.searchParams.get('author');
        
        // Clean up expired stories on every fetch
        await deleteExpiredStories();

        if (author) {
            const stories = await getUserStories(author);
            return NextResponse.json({ stories });
        }

        const stories = await getActiveStories(viewer);

        // Group stories by author
        const grouped: Record<string, any> = {};
        for (const story of stories) {
            const addr = (story.author_address as string).toLowerCase();
            if (!grouped[addr]) {
                grouped[addr] = {
                    author_address: story.author_address,
                    username: story.username || (story.author_address as string).slice(0, 6) + '...',
                    avatar_url: story.avatar_url || '',
                    stories: [],
                    has_unviewed: false,
                };
            }
            grouped[addr].stories.push(story);
            if (!story.viewed) {
                grouped[addr].has_unviewed = true;
            }
        }

        return NextResponse.json({
            groups: Object.values(grouped),
            total: stories.length,
        });
    } catch (error) {
        console.error('Stories fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { authorAddress, mediaUrl, thumbUrl, mediaType, caption, bgColor } = body;

        if (!authorAddress || !mediaUrl) {
            return NextResponse.json({ error: 'authorAddress and mediaUrl required' }, { status: 400 });
        }

        const storyId = await createStory(authorAddress, mediaUrl, thumbUrl || '', mediaType || 'image', caption || '', bgColor || '#000');
        return NextResponse.json({ success: true, storyId: Number(storyId) });
    } catch (error) {
        console.error('Story create error:', error);
        return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { storyId, viewerAddress } = body;

        if (!storyId || !viewerAddress) {
            return NextResponse.json({ error: 'storyId and viewerAddress required' }, { status: 400 });
        }

        await markStoryViewed(storyId, viewerAddress);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Story view error:', error);
        return NextResponse.json({ error: 'Failed to mark story viewed' }, { status: 500 });
    }
}
