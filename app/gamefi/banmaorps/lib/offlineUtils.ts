// lib/offlineUtils.ts
// Offline detection and draft management utilities

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus(): {
    isOnline: boolean;
    wasOffline: boolean;
    lastOnlineAt: number | null;
} {
    const [isOnline, setIsOnline] = useState(true);
    const [wasOffline, setWasOffline] = useState(false);
    const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Initial state
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
            setLastOnlineAt(Date.now());
        }

        const handleOnline = () => {
            setIsOnline(true);
            setLastOnlineAt(Date.now());
            // Keep wasOffline true for a moment to show recovery UI
            setTimeout(() => setWasOffline(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return { isOnline, wasOffline, lastOnlineAt };
}

/**
 * Draft types for offline storage
 */
export interface DraftRoom {
    type: "create_room";
    stake: string;
    commitWindow: number;
    createdAt: number;
}

export interface DraftJoin {
    type: "join_room";
    roomId: string;
    createdAt: number;
}

export interface DraftCommit {
    type: "commit";
    roomId: string;
    choice: number;
    salt: string;
    createdAt: number;
}

export interface DraftReveal {
    type: "reveal";
    roomId: string;
    choice: number;
    salt: string;
    createdAt: number;
}

export type Draft = DraftRoom | DraftJoin | DraftCommit | DraftReveal;

const DRAFTS_STORAGE_KEY = "banmao_drafts";

/**
 * Save a draft to local storage
 */
export function saveDraft(draft: Draft): string {
    const id = `${draft.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (typeof window === "undefined") return id;

    try {
        const drafts = loadDrafts();
        drafts[id] = draft;
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
        console.error("[Offline] Failed to save draft:", error);
    }

    return id;
}

/**
 * Load all drafts from local storage
 */
export function loadDrafts(): Record<string, Draft> {
    if (typeof window === "undefined") return {};

    try {
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        if (!stored) return {};
        return JSON.parse(stored);
    } catch {
        return {};
    }
}

/**
 * Load drafts of a specific type
 */
export function loadDraftsByType<T extends Draft>(type: T["type"]): Array<{ id: string; draft: T }> {
    const drafts = loadDrafts();
    return Object.entries(drafts)
        .filter(([, draft]) => draft.type === type)
        .map(([id, draft]) => ({ id, draft: draft as T }));
}

/**
 * Clear a specific draft
 */
export function clearDraft(id: string): void {
    if (typeof window === "undefined") return;

    try {
        const drafts = loadDrafts();
        delete drafts[id];
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
        console.error("[Offline] Failed to clear draft:", error);
    }
}

/**
 * Clear all drafts
 */
export function clearAllDrafts(): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.removeItem(DRAFTS_STORAGE_KEY);
    } catch (error) {
        console.error("[Offline] Failed to clear all drafts:", error);
    }
}

/**
 * Hook for auto-retry functionality
 */
export function useAutoRetry<T>(
    action: () => Promise<T>,
    options: {
        maxRetries?: number;
        retryDelay?: number;
        onSuccess?: (result: T) => void;
        onError?: (error: Error, retriesLeft: number) => void;
        onMaxRetriesReached?: () => void;
    } = {}
): {
    execute: () => Promise<T | null>;
    isRetrying: boolean;
    retriesLeft: number;
    reset: () => void;
} {
    const {
        maxRetries = 3,
        retryDelay = 2000,
        onSuccess,
        onError,
        onMaxRetriesReached,
    } = options;

    const [isRetrying, setIsRetrying] = useState(false);
    const [retriesLeft, setRetriesLeft] = useState(maxRetries);

    const reset = useCallback(() => {
        setRetriesLeft(maxRetries);
        setIsRetrying(false);
    }, [maxRetries]);

    const execute = useCallback(async (): Promise<T | null> => {
        setIsRetrying(true);

        let currentRetries = retriesLeft;

        while (currentRetries > 0) {
            try {
                const result = await action();
                setIsRetrying(false);
                setRetriesLeft(maxRetries);
                onSuccess?.(result);
                return result;
            } catch (error) {
                currentRetries--;
                setRetriesLeft(currentRetries);
                onError?.(error as Error, currentRetries);

                if (currentRetries > 0) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        setIsRetrying(false);
        onMaxRetriesReached?.();
        return null;
    }, [action, retriesLeft, maxRetries, retryDelay, onSuccess, onError, onMaxRetriesReached]);

    return { execute, isRetrying, retriesLeft, reset };
}
