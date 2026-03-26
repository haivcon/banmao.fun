// app/api/snake-leaderboard/route.ts
// Turso-based leaderboard storage for Vercel Edge/Serverless
import { NextRequest, NextResponse } from "next/server";
import {
    getAllPlayers,
    getPlayerByAddress,
    insertPlayer,
    updatePlayerClaim,
    updatePlayerProfile,
    isClaimTxHashUsed,
    recordClaimTransaction,
    checkRateLimitDB
} from "../../../lib/db";

interface PlayerRow {
    address: string;
    name: string;
    avatar: number;
    highest_claim: string;
    total_claimed: string;
    claim_count: number;
    last_claim_time: number;
    telegram: string | null;
    twitter: string | null;
    edit_count: number;
}

// Rate limiting is now database-backed (imported from db.ts as checkRateLimitDB)

// Validate and sanitize inputs
function validateName(name?: string): string | null {
    if (!name) return null;
    // Remove any HTML/script tags, trim, limit to 20 chars
    return name.replace(/<[^>]*>/g, '').trim().slice(0, 20) || null;
}

function validateSocialHandle(handle?: string): string | null {
    if (!handle) return null;
    // Remove any HTML/script tags, trim, limit to 50 chars
    return handle.replace(/<[^>]*>/g, '').trim().slice(0, 50) || null;
}

// GET - Fetch leaderboard (sorted by highest_claim)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const rows = await getAllPlayers(limit, (page - 1) * limit);

        const leaderboard = rows.map((row: any) => ({
            address: row.address,
            name: row.name,
            avatar: row.avatar || 0,
            highestClaim: row.highest_claim || '0',
            totalClaimed: row.total_claimed || '0',
            claimCount: row.claim_count || 0,
            lastClaimTime: row.last_claim_time || 0,
            telegram: row.telegram || undefined,
            twitter: row.twitter || undefined,
            editCount: row.edit_count || 0,
        }));

        return NextResponse.json({ success: true, leaderboard, page, limit });
    } catch (error) {
        console.error('Error reading leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to read leaderboard' }, { status: 500 });
    }
}

// POST - Update player stats after successful claim
// SECURITY: Requires txHash to verify on-chain claim
export async function POST(req: NextRequest) {
    try {
        const { address, name, avatar, claimAmount, txHash, telegram, twitter } = await req.json();

        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
        }
        if (!claimAmount || typeof claimAmount !== 'string') {
            return NextResponse.json({ success: false, error: 'Invalid claimAmount' }, { status: 400 });
        }

        // SECURITY: Require txHash to prevent fake claims
        if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Transaction hash required' }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        // Database-backed rate limiting
        const rateLimit = await checkRateLimitDB(
            `leaderboard:${normalizedAddress}`,
            60000, // 1 minute window
            30     // Max 30 requests per minute
        );
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
        }

        // SECURITY: Check if txHash has already been used (prevent replay)
        const alreadyUsed = await isClaimTxHashUsed(txHash);
        if (alreadyUsed) {
            return NextResponse.json({
                success: false,
                error: 'Transaction already processed'
            }, { status: 409 });
        }

        const now = Date.now();

        // Validate inputs
        const validName = validateName(name);
        const validTelegram = validateSocialHandle(telegram);
        const validTwitter = validateSocialHandle(twitter);

        // Check if player exists
        const existing = await getPlayerByAddress(normalizedAddress) as unknown as PlayerRow | null;

        if (existing) {
            const currentTotal = BigInt(existing.total_claimed || '0');
            const currentHighest = BigInt(existing.highest_claim || '0');
            const claimBigInt = BigInt(claimAmount);

            const newTotal = currentTotal + claimBigInt;
            const newHighest = claimBigInt > currentHighest ? claimBigInt : currentHighest;

            await updatePlayerClaim(
                normalizedAddress,
                validName,
                avatar ?? null,
                newTotal.toString(),
                newHighest.toString(),
                now,
                validTelegram || undefined,
                validTwitter || undefined
            );
        } else {
            // Insert new player
            await insertPlayer(
                normalizedAddress,
                validName || `Player ${address.slice(0, 6)}`,
                avatar ?? 0,
                claimAmount,
                claimAmount,
                now,
                validTelegram || undefined,
                validTwitter || undefined
            );
        }

        // Record the transaction to prevent replay
        await recordClaimTransaction(txHash, normalizedAddress, claimAmount);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
    }
}

// PATCH - Update player profile only (with edit count tracking)
// SECURITY: Requires wallet signature to verify ownership
export async function PATCH(req: NextRequest) {
    try {
        const { address, name, avatar, telegram, twitter, signature, message } = await req.json();

        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
            return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
        }

        // SECURITY: Verify wallet signature to prove ownership
        if (!signature || !message) {
            return NextResponse.json({
                success: false,
                error: 'Signature required to update profile. Please sign the message with your wallet.'
            }, { status: 401 });
        }

        // Verify the message is recent (within 5 minutes) to prevent replay attacks
        try {
            const messageData = JSON.parse(message);
            const timestamp = messageData.timestamp;
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            if (!timestamp || Math.abs(now - timestamp) > fiveMinutes) {
                return NextResponse.json({
                    success: false,
                    error: 'Signature expired. Please sign again.'
                }, { status: 401 });
            }
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Invalid message format'
            }, { status: 400 });
        }

        // Verify signature matches the address using viem
        const { verifyMessage } = await import('viem');
        try {
            const isValid = await verifyMessage({
                address: address as `0x${string}`,
                message: message,
                signature: signature as `0x${string}`
            });
            if (!isValid) {
                return NextResponse.json({
                    success: false,
                    error: 'Signature verification failed. Make sure you signed with the correct wallet.'
                }, { status: 403 });
            }
        } catch (verifyError) {
            console.error('Signature verification error:', verifyError);
            return NextResponse.json({
                success: false,
                error: 'Invalid signature format'
            }, { status: 400 });
        }

        const normalizedAddress = address.toLowerCase();

        // Database-backed rate limiting
        const rateLimit = await checkRateLimitDB(
            `profile:${normalizedAddress}`,
            60000, // 1 minute window
            30     // Max 30 requests per minute
        );
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
        }

        // Validate inputs
        const validName = validateName(name);
        const validTelegram = validateSocialHandle(telegram);
        const validTwitter = validateSocialHandle(twitter);

        const result = await updatePlayerProfile(
            normalizedAddress,
            validName || undefined,
            avatar,
            validTelegram || undefined,
            validTwitter || undefined
        );

        if (!result.success) {
            const status = result.error === 'Player not found. Claim first to create profile.' ? 404 : 403;
            return NextResponse.json({
                success: false,
                error: result.error || 'Edit limit reached',
                editCount: result.editCount
            }, { status });
        }

        return NextResponse.json({ success: true, editCount: result.editCount });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }
}
