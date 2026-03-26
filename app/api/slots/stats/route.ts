// app/api/slots/stats/route.ts
// API for fetching slots statistics (admin dashboard)
import { NextResponse } from "next/server";
import { getSlotsStats } from "../../../../lib/db";

export async function GET() {
    try {
        const stats = await getSlotsStats();

        return NextResponse.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching slots stats:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
    }
}
