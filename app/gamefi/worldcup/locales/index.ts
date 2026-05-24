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

const t: Record<WCLang, typeof en> = {
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

import { useState, useEffect } from "react";

export function useWCLang(): { lang: WCLang; setLang: (l: WCLang) => void; t: typeof en } {
    const [lang, setLangState] = useState<WCLang>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        let stored = localStorage.getItem('wc_lang') as WCLang;
        if (!stored) {
            stored = detectBrowserLanguage();
            localStorage.setItem('wc_lang', stored);
        }
        setLangState(stored);
        setMounted(true);
    }, []);

    const setLang = (l: WCLang) => {
        localStorage.setItem('wc_lang', l);
        window.location.reload();
    };

    const activeLang = mounted ? lang : 'en';

    return {
        lang: activeLang,
        setLang,
        t: t[activeLang] || t.en
    };
}

export function getWCT(lang: WCLang): typeof en {
    return t[lang] || t.en;
}
