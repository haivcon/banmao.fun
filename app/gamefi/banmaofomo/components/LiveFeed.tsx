/**
 * LiveFeed Component
 * Real-time attack feed showing recent attacks with animations
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUnits } from "viem";

interface AttackEntry {
    id: string;
    player: string;
    count: number;
    luckyNumber: number;
    timestamp: number;
}

interface LiveFeedProps {
    attackHistory: AttackEntry[];
    maxItems?: number;
}

// Lucky tier styling
function getLuckyStyle(lucky: number) {
    if (lucky >= 900) return { emoji: "🔥", color: "#ff4444", label: "CRITICAL" };
    if (lucky >= 700) return { emoji: "⚡", color: "#ffd700", label: "SUPER" };
    if (lucky >= 500) return { emoji: "✨", color: "#22d3ee", label: "NICE" };
    return { emoji: "🎯", color: "#22c55e", label: "" };
}

// Format address
function formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function LiveFeed({ attackHistory, maxItems = 5 }: LiveFeedProps) {
    const [displayedItems, setDisplayedItems] = useState<AttackEntry[]>([]);

    // Update displayed items when history changes
    useEffect(() => {
        const recentItems = attackHistory.slice(0, maxItems);
        setDisplayedItems(recentItems);
    }, [attackHistory, maxItems]);

    if (displayedItems.length === 0) {
        return null;
    }

    return (
        <div className="live-feed-container">
            <div className="live-feed-header">
                <span className="live-indicator">
                    <span className="live-dot"></span>
                    LIVE
                </span>
                <span className="feed-title">Recent Gifts</span>
            </div>

            <div className="live-feed-list">
                <AnimatePresence mode="popLayout">
                    {displayedItems.map((entry, index) => {
                        const luckyStyle = getLuckyStyle(entry.luckyNumber);

                        return (
                            <motion.div
                                key={entry.id}
                                className="feed-item"
                                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                    scale: 1,
                                    transition: { delay: index * 0.1 }
                                }}
                                exit={{ opacity: 0, x: -50, scale: 0.8 }}
                                layout
                            >
                                <span className="feed-emoji">{luckyStyle.emoji}</span>
                                <span className="feed-player">{formatAddress(entry.player)}</span>
                                <span className="feed-action">gifted</span>
                                <span className="feed-count">{entry.count}x</span>
                                <span
                                    className="feed-lucky"
                                    style={{ color: luckyStyle.color }}
                                >
                                    #{entry.luckyNumber}
                                </span>
                                {luckyStyle.label && (
                                    <span
                                        className="feed-badge"
                                        style={{
                                            background: `${luckyStyle.color}20`,
                                            color: luckyStyle.color
                                        }}
                                    >
                                        {luckyStyle.label}
                                    </span>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
