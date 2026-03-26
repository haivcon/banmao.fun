// lib/i18n/index.ts - Translation system for Banmao Gold Miner

import en from './en';
import vi from './vi';
import zh from './zh';
import ko from './ko';
import ru from './ru';
import id from './id';

export type LangKey = 'en' | 'vi' | 'zh' | 'ko' | 'ru' | 'id';

export const translations = {
    en,
    vi,
    zh,
    ko,
    ru,
    id,
};

export type TranslationKeys = keyof typeof en;

export function t(lang: LangKey, key: TranslationKeys): string {
    return translations[lang][key] || translations.en[key] || key;
}

export const languageNames: Record<LangKey, string> = {
    en: 'English',
    vi: 'Tiếng Việt',
    zh: '中文',
    ko: '한국어',
    ru: 'Русский',
    id: 'Bahasa',
};
