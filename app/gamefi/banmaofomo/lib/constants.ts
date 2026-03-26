/**
 * BanMaoFomo Pure Edition Game Constants
 * Centralized configuration for the FOMO3D game (Pure Edition)
 */

// ===================== Contract Addresses =====================

// V11 Contract Address (X Layer Mainnet)
export const BANMAOFOMO_ADDRESS = "0xf77195f556Aee264Cc0Edc387d758018ad7b3E21" as `0x${string}`;
// V3 Jackpot Tier System Contract (PLACEHOLDER - update after deployment)
export const BANMAOFOMO_V3_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
export const BANMAOPK_ADDRESS = "0x6aADdAe057D3798D80D8694b67c256D5Ac4de09A" as `0x${string}`; // Keep Testnet for now or placeholder
export const BANMAO_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" as `0x${string}`;
export const STAKING_ADDRESS = "0x92809f2837f708163d375960063c8a3156fceacb" as `0x${string}`;

/** Chain ID for the game (XLayer Mainnet) */
export const CHAIN_ID = 196;

// ===================== Zero Values =====================

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
export const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// ===================== Game Constants (Pure Edition) =====================

/** Soft timer duration: 6 hours (resets on each attack) */
export const SOFT_DURATION = 6 * 60 * 60;

/** Initial hard timer duration: 120 hours (decreases with attacks) */
export const HARD_DURATION = 120 * 60 * 60;

/** Time decrease per attack: 30 seconds */
export const TIME_DECREASE_STEP = 30;

/** Default attack cost: 2000 BANMAO */
export const DEFAULT_ATTACK_COST = 2000n * 10n ** 18n;

/** Attack cooldown: 5 seconds */
export const ATTACK_COOLDOWN = 5;

/** Max attacks per round per wallet: 100 */
export const MAX_ATTACKS_PER_ROUND = 100;

/** Max claim batch: 50 rounds per claim tx */
export const MAX_CLAIM_BATCH = 50;

/** Min attacks per transaction */
export const MIN_ATTACKS = 1;

/** Max attacks per transaction */
export const MAX_ATTACKS = 10;

// ===================== Distribution Percentages (Pure Edition) =====================

export const DISTRIBUTION = {
    /** Burn percentage */
    BURN: 1,
    /** Staking reward */
    STAKING: 2,
    /** Seed fund for next round */
    SEED_FUND: 5,
    /** History dividend */
    DIVIDENDS: 17,
    /** Jackpot pool */
    JACKPOT: 75,

    // Win distributions
    /** Soft Win: Winner takes */
    SOFT_WIN_WINNER: 80,
    /** Soft Win: Community bonus */
    SOFT_WIN_COMMUNITY: 20,

    /** Hard Win: Winner takes */
    HARD_WIN_WINNER: 40,
    /** Hard Win: Community bonus */
    HARD_WIN_COMMUNITY: 30,
    /** Hard Win: Next round seed */
    HARD_WIN_SEED: 30,
} as const;

// V11 Tier Distribution (from contract)
export const V11_DISTRIBUTION = {
    /** Winner tier: last attacker (75%) */
    WINNER: 75,
    /** Top attackers tier: top 10 by attack count (25%) */
    TOP_ATTACKERS: 25,
    /** Minimum attacks to qualify for full reward */
    MIN_ATTACKS_FOR_REWARD: 10,
    /** Claim expiration time in seconds (2 hours) */
    CLAIM_EXPIRATION_TIME: 2 * 60 * 60,
} as const;

// V11 Fund Distribution per attack
export const V11_FUND_DISTRIBUTION = {
    /** Burn percentage */
    BURN: 1,
    /** Staking reward */
    STAKING: 2,
    /** Seed fund for next round */
    SEED_FUND: 5,
    /** Dividends to attackers */
    DIVIDENDS: 17,
    /** Jackpot pool (remainder: 75%) */
    JACKPOT: 75,
} as const;

// ===================== Timing Config =====================

export const REFRESH_INTERVAL_MS = 5_000;
export const COUNTDOWN_UPDATE_MS = 1_000;
export const ATTACK_DEBOUNCE_MS = 500;

// ===================== UI Config =====================

export const STEP_PRESETS = [1, 2, 5, 10] as const;

export const URGENCY_THRESHOLDS = {
    /** Green zone: > 30 minutes */
    SAFE: 30 * 60,
    /** Yellow zone: > 5 minutes */
    WARNING: 5 * 60,
    /** Red zone: <= 5 minutes */
    DANGER: 0,
} as const;

// ===================== URLs =====================

export const TELEGRAM_URL = "https://t.me/banmao_community";
export const X_URL = "https://x.com/banmao_X";
export const DOCS_URL = "https://docs.banmao.fun/fomo";
export const CONTRACT_EXPLORER_URL = "https://web3.okx.com/explorer/x-layer/address/0xf77195f556Aee264Cc0Edc387d758018ad7b3E21";

// ===================== Storage Keys =====================

export const STORAGE_KEYS = {
    LANGUAGE: "banmao_fomo_lang",
    THEME: "banmao_fomo_theme",
    USER_ROUNDS: "banmao_fomo_user_rounds", // Track rounds user participated in
    /** Bump this number when deploying to force-clear round history cache for all users */
    ROUND_CACHE_VERSION: "5",
} as const;
