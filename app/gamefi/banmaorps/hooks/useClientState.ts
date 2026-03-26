/**
 * Custom hook for managing client-side state initialization
 * Handles the isClient flag and SSR-safe operations
 */

import { useCallback, useEffect, useState } from "react";
import { isThemeKey, DEFAULT_THEME, type ThemeKey } from "../lib/themes";
import type { UiScale } from "../components/FloatingSettings";

const UI_SCALE_STORAGE_KEY = "banmao_ui_scale";
const THEME_STORAGE_KEY = "banmao_theme";
const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function useClientState() {
    const [isClient, setIsClient] = useState(false);
    const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME);
    const [uiScale, setUiScale] = useState<UiScale>("normal");
    const [isMobile, setIsMobile] = useState(false);

    // Initialize client state
    useEffect(() => {
        setIsClient(true);

        // Check if mobile
        if (typeof navigator !== "undefined") {
            setIsMobile(MOBILE_UA_REGEX.test(navigator.userAgent));
        }

        // Load UI scale from storage
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
            const storedScale = localStorage.getItem(UI_SCALE_STORAGE_KEY);
            if (storedScale === "compact" || storedScale === "normal" || storedScale === "large") {
                setUiScale(storedScale as UiScale);
                document.body.dataset.uiScale = storedScale;
            }

            // Load theme from storage
            const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (storedTheme && isThemeKey(storedTheme)) {
                setTheme(storedTheme);
                document.body.dataset.theme = storedTheme;
            } else {
                document.body.dataset.theme = DEFAULT_THEME;
            }
        }
    }, []);

    // Sync UI scale to storage and DOM
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.body.dataset.uiScale = uiScale;
        }
        if (isClient && typeof window !== "undefined") {
            localStorage.setItem(UI_SCALE_STORAGE_KEY, uiScale);
        }
    }, [uiScale, isClient]);

    // Sync theme to storage and DOM
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.body.dataset.theme = theme;
        }
        if (isClient && typeof window !== "undefined") {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
    }, [theme, isClient]);

    // Helper to safely access localStorage
    const getStorageItem = useCallback((key: string): string | null => {
        if (!isClient || typeof window === "undefined") return null;
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }, [isClient]);

    // Helper to safely set localStorage
    const setStorageItem = useCallback((key: string, value: string): void => {
        if (!isClient || typeof window === "undefined") return;
        try {
            localStorage.setItem(key, value);
        } catch {
            // Storage might be full or blocked
        }
    }, [isClient]);

    // Helper to safely remove localStorage item
    const removeStorageItem = useCallback((key: string): void => {
        if (!isClient || typeof window === "undefined") return;
        try {
            localStorage.removeItem(key);
        } catch {
            // Ignore errors
        }
    }, [isClient]);

    return {
        isClient,
        theme,
        setTheme,
        uiScale,
        setUiScale,
        isMobile,
        getStorageItem,
        setStorageItem,
        removeStorageItem,
    };
}
