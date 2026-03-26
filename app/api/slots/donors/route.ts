// app/api/slots/donors/route.ts
// API endpoints for SLOTS donor leaderboard (separate from generic donors)
import { NextRequest, NextResponse } from "next/server";
import {
    getAllSlotsDonors,
    getSlotsDonorByAddress,
    getDonorBadge,
    checkRateLimitDB
} from "../../../../lib/db";

// GET - Fetch slots donor leaderboard
export async function GET() {
    try {
        const rows = await getAllSlotsDonors(); // No limit - show all donors

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

        return NextResponse.json({ success: true, leaderboard });
    } catch (error) {
        console.error('Error reading slots donor leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to read leaderboard' }, { status: 500 });
    }
}
