// Airdrop Translations Index
import { enAirdrop } from "./en";
import { zhAirdrop } from "./zh";
import { viAirdrop } from "./vi";
import { koAirdrop } from "./ko";
import { ruAirdrop } from "./ru";
import { idAirdrop } from "./id";

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
    en: enAirdrop as any,
    zh: zhAirdrop as any,
    vi: viAirdrop as any,
    ko: koAirdrop as any,
    ru: ruAirdrop as any,
    id: idAirdrop as any,
};
