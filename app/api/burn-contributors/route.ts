// API endpoint to manage burn contributions - TURSO DATABASE VERSION
// Verifies transactions that sent $BANMAO to community wallet and records in Turso
import { NextRequest, NextResponse } from "next/server";
import {
    getBurnProfileByAddress,
    insertBurnDonation,
    isBurnDonationTxUsed,
    getAllBurnDonations,
    getBurnLeaderboard,
} from "../../../lib/db";

// Contract addresses
const BANMAO_ADDRESS = (process.env.NEXT_PUBLIC_BANMAO || "0x16d91d1615fc55b76d5f92365bd60c069b46ef78").toLowerCase();
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xlayer.tech";

// Community wallet - donations sent here support ecosystem
const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb".toLowerCase();

// Dead wallet addresses - tokens sent here are considered burned
const DEAD_WALLETS = [
    "0x000000000000000000000000000000000000dead",
    "0x0000000000000000000000000000000000000000",
];

// All valid donation destinations (community wallet + dead wallets)
const VALID_DONATION_DESTINATIONS = [COMMUNITY_WALLET, ...DEAD_WALLETS];

// ERC20 Transfer event topic
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Helper: Make RPC call
async function rpcCall(method: string, params: unknown[]) {
    const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
}

// Verify transaction is a valid burn/donation
async function verifyBurnTx(txHash: string): Promise<{
    valid: boolean;
    from: string;
    amount: string;
    timestamp: number;
    blockNumber: string;
    error?: string;
}> {
    try {
        const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
        if (!receipt) {
            return { valid: false, from: "", amount: "0", timestamp: 0, blockNumber: "", error: "Transaction not found" };
        }

        if (receipt.status !== "0x1") {
            return { valid: false, from: "", amount: "0", timestamp: 0, blockNumber: "", error: "Transaction failed" };
        }

        // Find Transfer event to community wallet or dead wallet
        let donationAmount = BigInt(0);
        let fromAddress = "";

        for (const log of receipt.logs || []) {
            if (log.address.toLowerCase() !== BANMAO_ADDRESS) continue;
            if (log.topics[0] !== TRANSFER_TOPIC) continue;

            const to = "0x" + log.topics[2].slice(26).toLowerCase();

            if (VALID_DONATION_DESTINATIONS.includes(to)) {
                fromAddress = "0x" + log.topics[1].slice(26);
                donationAmount += BigInt(log.data);
            }
        }

        if (donationAmount === BigInt(0)) {
            return { valid: false, from: "", amount: "0", timestamp: 0, blockNumber: "", error: "No donation transfer found in this transaction" };
        }

        // Get block timestamp
        const block = await rpcCall("eth_getBlockByNumber", [receipt.blockNumber, false]);
        const timestamp = parseInt(block.timestamp, 16) * 1000;
        const blockNumber = parseInt(receipt.blockNumber, 16).toString();

        return {
            valid: true,
            from: fromAddress,
            amount: donationAmount.toString(),
            timestamp,
            blockNumber,
        };
    } catch (error) {
        return {
            valid: false,
            from: "",
            amount: "0",
            timestamp: 0,
            blockNumber: "",
            error: error instanceof Error ? error.message : "Verification failed",
        };
    }
}

// Format amount for display
function formatAmount(value: string): string {
    const num = Number(BigInt(value)) / 1e18;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// GET: Fetch all contributors (leaderboard) from Turso
export async function GET() {
    try {
        // Get leaderboard from Turso (aggregated by donor)
        const leaderboardRows = await getBurnLeaderboard(100);

        // Get all donations for transaction history
        const allDonations = await getAllBurnDonations();

        // Build donation map by address
        const donationsByAddress: Record<string, Array<{ txHash: string; amount: string; timestamp: number }>> = {};
        for (const row of allDonations) {
            const addr = String((row as any).donor_address).toLowerCase();
            if (!donationsByAddress[addr]) {
                donationsByAddress[addr] = [];
            }
            donationsByAddress[addr].push({
                txHash: String((row as any).tx_hash),
                amount: String((row as any).amount),
                timestamp: Number((row as any).timestamp),
            });
        }

        // Build leaderboard with profile data
        let grandTotal = BigInt(0);
        const leaderboard = await Promise.all(
            leaderboardRows.map(async (row: any, i: number) => {
                const address = String(row.address).toLowerCase();
                const totalBurned = String(row.total_donated);
                grandTotal += BigInt(totalBurned);

                // Try to get profile from database
                let profileName = `Burner ${address.slice(0, 6)}...${address.slice(-4)}`;
                let profileAvatar = 0;
                let profileTelegram = "";
                let profileTwitter = "";

                try {
                    const profile = await getBurnProfileByAddress(address);
                    if (profile) {
                        profileName = String(profile.name) || profileName;
                        profileAvatar = Number(profile.avatar) || 0;
                        profileTelegram = String(profile.telegram || "");
                        profileTwitter = String(profile.twitter || "");
                    }
                } catch (err) {
                    console.warn("Failed to fetch profile for", address, err);
                }

                return {
                    address,
                    name: profileName,
                    avatar: profileAvatar,
                    telegram: profileTelegram,
                    twitter: profileTwitter,
                    totalBurned,
                    burnCount: Number(row.donation_count),
                    donations: donationsByAddress[address] || [],
                    rank: i + 1,
                    totalBurnedFormatted: formatAmount(totalBurned),
                };
            })
        );

        return NextResponse.json({
            success: true,
            leaderboard,
            totalBurned: grandTotal.toString(),
            totalBurnedFormatted: formatAmount(grandTotal.toString()),
            contributorCount: leaderboard.length,
        });
    } catch (error) {
        console.error("[burn-contributors] GET error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch contributors" },
            { status: 500 }
        );
    }
}

// POST: Submit a new burn contribution (saves to Turso)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { txHash } = body;

        if (!txHash || typeof txHash !== "string") {
            return NextResponse.json(
                { success: false, error: "Transaction hash is required" },
                { status: 400 }
            );
        }

        // Normalize txHash
        const normalizedTxHash = txHash.toLowerCase().trim();
        if (!/^0x[a-f0-9]{64}$/.test(normalizedTxHash)) {
            return NextResponse.json(
                { success: false, error: "Invalid transaction hash format" },
                { status: 400 }
            );
        }

        // Check if already recorded in Turso
        const alreadyRecorded = await isBurnDonationTxUsed(normalizedTxHash);
        if (alreadyRecorded) {
            return NextResponse.json(
                { success: false, error: "This transaction has already been recorded" },
                { status: 400 }
            );
        }

        // Verify the transaction
        const verification = await verifyBurnTx(normalizedTxHash);
        if (!verification.valid) {
            return NextResponse.json(
                { success: false, error: verification.error || "Invalid burn transaction" },
                { status: 400 }
            );
        }

        // Insert into Turso
        const insertResult = await insertBurnDonation(
            normalizedTxHash,
            verification.from.toLowerCase(),
            verification.amount,
            verification.blockNumber,
            verification.timestamp
        );

        if (!insertResult.success) {
            return NextResponse.json(
                { success: false, error: insertResult.error || "Failed to record donation" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            contributor: {
                address: verification.from.toLowerCase(),
                totalBurnedFormatted: formatAmount(verification.amount),
            },
            burnedAmount: verification.amount,
            burnedAmountFormatted: formatAmount(verification.amount),
        });
    } catch (error) {
        console.error("[burn-contributors] POST error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to record contribution" },
            { status: 500 }
        );
    }
}

// PATCH: Update contributor profile (uses burn-profiles API instead now)
export async function PATCH() {
    // Profile updates are now handled by /api/burn-profiles
    return NextResponse.json(
        { success: false, error: "Use /api/burn-profiles to update profiles" },
        { status: 400 }
    );
}
