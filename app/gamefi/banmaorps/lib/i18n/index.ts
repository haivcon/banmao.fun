import { en } from "./en";
import { zh } from "./zh";
import { vi } from "./vi";
import { id } from "./id";
import { ms } from "./ms";
import { ru } from "./ru";
import { ko } from "./ko";

export * from "./types";
export * from "./en";
export * from "./zh";
export * from "./vi";
export * from "./id";
export * from "./ms";
export * from "./ru";
export * from "./ko";

export const langs = {
    en,
    zh,
    vi,
    id,
    ms,
    ru,
    ko,
} as const;

export const flags: Record<keyof typeof langs, string> = {
    en: "🇺🇸",
    zh: "🇨🇳",
    vi: "🇻🇳",
    id: "🇮🇩",
    ms: "🇲🇾",
    ru: "🇷🇺",
    ko: "🇰🇷",
};

export type LangKey = keyof typeof langs;
