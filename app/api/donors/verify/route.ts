// app/api/donors/verify/route.ts
// Verify a donation transaction hash and add to donor leaderboard
// Supports both direct ERC20 transfer AND contract donate() function
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { upsertDonor, getDonorByAddress, getDonorBadge, insertDonationHistory, isDonationTxUsed } from "../../../../lib/db";

// XLayer configuration
const XLAYER_RPC = "https://rpc.xlayer.tech";
const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78".toLowerCase();
const DONATION_CONTRACT = "0x986dE458302005890d708B3930ce57cD1E1E3BaF".toLowerCase();

// ERC20 Transfer function signature (direct transfer)
const TRANSFER_SIGNATURE = "0xa9059cbb";
// BanMaoSnake donate function signature: donate(uint256)
const DONATE_SIGNATURE = "0xf14faf6f";

// ERC20 Transfer event
const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

// Create XLayer client
const client = createPublicClient({
    transport: http(XLAYER_RPC, {
        timeout: 30_000,
    }),
});

// Tx tracking is now database-backed via isDonationTxUsed() function

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { txHash, walletAddress } = body;

        // Validate inputs
        if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
            return NextResponse.json({ success: false, error: "Invalid transaction hash" }, { status: 400 });
        }

        if (!walletAddress || typeof walletAddress !== 'string' || !walletAddress.startsWith('0x')) {
            return NextResponse.json({ success: false, error: "Invalid wallet address" }, { status: 400 });
        }

        const normalizedTxHash = txHash.toLowerCase();
        const normalizedWallet = walletAddress.toLowerCase();

        // Check if already processed (database-backed)
        const alreadyUsed = await isDonationTxUsed(normalizedTxHash);
        if (alreadyUsed) {
            return NextResponse.json({ success: false, error: "Transaction already processed" }, { status: 400 });
        }

        console.log(`Verifying tx: ${normalizedTxHash} for wallet: ${normalizedWallet}`);

        // Fetch transaction from blockchain
        let tx;
        let receipt;
        try {
            tx = await client.getTransaction({ hash: normalizedTxHash as `0x${string}` });
            receipt = await client.getTransactionReceipt({ hash: normalizedTxHash as `0x${string}` });
        } catch (err) {
            console.error("RPC error:", err);
            return NextResponse.json({ success: false, error: "Transaction not found on XLayer" }, { status: 404 });
        }

        if (!tx || !receipt) {
            return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
        }

        // Check if transaction was successful
        if (receipt.status !== 'success') {
            return NextResponse.json({ success: false, error: "Transaction failed on blockchain" }, { status: 400 });
        }

        // Verify sender matches connected wallet
        const txFrom = tx.from?.toLowerCase() || '';
        if (txFrom !== normalizedWallet) {
            return NextResponse.json({ success: false, error: "Sender doesn't match your wallet" }, { status: 403 });
        }

        const txTo = tx.to?.toLowerCase() || '';
        const input = tx.input?.toString() || '';
        let amount = BigInt(0);

        if (txTo === BANMAO_TOKEN && input.startsWith(TRANSFER_SIGNATURE)) {
            // === Pattern 1: Direct ERC20 transfer(address, uint256) to contract ===
            const recipientHex = input.slice(34, 74).toLowerCase();
            const donationContractHex = DONATION_CONTRACT.slice(2).toLowerCase();

            if (recipientHex !== donationContractHex) {
                return NextResponse.json({
                    success: false,
                    error: `Not sent to donation contract`
                }, { status: 400 });
            }

            const amountHex = '0x' + input.slice(74, 138);
            amount = BigInt(amountHex);
        } else if (txTo === DONATION_CONTRACT && input.startsWith(DONATE_SIGNATURE)) {
            // === Pattern 2: Contract donate(uint256) function ===
            // Extract amount from Transfer event in receipt logs
            const transferEventTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
            const donationLog = receipt.logs.find((log: any) =>
                log.address?.toLowerCase() === BANMAO_TOKEN &&
                log.topics?.[0] === transferEventTopic &&
                log.topics?.[2] && ('0x' + log.topics[2].slice(26).toLowerCase()) === DONATION_CONTRACT
            );

            if (!donationLog) {
                return NextResponse.json({
                    success: false,
                    error: "No token transfer to contract found in transaction"
                }, { status: 400 });
            }

            amount = BigInt(donationLog.data);
        } else {
            return NextResponse.json({
                success: false,
                error: "Not a recognized donation transaction"
            }, { status: 400 });
        }

        if (amount <= BigInt(0)) {
            return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
        }

        console.log(`Valid donation: ${amount.toString()} wei`);

        // Get existing donor data
        const existingDonor = await getDonorByAddress(normalizedWallet);
        const existingTotal = BigInt(existingDonor?.total_donated?.toString() || '0');
        const existingCount = Number(existingDonor?.donation_count || 0);

        // Calculate new totals
        const newTotal = existingTotal + amount;
        const newCount = existingCount + 1;

        // Get block timestamp
        const block = await client.getBlock({ blockNumber: tx.blockNumber });
        const timestamp = Number(block.timestamp) * 1000;

        // Update donor in database
        await upsertDonor(
            normalizedWallet,
            newTotal.toString(),
            newCount,
            Number(existingDonor?.first_donation) || timestamp,
            timestamp
        );

        // Save this donation to history (also marks tx as processed to prevent replay)
        await insertDonationHistory(normalizedTxHash, normalizedWallet, amount.toString(), timestamp);

        // Get badge
        const badge = getDonorBadge(newTotal.toString());

        const amountTokens = Number(amount) / 1e18;
        const totalTokens = Number(newTotal) / 1e18;

        return NextResponse.json({
            success: true,
            message: `Successfully verified ${amountTokens.toLocaleString()} $BANMAO donation!`,
            donation: {
                txHash: normalizedTxHash,
                amount: amountTokens.toLocaleString() + " $BANMAO",
            },
            donor: {
                address: normalizedWallet,
                totalDonated: totalTokens.toLocaleString() + " $BANMAO",
                donationCount: newCount,
                badge
            }
        });

    } catch (error) {
        console.error("Verify error:", error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: "Submit tx hash to verify donation",
        method: "POST",
        body: { txHash: "0x...", walletAddress: "0x..." }
    });
}
