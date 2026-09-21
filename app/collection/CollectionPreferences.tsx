"use client";

import { useEffect } from "react";
import { LANG_LIST, type Lang } from "./i18n";
import { detectBrowserLang } from "./i18n/nameDict";
import { useHubStore } from "./stores/useHubStore";

export function saveCollectionLanguage(lang: Lang) {
    useHubStore.getState().setLang(lang);
    try { localStorage.setItem("banmao_language", lang); } catch { /* Preferences still work without storage. */ }
}

export function saveCollectionTheme(theme: "dark" | "light") {
    useHubStore.getState().setTheme(theme);
    try { localStorage.setItem("banmao_theme", theme); } catch { /* Preferences still work without storage. */ }
}

// Mounted once in the shared layout so route changes retain the same preferences.
export default function CollectionPreferences() {
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: light)");
        let explicitTheme = false;
        const read = () => {
            let language: string | null = null;
            let theme: string | null = null;
            try {
                language = localStorage.getItem("banmao_language");
                theme = localStorage.getItem("banmao_theme");
            } catch { /* Fall back to browser settings. */ }
            const store = useHubStore.getState();
            store.setLang(LANG_LIST.some(item => item.code === language) ? language as Lang : detectBrowserLang());
            explicitTheme = theme === "dark" || theme === "light";
            store.setTheme(theme === "dark" || theme === "light" ? theme : media.matches ? "light" : "dark");
        };
        read();
        const storage = (event: StorageEvent) => {
            if (event.key === null || event.key === "banmao_language" || event.key === "banmao_theme") read();
        };
        const systemTheme = () => {
            try { explicitTheme = ["dark", "light"].includes(localStorage.getItem("banmao_theme") || ""); } catch { /* Optional storage. */ }
            if (!explicitTheme) useHubStore.getState().setTheme(media.matches ? "light" : "dark");
        };
        window.addEventListener("storage", storage);
        media.addEventListener("change", systemTheme);
        return () => {
            window.removeEventListener("storage", storage);
            media.removeEventListener("change", systemTheme);
        };
    }, []);
    return null;
}
