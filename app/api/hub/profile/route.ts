// app/api/hub/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHubProfile, upsertHubProfile, getHubProfileByUsername } from '@/lib/db';

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address');
    const username = req.nextUrl.searchParams.get('username');
    if (!address && !username) return NextResponse.json({ error: 'address or username required' }, { status: 400 });

    const profile = address ? await getHubProfile(address) : await getHubProfileByUsername(username!);
    return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, username, avatarUrl, bio } = body;
        if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

        // Check username uniqueness
        if (username) {
            const existing = await getHubProfileByUsername(username);
            if (existing && String(existing.address).toLowerCase() !== address.toLowerCase()) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
        }

        await upsertHubProfile(address, username, avatarUrl, bio);
        const profile = await getHubProfile(address);
        return NextResponse.json({ success: true, profile });
    } catch (error) {
        console.error('Hub profile error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
