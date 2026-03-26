/**
 * Confetti - Celebration Effects
 * Uses canvas-confetti for visual celebrations
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

// Types for different celebration effects
type CelebrationTrigger = "jackpot" | "lucky900" | "lucky777" | "achievement" | "newKing";

interface ConfettiConfig {
    particleCount: number;
    spread: number;
    origin: { y: number };
    colors?: string[];
    scalar?: number;
}

// Default configs for different celebrations
const celebrationConfigs: Record<CelebrationTrigger, ConfettiConfig> = {
    jackpot: {
        particleCount: 200,
        spread: 160,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#ff6b35", "#22c55e", "#fff"],
    },
    lucky900: {
        particleCount: 100,
        spread: 80,
        origin: { y: 0.7 },
        colors: ["#ffd700", "#ffaa00", "#ff8c00"],
    },
    lucky777: {
        particleCount: 77,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#ff0000", "#ff8c00", "#ffd700", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"],
    },
    achievement: {
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#22d3ee", "#3b82f6", "#8b5cf6"],
    },
    newKing: {
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#ffd700", "#c0c0c0", "#cd7f32"],
    },
};

// Fire confetti with specific celebration type
export function fireCelebration(type: CelebrationTrigger) {
    const config = celebrationConfigs[type];

    if (type === "jackpot") {
        // Full spectacular confetti shower for jackpot
        const duration = 3000;
        const animationEnd = Date.now() + duration;

        const frame = () => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return;

            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: config.colors,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: config.colors,
            });

            requestAnimationFrame(frame);
        };
        frame();

        // Central burst
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 160,
                origin: { y: 0.6 },
                colors: config.colors,
            });
        }, 500);
    } else if (type === "lucky777") {
        // Rainbow effect for 777
        const colors = config.colors!;
        colors.forEach((color, i) => {
            setTimeout(() => {
                confetti({
                    particleCount: 11,
                    angle: 90 + (i - 3) * 15,
                    spread: 45,
                    origin: { y: 0.7, x: 0.5 },
                    colors: [color],
                });
            }, i * 100);
        });
    } else {
        // Standard burst
        confetti(config);
    }
}

// Hook for component-based triggering
export function useConfetti() {
    const fire = useCallback((type: CelebrationTrigger) => {
        fireCelebration(type);
    }, []);

    return { fire };
}

// Component with auto-trigger on prop change
interface ConfettiTriggerProps {
    trigger: CelebrationTrigger | null;
    enabled?: boolean;
}

export function ConfettiTrigger({ trigger, enabled = true }: ConfettiTriggerProps) {
    const prevTrigger = useRef<CelebrationTrigger | null>(null);

    useEffect(() => {
        if (!enabled || !trigger) return;

        // Only fire if trigger changed (not on initial mount)
        if (trigger !== prevTrigger.current && prevTrigger.current !== null) {
            fireCelebration(trigger);
        }
        prevTrigger.current = trigger;
    }, [trigger, enabled]);

    return null;
}

// Quick fire functions for convenience
export const fireJackpotConfetti = () => fireCelebration("jackpot");
export const fireLucky900Confetti = () => fireCelebration("lucky900");
export const fireLucky777Confetti = () => fireCelebration("lucky777");
export const fireAchievementConfetti = () => fireCelebration("achievement");
export const fireNewKingConfetti = () => fireCelebration("newKing");

export default ConfettiTrigger;
