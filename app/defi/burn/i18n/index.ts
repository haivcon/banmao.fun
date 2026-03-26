// Burn Page Translations Index
import { en } from "./en";
import { zh } from "./zh";
import { vi } from "./vi";
import { ko } from "./ko";
import { ru } from "./ru";
import { id } from "./id";

export type Language = "en" | "zh" | "vi" | "ko" | "ru" | "id";

export const LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "id", name: "Bahasa", flag: "🇮🇩" },
];

export const translations: Record<Language, Record<string, string>> = {
    en,
    zh,
    vi,
    ko,
    ru,
    id,
};

export { en, zh, vi, ko, ru, id };
