/**
 * Custom hook for managing notification state
 * Tracks notified, snoozed, and alert loops
 */

import { useCallback, useRef, useState } from "react";

const DEFAULT_SNOOZE_MINUTES = 2;

export function useNotificationState(snoozeMinutes = DEFAULT_SNOOZE_MINUTES) {
    const notifiedRef = useRef<Set<string>>(new Set());
    const snoozedRef = useRef<Map<string, number>>(new Map());
    const alertLoopsRef = useRef<Map<string, number>>(new Map());

    const [, forceUpdate] = useState(0);

    // Check if a notification key has been snoozed
    const isSnoozed = useCallback((key: string): boolean => {
        const until = snoozedRef.current.get(key);
        if (!until) return false;
        if (Date.now() < until) return true;
        snoozedRef.current.delete(key);
        return false;
    }, []);

    // Snooze a notification
    const snooze = useCallback((key: string, minutes = snoozeMinutes) => {
        const until = Date.now() + minutes * 60 * 1000;
        snoozedRef.current.set(key, until);
    }, [snoozeMinutes]);

    // Check if notification has been shown
    const hasNotified = useCallback((key: string): boolean => {
        return notifiedRef.current.has(key);
    }, []);

    // Mark as notified
    const markNotified = useCallback((key: string) => {
        notifiedRef.current.add(key);
    }, []);

    // Clear notified state
    const clearNotified = useCallback((key: string) => {
        notifiedRef.current.delete(key);
    }, []);

    // Start alert loop (vibration/beep repeat)
    const startAlertLoop = useCallback((key: string, intervalMs = 2500) => {
        if (alertLoopsRef.current.has(key)) return;

        const intervalId = window.setInterval(() => {
            // The actual vibration/beep is handled externally
        }, intervalMs);

        alertLoopsRef.current.set(key, intervalId);
    }, []);

    // Stop alert loop
    const stopAlertLoop = useCallback((key: string, options?: { dismiss?: boolean }) => {
        const intervalId = alertLoopsRef.current.get(key);
        if (intervalId) {
            clearInterval(intervalId);
            alertLoopsRef.current.delete(key);
        }
        if (options?.dismiss !== false) {
            // Toast dismiss handled externally
        }
    }, []);

    // Clear all state
    const clearAll = useCallback(() => {
        notifiedRef.current.clear();
        snoozedRef.current.clear();
        alertLoopsRef.current.forEach((id) => clearInterval(id));
        alertLoopsRef.current.clear();
    }, []);

    return {
        notifiedRef,
        snoozedRef,
        alertLoopsRef,
        isSnoozed,
        snooze,
        hasNotified,
        markNotified,
        clearNotified,
        startAlertLoop,
        stopAlertLoop,
        clearAll,
    };
}
