// One-time migration API to sync remaining JSON data to Turso database
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
    migrateStakingProfile,
    insertPlayer,
    getPlayerByAddress,
    upsertDonor,
    insertDonationHistory,
    isDonationTxUsed
} from "../../../../lib/db";

export async function POST() {
    const results = {
        stakingProfiles: { migrated: 0, errors: 0 },
        snakeLeaderboard: { migrated: 0, errors: 0 },
        donations: { migrated: 0, skipped: 0, errors: 0 }
    };

    // 1. Migrate staking-profiles.json
    try {
        const filePath = path.join(process.cwd(), "data", "staking-profiles.json");
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        for (const key in data.profiles) {
            const p = data.profiles[key];
            try {
                await migrateStakingProfile(
                    p.address,
                    p.name,
                    p.avatar,
                    p.telegram,
                    p.twitter,
                    p.editCount || 0,
                    p.createdAt || Date.now(),
                    p.updatedAt || Date.now()
                );
                results.stakingProfiles.migrated++;
            } catch (err) {
                console.error("Failed to migrate staking profile:", p.address, err);
                results.stakingProfiles.errors++;
            }
        }
    } catch (error) {
        console.log("staking-profiles.json not found or empty, skipping...");
    }

    // 2. Migrate snake-leaderboard.json
    try {
        const filePath = path.join(process.cwd(), "data", "snake-leaderboard.json");
        const content = await fs.readFile(filePath, "utf-8");
        const players = JSON.parse(content);

        for (const p of players) {
            try {
                const existing = await getPlayerByAddress(p.address);
                if (!existing) {
                    await insertPlayer(
                        p.address,
                        p.name,
                        p.avatar,
                        p.totalClaimed,
                        p.highestClaim,
                        p.lastClaimTime,
                        p.telegram,
                        p.twitter
                    );
                    results.snakeLeaderboard.migrated++;
                } else {
                    // Already exists, maybe update? For now just skip to adhere to "insert only if new" logic
                    // Or we could update if JSON has newer data. 
                    // Let's assume database is source of truth if exists.
                }
            } catch (err) {
                console.error("Failed to migrate snake player:", p.address, err);
                results.snakeLeaderboard.errors++;
            }
        }
    } catch (error) {
        console.log("snake-leaderboard.json not found or empty, skipping...");
    }

    // 3. Migrate donations.json (General Donations)
    try {
        const filePath = path.join(process.cwd(), "data", "donations.json");
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        for (const d of data.donations) {
            try {
                // Check if tx exists
                if (await isDonationTxUsed(d.txHash)) {
                    results.donations.skipped++;
                    continue;
                }

                // Insert history
                await insertDonationHistory(d.txHash, d.address, d.amount, d.timestamp);

                // Update donor stats (upsert handles incrementing logic? No, upsert sets values)
                // Actually upsertDonor sets fixed values. 
                // We shouldn't blindly overwrite donor stats if DB has more recent data.
                // But if this is legacy data, maybe we should just insert history?
                // `insertDonationHistory` is enough for history.
                // Re-calculating donor stats is complex.
                // Let's just insert history for now.

                results.donations.migrated++;
            } catch (err) {
                console.error("Failed to migrate donation:", d.txHash, err);
                results.donations.errors++;
            }
        }
    } catch (error) {
        console.log("donations.json not found or empty, skipping...");
    }

    return NextResponse.json({
        success: true,
        message: "Migration completed",
        results
    });
}
