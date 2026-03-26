// app/api/donors/add/route.ts
// Manually add donors to the database
// SECURITY: Requires admin API key authentication
import { NextRequest, NextResponse } from "next/server";
import { upsertDonor, getDonorBadge } from "../../../../lib/db";

// Admin authentication check
function verifyAdminAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (!apiKey) {
        console.error('ADMIN_API_KEY not set in environment');
        return false;
    }

    // Support both "Bearer <key>" and just "<key>"
    const providedKey = authHeader?.replace('Bearer ', '').trim();
    return providedKey === apiKey;
}

interface DonorInput {
    address: string;
    totalDonated: string;
    donationCount?: number;
    firstDonation?: number;
    lastDonation?: number;
}

export async function POST(request: NextRequest) {
    // SECURITY: Verify admin authentication
    if (!verifyAdminAuth(request)) {
        return NextResponse.json({
            success: false,
            error: 'Unauthorized. Admin API key required.'
        }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Accept single donor or array of donors
        let donors: DonorInput[] = [];

        if (body.donors && Array.isArray(body.donors)) {
            donors = body.donors;
        } else if (body.address && body.totalDonated) {
            donors = [body];
        } else {
            return NextResponse.json({
                success: false,
                error: "Invalid request. Provide 'donors' array or single donor object with 'address' and 'totalDonated'",
                example: {
                    donors: [
                        {
                            address: "0x...",
                            totalDonated: "1000000000000000000",
                            donationCount: 1
                        }
                    ]
                }
            }, { status: 400 });
        }

        let synced = 0;
        const results: { address: string; success: boolean; badge?: any; error?: string }[] = [];

        for (const donor of donors) {
            if (!donor.address || !donor.totalDonated) {
                results.push({ address: donor.address || 'unknown', success: false, error: 'Missing address or totalDonated' });
                continue;
            }

            try {
                await upsertDonor(
                    donor.address.toLowerCase(),
                    donor.totalDonated,
                    donor.donationCount || 1,
                    donor.firstDonation || Date.now(),
                    donor.lastDonation || Date.now()
                );

                const badge = getDonorBadge(donor.totalDonated);
                results.push({ address: donor.address, success: true, badge });
                synced++;
            } catch (err) {
                results.push({
                    address: donor.address,
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Added ${synced} of ${donors.length} donors`,
            donors: synced,
            results
        });
    } catch (error) {
        console.error("Error adding donors:", error);
        return NextResponse.json({
            success: false,
            error: `Failed to add donors: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: "POST to this endpoint to manually add donors",
        example: {
            method: "POST",
            contentType: "application/json",
            body: {
                donors: [
                    {
                        address: "0x92809f2837f708163d375960063c8a3156fceacb",
                        totalDonated: "1000000000000000000",
                        donationCount: 1
                    }
                ]
            }
        }
    });
}
