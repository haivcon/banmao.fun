// app/api/snake-sign/route.ts
import { NextRequest, NextResponse } from "next/server";

// EIP-712 Domain - Must match smart contract exactly
const DOMAIN = {
    name: "BanMaoSnake",
    version: "1.0",
    chainId: 196, // X Layer Mainnet
};

const TYPES = {
    Withdraw: [
        { name: "player", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
};

// Configuration - defaults (can be overridden via admin dashboard)
const DEFAULT_RATIO = 1; // 1 điểm = 1 $BANMAO
const DEFAULT_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const DEFAULT_MAX_CLAIMS_PER_HOUR = 3; // 🔒 FIX #4: Reduced from 10 → 3
const DEFAULT_MAX_SCORE_PER_GAME = 2000; // 🔒 FIX #1: Max score per game (admin-configurable)
const DEFAULT_MAX_CLAIMS_PER_IP = 5; // 🔒 FIX #3: Max claims per IP per hour

// Import database functions
import { checkSlidingRateLimit, getConfig, validateAndClaimSession, countWalletsPerFingerprint } from "../../../lib/db";
import crypto from "crypto";

// Get config value with fallback
async function getConfigValue(key: string, defaultValue: number): Promise<number> {
    try {
        const value = await getConfig(key);
        if (value !== null) {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) return parsed;
        }
    } catch (e) {
        console.error(`Failed to get config ${key}:`, e);
    }
    return defaultValue;
}

// Anti-cheat: Sliding window rate limiting per address
async function checkRateLimit(address: string): Promise<{ allowed: boolean; reason?: string }> {
    const rateLimitWindow = await getConfigValue('SNAKE_RATE_LIMIT_WINDOW', 60) * 1000; // seconds → ms
    const maxClaims = await getConfigValue('SNAKE_MAX_CLAIMS_PER_HOUR', DEFAULT_MAX_CLAIMS_PER_HOUR);

    const result = await checkSlidingRateLimit(
        `snake-claim:${address}`,
        rateLimitWindow,
        maxClaims
    );

    if (!result.allowed) {
        const waitMinutes = Math.ceil((result.resetTime - Date.now()) / 60000);
        return { allowed: false, reason: `Rate limit exceeded. Wait ${waitMinutes} minutes.` };
    }

    return { allowed: true };
}

// 🔒 FIX #3: IP-based rate limiting (sliding window)
async function checkIPRateLimit(ip: string): Promise<{ allowed: boolean; reason?: string }> {
    const rateLimitWindow = await getConfigValue('SNAKE_RATE_LIMIT_WINDOW', 60) * 1000; // seconds → ms
    const maxClaimsPerIP = await getConfigValue('SNAKE_MAX_CLAIMS_PER_IP', DEFAULT_MAX_CLAIMS_PER_IP);

    const result = await checkSlidingRateLimit(
        `snake-ip:${ip}`,
        rateLimitWindow,
        maxClaimsPerIP
    );

    if (!result.allowed) {
        const waitMinutes = Math.ceil((result.resetTime - Date.now()) / 60000);
        console.warn(`[SECURITY] IP rate limit hit: ${ip}, count: ${result.count}`);
        return { allowed: false, reason: `Too many requests from this network. Wait ${waitMinutes} minutes.` };
    }

    return { allowed: true };
}

// 🔒 Browser fingerprint generation (improved with Sec-CH-UA headers)
function generateFingerprint(req: NextRequest, ip: string): string {
    const ua = req.headers.get('user-agent') || '';
    const lang = req.headers.get('accept-language') || '';
    const encoding = req.headers.get('accept-encoding') || '';
    const secChUa = req.headers.get('sec-ch-ua') || '';
    const secChUaPlatform = req.headers.get('sec-ch-ua-platform') || '';
    const secChUaMobile = req.headers.get('sec-ch-ua-mobile') || '';
    const raw = `${ip}|${ua}|${lang}|${encoding}|${secChUa}|${secChUaPlatform}|${secChUaMobile}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

// 🔒 FIX #2: Verify nonce on-chain before signing
async function verifyNonceOnChain(player: string, clientNonce: string): Promise<{ valid: boolean; onChainNonce?: string; reason?: string }> {
    try {
        const { createPublicClient, http, defineChain } = await import("viem");

        const xlayer = defineChain({
            id: 196,
            name: "X Layer",
            nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
            rpcUrls: { default: { http: ["https://xlayerrpc.okx.com"] } },
            blockExplorers: { default: { name: "OKLink", url: "https://web3.okx.com/explorer/x-layer" } },
        });

        const publicClient = createPublicClient({ chain: xlayer, transport: http() });

        const contractAddress = process.env.SNAKE_CONTRACT_ADDRESS as `0x${string}`;
        if (!contractAddress) {
            console.error("[SECURITY] SNAKE_CONTRACT_ADDRESS not set");
            return { valid: false, reason: "Server configuration error" };
        }

        const onChainNonce = await publicClient.readContract({
            address: contractAddress,
            abi: [{
                inputs: [{ internalType: "address", name: "", type: "address" }],
                name: "nonces",
                outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                stateMutability: "view",
                type: "function",
            }] as const,
            functionName: "nonces",
            args: [player as `0x${string}`],
        } as any);

        const onChainNonceStr = onChainNonce.toString();

        if (clientNonce !== onChainNonceStr) {
            console.warn(`[SECURITY] Nonce mismatch for ${player}: client=${clientNonce}, chain=${onChainNonceStr}`);
            return { valid: false, onChainNonce: onChainNonceStr, reason: "Nonce mismatch - please refresh and try again" };
        }

        return { valid: true, onChainNonce: onChainNonceStr };
    } catch (error) {
        console.error("[SECURITY] Failed to verify nonce on-chain:", error);
        // If RPC fails, reject for safety (fail-closed)
        return { valid: false, reason: "Cannot verify nonce - please try again later" };
    }
}

// Anti-cheat verification - ENHANCED
function verifyReplay(
    moves: Array<{ d?: string; dir?: string; t?: number; timestamp?: number }>,
    score: number,
    gameStartTime?: number,
    gameEndTime?: number
): { valid: boolean; reason?: string } {
    // === 1. BASIC INPUT VALIDATION ===
    if (score < 0 || score > 50000) {
        return { valid: false, reason: "Invalid score range" };
    }

    // === 2. MOVE HISTORY VALIDATION ===
    if (!moves || !Array.isArray(moves)) {
        // Allow small scores without moves (for backwards compatibility)
        if (score <= 30) {
            console.log(`No moves but score ${score} <= 30 - allowing`);
            return { valid: true };
        }
        return { valid: false, reason: "Move history required for scores > 30" };
    }

    const normalizedMoves = moves.map(m => ({
        dir: m.d || m.dir || '',
        timestamp: m.t || m.timestamp || 0
    })).filter(m => m.dir); // Only valid moves

    // === 3. MOVE COUNT VS SCORE CHECK ===
    // Each coin = 10 points, each power-up = 50 points
    // Minimum expected moves: score / 30 (generous estimate)
    const minExpectedMoves = Math.floor(score / 30);
    if (normalizedMoves.length < minExpectedMoves && score > 50) {
        console.log(`Suspicious: ${normalizedMoves.length} moves for score ${score} (expected >= ${minExpectedMoves})`);
        return { valid: false, reason: "Move count too low for claimed score" };
    }

    // === 4. VALIDATE DIRECTIONS ===
    const validDirs = ["U", "D", "L", "R", "up", "down", "left", "right"];
    for (const move of normalizedMoves) {
        if (move.dir && !validDirs.includes(move.dir)) {
            return { valid: false, reason: "Invalid direction detected" };
        }
    }

    // === 5. GAME DURATION CHECK ===
    if (gameStartTime && gameEndTime) {
        const duration = gameEndTime - gameStartTime;
        // Minimum: 1 second per 15 points (realistic for Snake gameplay)
        const minDuration = (score / 15) * 1000;
        if (duration < minDuration && score > 100) {
            console.log(`Suspicious: ${duration}ms duration for score ${score} (expected >= ${minDuration}ms)`);
            return { valid: false, reason: "Game duration too short" };
        }
    } else if (normalizedMoves.length >= 2) {
        // Calculate duration from first and last move timestamps
        const firstMove = normalizedMoves.find(m => m.timestamp > 0);
        const lastMove = [...normalizedMoves].reverse().find(m => m.timestamp > 0);
        if (firstMove && lastMove && firstMove.timestamp !== lastMove.timestamp) {
            const duration = lastMove.timestamp - firstMove.timestamp;
            const minDuration = (score / 15) * 1000;
            if (duration < minDuration && score > 100) {
                console.log(`Suspicious: ${duration}ms play time for score ${score}`);
                return { valid: false, reason: "Play time too short" };
            }
        }
    }

    // === 6. MOVE TIMING CHECK ===
    // Humans can't move faster than 50ms between inputs consistently
    if (normalizedMoves.length >= 10) {
        let tooFastCount = 0;
        for (let i = 1; i < normalizedMoves.length; i++) {
            if (normalizedMoves[i].timestamp && normalizedMoves[i - 1].timestamp) {
                const delta = normalizedMoves[i].timestamp - normalizedMoves[i - 1].timestamp;
                if (delta > 0 && delta < 30) { // Less than 30ms is suspicious
                    tooFastCount++;
                }
            }
        }
        // If more than 30% of moves are suspiciously fast
        if (tooFastCount > normalizedMoves.length * 0.3) {
            console.log(`Suspicious: ${tooFastCount}/${normalizedMoves.length} moves too fast`);
            return { valid: false, reason: "Inhuman input speed detected" };
        }
    }

    // === 7. REPETITIVE PATTERN DETECTION ===
    if (normalizedMoves.length >= 20) {
        const dirs = normalizedMoves.map(m => m.dir);
        // Check for short repeating cycles (2-6 char patterns repeating 8+ times)
        const dirStr = dirs.join('');
        for (let patLen = 2; patLen <= 6; patLen++) {
            const pat = dirStr.substring(0, patLen);
            const repeated = pat.repeat(8);
            if (dirStr.includes(repeated)) {
                console.log(`Suspicious: repeating pattern "${pat}" detected in moves`);
                return { valid: false, reason: "Repetitive movement pattern detected" };
            }
        }
    }

    // === 8. DIRECTION ENTROPY CHECK ===
    if (normalizedMoves.length >= 20 && score > 200) {
        const dirCounts: Record<string, number> = {};
        for (const m of normalizedMoves) {
            const d = m.dir.toUpperCase().charAt(0); // Normalize to U/D/L/R
            dirCounts[d] = (dirCounts[d] || 0) + 1;
        }
        const maxDirRatio = Math.max(...Object.values(dirCounts)) / normalizedMoves.length;
        // Real Snake gameplay requires turns; >60% in one direction is suspicious
        if (maxDirRatio > 0.6) {
            console.log(`Suspicious: ${(maxDirRatio * 100).toFixed(0)}% moves in one direction`);
            return { valid: false, reason: "Unnatural direction distribution" };
        }
    }

    // === 9. MOVE TIMING VARIANCE CHECK ===
    // Real humans have variable timing; bots often have uniform intervals
    if (normalizedMoves.length >= 15) {
        const intervals: number[] = [];
        for (let i = 1; i < normalizedMoves.length; i++) {
            if (normalizedMoves[i].timestamp && normalizedMoves[i - 1].timestamp) {
                const delta = normalizedMoves[i].timestamp - normalizedMoves[i - 1].timestamp;
                if (delta > 0 && delta < 10000) intervals.push(delta);
            }
        }
        if (intervals.length >= 10) {
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            const coeffOfVariation = mean > 0 ? stdDev / mean : 0;
            // Real human gameplay has CoV > 0.3; bots are often < 0.15
            if (coeffOfVariation < 0.1 && score > 200) {
                console.log(`Suspicious: timing CoV=${coeffOfVariation.toFixed(3)} (too uniform)`);
                return { valid: false, reason: 'Automated input pattern detected' };
            }
        }
    }

    console.log(`Anti-cheat passed: ${normalizedMoves.length} moves, score ${score}`);
    return { valid: true };
}

// Helper: Extract client IP from request
function getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIP = req.headers.get('x-real-ip');
    if (realIP) {
        return realIP.trim();
    }
    return 'unknown';
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { player, score, moveHistory, nonce, gameStartTime, gameEndTime, sessionId, startTimeHash } = body;

        console.log("Snake claim request:", { player, score, moveCount: moveHistory?.length, nonce, sessionId });

        // Validate inputs
        if (!player || typeof player !== "string" || !player.startsWith("0x")) {
            return NextResponse.json({ error: "Địa chỉ ví không hợp lệ" }, { status: 400 });
        }
        if (typeof score !== "number" || score < 0) {
            return NextResponse.json({ error: "Điểm số không hợp lệ" }, { status: 400 });
        }

        if (typeof nonce !== "string" && typeof nonce !== "number") {
            return NextResponse.json({ error: "Nonce không hợp lệ" }, { status: 400 });
        }

        // 🔒 FIX #1: Server-side MAX SCORE cap (configurable via admin)
        const maxScorePerGame = await getConfigValue('SNAKE_MAX_SCORE_PER_GAME', DEFAULT_MAX_SCORE_PER_GAME);
        if (score > maxScorePerGame) {
            console.warn(`[SECURITY] Score ${score} exceeds max ${maxScorePerGame} for player ${player}`);
            return NextResponse.json(
                { error: `Score exceeds maximum allowed per game (${maxScorePerGame})` },
                { status: 403 }
            );
        }

        // Maintenance mode check
        const maintenanceMode = await getConfig('MAINTENANCE_MODE');
        if (maintenanceMode === 'true') {
            const maintenanceMsg = await getConfig('MAINTENANCE_MESSAGE') || 'Hệ thống đang bảo trì, vui lòng thử lại sau.';
            return NextResponse.json({ error: maintenanceMsg }, { status: 503 });
        }

        // 🔒 FIX #3: IP-based rate limiting (before address rate limit)
        const clientIP = getClientIP(req);
        const ipCheck = await checkIPRateLimit(clientIP);
        if (!ipCheck.allowed) {
            return NextResponse.json({ error: ipCheck.reason || "Too many requests" }, { status: 429 });
        }

        // Rate limiting check (per address) — FIX #4: default reduced to 3
        const rateCheck = await checkRateLimit(player);
        if (!rateCheck.allowed) {
            return NextResponse.json({ error: rateCheck.reason || "Quá nhiều yêu cầu" }, { status: 429 });
        }

        // 🔒 Session validation — each game must have a session from /api/snake-session
        if (!sessionId || typeof sessionId !== 'string') {
            return NextResponse.json({ error: 'Game session required. Please restart the game.' }, { status: 400 });
        }
        const sessionCheck = await validateAndClaimSession(sessionId, player, score);
        if (!sessionCheck.valid) {
            console.warn(`[SECURITY] Session validation failed for ${player}: ${sessionCheck.reason}`);
            return NextResponse.json({ error: sessionCheck.reason || 'Invalid game session' }, { status: 403 });
        }

        // 🔒 FIX #1: HMAC verify is now MANDATORY (not optional)
        if (!startTimeHash || !gameStartTime) {
            return NextResponse.json({ error: 'Game timestamp required. Please restart the game.' }, { status: 400 });
        }
        const HMAC_SECRET = process.env.SESSION_HMAC_SECRET || process.env.SIGNER_PRIVATE_KEY;
        if (!HMAC_SECRET) {
            console.error('[CRITICAL] No HMAC secret configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
        }
        const expectedHash = crypto.createHmac('sha256', HMAC_SECRET)
            .update(`${sessionId}:${gameStartTime}`)
            .digest('hex')
            .substring(0, 32);
        if (startTimeHash !== expectedHash) {
            console.warn(`[SECURITY] HMAC mismatch for session ${sessionId}, player ${player}`);
            return NextResponse.json({ error: 'Invalid game timestamp' }, { status: 403 });
        }

        // 🔒 FIX #7: Enforce minimum game duration (server-side)
        const gameDuration = Date.now() - gameStartTime;
        const MIN_GAME_DURATION_MS = 15000; // At least 15 seconds
        if (gameDuration < MIN_GAME_DURATION_MS && score > 50) {
            console.warn(`[SECURITY] Game too short: ${gameDuration}ms for score ${score}, player ${player}`);
            return NextResponse.json({ error: 'Game duration too short' }, { status: 403 });
        }

        // 🔒 FIX #6: Fingerprint-based multi-wallet detection — now BLOCKS (not just warns)
        const fingerprint = generateFingerprint(req, clientIP);
        const walletCount = await countWalletsPerFingerprint(fingerprint);
        if (walletCount > 3) {
            console.warn(`[SECURITY] Fingerprint ${fingerprint.substring(0, 8)}... has ${walletCount} wallets, blocking ${player}`);
            return NextResponse.json({ error: 'Too many accounts detected from this device' }, { status: 429 });
        }

        // 🔒 FIX #2: Score integrity checksum verification (MANDATORY)
        const { scoreChecksum } = body;
        if (!scoreChecksum || typeof scoreChecksum !== 'string') {
            return NextResponse.json({ error: 'Score checksum required. Please restart the game.' }, { status: 400 });
        }
        {
            // Recompute the seed the same way session API generated it
            const checksumSeed = crypto.createHmac('sha256', HMAC_SECRET)
                .update(`seed:${sessionId}`)
                .digest('hex')
                .substring(0, 32);
            // Frontend computes: simple hash of seed + sessionId + score + moveCount
            const payload = `${checksumSeed}:${sessionId}:${score}:${(moveHistory || []).length}`;
            const expectedChecksum = crypto.createHash('sha256')
                .update(payload)
                .digest('hex')
                .substring(0, 16);
            if (scoreChecksum !== expectedChecksum) {
                console.warn(`[SECURITY] Score checksum mismatch for ${player}: expected=${expectedChecksum}, got=${scoreChecksum}`);
                return NextResponse.json({ error: 'Score integrity check failed' }, { status: 403 });
            }
        }

        // Anti-cheat verification (with game time)
        const verification = verifyReplay(moveHistory || [], score, gameStartTime, gameEndTime);
        if (!verification.valid) {
            return NextResponse.json({ error: verification.reason || "Phát hiện gian lận!" }, { status: 403 });
        }

        // 🔒 FIX #2: Verify nonce on-chain before signing
        const nonceStr = nonce.toString();
        const nonceCheck = await verifyNonceOnChain(player, nonceStr);
        if (!nonceCheck.valid) {
            return NextResponse.json(
                { error: nonceCheck.reason || "Nonce verification failed" },
                { status: 403 }
            );
        }

        // ⚡ Calculate reward with configurable ratio
        // Load ratio from config DB (default 1 điểm = 1 $BANMAO)
        const ratio = await getConfigValue('SNAKE_RATIO', DEFAULT_RATIO);
        const decimals = BigInt(18);
        const amount = BigInt(score) * BigInt(Math.floor(ratio)) * (BigInt(10) ** decimals);

        const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;

        if (!SIGNER_PRIVATE_KEY) {
            console.error("[CRITICAL] SIGNER_PRIVATE_KEY not configured");
            return NextResponse.json(
                { error: "Server signing not configured. Please contact admin." },
                { status: 503 }
            );
        }

        // Production: Sign using viem
        const { createWalletClient, http, defineChain } = await import("viem");
        const { privateKeyToAccount } = await import("viem/accounts");

        const xlayer = defineChain({
            id: 196,
            name: "X Layer",
            nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
            rpcUrls: { default: { http: ["https://xlayerrpc.okx.com"] } },
            blockExplorers: { default: { name: "OKLink", url: "https://web3.okx.com/explorer/x-layer" } },
        });

        const account = privateKeyToAccount(SIGNER_PRIVATE_KEY as `0x${string}`);
        const client = createWalletClient({ account, chain: xlayer, transport: http() });

        const contractAddress = process.env.SNAKE_CONTRACT_ADDRESS as `0x${string}`;

        // Use the verified on-chain nonce for signing
        const verifiedNonce = nonceCheck.onChainNonce || nonceStr;

        // Generate deadline: 5 minutes from now
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

        const signature = await client.signTypedData({
            account,
            domain: { ...DOMAIN, verifyingContract: contractAddress },
            types: TYPES,
            primaryType: "Withdraw",
            message: { player: player as `0x${string}`, amount, nonce: BigInt(verifiedNonce), deadline },
        });

        console.log("Signature generated for player:", player, "Amount:", score, "$BANMAO (max:", maxScorePerGame, "), IP:", clientIP);
        return NextResponse.json({ signature, amount: amount.toString(), nonce: verifiedNonce, deadline: deadline.toString() });
    } catch (error) {
        console.error("Snake sign error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Lỗi server" },
            { status: 500 }
        );
    }
}
