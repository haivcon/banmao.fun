/**
 * Game Constants for BANMAO RPS
 * Centralized constants extracted from page.tsx
 */

import { TELEGRAM_BOT_USERNAME } from "./telegram";
import { buildCacheKey } from "./version";

// ===================== Contract Addresses =====================

export const RPS_ADDRESS = "0x2Ae44e728106a826616aA8CFec062F22bE255aCB" as `0x${string}`;
export const BANMAO_ADDRESS = process.env.NEXT_PUBLIC_BANMAO as `0x${string}`;

// ===================== Zero Values =====================

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
export const ZERO_ADDR_LOWER = ZERO_ADDR.toLowerCase();
export const ZERO_COMMIT = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const ZERO_BIGINT = BigInt(0);
export const MAX_SALT_VALUE = BigInt(`0x${"f".repeat(64)}`);

// ===================== RPC Config =====================

export const RPC_LOG_RANGE_LIMIT = BigInt(100);
export const DEFAULT_LOG_CHUNK = BigInt(90);
export const DEFAULT_LOG_ATTEMPTS = 20;

export const LOG_CHUNK_SIZE = (() => {
    const raw = process.env.NEXT_PUBLIC_RPC_LOG_CHUNK;
    if (!raw) return DEFAULT_LOG_CHUNK;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LOG_CHUNK;
    const normalized = BigInt(parsed);
    if (normalized > RPC_LOG_RANGE_LIMIT) return RPC_LOG_RANGE_LIMIT;
    return normalized;
})();

export const LOG_MAX_ATTEMPTS = (() => {
    const raw = process.env.NEXT_PUBLIC_RPC_LOG_ATTEMPTS;
    if (!raw) return DEFAULT_LOG_ATTEMPTS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LOG_ATTEMPTS;
    return parsed;
})();

export const RPS_DEPLOY_BLOCK = (() => {
    const raw = process.env.NEXT_PUBLIC_RPS_DEPLOY_BLOCK;
    if (!raw) return ZERO_BIGINT;
    try {
        const parsed = BigInt(raw);
        if (parsed < ZERO_BIGINT) return ZERO_BIGINT;
        return parsed;
    } catch {
        return ZERO_BIGINT;
    }
})();

// ===================== Game Settings =====================

export const STEP_PRESETS = [10, 100, 10000, 100000, 1000000] as const;
export const DEFAULT_VIBRATION = 220;
export const DEFAULT_SNOOZE_MINUTES = 2;
export const FEEDBACK_COOLDOWN_MS = 120;

// ===================== Timing Config =====================

export const READ_QUERY_BEHAVIOR = {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
} as const;

export const BLOCK_REFETCH_THROTTLE_MS = 1_200;
export const BLOCK_WATCH_POLL_INTERVAL_MS = 1_000;
export const SHARED_REFRESH_INTERVAL_MS = 12_000;
export const FORFEIT_FETCH_COOLDOWN_MS = 25_000;
export const FORFEIT_FETCH_DELAY_MS = 120;

const DEFAULT_FORFEIT_LOG_INTERVAL_MS = 180;
const DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS = 2_000;

export const FORFEIT_LOG_MIN_INTERVAL_MS = (() => {
    const raw = process.env.NEXT_PUBLIC_FORFEIT_LOG_INTERVAL_MS;
    if (!raw) return DEFAULT_FORFEIT_LOG_INTERVAL_MS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_FORFEIT_LOG_INTERVAL_MS;
    return parsed;
})();

export const FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS = (() => {
    const raw = process.env.NEXT_PUBLIC_FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS;
    if (!raw) return DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS;
    }
    return parsed;
})();

// ===================== Time Windows =====================

/** Commit window in seconds (10 minutes) */
export const DEFAULT_COMMIT_WINDOW = 600;
/** Minimum commit window (1 minute) */
export const MIN_COMMIT_WINDOW = 60;
/** Maximum commit window (24 hours) */
export const MAX_COMMIT_WINDOW = 24 * 60 * 60;
/** Reveal window in seconds (15 minutes) */
export const REVEAL_WINDOW = 900;

// ===================== Storage Keys =====================

export const UI_SCALE_STORAGE_KEY = "banmao_ui_scale";
export const THEME_STORAGE_KEY = "banmao_theme";
export const ROOMS_CACHE_KEY = buildCacheKey("banmao_rooms_cache");
export const INFO_CACHE_KEY = buildCacheKey("banmao_info_cache");

// ===================== URLs =====================

export const X_HANDLE = "banmao_X";
export const TELEGRAM_NOTIFY_ENDPOINT = process.env.NEXT_PUBLIC_TELEGRAM_NOTIFY_ENDPOINT;
export const GOOGLE_DOCS_URL = "https://docs.google.com/document/d/1ObVjHuoVCjXbF5zuWqzbcUuoqT86CdCm4Z9mwMWCpp0/";
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
export const X_URL = `https://x.com/${X_HANDLE}`;

// ===================== UI Config =====================

export const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const RULE_ACCENTS = [
    { icon: "🎮", className: "rule-accent-start" },
    { icon: "🔒", className: "rule-accent-commit" },
    { icon: "🔍", className: "rule-accent-reveal" },
    { icon: "🏆", className: "rule-accent-outcome" },
    { icon: "⏰", className: "rule-accent-timeout" },
    { icon: "🏳️", className: "rule-accent-forfeit" },
    { icon: "♻️", className: "rule-accent-both-commit" },
    { icon: "🌀", className: "rule-accent-both-reveal" },
] as const;
