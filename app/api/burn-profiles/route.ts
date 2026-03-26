import { NextResponse } from 'next/server';
import { getBurnProfileByAddress, upsertBurnProfile } from '../../../lib/db';

// GET /api/burn-profiles?address=0x... - Get profile by address
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
        }

        const profile = await getBurnProfileByAddress(address);

        if (profile) {
            return NextResponse.json({
                success: true,
                profile: {
                    address: profile.address,
                    name: profile.name || `Donor ${String(profile.address).slice(0, 6)}`,
                    avatar: Number(profile.avatar) || 0,
                    telegram: profile.telegram || '',
                    twitter: profile.twitter || '',
                    editCount: Number(profile.edit_count) || 0
                }
            });
        } else {
            // Return default profile structure
            return NextResponse.json({
                success: true,
                profile: null,
                default: {
                    address: address.toLowerCase(),
                    name: `Donor ${address.slice(0, 6)}`,
                    avatar: Math.floor(Math.random() * 8),
                    editCount: 0
                }
            });
        }
    } catch (error) {
        console.error('Failed to read burn profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to read profile' }, { status: 500 });
    }
}

// POST /api/burn-profiles - Create or update profile
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, name, avatar, telegram, twitter } = body;

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
        }

        // Validate avatar (0-7)
        const validatedAvatar = typeof avatar === 'number' && avatar >= 0 && avatar <= 7 ? avatar : 0;

        const result = await upsertBurnProfile(
            address,
            name || `Donor ${address.slice(0, 6)}`,
            validatedAvatar,
            telegram,
            twitter
        );

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                editCount: result.editCount
            }, { status: 403 });
        }

        // Format profile response
        const profile = result.profile as { address: string; name: string; avatar: number; telegram?: string; twitter?: string; edit_count: number };

        return NextResponse.json({
            success: true,
            profile: {
                address: profile.address,
                name: profile.name,
                avatar: profile.avatar,
                telegram: profile.telegram || '',
                twitter: profile.twitter || '',
                editCount: Number(profile.edit_count) || result.editCount
            },
            editCount: result.editCount,
            editsRemaining: 3 - result.editCount
        });
    } catch (error) {
        console.error('Failed to save burn profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 });
    }
}
