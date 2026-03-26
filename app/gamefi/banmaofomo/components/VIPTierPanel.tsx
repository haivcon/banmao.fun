/**
 * VIPTierPanel Component
 * Shows player VIP tier progress, cooldown reduction bonus, and next tier goal
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";

// VIP Tier definitions (defaults matching contract, overridden by tierData prop)
const TIER_CONFIG_DEFAULT = [
    { name: "Newcomer", icon: "🌱", threshold: 0, cooldownReduction: 0, color: "#888" },
    { name: "Bronze", icon: "🥉", threshold: 10, cooldownReduction: 0, color: "#cd7f32" },
    { name: "Silver", icon: "🥈", threshold: 100, cooldownReduction: 10, color: "#c0c0c0" },
    { name: "Gold", icon: "🥇", threshold: 500, cooldownReduction: 20, color: "#ffd700" },
    { name: "Diamond", icon: "💎", threshold: 1000, cooldownReduction: 40, color: "#b9f2ff" },
];

interface TierDataItem {
    threshold: number;
    cooldownReduction: number;
}

interface VIPTierPanelProps {
    currentTier: number; // 0-4
    lifetimeAttacks: bigint;
    baseCooldown: bigint;
    isConnected: boolean;
    tierData?: TierDataItem[]; // Dynamic tier data from contract
}

export default function VIPTierPanel({
    currentTier,
    lifetimeAttacks,
    baseCooldown,
    isConnected,
    tierData,
}: VIPTierPanelProps) {
    if (!isConnected) return null;

    // Build effective tier config: merge contract data into defaults
    const TIER_CONFIG = TIER_CONFIG_DEFAULT.map((defaultTier, idx) => {
        if (idx === 0 || !tierData || !tierData[idx - 1]) return defaultTier;
        return {
            ...defaultTier,
            threshold: tierData[idx - 1].threshold,
            cooldownReduction: tierData[idx - 1].cooldownReduction,
        };
    });

    const tier = TIER_CONFIG[currentTier] || TIER_CONFIG[0];
    const nextTier = currentTier < 4 ? TIER_CONFIG[currentTier + 1] : null;

    const attacks = Number(lifetimeAttacks);
    const progressToNext = nextTier
        ? Math.min(100, ((attacks - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100)
        : 100;

    const attacksToNext = nextTier ? nextTier.threshold - attacks : 0;

    // Calculate effective cooldown
    const base = Number(baseCooldown);
    const reduction = tier.cooldownReduction;
    const effectiveCooldown = Math.ceil(base * (1 - reduction / 100));

    return (
        <motion.div
            className="vip-tier-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: `1px solid ${tier.color}33`,
                borderRadius: "16px",
                padding: "16px",
                marginTop: "16px",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <motion.span
                    style={{ fontSize: "32px" }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {tier.icon}
                </motion.span>
                <div>
                    <div style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: tier.color,
                        textShadow: `0 0 10px ${tier.color}50`
                    }}>
                        {tier.name} Tier
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>
                        {attacks.toLocaleString()} lifetime attacks
                    </div>
                </div>
            </div>

            {/* Progress Bar to Next Tier */}
            {nextTier && (
                <div style={{ marginBottom: "12px" }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "#888",
                        marginBottom: "4px"
                    }}>
                        <span>{tier.name}</span>
                        <span>{nextTier.name} ({attacksToNext} more)</span>
                    </div>
                    <div style={{
                        height: "8px",
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "4px",
                        overflow: "hidden",
                    }}>
                        <motion.div
                            style={{
                                height: "100%",
                                background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`,
                                borderRadius: "4px",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressToNext}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            )}

            {/* Cooldown Bonus */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: reduction > 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(255,255,255,0.05)",
                borderRadius: "8px",
                fontSize: "0.8rem",
            }}>
                <span style={{ color: "#888" }}>
                    ❄️ Cooldown
                </span>
                <span style={{ color: reduction > 0 ? "#22c55e" : "#fff" }}>
                    {reduction > 0 ? (
                        <>
                            <span style={{ textDecoration: "line-through", color: "#666", marginRight: "6px" }}>
                                {base}s
                            </span>
                            {effectiveCooldown}s
                            <span style={{ color: "#22c55e", marginLeft: "4px", fontSize: "0.7rem" }}>
                                (-{reduction}%)
                            </span>
                        </>
                    ) : (
                        `${base}s`
                    )}
                </span>
            </div>
        </motion.div>
    );
}

interface DynamicCostPanelProps {
    isEnabled: boolean;
    currentJackpot: bigint;
    baseCost: bigint;
    effectiveCost: bigint;
}

// Dynamic Cost thresholds from contract
const DYNAMIC_THRESHOLDS = [
    { threshold: 500000, multiplier: 100, label: "500K" },
    { threshold: 1000000, multiplier: 150, label: "1M" },
    { threshold: 2000000, multiplier: 200, label: "2M" },
    { threshold: 5000000, multiplier: 300, label: "5M" },
];

export function DynamicCostPanel({
    isEnabled,
    currentJackpot,
    baseCost,
    effectiveCost,
}: DynamicCostPanelProps) {
    if (!isEnabled) return null;

    const jackpot = Number(formatUnits(currentJackpot, 18));
    const base = Number(formatUnits(baseCost, 18));
    const effective = Number(formatUnits(effectiveCost, 18));
    const multiplier = base > 0 ? (effective / base) : 1;

    // Find current threshold level
    let currentLevel = 0;
    for (let i = DYNAMIC_THRESHOLDS.length - 1; i >= 0; i--) {
        if (jackpot >= DYNAMIC_THRESHOLDS[i].threshold) {
            currentLevel = i + 1;
            break;
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "16px",
                padding: "16px",
                marginTop: "16px",
            }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                fontSize: "0.9rem",
                fontWeight: 600,
            }}>
                📈 Dynamic Cost Active
                {multiplier > 1 && (
                    <span style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        padding: "2px 8px",
                        borderRadius: "8px",
                        fontSize: "0.7rem",
                    }}>
                        x{multiplier.toFixed(1)}
                    </span>
                )}
            </div>

            {/* Threshold Visualization */}
            <div style={{
                display: "flex",
                gap: "4px",
                marginBottom: "12px",
            }}>
                {DYNAMIC_THRESHOLDS.map((t, idx) => {
                    const isActive = jackpot >= t.threshold;
                    const isCurrent = currentLevel === idx + 1;
                    return (
                        <div
                            key={idx}
                            style={{
                                flex: 1,
                                padding: "8px 4px",
                                textAlign: "center",
                                background: isActive
                                    ? "rgba(239, 68, 68, 0.2)"
                                    : "rgba(255,255,255,0.05)",
                                border: isCurrent ? "1px solid #ef4444" : "1px solid transparent",
                                borderRadius: "8px",
                                fontSize: "0.65rem",
                            }}
                        >
                            <div style={{ color: isActive ? "#ef4444" : "#666" }}>
                                {t.label}
                            </div>
                            <div style={{
                                color: isActive ? "#fff" : "#444",
                                fontWeight: isActive ? 600 : 400,
                            }}>
                                x{(t.multiplier / 100).toFixed(1)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Current Cost Display */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "8px",
            }}>
                <span style={{ color: "#888" }}>Current Cost</span>
                <span>
                    <span style={{
                        textDecoration: multiplier > 1 ? "line-through" : "none",
                        color: multiplier > 1 ? "#666" : "#fff",
                        marginRight: multiplier > 1 ? "6px" : 0,
                    }}>
                        {base.toLocaleString()}
                    </span>
                    {multiplier > 1 && (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>
                            {effective.toLocaleString()} $BANMAO
                        </span>
                    )}
                    {multiplier <= 1 && " $BANMAO"}
                </span>
            </div>
        </motion.div>
    );
}

interface SeedFundDisplayProps {
    seedFund: bigint;
}

export function SeedFundDisplay({ seedFund }: SeedFundDisplayProps) {
    const amount = Number(formatUnits(seedFund, 18));
    if (amount <= 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "12px",
                fontSize: "0.8rem",
                marginTop: "12px",
            }}
        >
            <span style={{ fontSize: "1.2rem" }}>🌱</span>
            <span style={{ color: "#888" }}>Next Round Seed:</span>
            <span style={{ color: "#22c55e", fontWeight: 600 }}>
                {amount.toLocaleString()} $BANMAO
            </span>
        </motion.div>
    );
}
