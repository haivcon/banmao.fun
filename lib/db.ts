// lib/db.ts - Turso (LibSQL) database client for Vercel Edge/Serverless
import { createClient } from '@libsql/client';

// Create Turso client from environment variables
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// Debug logging to identify database connection
console.log('[DB] ===== DATABASE CONFIG DEBUG =====');
console.log('[DB] TURSO_DATABASE_URL:', tursoUrl ? `${tursoUrl.substring(0, 30)}...` : 'NOT SET');
console.log('[DB] TURSO_AUTH_TOKEN:', tursoToken ? 'SET (hidden)' : 'NOT SET');
console.log('[DB] Using database:', tursoUrl ? 'Turso Cloud' : 'LOCAL file:local.db');
console.log('[DB] =================================');

if (!tursoUrl) {
    console.warn('[DB] ⚠️ TURSO_DATABASE_URL not set - using local.db fallback!');
}

export const db = createClient({
    url: tursoUrl || 'file:local.db', // Fallback to local file for dev
    authToken: tursoToken,
});

// Initialize database schema (run once on first request)
let initialized = false;

export async function initializeDatabase() {
    if (initialized) return;

    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS players (
                address TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                avatar INTEGER DEFAULT 0,
                highest_claim TEXT DEFAULT '0',
                total_claimed TEXT DEFAULT '0',
                claim_count INTEGER DEFAULT 0,
                last_claim_time INTEGER,
                telegram TEXT,
                twitter TEXT,
                edit_count INTEGER DEFAULT 0
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_highest_claim 
            ON players(highest_claim DESC)
        `);

        // Migration: Add missing columns to existing table (safe to run multiple times)
        // These will fail silently if columns already exist
        try {
            await db.execute(`ALTER TABLE players ADD COLUMN telegram TEXT`);
            console.log('Added telegram column');
        } catch { /* Column already exists */ }

        try {
            await db.execute(`ALTER TABLE players ADD COLUMN twitter TEXT`);
            console.log('Added twitter column');
        } catch { /* Column already exists */ }

        try {
            await db.execute(`ALTER TABLE players ADD COLUMN edit_count INTEGER DEFAULT 0`);
            console.log('Added edit_count column');
        } catch { /* Column already exists */ }

        // Create donors table for tracking $BANMAO donations
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donors (
                address TEXT PRIMARY KEY,
                name TEXT DEFAULT '',
                avatar INTEGER DEFAULT 0,
                total_donated TEXT DEFAULT '0',
                donation_count INTEGER DEFAULT 0,
                first_donation INTEGER DEFAULT 0,
                last_donation INTEGER DEFAULT 0,
                telegram TEXT,
                twitter TEXT,
                edit_count INTEGER DEFAULT 0
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_total_donated 
            ON donors(total_donated DESC)
        `);

        // Create donation_history table for tracking individual donations with txHash
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT UNIQUE NOT NULL,
                donor_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (donor_address) REFERENCES donors(address)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_donation_donor_address 
            ON donation_history(donor_address)
        `);

        // Rate limits table for persistent rate limiting
        await db.execute(`
            CREATE TABLE IF NOT EXISTS rate_limits (
                key TEXT PRIMARY KEY,
                count INTEGER DEFAULT 0,
                reset_time INTEGER NOT NULL
            )
        `);

        // Claim history table - tracks verified on-chain claims
        await db.execute(`
            CREATE TABLE IF NOT EXISTS claim_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT UNIQUE NOT NULL,
                player_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (player_address) REFERENCES players(address)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_claim_player_address 
            ON claim_history(player_address)
        `);

        // Game configuration table for admin-adjustable settings
        await db.execute(`
            CREATE TABLE IF NOT EXISTS game_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                updated_by TEXT
            )
        `);

        // Admin wallets whitelist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_wallets (
                address TEXT PRIMARY KEY,
                name TEXT,
                added_at INTEGER NOT NULL
            )
        `);

        // Activity logs for tracking all admin actions
        await db.execute(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                actor TEXT,
                target TEXT,
                details TEXT,
                created_at INTEGER NOT NULL
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_activity_created 
            ON activity_logs(created_at DESC)
        `);

        // =========== SLOTS-SPECIFIC TABLES (separate from Snake) ===========

        // Slots donors table - separate from snake donors
        await db.execute(`
            CREATE TABLE IF NOT EXISTS slots_donors (
                address TEXT PRIMARY KEY,
                name TEXT DEFAULT '',
                avatar INTEGER DEFAULT 0,
                total_donated TEXT DEFAULT '0',
                donation_count INTEGER DEFAULT 0,
                first_donation INTEGER DEFAULT 0,
                last_donation INTEGER DEFAULT 0,
                telegram TEXT,
                twitter TEXT,
                edit_count INTEGER DEFAULT 0
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_slots_total_donated 
            ON slots_donors(total_donated DESC)
        `);

        // Slots donation history - separate from snake donation history
        await db.execute(`
            CREATE TABLE IF NOT EXISTS slots_donation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT UNIQUE NOT NULL,
                donor_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (donor_address) REFERENCES slots_donors(address)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_slots_donation_donor_address 
            ON slots_donation_history(donor_address)
        `);

        // =========== DEFI STAKING DONATION TABLE ===========
        // For tracking donations to the DeFi Staking reward pool
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donate_stake (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT UNIQUE NOT NULL,
                donor_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                block_number TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_donate_stake_donor 
            ON donate_stake(donor_address)
        `);

        // =========== COMMUNITY BURN DONATION TABLE ===========
        // For tracking donations to the Community Burn Fund
        await db.execute(`
            CREATE TABLE IF NOT EXISTS donate_burn (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT UNIQUE NOT NULL,
                donor_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                block_number TEXT,
                timestamp INTEGER NOT NULL
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_donate_burn_donor 
            ON donate_burn(donor_address)
        `);

        // Burn contributor profiles (for name, avatar, social links)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS burn_profiles (
                address TEXT PRIMARY KEY,
                name TEXT DEFAULT '',
                avatar INTEGER DEFAULT 0,
                telegram TEXT,
                twitter TEXT,
                edit_count INTEGER DEFAULT 0,
                created_at INTEGER,
                updated_at INTEGER
            )
        `);

        // Staking contributor profiles (for DeFi staking)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS staking_profiles (
                address TEXT PRIMARY KEY,
                name TEXT DEFAULT '',
                avatar INTEGER DEFAULT 0,
                telegram TEXT,
                twitter TEXT,
                edit_count INTEGER DEFAULT 0,
                created_at INTEGER,
                updated_at INTEGER
            )
        `);

        // =========== GAME VISIT TRACKING TABLE ===========
        // For global visit statistics across all users
        await db.execute(`
            CREATE TABLE IF NOT EXISTS game_visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                visitor_id TEXT NOT NULL
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_game_visits_time 
            ON game_visits(timestamp)
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_game_visits_game 
            ON game_visits(game_id)
        `);

        // =========== SECURITY: SLIDING WINDOW RATE LIMIT LOGS ===========
        await db.execute(`
            CREATE TABLE IF NOT EXISTS rate_limit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_rll_key_ts
            ON rate_limit_logs(key, timestamp)
        `);

        // =========== SECURITY: GAME SESSION TRACKING ===========
        await db.execute(`
            CREATE TABLE IF NOT EXISTS game_sessions (
                id TEXT PRIMARY KEY,
                player TEXT NOT NULL,
                fingerprint TEXT NOT NULL,
                ip TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                claimed INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_gs_player
            ON game_sessions(player, created_at)
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_gs_fingerprint
            ON game_sessions(fingerprint, created_at)
        `);

        // =========== FOMO ROUND CONFIG TRACKING ===========
        // Store per-round game config for accurate historical display
        await db.execute(`
            CREATE TABLE IF NOT EXISTS fomo_round_configs (
                round_id INTEGER PRIMARY KEY,
                attack_cost TEXT NOT NULL,
                soft_duration INTEGER,
                initial_hard_duration INTEGER,
                time_decrease_step INTEGER,
                max_attacks INTEGER,
                winner_percent INTEGER,
                top_attackers_percent INTEGER,
                min_attacks_for_reward INTEGER,
                claim_expiration_time INTEGER,
                created_at INTEGER NOT NULL
            )
        `);
        // =========== BANMAOHUB SOCIAL TABLES ===========

        // User profiles (linked to wallet address)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_profiles (
                address TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                avatar_url TEXT DEFAULT '',
                bio TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER
            )
        `);

        // Migration for adding banner_url
        try { await db.execute(`ALTER TABLE hub_profiles ADD COLUMN banner_url TEXT DEFAULT ''`); } catch { }

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_profiles_username
            ON hub_profiles(username)
        `);

        // Posts (images/videos uploaded by users)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author_address TEXT NOT NULL,
                media_url TEXT NOT NULL,
                thumb_url TEXT DEFAULT '',
                media_type TEXT NOT NULL DEFAULT 'image',
                caption TEXT DEFAULT '',
                hashtags TEXT DEFAULT '',
                like_count INTEGER DEFAULT 0,
                comment_count INTEGER DEFAULT 0,
                tip_total TEXT DEFAULT '0',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (author_address) REFERENCES hub_profiles(address)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_posts_author
            ON hub_posts(author_address)
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_posts_created
            ON hub_posts(created_at DESC)
        `);

        // Add is_migrated column (safe migration)
        try { await db.execute(`ALTER TABLE hub_posts ADD COLUMN is_migrated INTEGER DEFAULT 0`); } catch { }
        try { await db.execute(`ALTER TABLE hub_posts ADD COLUMN is_featured INTEGER DEFAULT 0`); } catch { }

        // Likes
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_likes (
                post_id INTEGER NOT NULL,
                liker_address TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (post_id, liker_address),
                FOREIGN KEY (post_id) REFERENCES hub_posts(id)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_likes_post
            ON hub_likes(post_id)
        `);

        // Comments
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                author_address TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (post_id) REFERENCES hub_posts(id)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_comments_post
            ON hub_comments(post_id)
        `);

        // Tips (on-chain $banmao tips)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_tips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT UNIQUE NOT NULL,
                post_id INTEGER NOT NULL,
                tipper_address TEXT NOT NULL,
                creator_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                fee_amount TEXT DEFAULT '0',
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (post_id) REFERENCES hub_posts(id)
            )
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_tips_post
            ON hub_tips(post_id)
        `);

        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_hub_tips_creator
            ON hub_tips(creator_address)
        `);

        // Comment replies (parent_id) + likes
        await db.execute(`ALTER TABLE hub_comments ADD COLUMN parent_id INTEGER DEFAULT NULL`).catch(() => { });
        await db.execute(`ALTER TABLE hub_comments ADD COLUMN like_count INTEGER DEFAULT 0`).catch(() => { });

        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_comment_likes (
                comment_id INTEGER NOT NULL,
                liker_address TEXT NOT NULL,
                PRIMARY KEY (comment_id, liker_address)
            )
        `);

        // Bookmarks
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_bookmarks (
                post_id INTEGER NOT NULL,
                user_address TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (post_id, user_address)
            )
        `);

        // Reports
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                reporter_address TEXT NOT NULL,
                reason TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                UNIQUE(post_id, reporter_address)
            )
        `);

        // Follows
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_follows (
                follower_address TEXT NOT NULL,
                following_address TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (follower_address, following_address)
            )
        `);

        // Notifications
        await db.execute(`
            CREATE TABLE IF NOT EXISTS hub_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_address TEXT NOT NULL,
                actor_address TEXT NOT NULL,
                type TEXT NOT NULL, /* 'like', 'comment', 'tip', 'follow' */
                post_id INTEGER,
                read_status INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL
            )
        `);

        initialized = true;
        console.log('Turso database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
}

// Query helpers
export async function getAllPlayers(limit = 100, offset = 0) {
    await initializeDatabase();
    // BigInt strings like "90000000000000000000" overflow INTEGER
    // Sort by: 1) string length DESC (longer = bigger), 2) string value DESC (lexicographic works for same-length numbers)
    const result = await db.execute({
        sql: `SELECT * FROM players ORDER BY LENGTH(highest_claim) DESC, highest_claim DESC LIMIT ? OFFSET ?`,
        args: [limit, offset]
    });
    return result.rows;
}

export async function getPlayerByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT * FROM players WHERE address = ?`,
        args: [address]
    });
    return result.rows[0] || null;
}

export async function insertPlayer(
    address: string,
    name: string,
    avatar: number,
    totalClaimed: string,
    highestClaim: string,
    lastClaimTime: number,
    telegram?: string,
    twitter?: string
) {
    await initializeDatabase();
    await db.execute({
        sql: `INSERT INTO players (address, name, avatar, total_claimed, highest_claim, claim_count, last_claim_time, telegram, twitter)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        args: [address, name, avatar, totalClaimed, highestClaim, lastClaimTime, telegram || null, twitter || null]
    });
}

export async function updatePlayerClaim(
    address: string,
    name: string | null,
    avatar: number | null,
    totalClaimed: string,
    highestClaim: string, // Already calculated as MAX by API
    lastClaimTime: number,
    telegram?: string,
    twitter?: string
) {
    await initializeDatabase();
    // highestClaim is already the MAX value calculated by API (route.ts line 72)
    await db.execute({
        sql: `UPDATE players SET 
              name = COALESCE(?, name),
              avatar = COALESCE(?, avatar),
              total_claimed = ?,
              highest_claim = ?,
              claim_count = claim_count + 1,
              last_claim_time = ?,
              telegram = COALESCE(?, telegram),
              twitter = COALESCE(?, twitter)
              WHERE address = ?`,
        args: [name, avatar, totalClaimed, highestClaim, lastClaimTime, telegram || null, twitter || null, address]
    });
}

export async function updatePlayerProfile(
    address: string,
    name?: string,
    avatar?: number,
    telegram?: string,
    twitter?: string
): Promise<{ success: boolean; editCount: number; error?: string }> {
    await initializeDatabase();

    // First check if player exists
    const player = await getPlayerByAddress(address);

    if (!player) {
        // Player not in database - they need to claim first
        return { success: false, editCount: 0, error: 'Player not found. Claim first to create profile.' };
    }

    const currentEditCount = Number(player.edit_count ?? 0);

    // Check if edit limit reached (3 max)
    if (currentEditCount >= 3) {
        return { success: false, editCount: currentEditCount, error: 'Edit limit reached' };
    }

    // Sanitize inputs
    const sanitizedName = name ? name.trim().slice(0, 20) : null;
    const sanitizedTelegram = telegram ? telegram.trim().slice(0, 50) : null;
    const sanitizedTwitter = twitter ? twitter.trim().slice(0, 50) : null;

    // Increment edit_count
    const result = await db.execute({
        sql: `UPDATE players SET 
              name = COALESCE(?, name),
              avatar = COALESCE(?, avatar),
              telegram = COALESCE(?, telegram),
              twitter = COALESCE(?, twitter),
              edit_count = edit_count + 1
              WHERE address = ?`,
        args: [sanitizedName, avatar ?? null, sanitizedTelegram, sanitizedTwitter, address]
    });

    // Verify update happened
    if (result.rowsAffected === 0) {
        return { success: false, editCount: currentEditCount, error: 'Update failed' };
    }

    return { success: true, editCount: currentEditCount + 1 };
}

// Get player edit count
export async function getPlayerEditCount(address: string): Promise<number> {
    await initializeDatabase();
    const player = await getPlayerByAddress(address);
    return Number(player?.edit_count ?? 0);
}

// ========== DONOR FUNCTIONS ==========

// Get all donors sorted by total donated (no limit - show all)
export async function getAllDonors(limit?: number) {
    await initializeDatabase();
    // If limit is provided, use it; otherwise return all donors
    const sql = limit
        ? `SELECT * FROM donors ORDER BY LENGTH(total_donated) DESC, total_donated DESC LIMIT ?`
        : `SELECT * FROM donors ORDER BY LENGTH(total_donated) DESC, total_donated DESC`;
    const result = await db.execute({
        sql,
        args: limit ? [limit] : []
    });
    return result.rows;
}

// Get single donor by address
export async function getDonorByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT * FROM donors WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
    return result.rows[0] || null;
}

// Upsert donor (for blockchain sync)
export async function upsertDonor(
    address: string,
    totalDonated: string,
    donationCount: number,
    firstDonation: number,
    lastDonation: number
) {
    await initializeDatabase();

    const existing = await getDonorByAddress(address);

    if (existing) {
        await db.execute({
            sql: `UPDATE donors SET 
                  total_donated = ?,
                  donation_count = ?,
                  last_donation = ?
                  WHERE LOWER(address) = LOWER(?)`,
            args: [totalDonated, donationCount, lastDonation, address]
        });
    } else {
        await db.execute({
            sql: `INSERT INTO donors (address, total_donated, donation_count, first_donation, last_donation)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [address, totalDonated, donationCount, firstDonation, lastDonation]
        });
    }
}

// Update donor profile (for user edits)
export async function updateDonorProfile(
    address: string,
    name?: string,
    avatar?: number,
    telegram?: string,
    twitter?: string
): Promise<{ success: boolean; editCount: number; error?: string }> {
    await initializeDatabase();

    const donor = await getDonorByAddress(address);

    if (!donor) {
        return { success: false, editCount: 0, error: 'Not a donor. Donate first to create profile.' };
    }

    const currentEditCount = Number(donor.edit_count ?? 0);

    // Unlimited edits for donors (no limit like players)
    const sanitizedName = name ? name.trim().slice(0, 20) : null;
    const sanitizedTelegram = telegram ? telegram.trim().slice(0, 50) : null;
    const sanitizedTwitter = twitter ? twitter.trim().slice(0, 50) : null;

    const result = await db.execute({
        sql: `UPDATE donors SET 
              name = COALESCE(?, name),
              avatar = COALESCE(?, avatar),
              telegram = COALESCE(?, telegram),
              twitter = COALESCE(?, twitter),
              edit_count = edit_count + 1
              WHERE LOWER(address) = LOWER(?)`,
        args: [sanitizedName, avatar ?? null, sanitizedTelegram, sanitizedTwitter, address]
    });

    if (result.rowsAffected === 0) {
        return { success: false, editCount: currentEditCount, error: 'Update failed' };
    }

    return { success: true, editCount: currentEditCount + 1 };
}

// Get donor badge based on total donated amount (adjusted for 1B total supply)
export function getDonorBadge(totalDonated: string): { tier: string; icon: string; color: string; cssClass: string } {
    const amount = Number(totalDonated) / 1e18; // Convert from wei

    // Tiers based on 1 Billion total supply
    if (amount >= 10000000) return { tier: 'Diamond', icon: '💎', color: '#60a5fa', cssClass: 'badge-diamond' };    // 1% of supply
    if (amount >= 1000000) return { tier: 'Gold', icon: '🥇', color: '#fbbf24', cssClass: 'badge-gold' };          // 0.1%
    if (amount >= 100000) return { tier: 'Silver', icon: '🥈', color: '#cbd5e1', cssClass: 'badge-silver' };        // 0.01%
    if (amount >= 10000) return { tier: 'Bronze', icon: '🥉', color: '#f97316', cssClass: 'badge-bronze' };         // 0.001%
    return { tier: 'Supporter', icon: '💜', color: '#a855f7', cssClass: 'badge-supporter' };                        // Any donation
}

// Insert a new donation history record
export async function insertDonationHistory(txHash: string, donorAddress: string, amount: string, timestamp: number) {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO donation_history (tx_hash, donor_address, amount, timestamp) VALUES (?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), donorAddress.toLowerCase(), amount, timestamp]
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to insert donation history:', error);
        return { success: false, error: 'Failed to insert donation history' };
    }
}

// Get all donations by a donor address
export async function getDonationsByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT tx_hash, amount, timestamp FROM donation_history WHERE LOWER(donor_address) = LOWER(?) ORDER BY timestamp DESC`,
        args: [address]
    });
    return result.rows;
}

// Check if a donation transaction hash has already been processed
export async function isDonationTxUsed(txHash: string): Promise<boolean> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT 1 FROM donation_history WHERE LOWER(tx_hash) = LOWER(?)`,
        args: [txHash]
    });
    return result.rows.length > 0;
}

// ========== SLOTS-SPECIFIC DONOR FUNCTIONS (separate from Snake) ==========

// Get all slots donors sorted by total donated
export async function getAllSlotsDonors(limit?: number) {
    await initializeDatabase();
    const query = limit
        ? `SELECT * FROM slots_donors ORDER BY LENGTH(total_donated) DESC, total_donated DESC LIMIT ?`
        : `SELECT * FROM slots_donors ORDER BY LENGTH(total_donated) DESC, total_donated DESC`;
    const result = await db.execute({
        sql: query,
        args: limit ? [limit] : []
    });
    return result.rows;
}

// Get single slots donor by address
export async function getSlotsDonorByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT * FROM slots_donors WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
    return result.rows[0] || null;
}

// Upsert slots donor (for blockchain sync)
export async function upsertSlotsDonor(
    address: string,
    totalDonated: string,
    donationCount: number,
    firstDonation: number,
    lastDonation: number
) {
    await initializeDatabase();
    const existing = await getSlotsDonorByAddress(address);
    if (existing) {
        await db.execute({
            sql: `UPDATE slots_donors SET 
                total_donated = ?,
                donation_count = ?,
                last_donation = ?
                WHERE LOWER(address) = LOWER(?)`,
            args: [totalDonated, donationCount, lastDonation, address]
        });
    } else {
        await db.execute({
            sql: `INSERT INTO slots_donors (address, total_donated, donation_count, first_donation, last_donation)
                VALUES (?, ?, ?, ?, ?)`,
            args: [address.toLowerCase(), totalDonated, donationCount, firstDonation, lastDonation]
        });
    }
}

// Insert a new slots donation history record
export async function insertSlotsDonationHistory(txHash: string, donorAddress: string, amount: string, timestamp: number) {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO slots_donation_history (tx_hash, donor_address, amount, timestamp) VALUES (?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), donorAddress.toLowerCase(), amount, timestamp]
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to insert slots donation history:', error);
        return { success: false, error: 'Failed to insert slots donation history' };
    }
}

// Check if a slots donation transaction hash has already been processed
export async function isSlotsDonationTxUsed(txHash: string): Promise<boolean> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT 1 FROM slots_donation_history WHERE LOWER(tx_hash) = LOWER(?)`,
        args: [txHash]
    });
    return result.rows.length > 0;
}

// ========== DEFI STAKING DONATION FUNCTIONS ==========

// Insert a new staking donation history record
export async function insertStakeDonation(
    txHash: string,
    donorAddress: string,
    amount: string,
    blockNumber: string,
    timestamp: number
) {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO donate_stake (tx_hash, donor_address, amount, block_number, timestamp) VALUES (?, ?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), donorAddress.toLowerCase(), amount, blockNumber, timestamp]
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to insert stake donation:', error);
        return { success: false, error: 'Failed to insert stake donation' };
    }
}

// Get all staking donations by address
export async function getStakeDonationsByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT tx_hash, amount, block_number, timestamp FROM donate_stake WHERE LOWER(donor_address) = LOWER(?) ORDER BY timestamp DESC`,
        args: [address]
    });
    return result.rows;
}

// Get all staking donations (for cache refresh)
export async function getAllStakeDonations() {
    await initializeDatabase();
    const result = await db.execute(
        `SELECT tx_hash, donor_address, amount, block_number, timestamp FROM donate_stake ORDER BY timestamp DESC`
    );
    return result.rows;
}

// Check if a staking donation transaction hash has been processed
export async function isStakeDonationTxUsed(txHash: string): Promise<boolean> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT 1 FROM donate_stake WHERE LOWER(tx_hash) = LOWER(?)`,
        args: [txHash]
    });
    return result.rows.length > 0;
}

// ========== BURN PROFILE FUNCTIONS ==========

// Get burn profile by address
export async function getBurnProfileByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT * FROM burn_profiles WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
    return result.rows[0] || null;
}

// Create or update burn profile
export async function upsertBurnProfile(
    address: string,
    name: string,
    avatar: number,
    telegram?: string,
    twitter?: string
): Promise<{ success: boolean; profile?: unknown; editCount: number; error?: string }> {
    await initializeDatabase();

    const existing = await getBurnProfileByAddress(address);
    const now = Date.now();

    if (existing) {
        const currentEditCount = Number(existing.edit_count ?? 0);

        // Check edit limit (max 3)
        if (currentEditCount >= 3) {
            return { success: false, editCount: currentEditCount, error: 'Edit limit reached (max 3 edits)' };
        }

        // Update existing profile
        const sanitizedName = name ? name.trim().slice(0, 20) : '';
        const sanitizedTelegram = telegram ? telegram.trim().slice(0, 50) : null;
        const sanitizedTwitter = twitter ? twitter.trim().slice(0, 50) : null;

        await db.execute({
            sql: `UPDATE burn_profiles SET 
                  name = ?,
                  avatar = ?,
                  telegram = ?,
                  twitter = ?,
                  edit_count = edit_count + 1,
                  updated_at = ?
                  WHERE LOWER(address) = LOWER(?)`,
            args: [sanitizedName, avatar, sanitizedTelegram, sanitizedTwitter, now, address]
        });

        const updated = await getBurnProfileByAddress(address);
        return { success: true, profile: updated, editCount: currentEditCount + 1 };
    } else {
        // Insert new profile (first edit counts as edit #1)
        const sanitizedName = name ? name.trim().slice(0, 20) : `Donor ${address.slice(0, 6)}`;
        const sanitizedTelegram = telegram ? telegram.trim().slice(0, 50) : null;
        const sanitizedTwitter = twitter ? twitter.trim().slice(0, 50) : null;

        await db.execute({
            sql: `INSERT INTO burn_profiles (address, name, avatar, telegram, twitter, edit_count, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
            args: [address.toLowerCase(), sanitizedName, avatar, sanitizedTelegram, sanitizedTwitter, now, now]
        });

        const inserted = await getBurnProfileByAddress(address);
        return { success: true, profile: inserted, editCount: 1 };
    }
}

// ========== RATE LIMITING (Database-backed) ==========


export async function checkRateLimitDB(
    key: string,
    windowMs: number,
    maxCount: number
): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    await initializeDatabase();
    const now = Date.now();

    const result = await db.execute({
        sql: `SELECT count, reset_time FROM rate_limits WHERE key = ?`,
        args: [key.toLowerCase()]
    });

    const entry = result.rows[0] as unknown as { count: number; reset_time: number } | undefined;

    if (!entry || now > entry.reset_time) {
        // New window - reset or insert
        const resetTime = now + windowMs;
        await db.execute({
            sql: `INSERT OR REPLACE INTO rate_limits (key, count, reset_time) VALUES (?, 1, ?)`,
            args: [key.toLowerCase(), resetTime]
        });
        return { allowed: true, count: 1, resetTime };
    }

    if (entry.count >= maxCount) {
        return { allowed: false, count: entry.count, resetTime: entry.reset_time };
    }

    // Increment count
    await db.execute({
        sql: `UPDATE rate_limits SET count = count + 1 WHERE key = ?`,
        args: [key.toLowerCase()]
    });

    return { allowed: true, count: entry.count + 1, resetTime: entry.reset_time };
}

// ========== CLAIM HISTORY (On-chain verification) ==========

// Check if a transaction hash has already been recorded
export async function isClaimTxHashUsed(txHash: string): Promise<boolean> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT 1 FROM claim_history WHERE LOWER(tx_hash) = LOWER(?)`,
        args: [txHash]
    });
    return result.rows.length > 0;
}

// Record a verified claim transaction
export async function recordClaimTransaction(
    txHash: string,
    playerAddress: string,
    amount: string
): Promise<{ success: boolean; error?: string }> {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT INTO claim_history (tx_hash, player_address, amount, timestamp) VALUES (?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), playerAddress.toLowerCase(), amount, Date.now()]
        });
        return { success: true };
    } catch (error) {
        // Unique constraint violation = tx already recorded
        console.error('Failed to record claim:', error);
        return { success: false, error: 'Transaction already processed' };
    }
}

// Get claim history for a player
export async function getClaimsByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT tx_hash, amount, timestamp FROM claim_history WHERE LOWER(player_address) = LOWER(?) ORDER BY timestamp DESC`,
        args: [address]
    });
    return result.rows;
}

// ========== GAME CONFIG (Admin Dashboard) ==========

export interface GameConfigEntry {
    key: string;
    value: string;
    updated_at: number;
    updated_by: string | null;
}

// Get a single config value
export async function getConfig(key: string): Promise<string | null> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT value FROM game_config WHERE key = ?`,
        args: [key]
    });
    return result.rows[0] ? String((result.rows[0] as unknown as { value: string }).value) : null;
}

// Get all config values
export async function getAllConfig(): Promise<GameConfigEntry[]> {
    await initializeDatabase();
    const result = await db.execute(`SELECT key, value, updated_at, updated_by FROM game_config ORDER BY key`);
    return result.rows as unknown as GameConfigEntry[];
}

// Set a config value
export async function setConfig(key: string, value: string, updatedBy?: string): Promise<void> {
    await initializeDatabase();
    await db.execute({
        sql: `INSERT OR REPLACE INTO game_config (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)`,
        args: [key, value, Date.now(), updatedBy || null]
    });
}

// ========== ADMIN WALLETS ==========

// Check if a wallet is an admin
export async function isAdminWallet(address: string): Promise<boolean> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT 1 FROM admin_wallets WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
    return result.rows.length > 0;
}

// Get all admin wallets
export async function getAllAdminWallets(): Promise<{ address: string; name: string | null; added_at: number }[]> {
    await initializeDatabase();
    const result = await db.execute(`SELECT address, name, added_at FROM admin_wallets ORDER BY added_at`);
    return result.rows as unknown as { address: string; name: string | null; added_at: number }[];
}

// Add an admin wallet
export async function addAdminWallet(address: string, name?: string): Promise<void> {
    await initializeDatabase();
    await db.execute({
        sql: `INSERT OR IGNORE INTO admin_wallets (address, name, added_at) VALUES (?, ?, ?)`,
        args: [address.toLowerCase(), name || null, Date.now()]
    });
}

// Remove an admin wallet
export async function removeAdminWallet(address: string): Promise<void> {
    await initializeDatabase();
    await db.execute({
        sql: `DELETE FROM admin_wallets WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
}

// ========== ACTIVITY LOGS ==========

export interface ActivityLog {
    id: number;
    action: string;
    actor: string | null;
    target: string | null;
    details: string | null;
    created_at: number;
}

// Log an activity
export async function logActivity(
    action: string,
    actor?: string,
    target?: string,
    details?: Record<string, unknown>
): Promise<void> {
    await initializeDatabase();
    await db.execute({
        sql: `INSERT INTO activity_logs (action, actor, target, details, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: [action, actor || null, target || null, details ? JSON.stringify(details) : null, Date.now()]
    });
}

// Get activity logs with pagination
export async function getActivityLogs(limit = 50, offset = 0): Promise<ActivityLog[]> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT id, action, actor, target, details, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        args: [limit, offset]
    });
    return result.rows as unknown as ActivityLog[];
}

// ========== CLAIM STATISTICS ==========

export interface ClaimStats {
    claimsToday: number;
    totalClaimed: string;
    uniquePlayers: number;
    claimsThisHour: number;
}

// Get claim statistics
export async function getClaimStats(): Promise<ClaimStats> {
    await initializeDatabase();

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const hourAgo = now - 60 * 60 * 1000;

    // Claims today
    const todayResult = await db.execute({
        sql: `SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS REAL)), 0) as total FROM claim_history WHERE timestamp >= ?`,
        args: [todayStart]
    });

    // Claims this hour
    const hourResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM claim_history WHERE timestamp >= ?`,
        args: [hourAgo]
    });

    // Unique players all time
    const playersResult = await db.execute(
        `SELECT COUNT(DISTINCT player_address) as count FROM claim_history`
    );

    // Total claimed all time
    const totalResult = await db.execute(
        `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total FROM claim_history`
    );

    const todayRow = todayResult.rows[0] as unknown as { count: number; total: number };
    const hourRow = hourResult.rows[0] as unknown as { count: number };
    const playersRow = playersResult.rows[0] as unknown as { count: number };
    const totalRow = totalResult.rows[0] as unknown as { total: number };

    return {
        claimsToday: Number(todayRow?.count || 0),
        totalClaimed: String(totalRow?.total || 0),
        uniquePlayers: Number(playersRow?.count || 0),
        claimsThisHour: Number(hourRow?.count || 0)
    };
}

// Get recent claims for logs
export async function getRecentClaims(limit = 20): Promise<{ tx_hash: string; player_address: string; amount: string; timestamp: number }[]> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT tx_hash, player_address, amount, timestamp FROM claim_history ORDER BY timestamp DESC LIMIT ?`,
        args: [limit]
    });
    return result.rows as unknown as { tx_hash: string; player_address: string; amount: string; timestamp: number }[];
}

// ================== BANMAO SLOTS FUNCTIONS ==================

// Initialize slots tables (called from initializeDatabase)
export async function initializeSlotsDatabase() {
    // Slots spin history - Updated to support multiple entries per txHash (multi-spins)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS slots_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_address TEXT NOT NULL,
            bet_amount TEXT NOT NULL,
            payout TEXT NOT NULL,
            multiplier REAL NOT NULL,
            symbols TEXT NOT NULL,
            is_jackpot INTEGER DEFAULT 0,
            tx_hash TEXT,
            timestamp INTEGER NOT NULL,
            seed TEXT,
            pool_id INTEGER,
            pool_name TEXT,
            log_index INTEGER DEFAULT 0
        )
    `);

    // Migration: If tx_hash UNIQUE constraint exists, we need to remove it.
    // In SQLite, this usually requires recreating the table or just ignoring errors if we add a new index.
    // However, we can at least ensure the new columns and index exist.
    try {
        await db.execute(`ALTER TABLE slots_history ADD COLUMN log_index INTEGER DEFAULT 0`);
    } catch { /* Column already exists */ }

    // Ensure we have a unique index on (tx_hash, log_index) to prevent duplicate recording of the SAME event
    await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_tx_log ON slots_history(tx_hash, log_index)
    `);

    // Check if we need to migrate slots_history (to remove UNIQUE constraint on tx_hash)
    try {
        const indexList = await db.execute("PRAGMA index_list(slots_history)");
        const hasOldUnique = indexList.rows.some((row: any) =>
            row.unique === 1 && row.name.startsWith('sqlite_autoindex_slots_history')
        );

        if (hasOldUnique) {
            console.log('[Slots DB] Old UNIQUE constraint detected. Migrating table...');

            // 1. Rename old table
            await db.execute("ALTER TABLE slots_history RENAME TO slots_history_old");

            // 2. Create new table without UNIQUE on tx_hash
            await db.execute(`
                CREATE TABLE slots_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_address TEXT NOT NULL,
                    bet_amount TEXT NOT NULL,
                    payout TEXT NOT NULL,
                    multiplier REAL NOT NULL,
                    symbols TEXT NOT NULL,
                    is_jackpot INTEGER DEFAULT 0,
                    tx_hash TEXT,
                    timestamp INTEGER NOT NULL,
                    seed TEXT,
                    pool_id INTEGER,
                    pool_name TEXT,
                    log_index INTEGER DEFAULT 0
                )
            `);

            // 3. Copy data
            await db.execute(`
                INSERT INTO slots_history (
                    id, player_address, bet_amount, payout, multiplier, symbols, 
                    is_jackpot, tx_hash, timestamp, seed, pool_id, pool_name, log_index
                )
                SELECT 
                    id, player_address, bet_amount, payout, multiplier, symbols, 
                    is_jackpot, tx_hash, timestamp, seed, pool_id, pool_name, COALESCE(log_index, 0)
                FROM slots_history_old
            `);

            // 4. Drop old table
            await db.execute("DROP TABLE slots_history_old");
            console.log('[Slots DB] Migration successful');
        }
    } catch (err) {
        console.error('[Slots DB] Migration failed:', err);
    }

    // Ensure indices exist
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_slots_player ON slots_history(player_address)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_slots_timestamp ON slots_history(timestamp DESC)`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_tx_log ON slots_history(tx_hash, log_index)`);

    // Slots player stats with profile fields
    await db.execute(`
        CREATE TABLE IF NOT EXISTS slots_players (
            address TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            avatar INTEGER DEFAULT 0,
            telegram TEXT,
            twitter TEXT,
            edit_count INTEGER DEFAULT 0,
            total_spins INTEGER DEFAULT 0,
            total_wins INTEGER DEFAULT 0,
            total_wagered TEXT DEFAULT '0',
            total_won TEXT DEFAULT '0',
            biggest_win TEXT DEFAULT '0',
            jackpot_wins INTEGER DEFAULT 0,
            last_spin_time INTEGER,
            today_spins INTEGER DEFAULT 0,
            today_wins INTEGER DEFAULT 0,
            today_wagered TEXT DEFAULT '0',
            today_won TEXT DEFAULT '0',
            last_active_day TEXT
        )
    `);

    // Migrations for new columns
    try { await db.execute(`ALTER TABLE slots_players ADD COLUMN today_spins INTEGER DEFAULT 0`); } catch { }
    try { await db.execute(`ALTER TABLE slots_players ADD COLUMN today_wins INTEGER DEFAULT 0`); } catch { }
    try { await db.execute(`ALTER TABLE slots_players ADD COLUMN today_wagered TEXT DEFAULT '0'`); } catch { }
    try { await db.execute(`ALTER TABLE slots_players ADD COLUMN today_won TEXT DEFAULT '0'`); } catch { }
    try { await db.execute(`ALTER TABLE slots_players ADD COLUMN last_active_day TEXT`); } catch { }

    // Migration: Add profile columns to existing slots_players table if missing
    try {
        await db.execute(`ALTER TABLE slots_players ADD COLUMN name TEXT DEFAULT ''`);
    } catch { /* Column already exists */ }
    try {
        await db.execute(`ALTER TABLE slots_players ADD COLUMN avatar INTEGER DEFAULT 0`);
    } catch { /* Column already exists */ }
    try {
        await db.execute(`ALTER TABLE slots_players ADD COLUMN telegram TEXT`);
    } catch { /* Column already exists */ }
    try {
        await db.execute(`ALTER TABLE slots_players ADD COLUMN twitter TEXT`);
    } catch { /* Column already exists */ }
    try {
        await db.execute(`ALTER TABLE slots_players ADD COLUMN edit_count INTEGER DEFAULT 0`);
    } catch { /* Column already exists */ }
    // Migration: Add total_wins column if missing
    try {
        await db.execute(`ALTER TABLE slots_players ADD COLUMN total_wins INTEGER DEFAULT 0`);
    } catch { /* Column already exists */ }

    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slots_biggest_win ON slots_players(biggest_win DESC)
    `);
}

// Record a spin result
export async function recordSlotsSpin(
    playerAddress: string,
    betAmount: string,
    payout: string,
    symbols: string,
    isJackpot: boolean,
    txHash: string,
    seed?: string,
    poolId?: number,
    poolName?: string,
    logIndex: number = 0
): Promise<boolean> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    const normalizedAddress = playerAddress.toLowerCase();
    const now = Date.now();
    const multiplier = Number(payout) / Number(betAmount) || 0;

    try {
        // Insert spin history
        await db.execute({
            sql: `INSERT OR IGNORE INTO slots_history (player_address, bet_amount, payout, multiplier, symbols, is_jackpot, tx_hash, timestamp, seed, pool_id, pool_name, log_index)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [normalizedAddress, betAmount, payout, multiplier, symbols, isJackpot ? 1 : 0, txHash, now, seed || null, poolId || null, poolName || null, logIndex]
        });

        // Update player stats
        const existing = await db.execute({
            sql: `SELECT * FROM slots_players WHERE address = ?`,
            args: [normalizedAddress]
        });

        if (existing.rows.length > 0) {
            const player = existing.rows[0] as any;
            const newTotalWagered = (BigInt(player.total_wagered || '0') + BigInt(betAmount)).toString();
            const newTotalWon = (BigInt(player.total_won || '0') + BigInt(payout)).toString();
            const currentBiggest = BigInt(player.biggest_win || '0');
            const newBiggest = BigInt(payout) > currentBiggest ? payout : player.biggest_win;

            // Determine if this spin is a win (payout > 0)
            const isWin = BigInt(payout) > BigInt(0) ? 1 : 0;

            const todayStr = new Date().toISOString().split('T')[0];

            await db.execute({
                sql: `UPDATE slots_players SET 
                      total_spins = total_spins + 1,
                      total_wins = total_wins + ?,
                      total_wagered = ?,
                      total_won = ?,
                      biggest_win = ?,
                      jackpot_wins = jackpot_wins + ?,
                      last_spin_time = ?,
                      today_spins = CASE WHEN last_active_day = ? THEN today_spins + 1 ELSE 1 END,
                      today_wins = CASE WHEN last_active_day = ? THEN today_wins + ? ELSE ? END,
                      today_wagered = CASE WHEN last_active_day = ? 
                          THEN CAST(CAST(today_wagered AS BIGINT) + CAST(? AS BIGINT) AS TEXT) 
                          ELSE ? END,
                      today_won = CASE WHEN last_active_day = ? 
                          THEN CAST(CAST(today_won AS BIGINT) + CAST(? AS BIGINT) AS TEXT) 
                          ELSE ? END,
                      last_active_day = ?
                      WHERE address = ?`,
                args: [
                    isWin, newTotalWagered, newTotalWon, newBiggest, isJackpot ? 1 : 0, now,
                    todayStr, // for today_spins check
                    todayStr, isWin, isWin, // for today_wins check
                    todayStr, betAmount, betAmount, // for today_wagered check
                    todayStr, payout, payout, // for today_won check
                    todayStr, // set last_active_day
                    normalizedAddress
                ]
            });
        } else {
            // Determine if first spin is a win
            const isWin = BigInt(payout) > BigInt(0) ? 1 : 0;
            const todayStr = new Date().toISOString().split('T')[0];

            await db.execute({
                sql: `INSERT INTO slots_players (
                    address, total_spins, total_wins, total_wagered, total_won, 
                    biggest_win, jackpot_wins, last_spin_time,
                    today_spins, today_wins, today_wagered, today_won, last_active_day
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
                args: [
                    normalizedAddress, isWin, betAmount, payout, payout, isJackpot ? 1 : 0, now,
                    isWin, betAmount, payout, todayStr
                ]
            });
        }

        return true;
    } catch (error) {
        console.error('Error recording slots spin:', error);
        return false;
    }
}

// Get slots history for a player or pool
export async function getSlotsHistory(playerAddress?: string, limit = 50, poolId?: number): Promise<any[]> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    // JOIN on slots_players (not players) for correct profile data
    const baseQuery = `
        SELECT h.*, p.name as player_name, p.avatar as player_avatar
        FROM slots_history h
        LEFT JOIN slots_players p ON LOWER(h.player_address) = LOWER(p.address)
    `;

    let whereConditions: string[] = [];
    let args: any[] = [];

    if (playerAddress) {
        whereConditions.push('h.player_address = ?');
        args.push(playerAddress.toLowerCase());
    }

    if (poolId !== undefined && poolId !== null) {
        whereConditions.push('h.pool_id = ?');
        args.push(poolId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `${baseQuery} ${whereClause} ORDER BY h.timestamp DESC LIMIT ?`;
    args.push(limit);

    const result = await db.execute({ sql, args });
    return result.rows as any[];
}

// Get slots leaderboard with sorting options
export async function getSlotsLeaderboard(
    limit = 20,
    sortBy: 'biggestWin' | 'mostSpins' | 'profit' | 'winRate' | 'hotToday' | 'jackpotKings' | 'highRollers' = 'biggestWin'
): Promise<any[]> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    let orderByClause = 'CAST(biggest_win AS REAL) DESC';

    switch (sortBy) {
        case 'mostSpins':
            orderByClause = 'total_spins DESC';
            break;
        case 'profit':
            orderByClause = '(CAST(total_won AS REAL) - CAST(total_wagered AS REAL)) DESC';
            break;
        case 'winRate':
            // Min 50 spins required for winRate ranking to avoid 1/1 100% users topping chart
            orderByClause = 'CASE WHEN total_spins >= 50 THEN (CAST(total_wins AS REAL) / total_spins) ELSE 0 END DESC';
            break;
        case 'hotToday':
            orderByClause = 'CAST(today_won AS REAL) DESC';
            break;
        case 'jackpotKings':
            orderByClause = 'jackpot_wins DESC';
            break;
        case 'highRollers':
            orderByClause = 'CAST(total_wagered AS REAL) DESC';
            break;
        default: // biggestWin
            orderByClause = 'CAST(biggest_win AS REAL) DESC';
    }

    const result = await db.execute(`
        SELECT * FROM slots_players
        ORDER BY ${orderByClause}
        LIMIT ${limit}
    `);

    return result.rows as any[];
}

// Get slots stats (for admin dashboard)
export async function getSlotsStats(): Promise<{
    totalSpins: number;
    totalWagered: string;
    totalPaidOut: string;
    jackpotCount: number;
    uniquePlayers: number;
}> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    const statsResult = await db.execute(`
        SELECT 
            COUNT(*) as total_spins,
            COALESCE(SUM(CAST(bet_amount AS REAL)), 0) as total_wagered,
            COALESCE(SUM(CAST(payout AS REAL)), 0) as total_paid,
            SUM(is_jackpot) as jackpot_count
        FROM slots_history
    `);

    const playersResult = await db.execute(`
        SELECT COUNT(*) as count FROM slots_players
    `);

    const stats = statsResult.rows[0] as any;
    const players = playersResult.rows[0] as any;

    return {
        totalSpins: Number(stats?.total_spins || 0),
        totalWagered: String(stats?.total_wagered || '0'),
        totalPaidOut: String(stats?.total_paid || '0'),
        jackpotCount: Number(stats?.jackpot_count || 0),
        uniquePlayers: Number(players?.count || 0)
    };
}

// Check if tx hash + log index already recorded (prevent duplicates)
export async function isSlotsTxHashUsed(txHash: string, logIndex: number = 0): Promise<boolean> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    const result = await db.execute({
        sql: `SELECT 1 FROM slots_history WHERE tx_hash = ? AND log_index = ?`,
        args: [txHash, logIndex]
    });
    return result.rows.length > 0;
}

// Get slots player by address
export async function getSlotsPlayerByAddress(address: string): Promise<any | null> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    const result = await db.execute({
        sql: `SELECT * FROM slots_players WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
    return result.rows[0] || null;
}

// Update slots player profile (name, avatar, telegram, twitter)
export async function updateSlotsPlayerProfile(
    address: string,
    name?: string,
    avatar?: number,
    telegram?: string,
    twitter?: string
): Promise<{ success: boolean; editCount: number; error?: string }> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    const normalizedAddress = address.toLowerCase();
    const player = await getSlotsPlayerByAddress(normalizedAddress);

    if (!player) {
        // Create new player entry with profile info
        const sanitizedName = name?.trim().slice(0, 20) || `Spinner ${address.slice(0, 6)}`;
        await db.execute({
            sql: `INSERT INTO slots_players (address, name, avatar, telegram, twitter, edit_count, total_spins)
                  VALUES (?, ?, ?, ?, ?, 0, 0)`,
            args: [normalizedAddress, sanitizedName, avatar ?? 0, telegram?.trim() || null, twitter?.trim() || null]
        });
        return { success: true, editCount: 0 };
    }

    const currentEditCount = Number(player.edit_count ?? 0);

    // Check edit limit (3 max)
    if (currentEditCount >= 3) {
        return { success: false, editCount: currentEditCount, error: 'Edit limit reached (3 max)' };
    }

    // Sanitize inputs
    const sanitizedName = name ? name.trim().slice(0, 20) : null;
    const sanitizedTelegram = telegram ? telegram.trim().replace(/^@/, '').slice(0, 50) : null;
    const sanitizedTwitter = twitter ? twitter.trim().replace(/^@/, '').slice(0, 50) : null;

    // Update profile
    await db.execute({
        sql: `UPDATE slots_players SET 
              name = COALESCE(?, name),
              avatar = COALESCE(?, avatar),
              telegram = COALESCE(?, telegram),
              twitter = COALESCE(?, twitter),
              edit_count = edit_count + 1
              WHERE LOWER(address) = LOWER(?)`,
        args: [sanitizedName, avatar ?? null, sanitizedTelegram, sanitizedTwitter, normalizedAddress]
    });

    return { success: true, editCount: currentEditCount + 1 };
}

// Get slots player edit count
export async function getSlotsPlayerEditCount(address: string): Promise<number> {
    const player = await getSlotsPlayerByAddress(address);
    return Number(player?.edit_count ?? 0);
}

// ========== CLEANUP & MAINTENANCE ==========

// Cleanup old slots history records
// Default: keep 15 days, max 2000 records
export async function cleanupOldSlotsHistory(daysToKeep: number = 15, maxRecords: number = 2000): Promise<number> {
    await initializeDatabase();
    await initializeSlotsDatabase();

    let totalDeleted = 0;

    // Step 1: Delete records older than daysToKeep (keep jackpots)
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const timeResult = await db.execute({
        sql: `DELETE FROM slots_history WHERE timestamp < ? AND (is_jackpot = 0 OR is_jackpot IS NULL)`,
        args: [cutoffTime]
    });
    totalDeleted += timeResult.rowsAffected;

    // Step 2: Enforce max records limit (keep newest, delete oldest non-jackpot)
    const countResult = await db.execute(`SELECT COUNT(*) as count FROM slots_history`);
    const currentCount = Number((countResult.rows[0] as any)?.count || 0);

    if (currentCount > maxRecords) {
        const toDelete = currentCount - maxRecords;
        // Delete oldest non-jackpot records beyond limit
        const limitResult = await db.execute({
            sql: `DELETE FROM slots_history WHERE id IN (
                SELECT id FROM slots_history 
                WHERE is_jackpot = 0 OR is_jackpot IS NULL 
                ORDER BY timestamp ASC 
                LIMIT ?
            )`,
            args: [toDelete]
        });
        totalDeleted += limitResult.rowsAffected;
    }

    console.log(`[cleanup] Deleted ${totalDeleted} old slots_history records (${daysToKeep} days, max ${maxRecords})`);
    return totalDeleted;
}

// Cleanup expired rate limits
export async function cleanupRateLimits(): Promise<number> {
    await initializeDatabase();

    const now = Date.now();
    const result = await db.execute({
        sql: `DELETE FROM rate_limits WHERE reset_time < ?`,
        args: [now]
    });

    return result.rowsAffected;
}

// ========== GAME VISIT TRACKING (Global synchronization) ==========

const VISIT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Record a game visit
export async function recordGameVisitDB(gameId: string, visitorId: string): Promise<void> {
    await initializeDatabase();
    await db.execute({
        sql: `INSERT INTO game_visits (game_id, timestamp, visitor_id) VALUES (?, ?, ?)`,
        args: [gameId, Date.now(), visitorId]
    });
}

// Get visit stats for all games
export async function getGameVisitStatsDB(gameIds: string[]): Promise<Record<string, { visits24h: number; rank: number }>> {
    await initializeDatabase();

    const now = Date.now();
    const cutoffTime = now - VISIT_EXPIRY_MS;

    // Get counts for each game in last 24h
    const result = await db.execute({
        sql: `SELECT game_id, COUNT(*) as count 
              FROM game_visits 
              WHERE timestamp >= ? 
              GROUP BY game_id`,
        args: [cutoffTime]
    });

    // Build visit counts map
    const visitCounts: Record<string, number> = {};
    for (const gameId of gameIds) {
        visitCounts[gameId] = 0;
    }

    for (const row of result.rows) {
        const gameId = String((row as any).game_id);
        const count = Number((row as any).count);
        if (gameIds.includes(gameId)) {
            visitCounts[gameId] = count;
        }
    }

    // Sort by visits to determine rank
    const sortedGames = gameIds
        .map(id => ({ id, visits: visitCounts[id] }))
        .sort((a, b) => b.visits - a.visits);

    // Create stats with rank
    const stats: Record<string, { visits24h: number; rank: number }> = {};
    sortedGames.forEach((game, index) => {
        stats[game.id] = {
            visits24h: visitCounts[game.id],
            rank: index + 1,
        };
    });

    return stats;
}

// Cleanup old visits (older than 24h)
export async function cleanupOldGameVisits(): Promise<number> {
    await initializeDatabase();

    const cutoffTime = Date.now() - VISIT_EXPIRY_MS;
    const result = await db.execute({
        sql: `DELETE FROM game_visits WHERE timestamp < ?`,
        args: [cutoffTime]
    });

    console.log(`[cleanup] Deleted ${result.rowsAffected} old game_visits records`);
    return result.rowsAffected;
}

// ========== BURN DONATIONS (Community wallet donations - for /defi/burn) ==========

// Insert a new burn donation record (community wallet)
export async function insertBurnDonation(
    txHash: string,
    donorAddress: string,
    amount: string,
    blockNumber: string | null,
    timestamp: number
): Promise<{ success: boolean; error?: string }> {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO donate_burn (tx_hash, donor_address, amount, block_number, timestamp) VALUES (?, ?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), donorAddress.toLowerCase(), amount, blockNumber, timestamp]
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to insert burn donation:', error);
        return { success: false, error: 'Failed to insert burn donation' };
    }
}

// Check if a burn donation tx has been recorded
export async function isBurnDonationTxUsed(txHash: string): Promise<boolean> {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT 1 FROM donate_burn WHERE LOWER(tx_hash) = LOWER(?)`,
        args: [txHash]
    });
    return result.rows.length > 0;
}

// Get all burn donations (for leaderboard)
export async function getAllBurnDonations() {
    await initializeDatabase();
    const result = await db.execute(
        `SELECT tx_hash, donor_address, amount, block_number, timestamp FROM donate_burn ORDER BY timestamp DESC`
    );
    return result.rows;
}

// Get burn donations by address
export async function getBurnDonationsByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT tx_hash, amount, block_number, timestamp FROM donate_burn WHERE LOWER(donor_address) = LOWER(?) ORDER BY timestamp DESC`,
        args: [address]
    });
    return result.rows;
}

// Get burn leaderboard aggregated by donor (fetch all and aggregate in JS to handle BigInt)
export async function getBurnLeaderboard(limit = 50) {
    await initializeDatabase();
    // Get all donations and aggregate in JS to avoid INTEGER overflow
    const result = await db.execute(
        `SELECT donor_address, amount, timestamp FROM donate_burn ORDER BY timestamp DESC`
    );

    // Aggregate by donor in JavaScript to handle BigInt properly
    const donorMap = new Map<string, { total: bigint; count: number; first: number; last: number }>();

    for (const row of result.rows) {
        const addr = String((row as any).donor_address).toLowerCase();
        const amount = BigInt(String((row as any).amount));
        const timestamp = Number((row as any).timestamp);

        if (donorMap.has(addr)) {
            const existing = donorMap.get(addr)!;
            existing.total += amount;
            existing.count += 1;
            existing.first = Math.min(existing.first, timestamp);
            existing.last = Math.max(existing.last, timestamp);
        } else {
            donorMap.set(addr, { total: amount, count: 1, first: timestamp, last: timestamp });
        }
    }

    // Convert to array and sort by total descending
    const leaderboard = Array.from(donorMap.entries())
        .map(([address, data]) => ({
            address,
            total_donated: data.total.toString(),
            donation_count: data.count,
            first_donation: data.first,
            last_donation: data.last,
        }))
        .sort((a, b) => {
            const diff = BigInt(b.total_donated) - BigInt(a.total_donated);
            return diff > 0n ? 1 : diff < 0n ? -1 : 0;
        })
        .slice(0, limit);

    return leaderboard;
}

// ========== BURN HISTORY (Dead wallet burns only - separate from donations) ==========

// Create burn_history table for dead wallet transactions
export async function initializeBurnHistoryTable() {
    await initializeDatabase();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS burn_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT UNIQUE NOT NULL,
            from_address TEXT NOT NULL,
            amount TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);
    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_burn_history_from
        ON burn_history(from_address)
    `);
}

// Insert a burn transaction (dead wallet only)
export async function insertBurnHistory(
    txHash: string,
    fromAddress: string,
    amount: string,
    timestamp: number
): Promise<{ success: boolean; error?: string }> {
    await initializeBurnHistoryTable();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO burn_history (tx_hash, from_address, amount, timestamp) VALUES (?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), fromAddress.toLowerCase(), amount, timestamp]
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to insert burn history:', error);
        return { success: false, error: 'Failed to insert burn history' };
    }
}

// Check if burn tx hash exists
export async function isBurnHistoryTxUsed(txHash: string): Promise<boolean> {
    await initializeBurnHistoryTable();
    const result = await db.execute({
        sql: `SELECT 1 FROM burn_history WHERE LOWER(tx_hash) = LOWER(?)`,
        args: [txHash]
    });
    return result.rows.length > 0;
}

// Get all burn history (dead wallet burns)
export async function getAllBurnHistory(limit = 100) {
    await initializeBurnHistoryTable();
    const result = await db.execute({
        sql: `SELECT tx_hash, from_address, amount, timestamp FROM burn_history ORDER BY timestamp DESC LIMIT ?`,
        args: [limit]
    });
    return result.rows;
}

// Get total burned amount from burn_history (aggregate in JS to handle BigInt)
export async function getTotalBurnedFromHistory(): Promise<string> {
    await initializeBurnHistoryTable();
    const result = await db.execute(
        `SELECT amount FROM burn_history`
    );
    let total = BigInt(0);
    for (const row of result.rows) {
        total += BigInt(String((row as any).amount));
    }
    return total.toString();
}

// ========== STAKING PROFILES (For /defi/staking) ==========

export async function getStakingProfileByAddress(address: string) {
    await initializeDatabase();
    const result = await db.execute({
        sql: `SELECT * FROM staking_profiles WHERE LOWER(address) = LOWER(?)`,
        args: [address]
    });
    return result.rows[0] || null;
}

export async function updateStakingProfile(
    address: string,
    name?: string,
    avatar?: number,
    telegram?: string,
    twitter?: string
): Promise<{ success: boolean; editCount: number; error?: string }> {
    await initializeDatabase();

    // Check if profile exists
    let profile = await getStakingProfileByAddress(address);
    let editCount = profile ? Number(profile.edit_count || 0) : 0;

    // Check edit limit (max 3)
    if (editCount >= 3) {
        return { success: false, editCount, error: 'Edit limit reached (max 3 edits)' };
    }

    const now = Date.now();
    const sanitizedName = name ? name.trim().slice(0, 20) : undefined;
    const sanitizedTelegram = telegram ? telegram.trim().slice(0, 50) : undefined;
    const sanitizedTwitter = twitter ? twitter.trim().slice(0, 50) : undefined;

    if (profile) {
        // Update existing
        await db.execute({
            sql: `UPDATE staking_profiles SET 
                  name = COALESCE(?, name),
                  avatar = COALESCE(?, avatar),
                  telegram = COALESCE(?, telegram),
                  twitter = COALESCE(?, twitter),
                  edit_count = edit_count + 1,
                  updated_at = ?
                  WHERE LOWER(address) = LOWER(?)`,
            args: [
                sanitizedName ?? null,
                avatar ?? null,
                sanitizedTelegram ?? null,
                sanitizedTwitter ?? null,
                now,
                address
            ]
        });
    } else {
        // Insert new
        await db.execute({
            sql: `INSERT INTO staking_profiles (address, name, avatar, telegram, twitter, edit_count, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
            args: [
                address.toLowerCase(),
                sanitizedName || `Supporter ${address.slice(0, 6)}`,
                avatar || 0,
                sanitizedTelegram || null,
                sanitizedTwitter || null,
                now,
                now
            ]
        });
    }

    return { success: true, editCount: editCount + 1 };
}

// Function to migrate legacy staking profiles
export async function migrateStakingProfile(
    address: string,
    name: string,
    avatar: number,
    telegram: string | undefined,
    twitter: string | undefined,
    editCount: number,
    createdAt: number,
    updatedAt: number
) {
    await initializeDatabase();
    await db.execute({
        sql: `INSERT OR REPLACE INTO staking_profiles (address, name, avatar, telegram, twitter, edit_count, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            address.toLowerCase(),
            name,
            avatar,
            telegram || null,
            twitter || null,
            editCount,
            createdAt,
            updatedAt
        ]
    });
}

// ========== SECURITY: SLIDING WINDOW RATE LIMIT ==========

export async function checkSlidingRateLimit(
    key: string,
    windowMs: number,
    maxCount: number
): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    await initializeDatabase();
    const now = Date.now();
    const windowStart = now - windowMs;
    const normalizedKey = key.toLowerCase();

    // Clean up old entries outside the window
    await db.execute({
        sql: `DELETE FROM rate_limit_logs WHERE key = ? AND timestamp < ?`,
        args: [normalizedKey, windowStart]
    });

    // Count entries within the current window
    const result = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM rate_limit_logs WHERE key = ? AND timestamp >= ?`,
        args: [normalizedKey, windowStart]
    });

    const count = (result.rows[0] as any)?.cnt || 0;

    if (count >= maxCount) {
        // Find oldest entry in window to calculate reset time
        const oldest = await db.execute({
            sql: `SELECT MIN(timestamp) as oldest_ts FROM rate_limit_logs WHERE key = ? AND timestamp >= ?`,
            args: [normalizedKey, windowStart]
        });
        const oldestTs = (oldest.rows[0] as any)?.oldest_ts || now;
        return { allowed: false, count, resetTime: oldestTs + windowMs };
    }

    // Insert new entry
    await db.execute({
        sql: `INSERT INTO rate_limit_logs (key, timestamp) VALUES (?, ?)`,
        args: [normalizedKey, now]
    });

    return { allowed: true, count: count + 1, resetTime: now + windowMs };
}

// ========== SECURITY: GAME SESSION TRACKING ==========

export async function createGameSession(
    sessionId: string,
    player: string,
    fingerprint: string,
    ip: string
): Promise<{ success: boolean; error?: string }> {
    await initializeDatabase();
    const now = Date.now();

    try {
        await db.execute({
            sql: `INSERT INTO game_sessions (id, player, fingerprint, ip, created_at, claimed, score)
                  VALUES (?, ?, ?, ?, ?, 0, 0)`,
            args: [sessionId, player.toLowerCase(), fingerprint, ip, now]
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to create game session:', error);
        return { success: false, error: 'Failed to create session' };
    }
}

export async function validateAndClaimSession(
    sessionId: string,
    player: string,
    score: number,
    maxSessionAgeMs: number = 30 * 60 * 1000 // 30 minutes default
): Promise<{ valid: boolean; reason?: string }> {
    await initializeDatabase();
    const now = Date.now();
    const minCreatedAt = now - maxSessionAgeMs;

    // 🔒 ATOMIC claim: UPDATE only if unclaimed + valid player + not expired
    // This prevents race condition (TOCTOU) where 2 requests claim same session
    const result = await db.execute({
        sql: `UPDATE game_sessions SET claimed = 1, score = ? 
              WHERE id = ? AND player = ? AND claimed = 0 AND created_at >= ?`,
        args: [score, sessionId, player.toLowerCase(), minCreatedAt]
    });

    if (result.rowsAffected === 0) {
        // Determine why it failed (for logging/error message)
        const check = await db.execute({
            sql: `SELECT player, claimed, created_at FROM game_sessions WHERE id = ?`,
            args: [sessionId]
        });
        const session = check.rows[0] as any;
        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }
        if (session.player !== player.toLowerCase()) {
            console.warn(`[SECURITY] Session ${sessionId} belongs to ${session.player}, not ${player}`);
            return { valid: false, reason: 'Session does not belong to this player' };
        }
        if (session.claimed === 1) {
            console.warn(`[SECURITY] Session ${sessionId} already claimed (possible race condition)`);
            return { valid: false, reason: 'Session already claimed' };
        }
        return { valid: false, reason: 'Session expired' };
    }

    return { valid: true };
}

// Count unique wallets using same fingerprint within a time window
export async function countWalletsPerFingerprint(
    fingerprint: string,
    windowMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<number> {
    await initializeDatabase();
    const windowStart = Date.now() - windowMs;

    const result = await db.execute({
        sql: `SELECT COUNT(DISTINCT player) as cnt FROM game_sessions 
              WHERE fingerprint = ? AND created_at >= ?`,
        args: [fingerprint, windowStart]
    });

    return (result.rows[0] as any)?.cnt || 0;
}

// ========== FOMO ROUND CONFIG FUNCTIONS ==========

// Save config snapshot for a round (INSERT OR IGNORE — won't overwrite existing)
export async function upsertFomoRoundConfig(
    roundId: number,
    config: {
        attackCost: string;
        softDuration?: number;
        initialHardDuration?: number;
        timeDecreaseStep?: number;
        maxAttacksPerRound?: number;
        winnerPercent?: number;
        topAttackersPercent?: number;
        minAttacksForReward?: number;
        claimExpirationTime?: number;
    }
) {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO fomo_round_configs 
                  (round_id, attack_cost, soft_duration, initial_hard_duration, time_decrease_step, max_attacks, winner_percent, top_attackers_percent, min_attacks_for_reward, claim_expiration_time, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                roundId,
                config.attackCost,
                config.softDuration ?? null,
                config.initialHardDuration ?? null,
                config.timeDecreaseStep ?? null,
                config.maxAttacksPerRound ?? null,
                config.winnerPercent ?? null,
                config.topAttackersPercent ?? null,
                config.minAttacksForReward ?? null,
                config.claimExpirationTime ?? null,
                Date.now(),
            ],
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to upsert fomo round config:', error);
        return { success: false, error: String(error) };
    }
}

// Get configs for multiple rounds at once
export async function getFomoRoundConfigs(roundIds: number[]): Promise<Record<number, {
    attackCost: string;
    softDuration: number | null;
    initialHardDuration: number | null;
    timeDecreaseStep: number | null;
    maxAttacks: number | null;
    winnerPercent: number | null;
    topAttackersPercent: number | null;
    minAttacksForReward: number | null;
    claimExpirationTime: number | null;
}>> {
    await initializeDatabase();
    if (roundIds.length === 0) return {};

    // Build parameterized query for multiple round IDs
    const placeholders = roundIds.map(() => '?').join(',');
    const result = await db.execute({
        sql: `SELECT * FROM fomo_round_configs WHERE round_id IN (${placeholders})`,
        args: roundIds,
    });

    const configs: Record<number, any> = {};
    for (const row of result.rows) {
        const r = row as any;
        configs[Number(r.round_id)] = {
            attackCost: r.attack_cost,
            softDuration: r.soft_duration,
            initialHardDuration: r.initial_hard_duration,
            timeDecreaseStep: r.time_decrease_step,
            maxAttacks: r.max_attacks,
            winnerPercent: r.winner_percent,
            topAttackersPercent: r.top_attackers_percent,
            minAttacksForReward: r.min_attacks_for_reward,
            claimExpirationTime: r.claim_expiration_time,
        };
    }
    return configs;
}

// ========== BANMAOHUB FUNCTIONS ==========

// --- Profiles ---
export async function getHubProfile(address: string) {
    await initializeDatabase();
    const r = await db.execute({ sql: `SELECT * FROM hub_profiles WHERE LOWER(address) = LOWER(?)`, args: [address] });
    return r.rows[0] || null;
}

export async function getHubProfileByUsername(username: string) {
    await initializeDatabase();
    const r = await db.execute({ sql: `SELECT * FROM hub_profiles WHERE LOWER(username) = LOWER(?)`, args: [username] });
    return r.rows[0] || null;
}

export async function upsertHubProfile(address: string, username: string, avatarUrl?: string, bio?: string, bannerUrl?: string) {
    await initializeDatabase();
    const now = Date.now();
    const existing = await getHubProfile(address);
    if (existing) {
        await db.execute({
            sql: `UPDATE hub_profiles SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url), bio = COALESCE(?, bio), banner_url = COALESCE(?, banner_url), updated_at = ? WHERE LOWER(address) = LOWER(?)`,
            args: [username || null, avatarUrl || null, bio || null, bannerUrl || null, now, address]
        });
    } else {
        await db.execute({
            sql: `INSERT INTO hub_profiles (address, username, avatar_url, bio, banner_url, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            args: [address.toLowerCase(), username || '', avatarUrl || '', bio || '', bannerUrl || '', now]
        });
    }
}

export async function updateHubProfile(address: string, updates: { username?: string, bio?: string, avatar_url?: string, banner_url?: string }) {
    await initializeDatabase();
    const now = Date.now();
    const sets = [];
    const args = [];
    if (updates.username !== undefined) { sets.push('username = ?'); args.push(updates.username); }
    if (updates.bio !== undefined) { sets.push('bio = ?'); args.push(updates.bio); }
    if (updates.avatar_url !== undefined) { sets.push('avatar_url = ?'); args.push(updates.avatar_url); }
    if (updates.banner_url !== undefined) { sets.push('banner_url = ?'); args.push(updates.banner_url); }

    if (sets.length === 0) return;

    sets.push('updated_at = ?');
    args.push(now);
    args.push(address);

    await db.execute({
        sql: `UPDATE hub_profiles SET ${sets.join(', ')} WHERE LOWER(address) = LOWER(?)`,
        args
    });
}

export async function getHubProfileStats(address: string) {
    await initializeDatabase();
    // Get total posts
    const postsRes = await db.execute({ sql: `SELECT COUNT(*) as count FROM hub_posts WHERE LOWER(author_address) = LOWER(?) AND COALESCE(is_featured, 0) >= 0`, args: [address] });

    // Get total likes received on posts
    const likesRes = await db.execute({ sql: `SELECT SUM(like_count) as total_likes FROM hub_posts WHERE LOWER(author_address) = LOWER(?) AND COALESCE(is_featured, 0) >= 0`, args: [address] });

    // Get total tips received on posts
    const tipsRes = await db.execute({ sql: `SELECT SUM(CAST(tip_total AS REAL)) as total_tips FROM hub_posts WHERE LOWER(author_address) = LOWER(?)`, args: [address] });

    return {
        totalPosts: Number(postsRes.rows[0]?.count || 0),
        totalLikes: Number(likesRes.rows[0]?.total_likes || 0),
        totalTips: Number(tipsRes.rows[0]?.total_tips || 0)
    };
}

// --- Posts ---
export async function createHubPost(authorAddress: string, mediaUrl: string, thumbUrl: string, mediaType: string, caption: string, hashtags: string) {
    await initializeDatabase();
    const now = Date.now();
    const r = await db.execute({
        sql: `INSERT INTO hub_posts (author_address, media_url, thumb_url, media_type, caption, hashtags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [authorAddress.toLowerCase(), mediaUrl, thumbUrl, mediaType, caption, hashtags, now]
    });
    return r.lastInsertRowid;
}

export async function getHubPosts(
    limit = 20,
    offset = 0,
    authorAddress?: string,
    sort: 'newest' | 'trending' | 'top_tipped' | 'following' = 'newest',
    includeMigrated = false,
    viewerAddress?: string
) {
    await initializeDatabase();
    let sql = `SELECT p.*, hp.username, hp.avatar_url FROM hub_posts p LEFT JOIN hub_profiles hp ON LOWER(p.author_address) = LOWER(hp.address)`;
    const conditions: string[] = [];
    const args: (string | number)[] = [];
    if (!includeMigrated) { conditions.push(`COALESCE(p.is_migrated, 0) = 0`); }
    if (authorAddress) { conditions.push(`LOWER(p.author_address) = LOWER(?)`); args.push(authorAddress); }
    if (sort === 'following' && viewerAddress) {
        conditions.push(`EXISTS (SELECT 1 FROM hub_follows WHERE follower_address = LOWER(?) AND following_address = LOWER(p.author_address))`);
        args.push(viewerAddress);
    }
    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
    if (sort === 'trending') sql += ` ORDER BY p.like_count DESC, p.created_at DESC`;
    else if (sort === 'top_tipped') sql += ` ORDER BY CAST(p.tip_total AS REAL) DESC, p.created_at DESC`;
    else sql += ` ORDER BY p.created_at DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    args.push(limit, offset);
    const r = await db.execute({ sql, args });
    return r.rows;
}

export async function getHubPost(id: number) {
    await initializeDatabase();
    const r = await db.execute({
        sql: `SELECT p.*, hp.username, hp.avatar_url FROM hub_posts p LEFT JOIN hub_profiles hp ON LOWER(p.author_address) = LOWER(hp.address) WHERE p.id = ?`,
        args: [id]
    });
    return r.rows[0] || null;
}

export async function deleteHubPost(id: number, authorAddress: string) {
    await initializeDatabase();
    const r = await db.execute({
        sql: `DELETE FROM hub_posts WHERE id = ? AND LOWER(author_address) = LOWER(?)`,
        args: [id, authorAddress]
    });
    return r.rowsAffected > 0;
}

export async function getHubPostCount(includeMigrated = false) {
    await initializeDatabase();
    const sql = includeMigrated ? `SELECT COUNT(*) as count FROM hub_posts` : `SELECT COUNT(*) as count FROM hub_posts WHERE COALESCE(is_migrated, 0) = 0`;
    const r = await db.execute(sql);
    return Number(r.rows[0]?.count ?? 0);
}

export async function markAllPostsAsMigrated() {
    await initializeDatabase();
    await db.execute(`UPDATE hub_posts SET is_migrated = 1 WHERE COALESCE(is_migrated, 0) = 0`);
}

// --- Likes ---
export async function toggleHubLike(postId: number, likerAddress: string): Promise<boolean> {
    await initializeDatabase();
    const existing = await db.execute({
        sql: `SELECT 1 FROM hub_likes WHERE post_id = ? AND LOWER(liker_address) = LOWER(?)`,
        args: [postId, likerAddress]
    });
    if (existing.rows.length > 0) {
        await db.execute({ sql: `DELETE FROM hub_likes WHERE post_id = ? AND LOWER(liker_address) = LOWER(?)`, args: [postId, likerAddress] });
        await db.execute({ sql: `UPDATE hub_posts SET like_count = MAX(0, like_count - 1) WHERE id = ?`, args: [postId] });
        return false; // unliked
    } else {
        await db.execute({ sql: `INSERT INTO hub_likes (post_id, liker_address, created_at) VALUES (?, ?, ?)`, args: [postId, likerAddress.toLowerCase(), Date.now()] });
        await db.execute({ sql: `UPDATE hub_posts SET like_count = like_count + 1 WHERE id = ?`, args: [postId] });

        // Push notification
        const postRes = await db.execute({ sql: `SELECT author_address FROM hub_posts WHERE id = ?`, args: [postId] });
        if (postRes.rows.length > 0) {
            const author = String(postRes.rows[0].author_address).toLowerCase();
            const liker = likerAddress.toLowerCase();
            if (author !== liker) {
                // Check if notification already exists to prevent spam
                const existRes = await db.execute({
                    sql: `SELECT 1 FROM hub_notifications WHERE user_address = ? AND actor_address = ? AND type = 'like' AND post_id = ?`,
                    args: [author, liker, postId]
                });
                if (existRes.rows.length === 0) {
                    await db.execute({
                        sql: `INSERT INTO hub_notifications (user_address, actor_address, type, post_id, created_at) VALUES (?, ?, 'like', ?, ?)`,
                        args: [author, liker, postId, Date.now()]
                    });
                }
            }
        }

        return true; // liked
    }
}

export async function getHubLikedPosts(likerAddress: string): Promise<number[]> {
    await initializeDatabase();
    const r = await db.execute({ sql: `SELECT post_id FROM hub_likes WHERE LOWER(liker_address) = LOWER(?)`, args: [likerAddress] });
    return r.rows.map(row => Number(row.post_id));
}

export async function getHubLikers(postId: number) {
    await initializeDatabase();
    const r = await db.execute({
        sql: `SELECT l.liker_address, hp.username, hp.avatar_url FROM hub_likes l
              LEFT JOIN hub_profiles hp ON LOWER(l.liker_address) = LOWER(hp.address)
              WHERE l.post_id = ? ORDER BY l.created_at DESC LIMIT 100`,
        args: [postId]
    });
    return r.rows;
}

// --- Comments ---
export async function addHubComment(postId: number, authorAddress: string, text: string) {
    await initializeDatabase();
    const now = Date.now();
    await db.execute({ sql: `INSERT INTO hub_comments (post_id, author_address, text, created_at) VALUES (?, ?, ?, ?)`, args: [postId, authorAddress.toLowerCase(), text, now] });
    await db.execute({ sql: `UPDATE hub_posts SET comment_count = comment_count + 1 WHERE id = ?`, args: [postId] });

    // Push notification
    const postRes = await db.execute({ sql: `SELECT author_address FROM hub_posts WHERE id = ?`, args: [postId] });
    if (postRes.rows.length > 0) {
        const author = String(postRes.rows[0].author_address).toLowerCase();
        const commenter = authorAddress.toLowerCase();
        if (author !== commenter) {
            await db.execute({
                sql: `INSERT INTO hub_notifications (user_address, actor_address, type, post_id, created_at) VALUES (?, ?, 'comment', ?, ?)`,
                args: [author, commenter, postId, now]
            });
        }
    }
}

export async function getHubComments(postId: number) {
    await initializeDatabase();
    const r = await db.execute({
        sql: `SELECT c.*, hp.username, hp.avatar_url FROM hub_comments c LEFT JOIN hub_profiles hp ON LOWER(c.author_address) = LOWER(hp.address) WHERE c.post_id = ? ORDER BY c.created_at ASC`,
        args: [postId]
    });
    return r.rows;
}

export async function deleteHubComment(commentId: number, authorAddress: string) {
    await initializeDatabase();
    // Get the post_id first to decrement count
    const c = await db.execute({ sql: `SELECT post_id FROM hub_comments WHERE id = ? AND LOWER(author_address) = LOWER(?)`, args: [commentId, authorAddress] });
    if (c.rows.length === 0) return false;
    const postId = c.rows[0].post_id;
    await db.execute({ sql: `DELETE FROM hub_comments WHERE id = ?`, args: [commentId] });
    await db.execute({ sql: `UPDATE hub_posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?`, args: [postId] });
    return true;
}

// --- Tips ---
export async function insertHubTip(txHash: string, postId: number, tipperAddress: string, creatorAddress: string, amount: string, feeAmount: string) {
    await initializeDatabase();
    const now = Date.now();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO hub_tips (tx_hash, post_id, tipper_address, creator_address, amount, fee_amount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [txHash.toLowerCase(), postId, tipperAddress.toLowerCase(), creatorAddress.toLowerCase(), amount, feeAmount, now]
        });
        // Update post tip_total
        const tips = await db.execute({ sql: `SELECT SUM(CAST(amount AS REAL)) as total FROM hub_tips WHERE post_id = ?`, args: [postId] });
        const total = tips.rows[0]?.total || '0';
        await db.execute({ sql: `UPDATE hub_posts SET tip_total = ? WHERE id = ?`, args: [String(total), postId] });

        // Push notification
        if (creatorAddress.toLowerCase() !== tipperAddress.toLowerCase()) {
            await db.execute({
                sql: `INSERT INTO hub_notifications (user_address, actor_address, type, post_id, created_at) VALUES (?, ?, 'tip', ?, ?)`,
                args: [creatorAddress.toLowerCase(), tipperAddress.toLowerCase(), postId, now]
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to insert hub tip:', error);
        return { success: false };
    }
}

export async function isHubTipTxUsed(txHash: string): Promise<boolean> {
    await initializeDatabase();
    const r = await db.execute({ sql: `SELECT 1 FROM hub_tips WHERE LOWER(tx_hash) = LOWER(?)`, args: [txHash] });
    return r.rows.length > 0;
}

export async function getTopCreators(limit = 20) {
    await initializeDatabase();
    const r = await db.execute({
        sql: `SELECT creator_address, hp.username, hp.avatar_url, SUM(CAST(amount AS REAL)) as total_tips, COUNT(*) as tip_count
              FROM hub_tips t LEFT JOIN hub_profiles hp ON LOWER(t.creator_address) = LOWER(hp.address)
              GROUP BY creator_address ORDER BY total_tips DESC LIMIT ?`,
        args: [limit]
    });
    return r.rows;
}

// --- Comment Replies ---
export async function addHubCommentReply(postId: number, authorAddress: string, text: string, parentId: number | null) {
    await initializeDatabase();
    const now = Date.now();
    await db.execute({
        sql: `INSERT INTO hub_comments (post_id, author_address, text, created_at, parent_id) VALUES (?, ?, ?, ?, ?)`,
        args: [postId, authorAddress.toLowerCase(), text, now, parentId]
    });
    await db.execute({ sql: `UPDATE hub_posts SET comment_count = comment_count + 1 WHERE id = ?`, args: [postId] });

    // Push notification (always 'comment' type for simplicity in the UI)
    const postRes = await db.execute({ sql: `SELECT author_address FROM hub_posts WHERE id = ?`, args: [postId] });
    if (postRes.rows.length > 0) {
        const author = String(postRes.rows[0].author_address).toLowerCase();
        const commenter = authorAddress.toLowerCase();
        if (author !== commenter) {
            await db.execute({
                sql: `INSERT INTO hub_notifications (user_address, actor_address, type, post_id, created_at) VALUES (?, ?, 'comment', ?, ?)`,
                args: [author, commenter, postId, now]
            });
        }
    }
}

// --- Comment Likes ---
export async function toggleCommentLike(commentId: number, likerAddress: string): Promise<boolean> {
    await initializeDatabase();
    const existing = await db.execute({
        sql: `SELECT 1 FROM hub_comment_likes WHERE comment_id = ? AND LOWER(liker_address) = LOWER(?)`,
        args: [commentId, likerAddress]
    });
    if (existing.rows.length > 0) {
        await db.execute({ sql: `DELETE FROM hub_comment_likes WHERE comment_id = ? AND LOWER(liker_address) = LOWER(?)`, args: [commentId, likerAddress] });
        await db.execute({ sql: `UPDATE hub_comments SET like_count = MAX(0, like_count - 1) WHERE id = ?`, args: [commentId] });
        return false;
    } else {
        await db.execute({ sql: `INSERT INTO hub_comment_likes (comment_id, liker_address) VALUES (?, ?)`, args: [commentId, likerAddress.toLowerCase()] });
        await db.execute({ sql: `UPDATE hub_comments SET like_count = like_count + 1 WHERE id = ?`, args: [commentId] });
        return true;
    }
}

export async function getCommentLikedByUser(postId: number, likerAddress: string): Promise<number[]> {
    await initializeDatabase();
    const r = await db.execute({
        sql: `SELECT cl.comment_id FROM hub_comment_likes cl JOIN hub_comments c ON cl.comment_id = c.id WHERE c.post_id = ? AND LOWER(cl.liker_address) = LOWER(?)`,
        args: [postId, likerAddress]
    });
    return r.rows.map(row => Number(row.comment_id));
}

// --- Bookmarks ---
export async function toggleBookmark(postId: number, userAddress: string): Promise<boolean> {
    await initializeDatabase();
    const existing = await db.execute({
        sql: `SELECT 1 FROM hub_bookmarks WHERE post_id = ? AND LOWER(user_address) = LOWER(?)`,
        args: [postId, userAddress]
    });
    if (existing.rows.length > 0) {
        await db.execute({ sql: `DELETE FROM hub_bookmarks WHERE post_id = ? AND LOWER(user_address) = LOWER(?)`, args: [postId, userAddress] });
        return false;
    } else {
        await db.execute({ sql: `INSERT INTO hub_bookmarks (post_id, user_address, created_at) VALUES (?, ?, ?)`, args: [postId, userAddress.toLowerCase(), Date.now()] });
        return true;
    }
}

export async function getUserBookmarkIds(userAddress: string): Promise<number[]> {
    await initializeDatabase();
    const r = await db.execute({ sql: `SELECT post_id FROM hub_bookmarks WHERE LOWER(user_address) = LOWER(?)`, args: [userAddress] });
    return r.rows.map(row => Number(row.post_id));
}

// --- Reports ---
export async function reportPost(postId: number, reporterAddress: string, reason: string): Promise<{ reported: boolean; count: number }> {
    await initializeDatabase();
    try {
        await db.execute({
            sql: `INSERT OR IGNORE INTO hub_reports (post_id, reporter_address, reason, created_at) VALUES (?, ?, ?, ?)`,
            args: [postId, reporterAddress.toLowerCase(), reason, Date.now()]
        });
    } catch { /* duplicate */ }
    const r = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_reports WHERE post_id = ?`, args: [postId] });
    const count = Number(r.rows[0]?.cnt || 0);
    // Auto-hide if >= 5 reports
    if (count >= 5) {
        await db.execute({ sql: `UPDATE hub_posts SET is_featured = -1 WHERE id = ?`, args: [postId] }); // -1 = hidden
    }
    return { reported: true, count };
}

// --- Tip History ---
export async function getTipHistory(postId: number) {
    await initializeDatabase();
    const r = await db.execute({
        sql: `SELECT t.tipper_address, hp.username, t.amount, t.timestamp
              FROM hub_tips t LEFT JOIN hub_profiles hp ON LOWER(t.tipper_address) = LOWER(hp.address)
              WHERE t.post_id = ? ORDER BY CAST(t.amount AS REAL) DESC LIMIT 50`,
        args: [postId]
    });
    return r.rows;
}

// ==========================================
// Phase 6: Social Mining Leaderboard Logic
// ==========================================

export async function getHubLeaderboard(limit = 50) {
    await initializeDatabase();

    // Calculate points based on Phase 6 rules:
    // Posts authored = 50 pts
    // Likes received = 10 pts
    // Comments received = 20 pts
    // Tips received = 100 pts
    // Tips sent = 50 pts

    const query = `
        SELECT 
            hp.address,
            hp.username,
            hp.avatar_url,
            COALESCE(posts.post_cnt, 0) as total_posts,
            COALESCE(likes_recv.like_cnt, 0) as total_likes_recv,
            COALESCE(comments_recv.comment_cnt, 0) as total_comments_recv,
            COALESCE(tips_recv.tip_cnt, 0) as total_tips_recv,
            COALESCE(tips_sent.tip_cnt, 0) as total_tips_sent,
            (
                (COALESCE(posts.post_cnt, 0) * 50) +
                (COALESCE(likes_recv.like_cnt, 0) * 10) +
                (COALESCE(comments_recv.comment_cnt, 0) * 20) +
                (COALESCE(tips_recv.tip_cnt, 0) * 100) +
                (COALESCE(tips_sent.tip_cnt, 0) * 50)
            ) as total_points
        FROM hub_profiles hp
        
        /* Posts authored */
        LEFT JOIN (
            SELECT author_address, COUNT(*) as post_cnt
            FROM hub_posts
            GROUP BY author_address
        ) posts ON LOWER(hp.address) = LOWER(posts.author_address)
        
        /* Likes received */
        LEFT JOIN (
            SELECT p.author_address, COUNT(l.liker_address) as like_cnt
            FROM hub_posts p
            JOIN hub_likes l ON p.id = l.post_id
            GROUP BY p.author_address
        ) likes_recv ON LOWER(hp.address) = LOWER(likes_recv.author_address)
        
        /* Comments received */
        LEFT JOIN (
            SELECT p.author_address, COUNT(c.id) as comment_cnt
            FROM hub_posts p
            JOIN hub_comments c ON p.id = c.post_id
            GROUP BY p.author_address
        ) comments_recv ON LOWER(hp.address) = LOWER(comments_recv.author_address)
        
        /* Tips received */
        LEFT JOIN (
            SELECT creator_address, COUNT(*) as tip_cnt
            FROM hub_tips
            GROUP BY creator_address
        ) tips_recv ON LOWER(hp.address) = LOWER(tips_recv.creator_address)
        
        /* Tips sent */
        LEFT JOIN (
            SELECT tipper_address, COUNT(*) as tip_cnt
            FROM hub_tips
            GROUP BY tipper_address
        ) tips_sent ON LOWER(hp.address) = LOWER(tips_sent.tipper_address)

        /* Only rank players with at least some points */
        WHERE 
            COALESCE(posts.post_cnt, 0) > 0 OR
            COALESCE(likes_recv.like_cnt, 0) > 0 OR
            COALESCE(comments_recv.comment_cnt, 0) > 0 OR
            COALESCE(tips_recv.tip_cnt, 0) > 0 OR
            COALESCE(tips_sent.tip_cnt, 0) > 0
        ORDER BY total_points DESC
        LIMIT ?
    `;

    const r = await db.execute({
        sql: query,
        args: [limit]
    });

    return r.rows;
}

export async function getHubRewardPool() {
    await initializeDatabase();
    const sqlQuery = "SELECT SUM(CAST(fee_amount AS REAL)) as total_pool FROM hub_tips";
    const r = await db.execute({ sql: sqlQuery });
    return r.rows[0]?.total_pool || '0';
}

/* ===================== STORIES ===================== */

export async function createStoriesTable() {
    await initializeDatabase();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS hub_stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_address TEXT NOT NULL,
            media_url TEXT NOT NULL,
            thumb_url TEXT DEFAULT '',
            media_type TEXT DEFAULT 'image',
            caption TEXT DEFAULT '',
            bg_color TEXT DEFAULT '#000',
            created_at INTEGER DEFAULT (unixepoch() * 1000),
            expires_at INTEGER DEFAULT (unixepoch() * 1000 + 86400000),
            view_count INTEGER DEFAULT 0
        )
    `);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS hub_story_views (
            story_id INTEGER,
            viewer_address TEXT,
            viewed_at INTEGER DEFAULT (unixepoch() * 1000),
            PRIMARY KEY (story_id, viewer_address)
        )
    `);
}

export async function createStory(
    authorAddress: string,
    mediaUrl: string,
    thumbUrl: string,
    mediaType: string,
    caption: string,
    bgColor: string
) {
    await createStoriesTable();
    const r = await db.execute({
        sql: `INSERT INTO hub_stories (author_address, media_url, thumb_url, media_type, caption, bg_color) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [authorAddress, mediaUrl, thumbUrl || '', mediaType || 'image', caption || '', bgColor || '#000']
    });
    return r.lastInsertRowid;
}

export async function getActiveStories(viewerAddress?: string) {
    await createStoriesTable();
    const now = Date.now();
    const rows = await db.execute({
        sql: `
            SELECT s.*, 
                   hp.username, hp.avatar_url,
                   (SELECT COUNT(*) FROM hub_story_views WHERE story_id = s.id) as total_views
            FROM hub_stories s
            LEFT JOIN hub_profiles hp ON LOWER(s.author_address) = LOWER(hp.address)
            WHERE s.expires_at > ?
            ORDER BY s.created_at DESC
        `,
        args: [now]
    });

    if (viewerAddress) {
        const viewedRows = await db.execute({
            sql: `SELECT story_id FROM hub_story_views WHERE viewer_address = ?`,
            args: [viewerAddress.toLowerCase()]
        });
        const viewedIds = new Set(viewedRows.rows.map((r: any) => Number(r.story_id)));
        return rows.rows.map((s: any) => ({
            ...s,
            viewed: viewedIds.has(Number(s.id))
        }));
    }

    return rows.rows.map((s: any) => ({ ...s, viewed: false }));
}

export async function markStoryViewed(storyId: number, viewerAddress: string) {
    await createStoriesTable();
    // INSERT OR IGNORE — only actually inserts on first view
    const r = await db.execute({
        sql: `INSERT OR IGNORE INTO hub_story_views (story_id, viewer_address) VALUES (?, ?)`,
        args: [storyId, viewerAddress.toLowerCase()]
    });
    // Only increment if this was a new view (not duplicate)
    if (r.rowsAffected > 0) {
        await db.execute({
            sql: `UPDATE hub_stories SET view_count = view_count + 1 WHERE id = ?`,
            args: [storyId]
        });
    }
}

export async function deleteExpiredStories() {
    await createStoriesTable();
    const now = Date.now();
    await db.execute({
        sql: `DELETE FROM hub_story_views WHERE story_id IN (SELECT id FROM hub_stories WHERE expires_at <= ?)`,
        args: [now]
    });
    const r = await db.execute({
        sql: `DELETE FROM hub_stories WHERE expires_at <= ?`,
        args: [now]
    });
    return r.rowsAffected;
}

export async function getUserStories(authorAddress: string) {
    await createStoriesTable();
    const now = Date.now();
    const r = await db.execute({
        sql: `SELECT * FROM hub_stories WHERE LOWER(author_address) = LOWER(?) AND expires_at > ? ORDER BY created_at DESC`,
        args: [authorAddress, now]
    });
    return r.rows;
}

/* ===================== REACTIONS ===================== */

export async function createReactionsTable() {
    await initializeDatabase();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS hub_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_address TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '❤️',
            created_at INTEGER DEFAULT (unixepoch() * 1000),
            UNIQUE(post_id, user_address)
        )
    `);
    try {
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_reactions_post ON hub_reactions(post_id)`);
    } catch { /* already exists */ }
}

export async function toggleReaction(postId: number, userAddress: string, emoji: string): Promise<{ reacted: boolean; emoji: string }> {
    await createReactionsTable();
    const addr = userAddress.toLowerCase();
    const existing = await db.execute({
        sql: `SELECT emoji FROM hub_reactions WHERE post_id = ? AND user_address = ?`,
        args: [postId, addr]
    });
    if (existing.rows.length > 0) {
        if (existing.rows[0].emoji === emoji) {
            await db.execute({ sql: `DELETE FROM hub_reactions WHERE post_id = ? AND user_address = ?`, args: [postId, addr] });
            return { reacted: false, emoji };
        } else {
            await db.execute({ sql: `UPDATE hub_reactions SET emoji = ?, created_at = (unixepoch() * 1000) WHERE post_id = ? AND user_address = ?`, args: [emoji, postId, addr] });
            return { reacted: true, emoji };
        }
    }
    await db.execute({ sql: `INSERT INTO hub_reactions (post_id, user_address, emoji) VALUES (?, ?, ?)`, args: [postId, addr, emoji] });
    return { reacted: true, emoji };
}

export async function getPostReactions(postId: number): Promise<Record<string, number>> {
    await createReactionsTable();
    const r = await db.execute({ sql: `SELECT emoji, COUNT(*) as cnt FROM hub_reactions WHERE post_id = ? GROUP BY emoji ORDER BY cnt DESC`, args: [postId] });
    const counts: Record<string, number> = {};
    for (const row of r.rows) { counts[row.emoji as string] = Number(row.cnt); }
    return counts;
}

export async function getBulkReactions(postIds: number[]): Promise<Record<number, Record<string, number>>> {
    await createReactionsTable();
    if (postIds.length === 0) return {};
    const placeholders = postIds.map(() => '?').join(',');
    const r = await db.execute({ sql: `SELECT post_id, emoji, COUNT(*) as cnt FROM hub_reactions WHERE post_id IN (${placeholders}) GROUP BY post_id, emoji`, args: postIds });
    const result: Record<number, Record<string, number>> = {};
    for (const row of r.rows) {
        const pid = Number(row.post_id);
        if (!result[pid]) result[pid] = {};
        result[pid][row.emoji as string] = Number(row.cnt);
    }
    return result;
}

/* ===================== BADGES / ACHIEVEMENTS ===================== */

const BADGE_DEFINITIONS = [
    { id: 'first_post', name: 'First Steps', icon: '🐾', description: 'Create your first post', rarity: 'common', check: 'posts >= 1' },
    { id: 'post_5', name: 'Content Creator', icon: '📸', description: 'Create 5 posts', rarity: 'common', check: 'posts >= 5' },
    { id: 'post_25', name: 'Prolific Poster', icon: '🌟', description: 'Create 25 posts', rarity: 'rare', check: 'posts >= 25' },
    { id: 'post_100', name: 'Content Machine', icon: '🏆', description: 'Create 100 posts', rarity: 'epic', check: 'posts >= 100' },
    { id: 'first_like', name: 'Appreciated', icon: '❤️', description: 'Receive your first like', rarity: 'common', check: 'likes_received >= 1' },
    { id: 'likes_50', name: 'Fan Favorite', icon: '💕', description: 'Receive 50 likes', rarity: 'rare', check: 'likes_received >= 50' },
    { id: 'likes_500', name: 'Beloved', icon: '💖', description: 'Receive 500 likes', rarity: 'epic', check: 'likes_received >= 500' },
    { id: 'first_comment', name: 'Conversation Starter', icon: '💬', description: 'Leave your first comment', rarity: 'common', check: 'comments >= 1' },
    { id: 'comments_50', name: 'Social Butterfly', icon: '🦋', description: 'Leave 50 comments', rarity: 'rare', check: 'comments >= 50' },
    { id: 'first_tip', name: 'Generous Soul', icon: '💰', description: 'Send your first tip', rarity: 'rare', check: 'tips_sent >= 1' },
    { id: 'tips_10', name: 'Philanthropist', icon: '🎁', description: 'Send 10 tips', rarity: 'epic', check: 'tips_sent >= 10' },
    { id: 'og_member', name: 'OG Member', icon: '🐱', description: 'One of the first 100 members', rarity: 'legendary', check: 'member_rank <= 100' },
];

export async function createBadgesTable() {
    await initializeDatabase();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS hub_badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT NOT NULL,
            badge_id TEXT NOT NULL,
            earned_at INTEGER DEFAULT (unixepoch() * 1000),
            UNIQUE(user_address, badge_id)
        )
    `);
}

export async function getAllBadgeDefinitions() {
    return BADGE_DEFINITIONS.map(b => ({ id: b.id, name: b.name, icon: b.icon, description: b.description, rarity: b.rarity }));
}

export async function getUserBadges(userAddress: string) {
    await createBadgesTable();
    const earned = await db.execute({
        sql: `SELECT badge_id, earned_at FROM hub_badges WHERE LOWER(user_address) = LOWER(?)`,
        args: [userAddress]
    });
    const earnedMap = new Map<string, number>();
    for (const row of earned.rows) {
        earnedMap.set(row.badge_id as string, Number(row.earned_at));
    }
    return BADGE_DEFINITIONS.map(b => ({
        id: b.id, name: b.name, icon: b.icon, description: b.description, rarity: b.rarity,
        earned: earnedMap.has(b.id),
        earned_at: earnedMap.get(b.id) || undefined,
    }));
}

export async function checkAndAwardBadges(userAddress: string) {
    await createBadgesTable();
    const addr = userAddress.toLowerCase();

    // Gather user stats — use allSettled to handle missing tables gracefully
    const results = await Promise.allSettled([
        db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_posts WHERE LOWER(author_address) = LOWER(?)`, args: [addr] }),
        db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_likes WHERE post_id IN (SELECT id FROM hub_posts WHERE LOWER(author_address) = LOWER(?))`, args: [addr] }),
        db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_comments WHERE LOWER(author_address) = LOWER(?)`, args: [addr] }),
        db.execute({ sql: `SELECT COUNT(*) as cnt FROM hub_tips WHERE LOWER(tipper_address) = LOWER(?)`, args: [addr] }),
        db.execute({ sql: `SELECT COALESCE((SELECT COUNT(*) FROM hub_profiles WHERE ROWID <= (SELECT ROWID FROM hub_profiles WHERE LOWER(address) = LOWER(?))), 999) as cnt`, args: [addr] }),
    ]);

    const safeVal = (r: PromiseSettledResult<any>, fallback = 0) =>
        r.status === 'fulfilled' ? Number(r.value.rows[0]?.cnt || fallback) : fallback;

    const stats: Record<string, number> = {
        posts: safeVal(results[0]),
        likes_received: safeVal(results[1]),
        comments: safeVal(results[2]),
        tips_sent: safeVal(results[3]),
        member_rank: safeVal(results[4], 999),
    };

    // Check each badge
    for (const badge of BADGE_DEFINITIONS) {
        const [field, op, value] = badge.check.split(' ');
        const statVal = stats[field] || 0;
        const target = Number(value);
        let qualifies = false;
        if (op === '>=') qualifies = statVal >= target;
        else if (op === '<=') qualifies = statVal <= target;

        if (qualifies) {
            try {
                await db.execute({
                    sql: `INSERT OR IGNORE INTO hub_badges (user_address, badge_id) VALUES (?, ?)`,
                    args: [addr, badge.id]
                });
            } catch { /* already awarded */ }
        }
    }
}




