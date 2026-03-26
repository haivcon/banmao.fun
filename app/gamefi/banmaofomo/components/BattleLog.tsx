/**
 * BattleLog — RPG-style narrative feed for attack history
 * Renders attack entries as colorful, animated narrative messages
 */
"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AttackHistoryEntry } from "../lib/types";

interface BattleLogProps {
    attacks: AttackHistoryEntry[];
    userAddress?: `0x${string}`;
    maxEntries?: number;
    compact?: boolean;
}

// RPG message templates
interface NarrativeConfig {
    icon: string;
    template: (addr: string, count: number) => string;
    color: string;
    glowColor: string;
    category: "combo" | "leader" | "big" | "normal";
}

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getNarrative(entry: AttackHistoryEntry, isUser: boolean): NarrativeConfig {
    const name = isUser ? "BẠN" : shortAddr(entry.player);

    // Combo (≥ 5 gifts)
    if (entry.count >= 10) {
        return {
            icon: "💥",
            template: () => `${name} SIÊU COMBO x${entry.count}! Hủy diệt mọi thứ trên đường đi!`,
            color: "#ff4444",
            glowColor: "rgba(255, 68, 68, 0.3)",
            category: "combo",
        };
    }
    if (entry.count >= 5) {
        return {
            icon: "🔥",
            template: () => `${name} COMBO x${entry.count}! Chuối bay tứ phía!`,
            color: "#ff8c00",
            glowColor: "rgba(255, 140, 0, 0.2)",
            category: "big",
        };
    }
    if (entry.count >= 3) {
        return {
            icon: "⚡",
            template: () => `${name} tung x${entry.count} chuối! Hard timer run run!`,
            color: "#fbbf24",
            glowColor: "rgba(251, 191, 36, 0.15)",
            category: "big",
        };
    }
    if (entry.count === 2) {
        return {
            icon: "🗡️",
            template: () => `${name} cho mèo ăn x2 chuối liên tiếp!`,
            color: "#94a3b8",
            glowColor: "transparent",
            category: "normal",
        };
    }

    // Single attack — varied messages
    const variants = [
        { icon: "🍌", msg: `${name} ném 1 trái chuối vào mặt mèo!` },
        { icon: "🎯", msg: `${name} xuất hiện và tung 1 đòn chí mạng!` },
        { icon: "🐱", msg: `${name} đánh thức mèo bằng 1 trái chuối!` },
        { icon: "⚔️", msg: `${name} tham chiến với 1 đòn tấn công!` },
    ];
    const pick = variants[Math.abs(entry.timestamp) % variants.length];
    return {
        icon: pick.icon,
        template: () => pick.msg,
        color: "#64748b",
        glowColor: "transparent",
        category: "normal",
    };
}

export default function BattleLog({
    attacks,
    userAddress,
    maxEntries = 15,
    compact = false,
}: BattleLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top when new entry arrives
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [attacks.length]);

    const entries = useMemo(() => {
        return attacks.slice(0, maxEntries).map((entry, idx) => {
            const isUser = userAddress ? entry.player.toLowerCase() === userAddress.toLowerCase() : false;
            const narrative = getNarrative(entry, isUser);
            return {
                key: `${entry.player}-${entry.timestamp}-${idx}`,
                entry,
                isUser,
                narrative,
            };
        });
    }, [attacks, maxEntries, userAddress]);

    if (attacks.length === 0) return null;

    return (
        <div style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 107, 53, 0.12)",
            borderRadius: compact ? "8px" : "12px",
            padding: compact ? "6px" : "8px",
            marginBottom: compact ? "6px" : "10px",
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: compact ? "4px" : "6px",
                paddingLeft: "4px",
            }}>
                <span style={{ fontSize: compact ? "11px" : "13px" }}>📜</span>
                <span style={{
                    fontSize: compact ? "0.65rem" : "0.75rem",
                    fontWeight: 700,
                    color: "#ffd700",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                }}>
                    Battle Log
                </span>
                <span style={{
                    fontSize: "0.55rem",
                    color: "#555",
                    marginLeft: "auto",
                }}>
                    🟢 LIVE
                </span>
            </div>

            {/* Scrollable feed */}
            <div
                ref={scrollRef}
                style={{
                    maxHeight: compact ? "160px" : "220px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: compact ? "2px" : "3px",
                    scrollBehavior: "smooth",
                }}
            >
                <AnimatePresence initial={false}>
                    {entries.map(({ key, narrative, isUser }, idx) => (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -30, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: "auto" }}
                            exit={{ opacity: 0, x: 30, height: 0 }}
                            transition={{
                                opacity: { duration: 0.25 },
                                x: { type: "spring", stiffness: 300, damping: 25 },
                                height: { duration: 0.2 },
                            }}
                            style={{
                                padding: compact ? "3px 6px" : "4px 8px",
                                borderRadius: "6px",
                                background: isUser
                                    ? "rgba(34, 197, 94, 0.08)"
                                    : narrative.category === "combo"
                                        ? "rgba(255, 68, 68, 0.06)"
                                        : narrative.category === "big"
                                            ? "rgba(255, 140, 0, 0.05)"
                                            : "transparent",
                                borderLeft: `2px solid ${narrative.color}`,
                                fontSize: compact ? "0.6rem" : "0.7rem",
                                lineHeight: 1.4,
                                color: narrative.color,
                                overflow: "hidden",
                            }}
                        >
                            <span style={{ marginRight: "4px" }}>{narrative.icon}</span>
                            <span style={{
                                color: isUser ? "#22c55e" : narrative.category !== "normal" ? narrative.color : "#b0b0c0",
                                fontWeight: narrative.category !== "normal" ? 600 : 400,
                            }}>
                                {narrative.template("", 0)}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
