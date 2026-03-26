/**
 * ThemeProvider - Dark/Light Theme System
 * Provides theme context with localStorage persistence
 */
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "fomo_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme;
        if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
            setThemeState(savedTheme);
        }
        setMounted(true);
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem(STORAGE_KEY, theme);
        }
    }, [theme, mounted]);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === "dark" ? "light" : "dark");
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// Theme toggle button component
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}

export default ThemeProvider;
