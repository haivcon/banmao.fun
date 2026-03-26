/**
 * PlayerProfile - User profile card with stats and achievements
 */
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getUnlockedAchievements, getPlayerStats, ACHIEVEMENTS, getRarityColor, type Achievement } from "../lib/achievements";

interface PlayerProfileProps {
    address: string | undefined;
    totalAttacks?: bigint;
    roundsWon?: number;
}

export default function PlayerProfile({ address, totalAttacks, roundsWon }: PlayerProfileProps) {
    const [isOpen, setIsOpen] = useState(false);

    const stats = useMemo(() => getPlayerStats(), []);
    const unlockedAchievements = useMemo(() => getUnlockedAchievements(), []);

    const shortAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Not Connected";

    const attackCount = totalAttacks ? Number(totalAttacks) : stats.totalAttacks;
    const wins = roundsWon ?? stats.roundsWon;
    const bestLucky = stats.bestLucky;

    if (!address) return null;

    return (
        <>
            {/* Profile Button */}
            <button
                className="profile-toggle-btn"
                onClick={() => setIsOpen(true)}
                title="View Profile"
            >
                👤
            </button>

            {/* Profile Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="profile-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            className="player-profile-card"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        >
                            <button
                                className="profile-close-btn"
                                onClick={() => setIsOpen(false)}
                            >
                                ✕
                            </button>

                            {/* Header */}
                            <div className="profile-header">
                                <div className="profile-avatar">🐱</div>
                                <div className="profile-info">
                                    <div className="profile-address">{shortAddress}</div>
                                    <div className="profile-title">
                                        {wins >= 5 ? "🏆 Champion" :
                                            wins >= 1 ? "👑 Winner" :
                                                attackCount >= 100 ? "🐱 Cat Whisperer" :
                                                    attackCount >= 10 ? "⚔️ Attacker" : "🌱 Newcomer"}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="profile-stats">
                                <div className="stat-item">
                                    <span className="stat-value">{attackCount}</span>
                                    <span className="stat-label">Attacks</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{wins}</span>
                                    <span className="stat-label">Wins</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{bestLucky || "—"}</span>
                                    <span className="stat-label">Best Lucky</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{unlockedAchievements.length}</span>
                                    <span className="stat-label">Badges</span>
                                </div>
                            </div>

                            {/* Achievements Section */}
                            <div className="profile-achievements">
                                <h4>🏅 Achievements ({unlockedAchievements.length}/{Object.keys(ACHIEVEMENTS).length})</h4>
                                <div className="badges-grid">
                                    {Object.values(ACHIEVEMENTS).map((badge) => {
                                        const unlocked = unlockedAchievements.find(a => a.id === badge.id);
                                        return (
                                            <div
                                                key={badge.id}
                                                className={`badge-item ${unlocked ? "unlocked" : "locked"}`}
                                                style={{
                                                    borderColor: unlocked ? getRarityColor(badge.rarity) : undefined
                                                }}
                                                title={unlocked
                                                    ? `${badge.name}: ${badge.description}`
                                                    : `??? - ${badge.description}`
                                                }
                                            >
                                                <span className="badge-icon">
                                                    {unlocked ? badge.icon : "🔒"}
                                                </span>
                                                <span className="badge-name">
                                                    {unlocked ? badge.name : "???"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
