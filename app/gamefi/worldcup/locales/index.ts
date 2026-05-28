"use client";

import { useState, useEffect, useCallback } from "react";
import { en } from "./en";
import { vi } from "./vi";
import { zh } from "./zh";
import { ko } from "./ko";
import { ru } from "./ru";
import { ja } from "./ja";
import { id } from "./id";

export type WCLang = 'en' | 'vi' | 'zh' | 'ko' | 'ru' | 'ja' | 'id';

export const WC_LANGS: { code: WCLang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'zh', label: '中文' },
    { code: 'ko', label: '한국어' },
    { code: 'ru', label: 'Русский' },
    { code: 'ja', label: '日本語' },
    { code: 'id', label: 'Indonesia' },
];

const translations: Record<WCLang, typeof en> = {
    en,
    vi,
    zh,
    ko,
    ru,
    ja,
    id,
};

export function detectBrowserLanguage(): WCLang {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('wc_lang');
    if (stored) return stored as WCLang;
    
    const browserLang = (navigator.language || (navigator as any).userLanguage || 'en').toLowerCase();
    if (browserLang.startsWith('vi')) return 'vi';
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('ru')) return 'ru';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('id')) return 'id';
    return 'en';
}

/**
 * Proper React hook for language — always renders 'en' on server & first client
 * paint to avoid hydration mismatch, then reads localStorage in useEffect.
 */
export function useWCLang(): { lang: WCLang; setLang: (l: WCLang) => void; t: typeof en } {
    const [lang, setLangState] = useState<WCLang>('en');

    useEffect(() => {
        let stored = localStorage.getItem('wc_lang') as WCLang | null;
        if (!stored) {
            stored = detectBrowserLanguage();
            localStorage.setItem('wc_lang', stored);
        }
        if (stored !== 'en') {
            setLangState(stored);
        }
    }, []);

    const setLang = useCallback((l: WCLang) => {
        localStorage.setItem('wc_lang', l);
        setLangState(l);
    }, []);

    return {
        lang,
        setLang,
        t: translations[lang] || translations.en,
    };
}

export function getWCT(lang: WCLang): typeof en {
    return translations[lang] || translations.en;
}

