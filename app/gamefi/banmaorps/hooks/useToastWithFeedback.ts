/**
 * Custom hook for toast notifications with haptic feedback
 */

import { useCallback, useRef } from "react";
import toast from "react-hot-toast";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
    skipBeep?: boolean;
    skipVibration?: boolean;
}

interface UseToastWithFeedbackOptions {
    vibrationMs: number;
    notificationsEnabled: boolean;
    feedbackCooldownMs?: number;
}

export function useToastWithFeedback({
    vibrationMs,
    notificationsEnabled,
    feedbackCooldownMs = 120,
}: UseToastWithFeedbackOptions) {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastBeepRef = useRef(0);
    const lastVibrationRef = useRef(0);

    const getNormalizedVibration = useCallback(() => {
        const parsed = Number(vibrationMs);
        if (!Number.isFinite(parsed)) {
            return 220;
        }
        if (parsed <= 0) return 0;
        if (parsed > 500) return 500;
        return parsed;
    }, [vibrationMs]);

    const triggerVibration = useCallback(
        (options?: { force?: boolean; allowDuringCooldown?: boolean }) => {
            if (typeof window === "undefined" || typeof navigator === "undefined") return;
            if (!navigator.vibrate) return;

            const duration = getNormalizedVibration();
            if (duration <= 0) return;

            const now = Date.now();
            const force = options?.force ?? false;
            const allowDuringCooldown = options?.allowDuringCooldown ?? false;
            const elapsed = now - lastVibrationRef.current;

            if (!force && !allowDuringCooldown && elapsed < feedbackCooldownMs) {
                return;
            }

            lastVibrationRef.current = now;
            try {
                navigator.vibrate(duration);
            } catch {
                // Vibration API might not be supported
            }
        },
        [getNormalizedVibration, feedbackCooldownMs]
    );

    const playBeep = useCallback((options?: { force?: boolean }) => {
        if (typeof window === "undefined") return;
        if (!notificationsEnabled) return;

        const now = Date.now();
        const force = options?.force ?? false;
        const elapsed = now - lastBeepRef.current;

        if (!force && elapsed < feedbackCooldownMs) {
            return;
        }

        lastBeepRef.current = now;

        try {
            let ctx = audioCtxRef.current;
            if (!ctx) {
                ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioCtxRef.current = ctx;
            }
            if (ctx.state === "suspended") {
                ctx.resume().catch(() => { });
            }
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } catch {
            // Audio context might not be available
        }
    }, [notificationsEnabled, feedbackCooldownMs]);

    const showToast = useCallback(
        (type: ToastType, message: string, options?: ToastOptions) => {
            const { skipBeep = false, skipVibration = false } = options ?? {};

            // Trigger feedback
            if (!skipBeep && notificationsEnabled) {
                playBeep();
            }
            if (!skipVibration) {
                triggerVibration();
            }

            // Show toast based on type
            switch (type) {
                case "success":
                    toast.success(message);
                    break;
                case "error":
                    toast.error(message);
                    break;
                case "info":
                    toast(message, { icon: "ℹ️" });
                    break;
                case "warning":
                    toast(message, { icon: "⚠️" });
                    break;
            }
        },
        [notificationsEnabled, playBeep, triggerVibration]
    );

    return {
        showToast,
        playBeep,
        triggerVibration,
        getNormalizedVibration,
    };
}
