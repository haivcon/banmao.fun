"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "../locales/en/common.json";
import vi from "../locales/vi/common.json";
import zh from "../locales/zh/common.json";
import ko from "../locales/ko/common.json";
import ja from "../locales/ja/common.json";

export type Language = "en" | "vi" | "zh" | "ko" | "ja";
type Translations = typeof en;

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Translations, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = { en, vi, zh, ko, ja };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("en");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedLang = localStorage.getItem("launchpad-lang") as Language;
        if (storedLang && ["en", "vi", "zh", "ko", "ja"].includes(storedLang)) {
            setLanguageState(storedLang);
        } else {
            const navLang = navigator.language.toLowerCase();
            let browserLang: Language = "en";
            if (navLang.startsWith("vi")) browserLang = "vi";
            else if (navLang.startsWith("zh")) browserLang = "zh";
            else if (navLang.startsWith("ko")) browserLang = "ko";
            else if (navLang.startsWith("ja")) browserLang = "ja";
            setLanguageState(browserLang);
        }
        setMounted(true);

        const syncLanguage = (event: Event) => {
            const requested = (event as CustomEvent<string>).detail;
            const supported: Language = ["en", "vi", "zh", "ko", "ja"].includes(requested)
                ? requested as Language
                : "en";
            setLanguageState(supported);
            localStorage.setItem("launchpad-lang", supported);
        };
        window.addEventListener("banmao:language-change", syncLanguage);
        return () => window.removeEventListener("banmao:language-change", syncLanguage);
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("launchpad-lang", lang);
    };

    const t = (key: keyof Translations, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || translations["en"][key] || key;
        
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
            });
        }
        return text;
    };

    // Prevent hydration mismatch on content, but always provide context
    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            <div style={{ visibility: mounted ? "visible" : "hidden" }}>
                {children}
            </div>
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useTranslation must be used within an I18nProvider");
    }
    return context;
}
