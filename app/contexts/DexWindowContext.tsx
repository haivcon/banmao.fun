"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export type WindowState = 'open' | 'minimized' | 'maximized';

export interface WindowInfo {
    id: string;
    title: string;
    icon: string;
    state: WindowState;
    position: [number, number, number];
}

interface DexWindowContextType {
    windows: Record<string, WindowInfo>;
    registerWindow: (id: string, title: string, icon: string, position: [number, number, number]) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    restoreWindow: (id: string) => void;
    closeWindow: (id: string) => void;
    getWindowState: (id: string) => WindowState;
    minimizedWindows: WindowInfo[];
}

const DexWindowContext = createContext<DexWindowContextType | null>(null);

export function DexWindowProvider({ children }: { children: React.ReactNode }) {
    const [windows, setWindows] = useState<Record<string, WindowInfo>>({});

    const registerWindow = useCallback((id: string, title: string, icon: string, position: [number, number, number]) => {
        setWindows(prev => {
            if (prev[id]) return prev;
            return {
                ...prev,
                [id]: { id, title, icon, state: 'open', position }
            };
        });
    }, []);

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], state: 'minimized' }
            };
        });
    }, []);

    const maximizeWindow = useCallback((id: string) => {
        setWindows(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], state: 'maximized' }
            };
        });
    }, []);

    const restoreWindow = useCallback((id: string) => {
        setWindows(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], state: 'open' }
            };
        });
    }, []);

    const closeWindow = useCallback((id: string) => {
        // In DeX style, close = minimize to dock
        minimizeWindow(id);
    }, [minimizeWindow]);

    const getWindowState = useCallback((id: string): WindowState => {
        return windows[id]?.state || 'open';
    }, [windows]);

    const minimizedWindows = Object.values(windows).filter(w => w.state === 'minimized');

    return (
        <DexWindowContext.Provider value={{
            windows,
            registerWindow,
            minimizeWindow,
            maximizeWindow,
            restoreWindow,
            closeWindow,
            getWindowState,
            minimizedWindows,
        }}>
            {children}
        </DexWindowContext.Provider>
    );
}

export function useDexWindow() {
    const context = useContext(DexWindowContext);
    if (!context) {
        throw new Error('useDexWindow must be used within a DexWindowProvider');
    }
    return context;
}
