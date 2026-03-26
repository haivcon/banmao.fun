/**
 * ComboIndicator - Streak/Combo Animation
 * Shows escalating combo counter when user gifts consecutively
 */
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ComboIndicatorProps {
    comboCount: number;
    isVisible: boolean;
}

const COMBO_TIERS = [
    { min: 2, emoji: "🔥", color: "#22c55e", label: "COMBO" },
    { min: 3, emoji: "🔥🔥", color: "#eab308", label: "GREAT" },
    { min: 5, emoji: "💥💥", color: "#f97316", label: "AMAZING" },
    { min: 8, emoji: "💥💥💥", color: "#ef4444", label: "INSANE" },
    { min: 10, emoji: "⚡⚡⚡", color: "#a855f7", label: "LEGENDARY" },
];

function getComboTier(count: number) {
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
        if (count >= COMBO_TIERS[i].min) return COMBO_TIERS[i];
    }
    return null;
}

export default function ComboIndicator({ comboCount, isVisible }: ComboIndicatorProps) {
    const tier = getComboTier(comboCount);
    if (!tier || !isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                key={comboCount}
                className="combo-indicator"
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{
                    opacity: 1,
                    scale: [1, 1.2, 1],
                    y: 0,
                    rotate: [0, -3, 3, 0],
                }}
                exit={{ opacity: 0, scale: 0.5, y: -30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    pointerEvents: "none",
                }}
            >
                <motion.span
                    className="combo-count"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    style={{
                        fontSize: comboCount >= 8 ? "36px" : comboCount >= 5 ? "32px" : "28px",
                        fontWeight: 900,
                        color: tier.color,
                        textShadow: `0 0 15px ${tier.color}80, 0 0 30px ${tier.color}40, 0 2px 4px rgba(0,0,0,0.8)`,
                        lineHeight: 1,
                    }}
                >
                    x{comboCount}
                </motion.span>
                <span style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: tier.color,
                    textShadow: `0 0 8px ${tier.color}60`,
                    letterSpacing: "2px",
                }}>
                    {tier.emoji} {tier.label}
                </span>
            </motion.div>
        </AnimatePresence>
    );
}
