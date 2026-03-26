/**
 * useAlertLoop Hook
 * Manages alert loops with vibration, beep, and snooze functionality
 */

"use client";

import { useCallback, useRef, MutableRefObject } from "react";
import toast from "react-hot-toast";

export interface UseAlertLoopParams {
    notificationsEnabled: boolean;
    notificationSnoozeMinutes: number;
    vibrationMs: number;
    vibrate: (pattern?: number | number[]) => void;
    playBeep: (longPress?: boolean) => void;
    mainContentRef: MutableRefObject<HTMLElement | null>;
}

export interface UseAlertLoopReturn {
    alertLoopsRef: MutableRefObject<Map<string, number>>;
    snoozedRef: MutableRefObject<Map<string, number>>;
    notifiedRef: MutableRefObject<Set<string>>;
    isSnoozed: (key: string) => boolean;
    snooze: (key: string) => void;
    stopAlertLoop: (key: string, opts?: { dismiss?: boolean }) => void;
    startAlertLoop: (key: string, pattern?: number | number[]) => void;
}

export function useAlertLoop({
    notificationsEnabled,
    notificationSnoozeMinutes,
    vibrationMs,
    vibrate,
    playBeep,
    mainContentRef,
}: UseAlertLoopParams): UseAlertLoopReturn {
    const alertLoopsRef = useRef<Map<string, number>>(new Map());
    const snoozedRef = useRef<Map<string, number>>(new Map());
    const notifiedRef = useRef<Set<string>>(new Set());

    const isSnoozed = useCallback((key: string) => {
        const until = snoozedRef.current.get(key);
        return !!until && until > Date.now();
    }, []);

    const snooze = useCallback(
        (key: string) => {
            const duration = Math.max(0, notificationSnoozeMinutes) * 60 * 1000;
            snoozedRef.current.set(key, Date.now() + duration);
        },
        [notificationSnoozeMinutes]
    );

    const stopAlertLoop = useCallback(
        (key: string, opts: { dismiss?: boolean } = {}) => {
            if (typeof window !== "undefined") {
                const intervalId = alertLoopsRef.current.get(key);
                if (intervalId != null) {
                    window.clearInterval(intervalId);
                    alertLoopsRef.current.delete(key);
                }
            }
            if (opts.dismiss !== false) toast.dismiss(key);
            notifiedRef.current.delete(key);
            if (alertLoopsRef.current.size === 0) {
                mainContentRef.current?.classList.remove("app-shake");
            }
        },
        [mainContentRef]
    );

    const startAlertLoop = useCallback(
        (key: string, pattern?: number | number[]) => {
            if (typeof window === "undefined") return;
            if (alertLoopsRef.current.has(key)) return;
            if (!notificationsEnabled) return;
            vibrate(pattern);
            playBeep();
            mainContentRef.current?.classList.add("app-shake");
            const intervalId = window.setInterval(() => {
                vibrate(pattern);
                playBeep();
            }, Math.max(Number(vibrationMs) + 600, 1600));
            alertLoopsRef.current.set(key, intervalId);
        },
        [notificationsEnabled, vibrate, vibrationMs, playBeep, mainContentRef]
    );

    return {
        alertLoopsRef,
        snoozedRef,
        notifiedRef,
        isSnoozed,
        snooze,
        stopAlertLoop,
        startAlertLoop,
    };
}
