import en from "./en";
import vi from "./vi";
import zh from "./zh";
import ko from "./ko";
import ru from "./ru";
import id from "./id";

export type Lang = "en" | "vi" | "zh" | "ko" | "ru" | "id";

export const T: Record<Lang, Record<string, string>> = { en, vi, zh, ko, ru, id };

export const LANG_LIST: { code: Lang; name: string; flag: string }[] = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "id", name: "Indonesia", flag: "🇮🇩" },
];
