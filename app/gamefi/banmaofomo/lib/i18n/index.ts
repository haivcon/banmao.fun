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

export const langNames: Record<keyof typeof langs, string> = {
    en: "English",
    zh: "中文",
    vi: "Tiếng Việt",
    id: "Indonesia",
    ms: "Bahasa Melayu",
    ru: "Русский",
    ko: "한국어",
};

export type LangKey = keyof typeof langs;

/**
 * Get browser language and map to supported language
 */
export function getBrowserLanguage(): LangKey {
    if (typeof window === "undefined") return "en";
    const browserLang = navigator.language.split("-")[0].toLowerCase();
    const supported: LangKey[] = ["en", "zh", "vi", "id", "ms", "ru", "ko"];
    return supported.includes(browserLang as LangKey) ? (browserLang as LangKey) : "en";
}
