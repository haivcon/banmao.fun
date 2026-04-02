// app/api/airdrop-records/route.ts
// Airdrop leaderboard & history API
import { NextRequest, NextResponse } from "next/server";
import {
    insertAirdropRecord,
    upsertAirdropProfile,
    getAirdropLeaderboard,
    getAirdropHistory,
    getAllAirdropHistory,
    getAirdropStats,
    getAirdropAnalytics
} from "../../../lib/db";

// GET: Fetch leaderboard, history, or stats
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "leaderboard";
        const token = searchParams.get("token") || undefined;

        if (type === "leaderboard") {
            const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
            const offset = parseInt(searchParams.get("offset") || "0");
            const rows = await getAirdropLeaderboard(limit, offset, token);
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

        if (type === "all-history") {
            const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
            const rows = await getAllAirdropHistory(limit, token);
            return NextResponse.json({ success: true, data: rows });
        }

        if (type === "stats") {
            const stats = await getAirdropStats(token);
            return NextResponse.json({ success: true, data: stats });
        }

        if (type === "analytics") {
            const analytics = await getAirdropAnalytics(token);
            return NextResponse.json({ success: true, data: analytics });
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
        const { txBreakdown, txHashes, sender, tokenAddress, tokenSymbol, recipientCount, totalAmount, mode, chain, successCount, failedCount } = body;

        if (!sender) {
            return NextResponse.json({ success: false, error: "Missing sender" }, { status: 400 });
        }

        let inserted = 0;
        let totalRecipients = 0;
        let totalTxCount = 0;
        let totalAmountWei = "0";

        if (txBreakdown && Array.isArray(txBreakdown) && txBreakdown.length > 0) {
            // New format: per-TX breakdown with accurate counts
            for (const tx of txBreakdown) {
                const result = await insertAirdropRecord(
                    tx.txHash,
                    sender,
                    tokenAddress || "",
                    tokenSymbol || "BANMAO",
                    tx.recipientCount || 0,
                    tx.totalAmount || "0",
                    String(mode || "batch"),
                    chain || "196",
                    tx.successCount || 0,
                    tx.failedCount || 0
                );
                if (result.success) inserted++;
                totalRecipients += (tx.recipientCount || 0);
            }
            totalTxCount = txBreakdown.length;
            // Sum up all amounts for profile update
            try {
                totalAmountWei = String(txBreakdown.reduce((sum: bigint, tx: any) => sum + BigInt(tx.totalAmount || "0"), BigInt(0)));
            } catch { totalAmountWei = txBreakdown[0]?.totalAmount || "0"; }
        } else if (txHashes && txHashes.length > 0) {
            // Legacy format: same counts for all TX hashes
            for (const txHash of txHashes) {
                const result = await insertAirdropRecord(
                    txHash,
                    sender,
                    tokenAddress || "",
                    tokenSymbol || "BANMAO",
                    recipientCount || 0,
                    totalAmount || "0",
                    String(mode || "batch"),
                    chain || "196",
                    successCount || 0,
                    failedCount || 0
                );
                if (result.success) inserted++;
            }
            totalRecipients = recipientCount || 0;
            totalTxCount = txHashes.length;
            totalAmountWei = totalAmount || "0";
        } else {
            return NextResponse.json({ success: false, error: "No transactions provided" }, { status: 400 });
        }

        // Update profile aggregates
        await upsertAirdropProfile(
            sender,
            totalAmountWei,
            totalRecipients,
            totalTxCount
        );

        return NextResponse.json({ success: true, inserted });
    } catch (error) {
        console.error("[Airdrop Records] POST error:", error);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
