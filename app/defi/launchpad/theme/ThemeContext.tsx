"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { inter, outfit } from "./fonts";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem("launchpad-theme") as Theme;
        if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
            setThemeState(storedTheme);
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setThemeState(prefersDark ? "dark" : "light");
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        // Apply theme data attribute to body
        document.documentElement.setAttribute("data-theme", theme);
        
        // Remove old font class, add new font class
        document.body.classList.remove(inter.className, outfit.className);
        document.body.classList.add(theme === "dark" ? outfit.className : inter.className);
        
        localStorage.setItem("launchpad-theme", theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div style={{ visibility: mounted ? "visible" : "hidden" }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
