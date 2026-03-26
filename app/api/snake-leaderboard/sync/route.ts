// app/api/snake-leaderboard/sync/route.ts
// Manual sync/fix for player claim data
import { NextRequest, NextResponse } from "next/server";
import { db, initializeDatabase } from "../../../../lib/db";

// POST - Update player claim data manually
// Usage: POST with { address, claimCount, totalClaimed, highestClaim }
// Values should be from blockchain explorer (in wei, e.g., "230000000000000000000" for 230 tokens)
export async function POST(req: NextRequest) {
    try {
        await initializeDatabase();

        const { address, claimCount, totalClaimed, highestClaim } = await req.json();

        if (!address) {
            return NextResponse.json({
                success: false,
                error: "Provide 'address' parameter"
            }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        // Get current data
        const currentData = await db.execute({
            sql: `SELECT total_claimed, highest_claim, claim_count FROM players WHERE address = ?`,
            args: [normalizedAddress]
        });

        if (currentData.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Player not found in database"
            }, { status: 404 });
        }

        const before = {
            claim_count: currentData.rows[0].claim_count,
            total_claimed: currentData.rows[0].total_claimed,
            highest_claim: currentData.rows[0].highest_claim,
        };

        // Build update query dynamically based on provided fields
        const updates: string[] = [];
        const args: any[] = [];

        if (claimCount !== undefined) {
            updates.push('claim_count = ?');
            args.push(claimCount);
        }
        if (totalClaimed !== undefined) {
            updates.push('total_claimed = ?');
            args.push(totalClaimed);
        }
        if (highestClaim !== undefined) {
            updates.push('highest_claim = ?');
            args.push(highestClaim);
        }

        if (updates.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Provide at least one of: claimCount, totalClaimed, highestClaim"
            }, { status: 400 });
        }

        args.push(normalizedAddress);

        await db.execute({
            sql: `UPDATE players SET ${updates.join(', ')} WHERE address = ?`,
            args
        });

        // Get updated data
        const afterData = await db.execute({
            sql: `SELECT total_claimed, highest_claim, claim_count FROM players WHERE address = ?`,
            args: [normalizedAddress]
        });

        return NextResponse.json({
            success: true,
            message: `Updated player ${normalizedAddress}`,
            before,
            after: {
                claim_count: afterData.rows[0].claim_count,
                total_claimed: afterData.rows[0].total_claimed,
                highest_claim: afterData.rows[0].highest_claim,
            }
        });

    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Sync failed"
        }, { status: 500 });
    }
}

// GET - View current player data
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const address = url.searchParams.get("address");

    if (!address) {
        return NextResponse.json({
            success: false,
            error: "Provide 'address' query parameter"
        }, { status: 400 });
    }

    try {
        await initializeDatabase();

        const normalizedAddress = address.toLowerCase();

        const currentData = await db.execute({
            sql: `SELECT * FROM players WHERE address = ?`,
            args: [normalizedAddress]
        });

        if (currentData.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Player not found"
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            player: currentData.rows[0]
        });

    } catch (error) {
        console.error("Get error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed"
        }, { status: 500 });
    }
}
