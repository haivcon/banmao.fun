// app/api/airdrop-records/route.ts
// Airdrop leaderboard & history API
import { NextRequest, NextResponse } from "next/server";
import {
    insertAirdropRecord,
    upsertAirdropProfile,
    getAirdropLeaderboard,
    getAirdropHistory,
    getAirdropStats
} from "../../../lib/db";

// GET: Fetch leaderboard, history, or stats
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "leaderboard";

        if (type === "leaderboard") {
            const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
            const offset = parseInt(searchParams.get("offset") || "0");
            const rows = await getAirdropLeaderboard(limit, offset);
            return NextResponse.json({ success: true, data: rows });
        }

        if (type === "history") {
            const address = searchParams.get("address");
            if (!address) {
                return NextResponse.json({ success: false, error: "address required" }, { status: 400 });
            }
            const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
            const rows = await getAirdropHistory(address, limit);
            return NextResponse.json({ success: true, data: rows });
        }

        if (type === "stats") {
            const stats = await getAirdropStats();
            return NextResponse.json({ success: true, data: stats });
        }

        return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    } catch (error) {
        console.error("[Airdrop Records] GET error:", error);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}

// POST: Save airdrop record after successful execution
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { txHashes, sender, tokenAddress, tokenSymbol, recipientCount, totalAmount, mode, chain, successCount, failedCount } = body;

        if (!sender || !txHashes?.length || !totalAmount) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // Insert each txHash as a separate record
        let inserted = 0;
        for (const txHash of txHashes) {
            const result = await insertAirdropRecord(
                txHash,
                sender,
                tokenAddress || "",
                tokenSymbol || "BANMAO",
                recipientCount || 0,
                totalAmount,
                String(mode || "batch"),
                chain || "196",
                successCount || 0,
                failedCount || 0
            );
            if (result.success) inserted++;
        }

        // Update profile aggregates
        await upsertAirdropProfile(
            sender,
            totalAmount,
            recipientCount || 0,
            txHashes.length
        );

        return NextResponse.json({ success: true, inserted });
    } catch (error) {
        console.error("[Airdrop Records] POST error:", error);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
