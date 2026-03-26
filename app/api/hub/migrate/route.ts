// app/api/hub/migrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHubPost, getHubPostCount, upsertHubProfile, markAllPostsAsMigrated } from '@/lib/db';

const ADMIN_WALLET = '0x92809f2837f708163d375960063c8a3156fceacb';

// POST: run migration (import Cloudinary assets)
export async function POST(req: NextRequest) {
    try {
        const existingCount = await getHubPostCount(true);
        if (existingCount > 0) {
            return NextResponse.json({ error: 'Migration already done. Posts exist.', count: existingCount }, { status: 400 });
        }
        await upsertHubProfile(ADMIN_WALLET, 'BanmaoCat 🐱', '', 'Official Banmao Cat collection');
        const res = await fetch(`${req.nextUrl.origin}/api/collection?folder=banmao`);
        const data = await res.json();
        if (!data.images || data.images.length === 0) {
            return NextResponse.json({ error: 'No images found to migrate' }, { status: 404 });
        }
        let migrated = 0;
        for (const img of data.images) {
            if (img.folder?.endsWith('/a_prompt')) continue;
            const isVideo = img.resource_type === 'video';
            const mediaUrl = img.secure_url;
            let thumbUrl = mediaUrl;
            if (!isVideo) thumbUrl = mediaUrl.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto/');
            else thumbUrl = mediaUrl.replace(/\.\w+$/, '.jpg').replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto,so_0/');
            const folderName = img.folder?.split('/').pop() || '';
            const hashtag = folderName ? `#${folderName}` : '';
            const name = img.public_id?.split('/').pop()?.replace(/_/g, ' ') || '';
            await createHubPost(ADMIN_WALLET, mediaUrl, thumbUrl, isVideo ? 'video' : 'image', name, hashtag);
            migrated++;
        }
        // Mark all imported as migrated
        await markAllPostsAsMigrated();
        return NextResponse.json({ success: true, migrated });
    } catch (error) {
        console.error('Hub migration error:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}

// PUT: mark all existing posts as migrated (cleanup)
export async function PUT() {
    try {
        await markAllPostsAsMigrated();
        return NextResponse.json({ success: true, message: 'All existing posts marked as migrated' });
    } catch (error) {
        console.error('Mark migrated error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
