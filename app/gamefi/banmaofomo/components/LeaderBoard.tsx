/**
 * LeaderBoard Component
 * Live battle log with AnimatePresence slide-in animations
 */
"use client";

import React, { useEffect, useRef } from "react";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSprite from "./AnimatedSprite";
import { LocaleStrings } from "../lib/i18n/types";
import type { AttackHistoryEntry, TopAttacker } from "../lib/types";

// Sprite paths
const KING_SPRITE = "/gamefi/banmaofomo/sprites/banmao_king.png";

interface LeaderBoardProps {
    currentLeader: `0x${string}`;
    totalAttacks: bigint;
    roundId: bigint;
    attackHistory: AttackHistoryEntry[];
    t: LocaleStrings;
    /** V11: Top attackers for the round */
    topAttackers?: TopAttacker[];
    /** V11: Current jackpot pool for reward calculation */
    jackpotPool?: bigint;
    /** Current user address for highlighting */
    userAddress?: `0x${string}`;
}

export default function LeaderBoard({
    currentLeader,
    totalAttacks,
    roundId,
    attackHistory,
    t,
    topAttackers = [],
    jackpotPool = BigInt(0),
    userAddress,
}: LeaderBoardProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const prevLeaderRef = useRef<string>("");

    const formatAddress = (addr: string): string => {
        if (!addr || addr === "0x0000000000000000000000000000000000000000") {
            return "—";
        }
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatTime = (timestamp: number): string => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;

        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        return `${Math.floor(diff / 3600)}h`;
    };

    // Detect leader change for animation
    const leaderChanged = prevLeaderRef.current !== currentLeader &&
        prevLeaderRef.current !== "" &&
        currentLeader !== "0x0000000000000000000000000000000000000000";

    useEffect(() => {
        prevLeaderRef.current = currentLeader;
    }, [currentLeader]);

    const isZeroAddress = currentLeader === "0x0000000000000000000000000000000000000000";

    // V11: No luck tier badge - removed luckyNumber feature
    // Keeping function for backwards compatibility but not using it

    // Find user's rank in top attackers
    const userRank = userAddress
        ? topAttackers.findIndex(a => a.addr.toLowerCase() === userAddress.toLowerCase()) + 1
        : 0;
    const isUserInTop10 = userRank > 0;

    // Calculate total attacks from all top attackers (for reward share calculation)
    const totalTopAttacks = topAttackers.reduce((sum, a) => sum + Number(a.attacks), 0);

    // Calculate qualified attackers (>=10 attacks) for accurate reward share
    const qualifiedAttackers = topAttackers.filter(a => Number(a.attacks) >= 10);
    const totalQualifiedAttacks = qualifiedAttackers.reduce((sum, a) => sum + Number(a.attacks), 0);

    // Calculate 25% of jackpot for Top 10
    const topAttackersRewardPool = Number(formatUnits(jackpotPool, 18)) * 0.25;

    // tAny helper for dynamic keys
    const tAny = t as any;

    // Format numbers for display
    const formatNumber = (num: number): string => {
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    return (
        <div className="leaderboard-panel">
            <h3 className="leaderboard-title">
                <span className="round-icon">🎮</span>
                {t.currentRound}
                <motion.span
                    className="round-number"
                    key={roundId.toString()}
                    initial={{ scale: 1.3, color: "#ffd700" }}
                    animate={{ scale: 1, color: "#ffffff" }}
                >
                    #{roundId.toString()}
                </motion.span>
            </h3>

            {/* Current Leader with crown animation */}
            <motion.div
                className="leader-section"
                animate={leaderChanged ? {
                    boxShadow: [
                        "0 0 10px rgba(255, 215, 0, 0.3)",
                        "0 0 30px rgba(255, 215, 0, 0.8)",
                        "0 0 10px rgba(255, 215, 0, 0.3)",
                    ],
                } : {}}
                transition={{ duration: 1 }}
            >
                <div className="leader-badge">
                    <motion.span
                        className="leader-icon"
                        animate={{
                            rotate: [0, -10, 10, -10, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3
                        }}
                    >
                        👑
                    </motion.span>
                    <span className="leader-label">{t.currentLeader}</span>
                </div>
                <motion.div
                    className={`leader-address ${isZeroAddress ? "empty" : ""}`}
                    key={currentLeader}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {isZeroAddress ? "—" : formatAddress(currentLeader)}
                </motion.div>

                {/* King Sprite - shown when there's a leader */}
                {!isZeroAddress && (
                    <div
                        style={{
                            position: 'absolute',
                            right: '-10px',
                            top: '-30px',
                        }}
                    >
                        <AnimatedSprite
                            src={KING_SPRITE}
                            alt="Top Donor"
                            width={80}
                            height={80}
                            preset={["wave", "glow"]}
                            glowColor="gold"
                        />
                    </div>
                )}
            </motion.div>

            {/* Stats with animated counter */}
            <div className="leader-stats">
                <div className="stat-item">
                    <span className="stat-label">{t.totalAttacks}</span>
                    <motion.span
                        className="stat-value"
                        key={totalAttacks.toString()}
                        initial={{ scale: 1.2, color: "#ff6b35" }}
                        animate={{ scale: 1, color: "#ffffff" }}
                    >
                        {Number(totalAttacks).toLocaleString()}
                    </motion.span>
                </div>
            </div>

            {/* V11: Top 10 Attackers with reward share */}
            {topAttackers.length > 0 && (
                <div className="top-attackers-section">
                    <h4 className="top-attackers-title">
                        <span className="top-attackers-icon">🏆</span>
                        {t.leaderboardTopTitle}
                        <span className="reward-badge">{t.leaderboardPotShare}</span>
                    </h4>

                    {/* User rank indicator */}
                    {isUserInTop10 && (
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            marginBottom: '8px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            <span>⭐</span>
                            <span style={{ color: '#22c55e' }}>
                                {t.yourRank ? t.yourRank(userRank) : `You are #${userRank} in Top 10!`}
                            </span>
                        </div>
                    )}

                    {/* Collapsible Reward Calculation Detail */}
                    {topAttackersRewardPool > 0 && (
                        <details style={{
                            marginBottom: '8px',
                            background: 'rgba(34, 211, 238, 0.05)',
                            borderRadius: '6px',
                            border: '1px solid rgba(34, 211, 238, 0.15)',
                            overflow: 'hidden',
                        }}>
                            <summary style={{
                                cursor: 'pointer',
                                fontSize: '0.65rem',
                                color: '#22d3ee',
                                padding: '6px 10px',
                                fontWeight: 600,
                                listStyle: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                userSelect: 'none',
                            }}>
                                <span style={{ transition: 'transform 0.2s' }}>▶</span>
                                {tAny.top10CalcTitle || '📐 Top 10 Reward Breakdown'}
                            </summary>
                            <div style={{
                                padding: '6px 10px 10px',
                                fontSize: '0.62rem',
                                color: '#aaa',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                lineHeight: 1.5,
                            }}>
                                <div>{tAny.top10CalcPool ? tAny.top10CalcPool(formatNumber(topAttackersRewardPool)) : `🏆 Top 10 Pool: ${formatNumber(topAttackersRewardPool)} $BANMAO`}</div>
                                <div>{tAny.top10CalcMinAttacks ? tAny.top10CalcMinAttacks(10) : '⚠️ Min 10 feeds to qualify'}</div>
                                <div>{tAny.top10CalcQualified ? tAny.top10CalcQualified(qualifiedAttackers.length, topAttackers.length) : `✅ ${qualifiedAttackers.length}/${topAttackers.length} players qualified`}</div>
                                {totalQualifiedAttacks > 0 && (
                                    <div>{tAny.top10CalcTotalQualified ? tAny.top10CalcTotalQualified(totalQualifiedAttacks.toLocaleString()) : `Total qualified feeds: ${totalQualifiedAttacks.toLocaleString()}`}</div>
                                )}
                                <div style={{ color: '#22d3ee', fontWeight: 600, marginTop: '2px' }}>
                                    {tAny.top10CalcFormula || '📊 Formula: (Your feeds ÷ Total qualified) × Top 10 Pool'}
                                </div>
                                {/* Per-player reward breakdown */}
                                {qualifiedAttackers.length > 0 && (
                                    <div style={{
                                        marginTop: '4px',
                                        padding: '4px 6px',
                                        background: 'rgba(34, 197, 94, 0.05)',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                    }}>
                                        {qualifiedAttackers.map((a) => {
                                            const aAttacks = Number(a.attacks);
                                            const share = (aAttacks / totalQualifiedAttacks) * topAttackersRewardPool;
                                            return (
                                                <div key={a.addr} style={{ color: '#22c55e', fontSize: '0.6rem' }}>
                                                    {tAny.top10CalcYourShare
                                                        ? tAny.top10CalcYourShare(
                                                            aAttacks.toString(),
                                                            totalQualifiedAttacks.toLocaleString(),
                                                            formatNumber(share)
                                                        )
                                                        : `${aAttacks} ÷ ${totalQualifiedAttacks.toLocaleString()} × Pool = ~${formatNumber(share)} $BANMAO`}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </details>
                    )}

                    <div className="top-attackers-list">
                        {topAttackers.slice(0, 5).map((attacker, index) => {
                            const isCurrentUser = userAddress && attacker.addr.toLowerCase() === userAddress.toLowerCase();
                            // Calculate estimated reward share
                            const attackerShare = totalTopAttacks > 0
                                ? (Number(attacker.attacks) / totalTopAttacks) * topAttackersRewardPool
                                : 0;
                            return (
                                <motion.div
                                    key={attacker.addr}
                                    className={`top-attacker-item rank-${index + 1} leaderboard-item`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    style={isCurrentUser ? {
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '6px',
                                    } : {}}
                                >
                                    <span className="rank-badge">
                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                                    </span>
                                    <span className="attacker-address" style={isCurrentUser ? { color: '#22c55e', fontWeight: 600 } : {}}>
                                        {isCurrentUser ? t.youLabel : formatAddress(attacker.addr)}
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span className="attacker-attacks">
                                            {Number(attacker.attacks).toLocaleString()} {t.attacksShort}
                                        </span>
                                        {attackerShare > 0 ? (
                                            <span style={{ fontSize: '0.65rem', color: '#22c55e', marginTop: '2px', fontWeight: 600 }}>
                                                ~{formatNumber(attackerShare)} $BANMAO 🎁
                                            </span>
                                        ) : Number(attacker.attacks) < 10 ? (
                                            <span style={{ fontSize: '0.6rem', color: '#ef4444', marginTop: '2px' }}>
                                                {tAny.notQualified || '< 10 gifts ❌'}
                                            </span>
                                        ) : null}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    {topAttackers.length > 5 && (
                        <div className="more-attackers">
                            {t.leaderboardMore(topAttackers.length - 5)}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Attacks with slide-in animations */}
            <div className="recent-attacks">
                <h4 className="attacks-title">
                    <span className="attacks-icon">⚔️</span>
                    {t.recentAttacks}
                </h4>

                {attackHistory.length === 0 ? (
                    <motion.div
                        className="no-history"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {t.noHistory}
                    </motion.div>
                ) : (
                    <div className="attacks-list" ref={listRef}>
                        <AnimatePresence mode="popLayout">
                            {attackHistory.slice(0, 10).map((entry, index) => {
                                return (
                                    <motion.div
                                        key={`${entry.player}-${entry.timestamp}-${index}`}
                                        className={`attack-entry ${index === 0 ? "latest" : ""} leaderboard-item`}
                                        initial={{ opacity: 0, y: -30, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -100, scale: 0.8 }}
                                        transition={{
                                            duration: 0.3,
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25
                                        }}
                                        layout
                                    >
                                        <div className="attack-player">
                                            <motion.span
                                                className="attack-count-badge"
                                                initial={index === 0 ? { scale: 1.3 } : {}}
                                                animate={{ scale: 1 }}
                                            >
                                                x{entry.count}
                                            </motion.span>
                                            <span className="attack-address">
                                                {formatAddress(entry.player)}
                                            </span>
                                        </div>
                                        <div className="attack-meta">
                                            <span className="attack-time">{formatTime(entry.timestamp)}</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
