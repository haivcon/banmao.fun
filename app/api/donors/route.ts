// app/api/donors/route.ts
// API endpoints for donor leaderboard and profile management
import { NextRequest, NextResponse } from "next/server";
import {
    getAllDonors,
    getDonorByAddress,
    updateDonorProfile,
    getDonorBadge,
    checkRateLimitDB
} from "../../../lib/db";

interface DonorRow {
    address: string;
    name: string;
    avatar: number;
    total_donated: string;
    donation_count: number;
    first_donation: number;
    last_donation: number;
    telegram: string | null;
    twitter: string | null;
    edit_count: number;
}

// Rate limiting is now database-backed (imported from db.ts)

// GET - Fetch donor leaderboard
export async function GET() {
    try {
        const rows = await getAllDonors(); // No limit - show all donors

        const leaderboard = rows.map((row: any) => {
            const badge = getDonorBadge(row.total_donated || '0');
            return {
                address: row.address,
                name: row.name || '',
                avatar: row.avatar || 0,
                totalDonated: row.total_donated || '0',
                donationCount: row.donation_count || 0,
                firstDonation: row.first_donation || 0,
                lastDonation: row.last_donation || 0,
                telegram: row.telegram || undefined,
                twitter: row.twitter || undefined,
                editCount: row.edit_count || 0,
                badge: badge
            };
        });

        const response = NextResponse.json({ success: true, leaderboard });
        response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        return response;
    } catch (error) {
        console.error('Error reading donor leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to read leaderboard' }, { status: 500 });
    }
}

// POST - Update donor profile (requires wallet signature for verification)
export async function POST(req: NextRequest) {
    try {
        const { address, name, avatar, telegram, twitter, signature, message } = await req.json();

        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
        }

        // SECURITY: Verify wallet signature to prove ownership
        if (!signature || !message) {
            return NextResponse.json({
                success: false,
                error: 'Signature required to update profile. Please sign the message with your wallet.'
            }, { status: 401 });
        }

        // Verify the message is recent (within 5 minutes) to prevent replay attacks
        try {
            const messageData = JSON.parse(message);
            const timestamp = messageData.timestamp;
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            if (!timestamp || Math.abs(now - timestamp) > fiveMinutes) {
                return NextResponse.json({
                    success: false,
                    error: 'Signature expired. Please sign again.'
                }, { status: 401 });
            }
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Invalid message format'
            }, { status: 400 });
        }
        // Verify signature matches the address using viem
        const { verifyMessage } = await import('viem');
        try {
            const isValid = await verifyMessage({
                address: address as `0x${string}`,
                message: message,
                signature: signature as `0x${string}`
            });
            if (!isValid) {
                return NextResponse.json({
                    success: false,
                    error: 'Signature verification failed. Make sure you signed with the correct wallet.'
                }, { status: 403 });
            }
        } catch (verifyError) {
            console.error('Signature verification error:', verifyError);
            return NextResponse.json({
                success: false,
                error: 'Invalid signature format'
            }, { status: 400 });
        }

        // Database-backed rate limiting
        const rateLimit = await checkRateLimitDB(
            `donor-profile:${address.toLowerCase()}`,
            60000, // 1 minute window
            30     // Max 30 requests per minute
        );
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
        }

        // Check if user is a donor
        const donor = await getDonorByAddress(address);
        if (!donor) {
            return NextResponse.json({
                success: false,
                error: 'Not a donor. Donate $BANMAO to the contract first.'
            }, { status: 403 });
        }

        // Update profile
        const result = await updateDonorProfile(
            address,
            name,
            typeof avatar === 'number' ? avatar : undefined,
            telegram,
            twitter
        );

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                editCount: result.editCount
            }, { status: 400 });
        }

        // Fetch updated donor data
        const updatedDonor = await getDonorByAddress(address);
        const badge = getDonorBadge(String(updatedDonor?.total_donated || '0'));

        return NextResponse.json({
            success: true,
            editCount: result.editCount,
            donor: {
                address: updatedDonor?.address,
                name: updatedDonor?.name || '',
                avatar: updatedDonor?.avatar || 0,
                totalDonated: updatedDonor?.total_donated || '0',
                donationCount: updatedDonor?.donation_count || 0,
                telegram: updatedDonor?.telegram || undefined,
                twitter: updatedDonor?.twitter || undefined,
                badge: badge
            }
        });
    } catch (error) {
        console.error('Error updating donor profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }
}
