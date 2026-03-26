/**
 * WinnerModal Component - Premium Edition V2
 * Full-screen celebration overlay for all win types: SOFT_WIN, HARD_WIN, TIMEOUT
 * Hero layout: Image + $BANMAO amount as primary focus
 * Fully translated win type labels (no English prefix)
 * TxHash explorer link support
 */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import AnimatedFrameSprite from "./AnimatedFrameSprite";
import type { LocaleStrings } from "../lib/i18n/types";

interface WinnerModalProps {
    isVisible: boolean;
    winnerInfo: {
        winner: string;
        amount: string;
        winType: string;
        txHash?: string;
    } | null;
    onClose: () => void;
    t: LocaleStrings;
}

// Theme config per win type
const WIN_THEMES = {
    SOFT_WIN: {
        icon: "⏳",
        gradient: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(0,0,0,0.92))",
        border: "rgba(34,211,238,0.5)",
        accentColor: "#22d3ee",
        glowColor: "rgba(34,211,238,0.3)",
        badgeGradient: "linear-gradient(135deg, #22d3ee, #0891b2)",
        confettiColors: ["#22d3ee", "#06b6d4", "#67e8f9", "#a5f3fc", "#ffd700", "#22c55e"],
    },
    HARD_WIN: {
        icon: "⚡",
        gradient: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(0,0,0,0.92))",
        border: "rgba(168,85,247,0.5)",
        accentColor: "#a855f7",
        glowColor: "rgba(168,85,247,0.3)",
        badgeGradient: "linear-gradient(135deg, #a855f7, #7c3aed)",
        confettiColors: ["#a855f7", "#7c3aed", "#c084fc", "#e9d5ff", "#ffd700", "#ff6b35"],
    },
    TIMEOUT: {
        icon: "⏰",
        gradient: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(0,0,0,0.92))",
        border: "rgba(245,158,11,0.4)",
        accentColor: "#f59e0b",
        glowColor: "rgba(245,158,11,0.2)",
        badgeGradient: "linear-gradient(135deg, #f59e0b, #d97706)",
        confettiColors: [],
    },
    ROLLOVER: {
        icon: "🔄",
        gradient: "linear-gradient(135deg, rgba(148,163,184,0.15), rgba(0,0,0,0.92))",
        border: "rgba(148,163,184,0.5)",
        accentColor: "#94a3b8",
        glowColor: "rgba(148,163,184,0.3)",
        badgeGradient: "linear-gradient(135deg, #94a3b8, #475569)",
        confettiColors: [],
    }
} as const;

type ThemeKey = keyof typeof WIN_THEMES;

export default function WinnerModal({ isVisible, winnerInfo, onClose, t }: WinnerModalProps) {
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [confettiPieces, setConfettiPieces] = useState(250);

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (isVisible) {
            setConfettiPieces(250);
            const t1 = setTimeout(() => setConfettiPieces(80), 3000);
            const t2 = setTimeout(() => setConfettiPieces(0), 6000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [isVisible]);

    if (!winnerInfo) return null;

    const themeKey: ThemeKey = (winnerInfo.winType in WIN_THEMES) ? (winnerInfo.winType as ThemeKey) : "HARD_WIN";
    const theme = WIN_THEMES[themeKey];
    const isTimeout = themeKey === "TIMEOUT";
    const isHardWin = themeKey === "HARD_WIN";

    // Fully translated label — no English "Soft Win" / "Hard Win"
    const getWinTypeLabel = () => {
        switch (themeKey) {
            case "SOFT_WIN": return t.winnerSoftWinLabel;
            case "HARD_WIN": return t.winnerHardWinLabel;
            case "TIMEOUT": return t.winnerTimeoutLabel;
            case "ROLLOVER": return t.winnerRollover || "Rolled Over";
            default: return winnerInfo.winType;
        }
    };

    const explorerUrl = winnerInfo.txHash
        ? `https://web3.okx.com/explorer/x-layer/tx/${winnerInfo.txHash}`
        : null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center",
                        background: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(12px)",
                    }}
                    onClick={onClose}
                >
                    {/* Confetti for winners only */}
                    {!isTimeout && themeKey !== 'ROLLOVER' && theme.confettiColors.length > 0 && (
                        <Confetti
                            width={windowSize.width}
                            height={windowSize.height}
                            numberOfPieces={confettiPieces}
                            recycle={false}
                            colors={[...theme.confettiColors]}
                            gravity={0.12}
                        />
                    )}

                    {/* Ambient glow rings */}
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            position: "absolute", width: "600px", height: "600px",
                            borderRadius: "50%", border: `2px solid ${theme.accentColor}`,
                            opacity: 0.15, pointerEvents: "none",
                        }}
                    />
                    <motion.div
                        animate={{ scale: [1.2, 1.6, 1.2], opacity: [0.05, 0.15, 0.05] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        style={{
                            position: "absolute", width: "800px", height: "800px",
                            borderRadius: "50%", border: `1px solid ${theme.accentColor}`,
                            opacity: 0.08, pointerEvents: "none",
                        }}
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ scale: 0.5, y: 60, rotateX: 20 }}
                        animate={{ scale: 1, y: 0, rotateX: 0 }}
                        exit={{ scale: 0.5, y: 60 }}
                        transition={{ type: "spring", damping: 18, stiffness: 180 }}
                        style={{
                            background: theme.gradient,
                            border: `2px solid ${theme.border}`,
                            borderRadius: "28px",
                            padding: "32px 40px",
                            textAlign: "center",
                            maxWidth: "480px",
                            width: "90%",
                            boxShadow: `0 0 80px ${theme.glowColor}, 0 0 120px ${theme.glowColor}`,
                            position: "relative",
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Shimmer line at top */}
                        <motion.div
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                            style={{
                                position: "absolute", top: 0, left: 0, width: "50%", height: "2px",
                                background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`,
                            }}
                        />

                        {/* Title */}
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                fontSize: "1.6rem", fontWeight: 900,
                                background: `linear-gradient(135deg, ${theme.accentColor}, #ffd700)`,
                                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                marginBottom: "6px", textTransform: "uppercase", letterSpacing: "2px",
                            }}
                        >
                            {t.winnerTitle}
                        </motion.h2>

                        {/* Win Type Badge — fully translated */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            style={{
                                display: "inline-block", padding: "5px 16px",
                                background: theme.badgeGradient, borderRadius: "9999px",
                                fontSize: "0.8rem", fontWeight: 700,
                                marginBottom: "16px", color: "#fff",
                            }}
                        >
                            {getWinTypeLabel()}
                        </motion.div>

                        {(isTimeout || themeKey === 'ROLLOVER') ? (
                            /* TIMEOUT/ROLLOVER: No winner, rollover message */
                            <>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring" }}
                                    style={{ fontSize: "80px", margin: "16px 0", filter: `drop-shadow(0 0 20px ${theme.glowColor})` }}
                                >
                                    {theme.icon}
                                </motion.div>
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                    style={{
                                        fontSize: "1rem", color: theme.accentColor,
                                        marginBottom: "12px", lineHeight: 1.5,
                                        padding: "16px",
                                        background: `rgba(${themeKey === 'ROLLOVER' ? '148,163,184' : '245,158,11'},0.08)`,
                                        borderRadius: "16px",
                                        border: `1px dashed rgba(${themeKey === 'ROLLOVER' ? '148,163,184' : '245,158,11'},0.3)`,
                                    }}
                                >
                                    {themeKey === 'ROLLOVER'
                                        ? (t.noWinnerRollover || "No gifts this round. 100% of the pot rolls over to the next round!")
                                        : t.winnerTimeoutDesc}
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    style={{ fontSize: "0.85rem", color: "#9ca3af" }}
                                >
                                    {winnerInfo.amount !== '0' && (
                                        <>💰 {winnerInfo.amount} $BANMAO<br /></>
                                    )}
                                    🔄 {t.winnerRollover}
                                </motion.div>
                            </>
                        ) : (
                            /* SOFT/HARD WIN: Winner celebration — Hero layout */
                            <>
                                {/* ★ HERO: Winner Animation — LARGE */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
                                    style={{
                                        display: "flex", justifyContent: "center", margin: "8px 0 12px",
                                        filter: `drop-shadow(0 0 30px ${theme.glowColor})`,
                                    }}
                                >
                                    <AnimatedFrameSprite type="winner" width={180} height={180} glowColor={theme.accentColor} />
                                </motion.div>

                                {/* ★ HERO: $BANMAO AMOUNT — BIGGEST, MOST PROMINENT */}
                                <motion.div
                                    initial={{ y: 30, opacity: 0, scale: 0.5 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
                                    style={{
                                        fontSize: "2.4rem", fontWeight: 900, color: "#22c55e",
                                        marginBottom: "6px",
                                        textShadow: "0 0 30px rgba(34,197,94,0.4), 0 0 60px rgba(34,197,94,0.2)",
                                        lineHeight: 1.2,
                                    }}
                                >
                                    💰 {winnerInfo.amount}
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    style={{
                                        fontSize: "1rem", fontWeight: 700, color: "#4ade80",
                                        marginBottom: "16px", letterSpacing: "1px",
                                    }}
                                >
                                    $BANMAO
                                </motion.div>

                                {/* Winner Address — secondary */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.55 }}
                                    style={{
                                        fontSize: "0.95rem", color: "#d1d5db", marginBottom: "8px",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                    }}
                                >
                                    <span style={{ color: "#888", fontSize: "0.8rem" }}>{t.winnerAddress}:</span>
                                    <span style={{
                                        fontFamily: "monospace",
                                        background: `rgba(${isHardWin ? '168,85,247' : '34,211,238'},0.12)`,
                                        padding: "4px 14px", borderRadius: "10px",
                                        color: theme.accentColor, fontWeight: 700, fontSize: "0.9rem",
                                    }}>
                                        {winnerInfo.winner}
                                    </span>
                                </motion.div>

                                {/* TxHash Explorer Link */}
                                {explorerUrl && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                        style={{ marginBottom: "12px" }}
                                    >
                                        <a
                                            href={explorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: "inline-flex", alignItems: "center", gap: "6px",
                                                fontSize: "0.75rem", color: theme.accentColor,
                                                textDecoration: "none", padding: "4px 12px",
                                                background: `${theme.accentColor}15`,
                                                borderRadius: "999px", border: `1px solid ${theme.accentColor}30`,
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            🔗 {t.winnerViewTx} ↗
                                        </a>
                                    </motion.div>
                                )}

                                {/* HARD_WIN rollover note */}
                                {isHardWin && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.65 }}
                                        style={{
                                            fontSize: "0.75rem", color: "#9ca3af",
                                            marginBottom: "12px", fontStyle: "italic",
                                        }}
                                    >
                                        🔄 30% {t.winnerRollover}
                                    </motion.div>
                                )}
                            </>
                        )}

                        {/* Close Button */}
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.04, boxShadow: `0 6px 30px ${theme.glowColor}` }}
                            whileTap={{ scale: 0.96 }}
                            onClick={onClose}
                            style={{
                                width: "100%", padding: "14px 28px",
                                fontSize: "1rem", fontWeight: 700,
                                color: "#000", background: `linear-gradient(135deg, ${theme.accentColor}, #ffd700)`,
                                border: "none", borderRadius: "9999px", cursor: "pointer",
                                boxShadow: `0 4px 24px ${theme.glowColor}`,
                                marginTop: "8px",
                            }}
                        >
                            {t.winnerContinue}
                        </motion.button>

                        {/* Close hint */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            transition={{ delay: 1 }}
                            style={{ marginTop: "12px", fontSize: "0.7rem", color: "#555" }}
                        >
                            {t.winnerClickToClose}
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
