// app/api/donors/history/route.ts
// Get donation history by address
import { NextRequest, NextResponse } from "next/server";
import { getDonationsByAddress } from "../../../../lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
            return NextResponse.json({ success: false, error: "Invalid address" }, { status: 400 });
        }

        const donations = await getDonationsByAddress(address);

        return NextResponse.json({
            success: true,
            donations: donations.map((d: any) => ({
                txHash: d.tx_hash,
                amount: d.amount,
                timestamp: d.timestamp
            }))
        });

    } catch (error) {
        console.error("History error:", error);
        return NextResponse.json({ success: false, error: "Failed to get donations" }, { status: 500 });
    }
}
