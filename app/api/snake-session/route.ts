import { NextRequest, NextResponse } from "next/server";
import { createGameSession, countWalletsPerFingerprint, db, initializeDatabase, checkSlidingRateLimit } from "../../../lib/db";
import crypto from "crypto";

const MAX_WALLETS_PER_FINGERPRINT = 3;
const HMAC_SECRET = process.env.SESSION_HMAC_SECRET || process.env.SIGNER_PRIVATE_KEY || '';

function generateFingerprint(req: NextRequest, ip: string): string {
    const ua = req.headers.get('user-agent') || '';
    const lang = req.headers.get('accept-language') || '';
    const encoding = req.headers.get('accept-encoding') || '';
    // 🔒 FIX #5: Add more headers for stronger fingerprinting
    const secChUa = req.headers.get('sec-ch-ua') || '';
    const secChUaPlatform = req.headers.get('sec-ch-ua-platform') || '';
    const secChUaMobile = req.headers.get('sec-ch-ua-mobile') || '';
    const raw = `${ip}|${ua}|${lang}|${encoding}|${secChUa}|${secChUaPlatform}|${secChUaMobile}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

function getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIP = req.headers.get('x-real-ip');
    if (realIP) return realIP.trim();
    return 'unknown';
}

// HMAC sign: sessionId + startTime → tamper-proof timestamp
function signStartTime(sessionId: string, startTime: number): string {
    return crypto.createHmac('sha256', HMAC_SECRET)
        .update(`${sessionId}:${startTime}`)
        .digest('hex')
        .substring(0, 32);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { player } = body;

        if (!player || typeof player !== 'string' || !player.startsWith('0x')) {
            return NextResponse.json({ error: 'Invalid player address' }, { status: 400 });
        }

        if (!HMAC_SECRET) {
            console.error('[CRITICAL] No HMAC secret configured for sessions');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
        }

        const ip = getClientIP(req);

        // 🔒 FIX #4: Rate limit session creation (max 10 per minute per IP)
        const sessionRateCheck = await checkSlidingRateLimit(`snake-session:${ip}`, 60000, 10);
        if (!sessionRateCheck.allowed) {
            console.warn(`[SECURITY] Session flood from IP ${ip}`);
            return NextResponse.json({ error: 'Too many game starts. Please wait.' }, { status: 429 });
        }

        const fingerprint = generateFingerprint(req, ip);

        // Check multi-wallet abuse
        const walletCount = await countWalletsPerFingerprint(fingerprint);
        if (walletCount >= MAX_WALLETS_PER_FINGERPRINT) {
            await initializeDatabase();
            const existing = await db.execute({
                sql: `SELECT 1 FROM game_sessions WHERE fingerprint = ? AND player = ? LIMIT 1`,
                args: [fingerprint, player.toLowerCase()]
            });
            if (!existing.rows.length) {
                console.warn(`[SECURITY] Fingerprint ${fingerprint.substring(0, 8)}... has ${walletCount} wallets, blocking ${player}`);
                return NextResponse.json({ error: 'Too many accounts from this device' }, { status: 429 });
            }
        }

        const sessionId = crypto.randomUUID();
        const startTime = Date.now();
        const startTimeHash = signStartTime(sessionId, startTime);

        const result = await createGameSession(sessionId, player, fingerprint, ip);
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Generate checksum seed for frontend score integrity
        const checksumSeed = crypto.createHmac('sha256', HMAC_SECRET)
            .update(`seed:${sessionId}`)
            .digest('hex')
            .substring(0, 32);

        return NextResponse.json({ sessionId, startTime, startTimeHash, checksumSeed });
    } catch (error) {
        console.error('Snake session error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
