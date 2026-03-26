'use client';
import React, { useState, useEffect, useCallback, memo } from 'react';

interface ThemeToggleProps {
    t: Record<string, string>;
}

const ThemeToggle = memo(function ThemeToggle({ t }: ThemeToggleProps) {
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

    const applyTheme = useCallback((mode: string) => {
        const root = document.documentElement;
        const body = document.body;
        const collection = document.querySelector('.col-page');

        if (mode === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            mode = prefersDark ? 'dark' : 'light';
        }

        if (mode === 'dark') {
            root.classList.add('dark');
            body.classList.add('col-dark');
            collection?.classList.add('col-dark');
        } else {
            root.classList.remove('dark');
            body.classList.remove('col-dark');
            collection?.classList.remove('col-dark');
        }
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('banmao-theme') || 'auto';
        setTheme(saved as 'light' | 'dark' | 'auto');
        applyTheme(saved);
    }, [applyTheme]);

    const cycleTheme = useCallback(() => {
        const order: ('light' | 'dark' | 'auto')[] = ['light', 'dark', 'auto'];
        const next = order[(order.indexOf(theme) + 1) % 3];
        setTheme(next);
        localStorage.setItem('banmao-theme', next);
        applyTheme(next);
    }, [theme, applyTheme]);

    const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
    const label = theme === 'dark'
        ? (t.darkMode || 'Dark')
        : theme === 'light'
            ? (t.lightMode || 'Light')
            : (t.autoMode || 'Auto');

    return (
        <button
            className="theme-toggle-btn"
            onClick={cycleTheme}
            title={`${t.theme || 'Theme'}: ${label}`}
        >
            <span className="theme-toggle-icon">{icon}</span>
            <span className="theme-toggle-label">{label}</span>
        </button>
    );
});

export default ThemeToggle;
