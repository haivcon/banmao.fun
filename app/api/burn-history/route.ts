// API endpoint for burn history - transactions sent to DEAD WALLET only
// Uses Turso database for persistent storage
import { NextRequest, NextResponse } from "next/server";
import {
    insertBurnHistory,
    isBurnHistoryTxUsed,
    getAllBurnHistory,
    getTotalBurnedFromHistory,
} from "../../../lib/db";

// Contract addresses
const BANMAO_ADDRESS = (process.env.NEXT_PUBLIC_BANMAO || "0x16d91d1615fc55b76d5f92365bd60c069b46ef78").toLowerCase();
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xlayer.tech";

// Dead wallet addresses ONLY - tokens sent here are considered burned
const DEAD_WALLETS = [
    "0x000000000000000000000000000000000000dead",
    "0x0000000000000000000000000000000000000000",
];

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

// Verify transaction is a burn to DEAD WALLET ONLY
async function verifyBurnTx(txHash: string): Promise<{
    valid: boolean;
    from: string;
    amount: string;
    timestamp: number;
    error?: string;
}> {
    try {
        const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
        if (!receipt) {
            return { valid: false, from: "", amount: "0", timestamp: 0, error: "Transaction not found" };
        }

        if (receipt.status !== "0x1") {
            return { valid: false, from: "", amount: "0", timestamp: 0, error: "Transaction failed" };
        }

        // Find Transfer event to DEAD WALLET ONLY (not community wallet)
        let burnAmount = BigInt(0);
        let fromAddress = "";

        for (const log of receipt.logs || []) {
            if (log.address.toLowerCase() !== BANMAO_ADDRESS) continue;
            if (log.topics[0] !== TRANSFER_TOPIC) continue;

            const to = "0x" + log.topics[2].slice(26).toLowerCase();

            // Only accept transfers to DEAD WALLETS
            if (DEAD_WALLETS.includes(to)) {
                fromAddress = "0x" + log.topics[1].slice(26);
                burnAmount += BigInt(log.data);
            }
        }

        if (burnAmount === BigInt(0)) {
            return { valid: false, from: "", amount: "0", timestamp: 0, error: "No burn transfer to dead wallet found" };
        }

        const block = await rpcCall("eth_getBlockByNumber", [receipt.blockNumber, false]);
        const timestamp = parseInt(block.timestamp, 16) * 1000;

        return {
            valid: true,
            from: fromAddress,
            amount: burnAmount.toString(),
            timestamp,
        };
    } catch (error) {
        return {
            valid: false,
            from: "",
            amount: "0",
            timestamp: 0,
            error: error instanceof Error ? error.message : "Verification failed",
        };
    }
}

// Format amount for display
function formatAmount(value: string): string {
    const num = Number(BigInt(value)) / 1e18;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// GET: Fetch all burn transactions (dead wallet only) from Turso
export async function GET() {
    try {
        const rows = await getAllBurnHistory(100);
        const totalBurned = await getTotalBurnedFromHistory();

        const transactions = rows.map((row: any) => ({
            txHash: String(row.tx_hash),
            from: String(row.from_address),
            amount: String(row.amount),
            amountFormatted: formatAmount(String(row.amount)),
            timestamp: Number(row.timestamp),
            fromShort: `${String(row.from_address).slice(0, 6)}...${String(row.from_address).slice(-4)}`,
        }));

        return NextResponse.json({
            success: true,
            transactions,
            totalBurned,
            totalBurnedFormatted: formatAmount(totalBurned),
            transactionCount: transactions.length,
        });
    } catch (error) {
        console.error("[burn-history] GET error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch burn history" },
            { status: 500 }
        );
    }
}

// POST: Submit a new burn transaction (dead wallet only, saves to Turso)
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

        const normalizedTxHash = txHash.toLowerCase().trim();
        if (!/^0x[a-f0-9]{64}$/.test(normalizedTxHash)) {
            return NextResponse.json(
                { success: false, error: "Invalid transaction hash format" },
                { status: 400 }
            );
        }

        // Check if already recorded in Turso
        const alreadyRecorded = await isBurnHistoryTxUsed(normalizedTxHash);
        if (alreadyRecorded) {
            return NextResponse.json(
                { success: false, error: "This burn transaction has already been recorded" },
                { status: 400 }
            );
        }

        // Verify the transaction - ONLY accepts dead wallet burns
        const verification = await verifyBurnTx(normalizedTxHash);
        if (!verification.valid) {
            return NextResponse.json(
                { success: false, error: verification.error || "Invalid burn transaction" },
                { status: 400 }
            );
        }

        // Insert into Turso
        const insertResult = await insertBurnHistory(
            normalizedTxHash,
            verification.from.toLowerCase(),
            verification.amount,
            verification.timestamp
        );

        if (!insertResult.success) {
            return NextResponse.json(
                { success: false, error: insertResult.error || "Failed to record burn" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            transaction: {
                txHash: normalizedTxHash,
                from: verification.from,
                amount: verification.amount,
                amountFormatted: formatAmount(verification.amount),
                timestamp: verification.timestamp,
            },
        });
    } catch (error) {
        console.error("[burn-history] POST error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to record burn transaction" },
            { status: 500 }
        );
    }
}
