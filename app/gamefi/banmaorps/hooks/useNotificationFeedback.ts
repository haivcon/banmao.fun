"use client";

import { useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { VibrateOptions } from "../lib/types";
import { FEEDBACK_COOLDOWN_MS, DEFAULT_VIBRATION } from "../lib/gameUtils";


export interface UseNotificationFeedbackOptions {
    notificationsEnabled: boolean;
    vibrationMs: number;
}

export interface UseNotificationFeedbackReturn {
    vibrate: (pattern?: number | number[], options?: VibrateOptions) => void;
    playBeep: (force?: boolean) => void;
    showToast: (
        type: "success" | "error" | "loading",
        message: string,
        options?: { id?: string; title?: string; skipBeep?: boolean; force?: boolean }
    ) => void;
    pushNotification: (
        renderer: Parameters<typeof toast.custom>[0],
        options?: Parameters<typeof toast.custom>[1]
    ) => string | undefined;
    triggerInteractBeep: () => void;
    provideButtonFeedback: () => void;
}

/**
 * Hook for notification feedback (vibration, audio, toasts)
 */
export function useNotificationFeedback({
    notificationsEnabled,
    vibrationMs,
}: UseNotificationFeedbackOptions): UseNotificationFeedbackReturn {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastBeepRef = useRef(0);
    const lastVibrationRef = useRef(0);

    const getNormalizedVibration = useCallback(() => {
        const parsed = Number(vibrationMs);
        if (!Number.isFinite(parsed)) {
            return DEFAULT_VIBRATION;
        }
        return Math.max(0, parsed);
    }, [vibrationMs]);

    const vibrate = useCallback(
        (pattern?: number | number[], options?: VibrateOptions) => {
            const { force = false, allowDuringCooldown = false } = options ?? {};
            if (typeof window === "undefined") return;
            if (!force && !notificationsEnabled) return;
            const now = Date.now();
            if (!allowDuringCooldown && now - lastVibrationRef.current < FEEDBACK_COOLDOWN_MS) return;
            const fallback = getNormalizedVibration();
            const finalPattern = pattern ?? fallback;
            try {
                if ("vibrate" in navigator) {
                    (navigator as any).vibrate(finalPattern ?? fallback);
                    lastVibrationRef.current = now;
                }
            } catch { }
        },
        [notificationsEnabled, getNormalizedVibration]
    );

    const playBeep = useCallback(
        (force = false) => {
            if (typeof window === "undefined") return;
            if (!force && !notificationsEnabled) return;
            const now = Date.now();
            if (now - lastBeepRef.current < FEEDBACK_COOLDOWN_MS) return;
            lastBeepRef.current = now;
            try {
                const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!AudioContextClass) return;
                if (!audioCtxRef.current) {
                    audioCtxRef.current = new AudioContextClass();
                }
                const ctx = audioCtxRef.current;
                if (!ctx) return;
                if (ctx.state === "suspended") {
                    ctx.resume().catch(() => { });
                }
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = "square";
                oscillator.frequency.value = 880;
                gain.gain.value = 0.08;
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.12);
                oscillator.onended = () => {
                    oscillator.disconnect();
                    gain.disconnect();
                };
            } catch { }
        },
        [notificationsEnabled]
    );

    const triggerInteractBeep = useCallback(() => playBeep(true), [playBeep]);

    const provideButtonFeedback = useCallback(() => {
        const normalizedVibration = getNormalizedVibration();
        playBeep(true);
        vibrate([normalizedVibration, 80, normalizedVibration], { force: true });
    }, [getNormalizedVibration, playBeep, vibrate]);

    const pushNotification = useCallback(
        (
            renderer: Parameters<typeof toast.custom>[0],
            options?: Parameters<typeof toast.custom>[1]
        ) => {
            if (!notificationsEnabled) return;
            playBeep();
            return toast.custom(renderer, options);
        },
        [notificationsEnabled, playBeep]
    );

    const showToast = useCallback(
        (
            type: "success" | "error" | "loading",
            message: string,
            options: { id?: string; title?: string; skipBeep?: boolean; force?: boolean } = {}
        ) => {
            const { id, title, skipBeep, force } = options;
            const shouldShow = force || notificationsEnabled || type === "error";
            if (!shouldShow) return;
            if (type !== "loading" && !skipBeep) playBeep();

            const baseTitle = title ?? (type === "success" ? "✓" : type === "error" ? "✕" : "⏳");
            const fullMessage = `${baseTitle} ${message}`;
            const duration = type === "loading" ? Infinity : type === "error" ? 8000 : 4500;

            if (type === "success") {
                toast.success(fullMessage, { id, duration, position: "top-center" });
            } else if (type === "error") {
                toast.error(fullMessage, { id, duration, position: "top-center" });
            } else {
                toast.loading(fullMessage, { id, duration, position: "top-center" });
            }
        },
        [notificationsEnabled, playBeep]
    );

    return {
        vibrate,
        playBeep,
        showToast,
        pushNotification,
        triggerInteractBeep,
        provideButtonFeedback,
    };
}
