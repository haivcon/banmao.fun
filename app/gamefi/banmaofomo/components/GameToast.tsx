/**
 * GameToast - Toast notification system for game events
 * Provides visual feedback for attacks, transactions, errors, and wins
 * Now featuring BanMao cat avatar icons!
 */
"use client";

import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { LocaleStrings } from "../lib/i18n/types";
import { playNotification } from "../lib/sounds";

// Static sprite paths for toast icons
const TOAST_SPRITES = {
    attack: "/gamefi/banmaofomo/sprites/banmao_feeding_happy.png",
    winner: "/gamefi/banmaofomo/sprites/banmao_winner.png",
    leader: "/gamefi/banmaofomo/sprites/banmao_super_excited.png",
    combo: "/gamefi/banmaofomo/sprites/banmao_love_eyes.png",
    error: "/gamefi/banmaofomo/sprites/banmao_sleeping_bored.png",
    countdown: "/gamefi/banmaofomo/sprites/banmao_idle_wave.png",
    lucky: "/gamefi/banmaofomo/sprites/banmao_dancing.png",
} as const;

// Helper: create a cat avatar icon element for toast
function catIcon(src: string, size: number = 32): React.ReactElement {
    return React.createElement("img", {
        src,
        alt: "BanMao",
        width: size,
        height: size,
        style: {
            borderRadius: "50%",
            objectFit: "cover" as const,
            flexShrink: 0,
            filter: "drop-shadow(0 0 4px rgba(255, 215, 0, 0.3))",
        },
    });
}

// Custom toast styles matching game theme
const baseStyle: React.CSSProperties = {
    background: "rgba(20, 20, 30, 0.95)",
    color: "#fff",
    border: "1px solid rgba(255, 215, 0, 0.3)",
    borderRadius: "16px",
    padding: "16px 20px",
    backdropFilter: "blur(10px)",
    fontSize: "14px",
    maxWidth: "400px",
};

// Toast types with different styling
export const gameToast = {
    // Attack success
    attack: (message: string, luckyNumber?: number) => {
        playNotification();
        const color = luckyNumber && luckyNumber > 700 ? "#ffd700" : "#22c55e";
        toast.success(message, {
            icon: catIcon(TOAST_SPRITES.attack),
            style: { ...baseStyle, borderColor: color },
            duration: 3000,
        });
    },

    // Transaction pending
    pending: (message: string) => {
        return toast.loading(message, {
            style: { ...baseStyle, borderColor: "rgba(59, 130, 246, 0.5)" },
        });
    },

    // Transaction success
    success: (message: string) => {
        playNotification();
        toast.success(message, {
            icon: "✅",
            style: { ...baseStyle, borderColor: "rgba(34, 197, 94, 0.5)" },
            duration: 4000,
        });
    },

    // Error message
    error: (message: string) => {
        playNotification();
        toast.error(message, {
            icon: catIcon(TOAST_SPRITES.error, 28),
            style: { ...baseStyle, borderColor: "rgba(239, 68, 68, 0.5)" },
            duration: 5000,
        });
    },

    // Warning message
    warning: (message: string) => {
        toast(message, {
            icon: "⚠️",
            style: { ...baseStyle, borderColor: "rgba(245, 158, 11, 0.5)" },
            duration: 4000,
        });
    },

    // Winner announcement
    winner: (winner: string, amount: string, t?: LocaleStrings) => {
        playNotification();
        const message = t ? t.toastWinnerWon(winner, amount) : `🏆 ${winner} won ${amount} $BANMAO!`;
        toast.success(message, {
            icon: catIcon(TOAST_SPRITES.winner, 36),
            style: {
                ...baseStyle,
                borderColor: "rgba(255, 215, 0, 0.8)",
                background: "linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(20, 20, 30, 0.95))",
            },
            duration: 8000,
        });
    },

    // Lucky number notification
    luckyNumber: (number: number, t?: LocaleStrings) => {
        playNotification();
        const tier = number > 900 ? (t?.toastLuckySuper || "🔥 SUPER LUCKY") :
            number > 700 ? (t?.toastLucky || "⭐ LUCKY") :
                number > 400 ? (t?.toastLuckyGood || "👍 GOOD") : (t?.toastLuckyTryAgain || "🎲 TRY AGAIN");
        const color = number > 900 ? "#ff69b4" :
            number > 700 ? "#ffd700" :
                number > 400 ? "#22c55e" : "#22d3ee";

        toast(`${tier}: ${number}`, {
            icon: catIcon(TOAST_SPRITES.lucky),
            style: { ...baseStyle, borderColor: color },
            duration: 3000,
        });
    },

    // Countdown warning
    countdown: (seconds: number, t?: LocaleStrings) => {
        const message = t ? t.toastCountdown(seconds) : `⏰ Only ${seconds} seconds left!`;
        toast(message, {
            icon: catIcon(TOAST_SPRITES.countdown, 28),
            style: { ...baseStyle, borderColor: "rgba(239, 68, 68, 0.8)" },
            duration: 2000,
        });
    },

    // New leader announcement
    leaderChange: (newLeader: string, isYou: boolean = false, t?: LocaleStrings) => {
        playNotification();
        const shortAddr = `${newLeader.slice(0, 6)}...${newLeader.slice(-4)}`;
        const message = isYou
            ? (t?.toastNewKingYou || "👑 You are the new KING!")
            : (t ? t.toastNewKing(shortAddr) : `👑 New King: ${shortAddr}`);

        toast.success(message, {
            icon: catIcon(TOAST_SPRITES.leader, 36),
            style: {
                ...baseStyle,
                borderColor: "rgba(255, 215, 0, 0.8)",
                background: isYou
                    ? "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(20, 20, 30, 0.95))"
                    : baseStyle.background,
            },
            duration: 4000,
        });
    },

    // Attack combo streak
    combo: (streak: number) => {
        if (streak < 2) return;
        playNotification();

        const tier = streak >= 10 ? "🔥 LEGENDARY" :
            streak >= 5 ? "⚡ SUPER" :
                streak >= 3 ? "✨ NICE" : "🎯 COMBO";
        const color = streak >= 10 ? "#ff4444" :
            streak >= 5 ? "#ffd700" :
                streak >= 3 ? "#22d3ee" : "#22c55e";

        toast(`${tier} x${streak}!`, {
            icon: catIcon(TOAST_SPRITES.combo, 32),
            style: {
                ...baseStyle,
                borderColor: color,
                fontWeight: "bold",
                fontSize: "16px",
            },
            duration: 2000,
        });
    },

    // Dismiss a specific toast
    dismiss: (toastId: string) => {
        toast.dismiss(toastId);
    },

    // Dismiss all toasts
    dismissAll: () => {
        toast.dismiss();
    },
};

// Game Toaster component - add to root layout
export function GameToaster() {
    return (
        <Toaster
            position="top-center"
            gutter={8}
            containerStyle={{
                top: 80, // Below header
            }}
            toastOptions={{
                // Default options
                duration: 4000,
                style: baseStyle,
            }}
        />
    );
}

export default gameToast;
