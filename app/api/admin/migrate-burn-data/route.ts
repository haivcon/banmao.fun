// One-time migration API to sync JSON data to Turso database
// Run this endpoint once to migrate existing data, then delete it
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { insertBurnDonation, isBurnDonationTxUsed, insertBurnHistory, isBurnHistoryTxUsed } from "../../../../lib/db";

// Interfaces for JSON data
interface BurnDonation {
    txHash: string;
    amount: string;
    timestamp: number;
}

interface BurnContributor {
    address: string;
    donations: BurnDonation[];
}

interface BurnData {
    contributors: BurnContributor[];
}

interface BurnHistoryTx {
    txHash: string;
    from: string;
    amount: string;
    timestamp: number;
}

interface BurnHistoryData {
    transactions: BurnHistoryTx[];
}

export async function POST() {
    const results = {
        burnContributors: { migrated: 0, skipped: 0, errors: 0 },
        burnHistory: { migrated: 0, skipped: 0, errors: 0 },
    };

    // 1. Migrate burn-contributors.json to donate_burn table
    try {
        const contributorsPath = path.join(process.cwd(), "data", "burn-contributors.json");
        const content = await fs.readFile(contributorsPath, "utf-8");
        const data: BurnData = JSON.parse(content);

        for (const contributor of data.contributors) {
            for (const donation of contributor.donations) {
                // Check if already exists
                const exists = await isBurnDonationTxUsed(donation.txHash);
                if (exists) {
                    results.burnContributors.skipped++;
                    continue;
                }

                // Insert to Turso
                const result = await insertBurnDonation(
                    donation.txHash,
                    contributor.address,
                    donation.amount,
                    null, // blockNumber not in JSON
                    donation.timestamp
                );

                if (result.success) {
                    results.burnContributors.migrated++;
                } else {
                    results.burnContributors.errors++;
                    console.error(`Failed to migrate ${donation.txHash}:`, result.error);
                }
            }
        }
    } catch (error) {
        console.error("Failed to read burn-contributors.json:", error);
    }

    // 2. Migrate burn-history.json to burn_history table
    try {
        const historyPath = path.join(process.cwd(), "data", "burn-history.json");
        const content = await fs.readFile(historyPath, "utf-8");
        const data: BurnHistoryData = JSON.parse(content);

        for (const tx of data.transactions || []) {
            // Check if already exists
            const exists = await isBurnHistoryTxUsed(tx.txHash);
            if (exists) {
                results.burnHistory.skipped++;
                continue;
            }

            // Insert to Turso
            const result = await insertBurnHistory(
                tx.txHash,
                tx.from,
                tx.amount,
                tx.timestamp
            );

            if (result.success) {
                results.burnHistory.migrated++;
            } else {
                results.burnHistory.errors++;
                console.error(`Failed to migrate burn history ${tx.txHash}:`, result.error);
            }
        }
    } catch (error) {
        // File might not exist, which is fine
        console.log("burn-history.json not found or empty, skipping...");
    }

    return NextResponse.json({
        success: true,
        message: "Migration completed",
        results,
        totalMigrated: results.burnContributors.migrated + results.burnHistory.migrated,
    });
}

export async function GET() {
    return NextResponse.json({
        message: "POST to this endpoint to migrate JSON data to Turso database",
        warning: "This is a one-time migration. Delete this file after use.",
    });
}
