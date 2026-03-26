// app/api/slots/donors/verify/route.ts
// Verify a depositToJackpot transaction hash for BanmaoSlots
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog } from "viem";
import { upsertSlotsDonor, getSlotsDonorByAddress, getDonorBadge, insertSlotsDonationHistory, isSlotsDonationTxUsed } from "../../../../../lib/db";

// XLayer configuration
const XLAYER_RPC = "https://rpc.xlayer.tech";
const SLOTS_CONTRACT = "0x9c64c18D792Eab435d1d921efaC978F6A62da2d2".toLowerCase(); // BanmaoSlots V2 contract
const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78".toLowerCase(); // Banmao Token contract

// depositToJackpot function signature: keccak256("depositToJackpot(uint256)")[0:8]
// Computed: 0x9d5c5e22 (first 4 bytes of keccak256)
const DEPOSIT_TO_JACKPOT_SIGNATURE = "0x9d5c5e22";

// Create XLayer client
const client = createPublicClient({
    transport: http(XLAYER_RPC, {
        timeout: 30_000,
    }),
});

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
        const alreadyUsed = await isSlotsDonationTxUsed(normalizedTxHash);
        if (alreadyUsed) {
            return NextResponse.json({ success: false, error: "Transaction already processed" }, { status: 400 });
        }

        console.log(`[Slots] Verifying tx: ${normalizedTxHash} for wallet: ${normalizedWallet}`);

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

        // Verify transaction is TO the slots contract OR the token contract (for direct pool donation)
        const txTo = tx.to?.toLowerCase() || '';
        if (txTo !== SLOTS_CONTRACT && txTo !== BANMAO_TOKEN) {
            console.log(`[Slots] TX target: ${txTo}, expected: ${SLOTS_CONTRACT} or ${BANMAO_TOKEN}`);
            return NextResponse.json({
                success: false,
                error: `Transaction not sent to BanmaoSlots or Token contract`
            }, { status: 400 });
        }

        // Extract amount from ERC20 Transfer events in the receipt
        // depositToJackpot triggers an ERC20 transferFrom, we can find the Transfer event
        let donationAmount = BigInt(0);

        // Look for Transfer event in logs
        // Transfer(address from, address to, uint256 value) - topic0: 0xddf252ad...
        const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

        for (const log of receipt.logs) {
            if (log.topics[0]?.toLowerCase() === TRANSFER_TOPIC) {
                // This is a Transfer event
                // topics[1] = from (padded), topics[2] = to (padded)
                // data = amount
                const toAddress = '0x' + log.topics[2]?.slice(-40).toLowerCase();

                // Check if transfer is TO the slots contract (donation going in)
                if (toAddress === SLOTS_CONTRACT) {
                    donationAmount = BigInt(log.data);
                    break;
                }
            }
        }

        if (donationAmount <= BigInt(0)) {
            // Fallback: try to decode from input data
            // depositToJackpot(uint256 amount) - amount is at position 10-74
            try {
                const txInput = tx.input?.toString() || '';
                const amountHex = '0x' + txInput.slice(10, 74);
                donationAmount = BigInt(amountHex);
            } catch {
                return NextResponse.json({ success: false, error: "Could not determine donation amount" }, { status: 400 });
            }
        }

        console.log(`[Slots] Valid donation: ${donationAmount.toString()} wei from ${normalizedWallet}`);

        // Get existing donor data
        const existingDonor = await getSlotsDonorByAddress(normalizedWallet);
        const existingTotal = BigInt(existingDonor?.total_donated?.toString() || '0');
        const existingCount = Number(existingDonor?.donation_count || 0);

        // Calculate new totals
        const newTotal = existingTotal + donationAmount;
        const newCount = existingCount + 1;

        // Get block timestamp
        const block = await client.getBlock({ blockNumber: tx.blockNumber });
        const timestamp = Number(block.timestamp) * 1000;

        // Update donor in database (SLOTS SPECIFIC)
        await upsertSlotsDonor(
            normalizedWallet,
            newTotal.toString(),
            newCount,
            Number(existingDonor?.first_donation) || timestamp,
            timestamp
        );

        // Save to SLOTS donation history
        await insertSlotsDonationHistory(normalizedTxHash, normalizedWallet, donationAmount.toString(), timestamp);

        // Get badge
        const badge = getDonorBadge(newTotal.toString());

        const amountTokens = Number(donationAmount) / 1e18;
        const totalTokens = Number(newTotal) / 1e18;

        return NextResponse.json({
            success: true,
            message: `Successfully verified ${amountTokens.toLocaleString()} $BANMAO slots donation!`,
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
        console.error("[Slots] Verify error:", error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: "Submit slots donation tx hash to verify",
        method: "POST",
        body: { txHash: "0x...", walletAddress: "0x..." },
        note: "For depositToJackpot transactions on BanmaoSlots contract"
    });
}
