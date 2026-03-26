/**
 * RulesModal Component - V12 Comprehensive Edition
 * Premium design with dynamic contract data and detailed explanations
 */
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LocaleStrings } from "../lib/i18n/types";
import type { GameConfigV11 } from "../lib/types";

interface TierDataItem {
    threshold: number;
    cooldownReduction: number;
}

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: LocaleStrings;
    config?: GameConfigV11 | null;
    attackCost?: number;
    jackpotPool?: string;
    tierData?: TierDataItem[];
    baseCooldown?: number;
}

export default function RulesModal({
    isOpen,
    onClose,
    t,
    config,
    attackCost = 2000,
    jackpotPool = "1,000,000",
    tierData,
    baseCooldown = 5,
}: RulesModalProps) {
    const [activeTab, setActiveTab] = useState<"overview" | "mechanics" | "rewards" | "tips">("overview");

    // Get dynamic values from config or use defaults
    const cost = config?.attackCost ? Number(config.attackCost) / 1e18 : attackCost;
    const softDurationHours = config?.softDuration ? Number(config.softDuration) / 3600 : 6;
    const hardDurationHours = config?.initialHardDuration ? Number(config.initialHardDuration) / 3600 : 120;
    const timeDecreaseSeconds = config?.timeDecreaseStep ? Number(config.timeDecreaseStep) : 30;
    const maxAttacks = config?.maxAttacksPerRound ? Number(config.maxAttacksPerRound) : 100;
    const winnerPercent = config?.winnerPercent ? Number(config.winnerPercent) : 75;
    const topAttackersPercent = config?.topAttackersPercent ? Number(config.topAttackersPercent) : 25;
    const minAttacks = config?.minAttacksForReward ? Number(config.minAttacksForReward) : 10;
    const claimHours = config?.claimExpirationTime ? Number(config.claimExpirationTime) / 3600 : 2;

    // Calculated values
    const hardWinRollover = 30; // Fixed 30% rollover on hard win
    const hardWinDistributable = 100 - hardWinRollover; // 70%
    const hardWinWinner = (hardWinDistributable * winnerPercent) / 100; // 52.5%
    const hardWinTop10 = (hardWinDistributable * topAttackersPercent) / 100; // 17.5%

    // Fund distribution percentages (hardcoded in contract _distributeFunds, NOT owner-changeable)
    const burnPercent = 1;
    const stakingPercent = 2;
    const seedPercent = 5;
    const dividendsPercent = 17;
    const jackpotPercent = 75;

    // VIP Tier data from contract (owner-changeable via setTierThresholds/setTierCooldownReduction)
    const tiers = [
        { name: "BRONZE", icon: "🥉", color: "#cd7f32", descColor: "#d4a574", bgColor: "rgba(205,127,50,0.15)", borderColor: "rgba(205,127,50,0.3)" },
        { name: "SILVER", icon: "🥈", color: "#c0c0c0", descColor: "#d4d4d4", bgColor: "rgba(192,192,192,0.15)", borderColor: "rgba(192,192,192,0.3)" },
        { name: "GOLD", icon: "🥇", color: "#ffd700", descColor: "#fde047", bgColor: "rgba(255,215,0,0.15)", borderColor: "rgba(255,215,0,0.3)" },
        { name: "DIAMOND", icon: "💎", color: "#b9f2ff", descColor: "#c4b5fd", bgColor: "linear-gradient(135deg, rgba(185,242,255,0.2) 0%, rgba(168,85,247,0.2) 100%)", borderColor: "rgba(185,242,255,0.4)" },
    ];

    // Derive tier thresholds and cooldown reductions from contract data
    const getTierThreshold = (i: number) => tierData?.[i]?.threshold ?? [10, 100, 500, 1000][i];
    const getTierReduction = (i: number) => tierData?.[i]?.cooldownReduction ?? [0, 10, 20, 40][i];
    const getEffectiveCooldown = (i: number) => {
        const reduction = getTierReduction(i);
        return (baseCooldown * (100 - reduction) / 100).toFixed(1).replace(/\.0$/, '');
    };
    const getThresholdRange = (i: number) => {
        const current = getTierThreshold(i);
        const next = i < 3 ? getTierThreshold(i + 1) - 1 : null;
        return next !== null ? `${current}-${next}` : `${current}+`;
    };

    if (!isOpen) return null;
    if (!t) return null;

    // Helper to format numbers
    const fmt = (n: number) => n.toLocaleString();

    return (
        <AnimatePresence>
            <motion.div
                className="rules-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="rules-modal-v11"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxHeight: "85vh", overflow: "hidden" }}
                >
                    {/* Header */}
                    <div className="rules-header-v11">
                        <h2>{t.rulesComprehensiveTitle || "📖 DETAILED GUIDE"}</h2>
                        <button className="rules-close-v11" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="rules-tabs-v11">
                        <button
                            className={`rules-tab-v11 ${activeTab === "overview" ? "active" : ""}`}
                            onClick={() => setActiveTab("overview")}
                        >
                            <span className="tab-icon">🎮</span>
                            <span>{t.rulesTabOverview}</span>
                        </button>
                        <button
                            className={`rules-tab-v11 ${activeTab === "mechanics" ? "active" : ""}`}
                            onClick={() => setActiveTab("mechanics")}
                        >
                            <span className="tab-icon">⏱️</span>
                            <span>{t.rulesTabTimer}</span>
                        </button>
                        <button
                            className={`rules-tab-v11 ${activeTab === "rewards" ? "active" : ""}`}
                            onClick={() => setActiveTab("rewards")}
                        >
                            <span className="tab-icon">💰</span>
                            <span>{t.rulesTabRewards}</span>
                        </button>
                        <button
                            className={`rules-tab-v11 ${activeTab === "tips" ? "active" : ""}`}
                            onClick={() => setActiveTab("tips")}
                        >
                            <span className="tab-icon">💎</span>
                            <span>{t.rulesTabVip}</span>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="rules-content-v11" style={{ overflowY: "auto", maxHeight: "calc(85vh - 140px)" }}>
                        <AnimatePresence mode="wait">
                            {/* ==================== OVERVIEW TAB ==================== */}
                            {activeTab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="rules-tab-content"
                                >
                                    {/* Game Overview */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesGameOverview || "🎮 Game Overview"}</h3>
                                        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
                                            {t.rulesGameOverviewDesc || "BanMao FOMO is a real-time 'last one standing' game."}
                                        </p>
                                    </div>

                                    {/* Attack Mechanics */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesAttackMechanicsTitle || "⚔️ Cơ chế Tặng"}</h3>
                                        <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                                            <div className="config-item" style={{ background: "rgba(255,215,0,0.1)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#ffd700" }}>{fmt(cost)}</div>
                                                <div style={{ fontSize: 10, color: "#888" }}>{t.rulesCostPerGift}</div>
                                            </div>
                                            <div className="config-item" style={{ background: "rgba(59,130,246,0.1)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#3b82f6" }}>1-10</div>
                                                <div style={{ fontSize: 10, color: "#888" }}>{t.rulesGiftsPerTx}</div>
                                            </div>
                                            <div className="config-item" style={{ background: "rgba(168,85,247,0.1)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#a855f7" }}>{maxAttacks}</div>
                                                <div style={{ fontSize: 10, color: "#888" }}>{t.rulesMaxPerRound}</div>
                                            </div>
                                            <div className="config-item" style={{ background: "rgba(34,197,94,0.1)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#22c55e" }}>{baseCooldown}s</div>
                                                <div style={{ fontSize: 10, color: "#888" }}>{t.rulesBaseCooldown}</div>
                                            </div>
                                        </div>
                                        <p style={{ lineHeight: 1.6, fontSize: 13 }}>
                                            {t.rulesAttackCostDesc}
                                        </p>
                                        <div style={{ background: "rgba(255,215,0,0.05)", padding: 10, borderRadius: 8, marginTop: 10, fontSize: 12, color: "#aaa" }}>
                                            {t.rulesAttackCostExample}
                                        </div>
                                    </div>

                                    {/* Token Distribution */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesFundDistributionTitle || "💰 Token Distribution"}</h3>
                                        <p style={{ fontSize: 13, marginBottom: 12, color: "#aaa" }}>
                                            {t.rulesFundDistOverview || "Every gift is distributed:"}
                                        </p>
                                        <div className="distribution-bar-v11">
                                            <div className="bar-segment-v11 jackpot" style={{ flex: jackpotPercent }}>
                                                <span className="segment-value">{jackpotPercent}%</span>
                                                <span className="segment-label">{t.distJackpot || "Jackpot"}</span>
                                            </div>
                                            <div className="bar-segment-v11 dividends" style={{ flex: dividendsPercent }}>
                                                <span className="segment-value">{dividendsPercent}%</span>
                                            </div>
                                            <div className="bar-segment-v11 seed" style={{ flex: seedPercent }}>
                                                <span className="segment-value">{seedPercent}%</span>
                                            </div>
                                            <div className="bar-segment-v11 staking" style={{ flex: stakingPercent }}>
                                                <span className="segment-value">{stakingPercent}%</span>
                                            </div>
                                            <div className="bar-segment-v11 burn" style={{ flex: burnPercent }}>
                                                <span className="segment-value">🔥</span>
                                            </div>
                                        </div>
                                        <div className="distribution-legend-v11" style={{ marginTop: 12 }}>
                                            <span><i className="dot jackpot"></i> {t.distJackpot} ({jackpotPercent}%)</span>
                                            <span><i className="dot dividends"></i> {t.distDividends} ({dividendsPercent}%)</span>
                                            <span><i className="dot seed"></i> {t.distSeed} ({seedPercent}%)</span>
                                            <span><i className="dot staking"></i> {t.distStaking} ({stakingPercent}%)</span>
                                            <span><i className="dot burn"></i> {t.distBurn} ({burnPercent}%)</span>
                                        </div>

                                        {/* Detailed Distribution Explanations */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                                            {/* Jackpot 75% */}
                                            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255, 215, 0, 0.06)', borderRadius: 8, border: '1px solid rgba(255, 215, 0, 0.15)' }}>
                                                <div style={{ fontSize: 20, lineHeight: 1 }}>🏆</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd700', marginBottom: 3 }}>{t.distJackpot} — {jackpotPercent}%</div>
                                                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>{t.distJackpotExplain}</div>
                                                </div>
                                            </div>

                                            {/* Dividends 17% */}
                                            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(34, 211, 238, 0.06)', borderRadius: 8, border: '1px solid rgba(34, 211, 238, 0.15)' }}>
                                                <div style={{ fontSize: 20, lineHeight: 1 }}>📊</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', marginBottom: 3 }}>{t.distDividends} — {dividendsPercent}%</div>
                                                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>{t.distDividendsExplain}</div>
                                                </div>
                                            </div>

                                            {/* Seed 5% */}
                                            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(34, 197, 94, 0.06)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                                                <div style={{ fontSize: 20, lineHeight: 1 }}>🌱</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 3 }}>{t.distSeed} — {seedPercent}%</div>
                                                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>{t.distSeedExplain}</div>
                                                </div>
                                            </div>

                                            {/* Staking 2% */}
                                            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(168, 85, 247, 0.06)', borderRadius: 8, border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                                                <div style={{ fontSize: 20, lineHeight: 1 }}>💎</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', marginBottom: 3 }}>{t.distStaking} — {stakingPercent}%</div>
                                                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>{t.distStakingExplain}</div>
                                                </div>
                                            </div>

                                            {/* Burn 1% */}
                                            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                                <div style={{ fontSize: 20, lineHeight: 1 }}>🔥</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 3 }}>{t.distBurn} — {burnPercent}%</div>
                                                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>{t.distBurnExplain}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: "rgba(255,215,0,0.05)", padding: 10, borderRadius: 8, marginTop: 12, fontSize: 12, color: "#aaa" }}>
                                            {t.rulesFundDistExample || `💡 Example: 10,000 $BANMAO gift = Burn ${fmt(cost * burnPercent / 100)} | Staking ${fmt(cost * stakingPercent / 100)} | Seed ${fmt(cost * seedPercent / 100)} | Dividends ${fmt(cost * dividendsPercent / 100)} | Jackpot ${fmt(cost * jackpotPercent / 100)}`}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ==================== MECHANICS TAB ==================== */}
                            {activeTab === "mechanics" && (
                                <motion.div
                                    key="mechanics"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="rules-tab-content"
                                >
                                    {/* Timer System */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesTimerSystemTitle || "⏰ Dual Timer System"}</h3>

                                        {/* Soft Timer */}
                                        <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.05) 100%)", padding: 16, borderRadius: 12, marginBottom: 12, border: "1px solid rgba(59,130,246,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                <span style={{ fontSize: 24 }}>🔵</span>
                                                <div>
                                                    <strong style={{ color: "#3b82f6" }}>{t.rulesSoftTimerLabel}</strong>
                                                    <span style={{ marginLeft: 8, background: "#3b82f6", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{softDurationHours}h</span>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                                                {t.rulesSoftTimerFullDesc || `Starts at ${softDurationHours} hours and RESETS every gift. No gifts for ${softDurationHours}h = SOFT WIN.`}
                                            </p>
                                            <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, color: "#93c5fd" }}>
                                                {t.rulesSoftTimerExample || "💡 Example: Timer at 2h → You gift → Resets to 6h"}
                                            </div>
                                        </div>

                                        {/* Hard Timer */}
                                        <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)", padding: 16, borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                <span style={{ fontSize: 24 }}>🔴</span>
                                                <div>
                                                    <strong style={{ color: "#ef4444" }}>{t.rulesHardTimerLabel}</strong>
                                                    <span style={{ marginLeft: 8, background: "#ef4444", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t.rulesHardTimerStart(hardDurationHours)}</span>
                                                    <span style={{ marginLeft: 4, background: "#991b1b", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t.rulesHardTimerPerGift(timeDecreaseSeconds)}</span>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                                                {t.rulesHardTimerFullDesc || `Starts at ${hardDurationHours}h and DECREASES ${timeDecreaseSeconds}s per gift. Never resets. When 0 = HARD WIN.`}
                                            </p>
                                            <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, color: "#fca5a5" }}>
                                                {t.rulesHardTimerExample || `💡 Example: Timer at 10h → 5 gifts → Decreases ${5 * timeDecreaseSeconds}s → Now 9h 57.5min`}
                                            </div>
                                            <div style={{ background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 8, marginTop: 8, fontSize: 11, color: "#888" }}>
                                                {t.rulesHardTimerCalcExample || `📐 To reach 0: ${hardDurationHours}h × 60min × (60s/${timeDecreaseSeconds}s) = ${Math.floor(hardDurationHours * 3600 / timeDecreaseSeconds)} total gifts needed`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Win Conditions */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesWinConditionsDetailTitle || "🏆 Win Conditions"}</h3>

                                        {/* SOFT WIN */}
                                        <div className="win-scenario soft" style={{ marginBottom: 16 }}>
                                            <div className="scenario-header">
                                                <span className="scenario-icon">🐱</span>
                                                <div className="scenario-info">
                                                    <h4 style={{ color: "#22c55e" }}>{t.rulesSoftWinLabel}</h4>
                                                    <p>{t.rulesSoftWinFullDesc || `No gifts for ${softDurationHours}h → 100% jackpot distributed`}</p>
                                                </div>
                                            </div>
                                            <div className="scenario-dist">
                                                <div className="dist-row">
                                                    <span className="dist-role">👑 {t.winnerLabel}</span>
                                                    <span className="dist-value" style={{ color: "#ffd700" }}>{winnerPercent}%</span>
                                                </div>
                                                <div className="dist-row">
                                                    <span className="dist-role">🏆 {t.rulesTop10Label}</span>
                                                    <span className="dist-value">{topAttackersPercent}%</span>
                                                </div>
                                            </div>
                                            <div className="scenario-note" style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>{t.rulesSoftWinExampleScenario}</div>
                                        </div>

                                        {/* HARD WIN */}
                                        <div className="win-scenario hard" style={{ marginBottom: 16 }}>
                                            <div className="scenario-header">
                                                <span className="scenario-icon">⚡</span>
                                                <div className="scenario-info">
                                                    <h4 style={{ color: "#ef4444" }}>{t.rulesHardWinLabel}</h4>
                                                    <p>{t.rulesHardWinFullDesc || "Hard timer hits 0 → 70% distributed, 30% to next round"}</p>
                                                </div>
                                            </div>
                                            <div className="scenario-dist">
                                                <div className="dist-row">
                                                    <span className="dist-role">🌱 {t.rulesNextRoundSeed}</span>
                                                    <span className="dist-value" style={{ color: "#22c55e" }}>{hardWinRollover}%</span>
                                                </div>
                                                <div className="dist-row sub-header" style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                                                    <span>{t.rulesRemainingPct(hardWinDistributable)}</span>
                                                </div>
                                                <div className="dist-row sub">
                                                    <span className="dist-role">👑 {t.winnerLabel}</span>
                                                    <span className="dist-value">{hardWinWinner.toFixed(1)}%</span>
                                                </div>
                                                <div className="dist-row sub">
                                                    <span className="dist-role">🏆 {t.rulesTop10Label}</span>
                                                    <span className="dist-value">{hardWinTop10.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="scenario-note" style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>{t.rulesHardWinExampleScenario}</div>
                                        </div>

                                        {/* TIMEOUT */}
                                        <div className="win-scenario timeout" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                            <div className="scenario-header">
                                                <span className="scenario-icon">⏰</span>
                                                <div className="scenario-info">
                                                    <h4 style={{ color: "#f97316" }}>{t.rulesTimeoutLabel}</h4>
                                                    <p>{t.rulesTimeoutFullDesc || `No claims within ${claimHours}h after round ends → 100% to next round`}</p>
                                                </div>
                                            </div>
                                            <div className="scenario-dist">
                                                <div className="dist-row">
                                                    <span className="dist-role">⚠️ {t.rulesAllPrizesLost}</span>
                                                    <span className="dist-value" style={{ color: "#ef4444" }}>100% → {t.rulesToSeed}</span>
                                                </div>
                                            </div>
                                            <div className="scenario-note" style={{ fontSize: 12, color: "#fca5a5", marginTop: 8 }}>{t.rulesTimeoutExampleScenario}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ==================== REWARDS TAB ==================== */}
                            {activeTab === "rewards" && (
                                <motion.div
                                    key="rewards"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="rules-tab-content"
                                >
                                    {/* Rewards System */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesRewardsSystemTitle || "🎁 Rewards System"}</h3>

                                        <div style={{ display: "grid", gap: 12 }}>
                                            {/* Winner Reward */}
                                            <div style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.05) 100%)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,215,0,0.3)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 24 }}>👑</span>
                                                    <strong style={{ color: "#ffd700" }}>{t.rulesWinnerHeading(winnerPercent)}</strong>
                                                </div>
                                                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#e2e8f0" }}>
                                                    {t.rulesWinnerRewardDesc || `Last gifter when round ends receives ${winnerPercent}% of jackpot.`}
                                                </p>
                                            </div>

                                            {/* Min Attacks Warning */}
                                            <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)", padding: 16, borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 24 }}>⚠️</span>
                                                    <strong style={{ color: "#ef4444" }}>{t.rulesMinGiftsHeading(minAttacks)}</strong>
                                                </div>
                                                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#fca5a5" }}>
                                                    {t.rulesWinnerMinAttacksDesc || `Winner with less than ${minAttacks} gifts only receives 50% reward. Other 50% goes to next round seed.`}
                                                </p>
                                                <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, color: "#fca5a5" }}>
                                                    {t.rulesWinnerPartialDesc || `💡 Example: Win with 5 gifts (<${minAttacks}) → Get only ${winnerPercent * 0.5}% instead of ${winnerPercent}%`}
                                                </div>
                                            </div>

                                            {/* Top 10 Reward */}
                                            <div style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0.05) 100%)", padding: 16, borderRadius: 12, border: "1px solid rgba(168,85,247,0.3)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 24 }}>🏆</span>
                                                    <strong style={{ color: "#a855f7" }}>{t.rulesTop10Heading(topAttackersPercent)}</strong>
                                                </div>
                                                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#e2e8f0" }}>
                                                    {t.rulesTop10RewardDesc || `Top 10 gifters share ${topAttackersPercent}% proportionally. More gifts = larger share. Requires min ${minAttacks} gifts.`}
                                                </p>
                                                <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, color: "#c4b5fd" }}>
                                                    {t.rulesTop10CalcExample || "📐 Pool 250,000 | #1: 100 gifts | #2: 50 gifts → #1 gets 100/400 × 250,000 = 62,500"}
                                                </div>
                                            </div>

                                            {/* Hard Win Distribution */}
                                            <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)", padding: 16, borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 24 }}>🔴</span>
                                                    <strong style={{ color: "#ef4444" }}>{t.rulesHardWinRewardTitle}</strong>
                                                </div>
                                                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#fca5a5" }}>
                                                    {t.rulesHardWinRewardDesc}
                                                </p>
                                                <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, color: "#fca5a5" }}>
                                                    {t.rulesHardWinRewardExample}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Claim Deadline */}
                                    <div className="rules-card-v11" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)", border: "1px solid rgba(249,115,22,0.3)" }}>
                                        <h3 style={{ color: "#f97316" }}>{t.rulesClaimDeadlineTitle || "⏳ Claim Deadline"}</h3>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                            <div style={{ background: "#f97316", padding: "8px 16px", borderRadius: 8, fontSize: 24, fontWeight: "bold" }}>{claimHours}h</div>
                                            <p style={{ fontSize: 13, color: "#fed7aa" }}>
                                                {t.rulesClaimDeadlineDesc || `You have ${claimHours} hours to claim rewards after round ends.`}
                                            </p>
                                        </div>
                                        <div style={{ background: "rgba(239,68,68,0.2)", padding: 12, borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)" }}>
                                            <strong style={{ color: "#ef4444" }}>🚨 {t.rulesClaimTimeoutConsequence || `If ${claimHours}h pass with NO claims → ALL prizes lost!`}</strong>
                                        </div>
                                        <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 10, fontSize: 12, color: "#fdba74" }}>
                                            {t.rulesClaimDeadlineExample || `💡 Round ends 14:00 → Claim by 16:00 or lose everything!`}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ==================== VIP/TIPS TAB ==================== */}
                            {activeTab === "tips" && (
                                <motion.div
                                    key="tips"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="rules-tab-content"
                                >
                                    {/* VIP Tier System */}
                                    <div className="rules-card-v11 hover-3d">
                                        <h3>{t.rulesTierSystemTitle || "⭐ VIP Tier System"}</h3>
                                        <p style={{ fontSize: 13, marginBottom: 16, color: "#aaa" }}>
                                            {t.rulesTierOverviewDesc || "VIP based on TOTAL LIFETIME GIFTS. Higher tier = Shorter cooldown = Faster gifting."}
                                        </p>

                                        <div style={{ display: "grid", gap: 10 }}>
                                            {tiers.map((tier, idx) => (
                                                <div key={tier.name} style={{
                                                    display: "flex", alignItems: "center", gap: 12, padding: 12,
                                                    background: tier.bgColor,
                                                    borderRadius: 10, border: `1px solid ${tier.borderColor}`,
                                                }}>
                                                    <span style={{ fontSize: 28 }}>{tier.icon}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <strong style={{ color: tier.color }}>{tier.name} ({getThresholdRange(idx)})</strong>
                                                        <p style={{ fontSize: 12, color: tier.descColor }}>
                                                            {t.rulesCooldownReduction(getTierReduction(idx), Number(getEffectiveCooldown(idx)))}
                                                        </p>
                                                    </div>
                                                    <span style={{
                                                        background: idx === 3 ? `linear-gradient(135deg, #b9f2ff, #a855f7)` : tier.color,
                                                        color: idx <= 0 ? undefined : "#000",
                                                        padding: "4px 10px", borderRadius: 6, fontSize: 12,
                                                    }}>{getEffectiveCooldown(idx)}s</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ background: "rgba(255,215,0,0.1)", padding: 12, borderRadius: 8, marginTop: 16, fontSize: 12 }}>
                                            {t.rulesTierBenefitDesc || "💡 Shorter cooldown = React faster in tense final moments!"}
                                        </div>
                                    </div>

                                    {/* Strategy Tips — Combined */}
                                    <div className="rules-card-v11 hover-3d" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                        <h3 style={{ color: "#22c55e" }}>🧠 {t.rulesProTips || "Pro Tips"}</h3>

                                        {/* Quick tips */}
                                        <ul className="tips-list-v11" style={{ marginBottom: 14 }}>
                                            <li><span className="tip-emoji">✅</span> {t.tipClaim ? t.tipClaim(claimHours.toString()) : `Claim within ${claimHours}h!`}</li>
                                            <li><span className="tip-emoji">✅</span> {t.tipTier || "Higher tier = faster reactions"}</li>
                                            <li><span className="tip-emoji">✅</span> {t.tipSettle || "Anyone can finalize ended rounds"}</li>
                                            <li><span className="tip-emoji">⚠️</span> {t.tipMaxAttacks ? t.tipMaxAttacks(maxAttacks) : `Max ${maxAttacks} gifts per round!`}</li>
                                            <li><span className="tip-emoji">⚠️</span> {t.rulesMinGiftsForPrize ? t.rulesMinGiftsForPrize(minAttacks) : `Min ${minAttacks} gifts to win full prize!`}</li>
                                        </ul>

                                        {/* Advanced strategy tips */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            {t.tipEarlyBird && (
                                                <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.04)", fontSize: 12, lineHeight: 1.6, color: "#cbd5e1" }}>
                                                    {t.tipEarlyBird(dividendsPercent)}
                                                    {t.tipEarlyBirdExample && (
                                                        <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#86efac", fontSize: 11 }}>
                                                            {t.tipEarlyBirdExample}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {t.tipSoftStrategy && (
                                                <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.04)", fontSize: 12, lineHeight: 1.6, color: "#cbd5e1" }}>
                                                    {t.tipSoftStrategy}
                                                </div>
                                            )}
                                            {t.tipHardAwareness && (
                                                <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.04)", fontSize: 12, lineHeight: 1.6, color: "#cbd5e1" }}>
                                                    {t.tipHardAwareness(timeDecreaseSeconds)}
                                                </div>
                                            )}
                                            {t.tipClaimUrgent && (
                                                <div style={{ padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.1)", fontSize: 12, lineHeight: 1.6, color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
                                                    {t.tipClaimUrgent(claimHours.toString())}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Example Round */}
                                    <div className="rules-card-v11" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                                        <h3 style={{ color: "#3b82f6" }}>{t.rulesExampleRoundTitle || "📝 Complete Round Example"}</h3>
                                        <p style={{ fontSize: 12, lineHeight: 1.7, color: "#93c5fd" }}>
                                            {t.rulesExampleRoundScenario || "Round 5 starts with Seed = 500,000. Hard timer = 120h, Soft timer = 6h. Alice gifts 20x → Jackpot grows. After 3 days, Hard timer hits 0. Carol is last → Carol wins HARD WIN with 70% × 75% = 52.5% of jackpot."}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
