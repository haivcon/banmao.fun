"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
    Web3DThemeKey,
    DEFAULT_WEB3D_THEME,
    THEME_STORAGE_KEY,
    isWeb3DThemeKey,
    getWeb3DTheme,
    Web3DTheme
} from "../theme";

interface Web3DThemeContextType {
    theme: Web3DThemeKey;
    themeConfig: Web3DTheme;
    setTheme: (theme: Web3DThemeKey) => void;
    // Helper color getters
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
}

const Web3DThemeContext = createContext<Web3DThemeContextType | null>(null);

interface Web3DThemeProviderProps {
    children: ReactNode;
}

export function Web3DThemeProvider({ children }: Web3DThemeProviderProps) {
    const [theme, setThemeState] = useState<Web3DThemeKey>(DEFAULT_WEB3D_THEME);

    // Load theme from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (stored && isWeb3DThemeKey(stored)) {
                setThemeState(stored);
                document.body.dataset.web3dTheme = stored;
            }
        }
    }, []);

    // Handle theme change
    const setTheme = (newTheme: Web3DThemeKey) => {
        setThemeState(newTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            document.body.dataset.web3dTheme = newTheme;
        }
    };

    const themeConfig = getWeb3DTheme(theme);

    const value: Web3DThemeContextType = {
        theme,
        themeConfig,
        setTheme,
        primaryColor: themeConfig.primary,
        secondaryColor: themeConfig.secondary,
        accentColor: themeConfig.accent,
    };

    return (
        <Web3DThemeContext.Provider value={value}>
            {children}
        </Web3DThemeContext.Provider>
    );
}

// Hook to use theme in any component
export function useWeb3DTheme(): Web3DThemeContextType {
    const context = useContext(Web3DThemeContext);
    if (!context) {
        // Return default values if not in provider
        const defaultTheme = getWeb3DTheme(DEFAULT_WEB3D_THEME);
        return {
            theme: DEFAULT_WEB3D_THEME,
            themeConfig: defaultTheme,
            setTheme: () => { },
            primaryColor: defaultTheme.primary,
            secondaryColor: defaultTheme.secondary,
            accentColor: defaultTheme.accent,
        };
    }
    return context;
}
