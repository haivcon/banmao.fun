import { NextRequest, NextResponse } from 'next/server';
import { getHubProfile, getHubProfileStats, updateHubProfile } from '@/lib/db';

// GET /api/hub/profiles?address=0x...
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    try {
        const profile = await getHubProfile(address);
        const stats = await getHubProfileStats(address);

        return NextResponse.json({
            ...profile,
            stats
        });
    } catch (error) {
        console.error('Error fetching hub profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT /api/hub/profiles
// Body: { address: string, username?: string, bio?: string, avatar_url?: string, banner_url?: string }
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, username, bio, avatar_url, banner_url } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address required' }, { status: 400 });
        }

        // Validate username (rules: 3-20 chars, alphanumeric + underscores, no spaces)
        if (username) {
            const trimmed = username.trim();
            if (trimmed.length < 3 || trimmed.length > 20) {
                return NextResponse.json({ error: 'Username must be between 3 and 20 characters' }, { status: 400 });
            }
            if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
            }
        }

        if (bio && bio.length > 160) {
            return NextResponse.json({ error: 'Bio must be less than 160 characters' }, { status: 400 });
        }

        // Basic sanity check that URLs look like URLs if provided
        if (avatar_url && !avatar_url.startsWith('http')) {
            return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
        }
        if (banner_url && !banner_url.startsWith('http')) {
            return NextResponse.json({ error: 'Invalid banner URL' }, { status: 400 });
        }

        await updateHubProfile(address, {
            username: username?.trim(),
            bio: bio?.trim(),
            avatar_url,
            banner_url
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating hub profile:', error);
        // Catch SQLite unique constraint violation for duplicated usernames
        if (error?.message?.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
