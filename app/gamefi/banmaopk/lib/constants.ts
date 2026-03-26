/**
 * BanMao PK Battle Platform - Constants
 */

// Contract Address - X Layer Testnet
export const BANMAOPK_ADDRESS = "0x6aADdAe057D3798D80D8694b67c256D5Ac4de09A" as `0x${string}`;

// Re-export common constants
export { BANMAO_ADDRESS } from "../../banmaofomo/lib/constants";

// Duration presets (in seconds)
export const DURATION_PRESETS = [
    { label: "1 Hour", value: 60 * 60 },
    { label: "6 Hours", value: 6 * 60 * 60 },
    { label: "24 Hours", value: 24 * 60 * 60 },
    { label: "3 Days", value: 3 * 24 * 60 * 60 },
] as const;

// Storage keys
export const PK_STORAGE_KEYS = {
    LANGUAGE: "banmao_pk_lang",
} as const;
