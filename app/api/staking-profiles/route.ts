import { NextResponse } from 'next/server';
import { getStakingProfileByAddress, updateStakingProfile } from '../../../lib/db';

export const runtime = 'edge';

// GET /api/staking-profiles?address=0x... - Get profile by address
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
        }

        const profile = await getStakingProfileByAddress(address);

        if (profile) {
            // Map Turso keys (snake_case) to API expected keys (camelCase if needed)
            // But db.ts returns column names which are typically snake_case or whatever defined in table.
            // Our previous JSON was: name, avatar, editCount, telegram, etc.
            // Turso result from `SELECT *` returns snake_case columns if defined that way.
            // In db.ts: name, avatar, telegram, twitter, edit_count, created_at, updated_at

            return NextResponse.json({
                success: true,
                profile: {
                    address: String(profile.address),
                    name: String(profile.name),
                    avatar: Number(profile.avatar),
                    telegram: profile.telegram ? String(profile.telegram) : undefined,
                    twitter: profile.twitter ? String(profile.twitter) : undefined,
                    editCount: Number(profile.edit_count),
                    createdAt: Number(profile.created_at),
                    updatedAt: Number(profile.updated_at)
                }
            });
        } else {
            // Return default profile structure
            return NextResponse.json({
                success: true,
                profile: null,
                default: {
                    address: address.toLowerCase(),
                    name: `Supporter ${address.slice(0, 6)}`,
                    avatar: Math.floor(Math.random() * 20),
                    editCount: 0
                }
            });
        }
    } catch (error) {
        console.error('Failed to read profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to read profile' }, { status: 500 });
    }
}

// POST /api/staking-profiles - Create or update profile
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, name, avatar, telegram, twitter } = body;

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
        }

        const result = await updateStakingProfile(
            address,
            name,
            avatar,
            telegram,
            twitter
        );

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                editCount: result.editCount
            }, { status: 403 }); // 403 Forbidden for limit reached
        }

        // Fetch updated profile to return full object
        const updated = await getStakingProfileByAddress(address);

        const profile = {
            address: String(updated.address),
            name: String(updated.name),
            avatar: Number(updated.avatar),
            telegram: updated.telegram ? String(updated.telegram) : undefined,
            twitter: updated.twitter ? String(updated.twitter) : undefined,
            editCount: Number(updated.edit_count),
            createdAt: Number(updated.created_at),
            updatedAt: Number(updated.updated_at)
        };

        return NextResponse.json({
            success: true,
            profile,
            editCount: profile.editCount,
            editsRemaining: 3 - profile.editCount
        });

    } catch (error) {
        console.error('Failed to save profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 });
    }
}
