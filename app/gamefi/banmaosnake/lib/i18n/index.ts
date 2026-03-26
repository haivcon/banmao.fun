import { en } from './en';
import { zh } from './zh';
import { vi } from './vi';
import { ko } from './ko';
import { ru } from './ru';
import { id } from './id';

export * from './types';
export * from './en';
export * from './zh';
export * from './vi';
export * from './ko';
export * from './ru';
export * from './id';

export const langs = {
    en,
    zh,
    vi,
    ko,
    ru,
    id,
} as const;

export const flags: Record<keyof typeof langs, string> = {
    en: '🇺🇸',
    zh: '🇨🇳',
    vi: '🇻🇳',
    ko: '🇰🇷',
    ru: '🇷🇺',
    id: '🇮🇩',
};

export type LangKey = keyof typeof langs;

// Helper to get browser language or fallback
export function getBrowserLang(): LangKey {
    if (typeof window === 'undefined') return 'en';
    const browserLang = navigator.language.split('-')[0];
    if (browserLang in langs) return browserLang as LangKey;
    return 'en';
}
