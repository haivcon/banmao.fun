/**
 * NextRoundPanel — Shows scheduled config changes for the next round
 * Reads nextConfig() from contract, compares with current activeConfig
 */
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { BANMAOFOMO_ADDRESS } from "../lib/constants";
import { BANMAOFOMO_V11_ABI } from "../lib/abis-v11";
import type { GameConfigV11 } from "../lib/types";
import type { LocaleStrings } from "../lib/i18n/types";

interface NextRoundPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: GameConfigV11 | null;
    t: LocaleStrings;
}

interface ConfigParam {
    key: keyof GameConfigV11;
    icon: string;
    getLabel: (t: LocaleStrings) => string;
    format: (val: bigint) => string;
    /** Higher = buff or nerf? "higher_is_buff" means bigger value is green */
    direction: "higher_is_buff" | "higher_is_nerf" | "neutral";
}

const fmtTokens = (val: bigint) => Number(formatUnits(val, 18)).toLocaleString();
const fmtSeconds = (val: bigint) => {
    const s = Number(val);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
};
const fmtPercent = (val: bigint) => `${Number(val)}%`;
const fmtNumber = (val: bigint) => Number(val).toLocaleString();

const CONFIG_PARAMS: ConfigParam[] = [
    {
        key: "attackCost",
        icon: "💰",
        getLabel: (t) => t.nrAttackCost || "Attack Cost",
        format: fmtTokens,
        direction: "higher_is_nerf",
    },
    {
        key: "softDuration",
        icon: "🐱",
        getLabel: (t) => t.nrSoftDuration || "Soft Timer",
        format: fmtSeconds,
        direction: "neutral",
    },
    {
        key: "initialHardDuration",
        icon: "⚡",
        getLabel: (t) => t.nrHardDuration || "Hard Timer",
        format: fmtSeconds,
        direction: "neutral",
    },
    {
        key: "timeDecreaseStep",
        icon: "⏱️",
        getLabel: (t) => t.nrTimeStep || "Time Decrease Step",
        format: (v) => `${Number(v)}s`,
        direction: "higher_is_nerf",
    },
    {
        key: "maxAttacksPerRound",
        icon: "🎯",
        getLabel: (t) => t.nrMaxAttacks || "Max Attacks/Round",
        format: fmtNumber,
        direction: "higher_is_buff",
    },
    {
        key: "minAttacksForReward",
        icon: "⭐",
        getLabel: (t) => t.nrMinAttacks || "Min Attacks for Reward",
        format: fmtNumber,
        direction: "higher_is_nerf",
    },
    {
        key: "winnerPercent",
        icon: "👑",
        getLabel: (t) => t.nrWinnerPct || "Winner %",
        format: fmtPercent,
        direction: "higher_is_buff",
    },
    {
        key: "topAttackersPercent",
        icon: "🏆",
        getLabel: (t) => t.nrTopPct || "Top 10 %",
        format: fmtPercent,
        direction: "higher_is_buff",
    },
    {
        key: "claimExpirationTime",
        icon: "⏰",
        getLabel: (t) => t.nrClaimExp || "Claim Deadline",
        format: fmtSeconds,
        direction: "higher_is_buff",
    },
];

function parseConfig(data: unknown): GameConfigV11 | null {
    if (!data) return null;
    const d = data as any;
    return {
        attackCost: BigInt(d[0] ?? d.attackCost ?? 0),
        softDuration: BigInt(d[1] ?? d.softDuration ?? 0),
        initialHardDuration: BigInt(d[2] ?? d.initialHardDuration ?? 0),
        timeDecreaseStep: BigInt(d[3] ?? d.timeDecreaseStep ?? 0),
        maxAttacksPerRound: BigInt(d[4] ?? d.maxAttacksPerRound ?? 0),
        winnerPercent: BigInt(d[5] ?? d.winnerPercent ?? 0),
        topAttackersPercent: BigInt(d[6] ?? d.topAttackersPercent ?? 0),
        minAttacksForReward: BigInt(d[7] ?? d.minAttacksForReward ?? 0),
        claimExpirationTime: BigInt(d[8] ?? d.claimExpirationTime ?? 0),
    };
}

export default function NextRoundPanel({ isOpen, onClose, currentConfig, t }: NextRoundPanelProps) {
    // Mobile detection
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    // Read nextConfig from contract
    const { data: nextConfigRaw } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_V11_ABI,
        functionName: "nextConfig",
        query: { enabled: isOpen, refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const nextConfig = parseConfig(nextConfigRaw);

    // Check if any values differ
    const hasChanges = currentConfig && nextConfig && CONFIG_PARAMS.some(p => {
        return currentConfig[p.key] !== nextConfig[p.key];
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9998,
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px",
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(145deg, rgba(15, 15, 30, 0.98), rgba(25, 25, 50, 0.95))",
                            borderRadius: isMobile ? "14px" : "20px",
                            border: isMobile ? "1px solid rgba(139, 92, 246, 0.3)" : "2px solid rgba(139, 92, 246, 0.4)",
                            boxShadow: "0 0 40px rgba(139, 92, 246, 0.15), inset 0 0 20px rgba(139, 92, 246, 0.03)",
                            width: "100%",
                            maxWidth: isMobile ? "100%" : "520px",
                            maxHeight: isMobile ? "80vh" : "85vh",
                            overflowY: "auto",
                            padding: isMobile ? "12px 10px" : "20px",
                            position: "relative",
                        }}
                    >
                        {/* Close Button */}
                        <motion.button
                            onClick={onClose}
                            whileHover={{ scale: 1.15, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: "rgba(255,255,255,0.1)",
                                color: "#fff",
                                fontSize: "16px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 10,
                            }}
                        >
                            ✕
                        </motion.button>

                        {/* Header */}
                        <div style={{ textAlign: "center", marginBottom: isMobile ? "10px" : "16px" }}>
                            <div style={{
                                fontSize: isMobile ? "14px" : "18px",
                                fontWeight: 800,
                                color: "#a78bfa",
                                marginBottom: "2px",
                            }}>
                                🔮 {t.nrTitle || "Next Round Config"}
                            </div>
                            <div style={{
                                fontSize: isMobile ? "9px" : "11px",
                                color: "#64748b",
                            }}>
                                {t.nrSubtitle || "Scheduled parameter changes for the next round"}
                            </div>
                        </div>

                        {/* Loading state */}
                        {!nextConfig && (
                            <div style={{
                                textAlign: "center",
                                padding: "32px",
                                color: "#64748b",
                            }}>
                                <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
                                Loading...
                            </div>
                        )}

                        {/* No changes */}
                        {nextConfig && currentConfig && !hasChanges && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    textAlign: "center",
                                    padding: "24px",
                                    background: "rgba(34, 197, 94, 0.08)",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(34, 197, 94, 0.2)",
                                    color: "#4ade80",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                }}
                            >
                                ✅ {t.nrNoChanges || "No changes scheduled — next round uses same config"}
                            </motion.div>
                        )}

                        {/* Config comparison table */}
                        {nextConfig && currentConfig && (
                            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "3px" : "6px" }}>
                                {/* Table header */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: isMobile ? "1fr 70px 70px" : "1fr 90px 90px",
                                    gap: isMobile ? "4px" : "8px",
                                    padding: isMobile ? "4px 6px" : "6px 10px",
                                    fontSize: isMobile ? "8px" : "10px",
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                }}>
                                    <span>{t.nrParam || "Parameter"}</span>
                                    <span style={{ textAlign: "right" }}>{t.nrCurrent || "Current"}</span>
                                    <span style={{ textAlign: "right" }}>{t.nrNext || "Next"}</span>
                                </div>

                                {/* Rows */}
                                {CONFIG_PARAMS.map((param, idx) => {
                                    const cur = currentConfig[param.key];
                                    const next = nextConfig[param.key];
                                    const changed = cur !== next;
                                    const isHigher = next > cur;

                                    let changeColor = "#64748b"; // gray = no change
                                    if (changed) {
                                        if (param.direction === "neutral") {
                                            changeColor = "#38bdf8"; // blue
                                        } else if (
                                            (param.direction === "higher_is_buff" && isHigher) ||
                                            (param.direction === "higher_is_nerf" && !isHigher)
                                        ) {
                                            changeColor = "#4ade80"; // green = buff
                                        } else {
                                            changeColor = "#f87171"; // red = nerf
                                        }
                                    }

                                    return (
                                        <motion.div
                                            key={param.key}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: isMobile ? "1fr 70px 70px" : "1fr 90px 90px",
                                                gap: isMobile ? "4px" : "8px",
                                                padding: isMobile ? "5px 6px" : "8px 10px",
                                                borderRadius: isMobile ? "6px" : "8px",
                                                background: changed
                                                    ? `${changeColor}10`
                                                    : "rgba(255,255,255,0.02)",
                                                border: changed
                                                    ? `1px solid ${changeColor}30`
                                                    : "1px solid transparent",
                                                alignItems: "center",
                                            }}
                                        >
                                            {/* Label */}
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: isMobile ? "4px" : "6px",
                                                fontSize: isMobile ? "10px" : "12px",
                                                fontWeight: 600,
                                                color: changed ? "#fff" : "#94a3b8",
                                            }}>
                                                <span style={{ fontSize: isMobile ? "11px" : "14px" }}>{param.icon}</span>
                                                <span>{param.getLabel(t)}</span>
                                            </div>

                                            {/* Current value */}
                                            <div style={{
                                                textAlign: "right",
                                                fontSize: isMobile ? "10px" : "12px",
                                                fontWeight: 600,
                                                color: changed ? "#64748b" : "#94a3b8",
                                                textDecoration: changed ? "line-through" : "none",
                                                opacity: changed ? 0.6 : 1,
                                            }}>
                                                {param.format(cur)}
                                            </div>

                                            {/* Next value */}
                                            <div style={{
                                                textAlign: "right",
                                                fontSize: isMobile ? "10px" : "12px",
                                                fontWeight: changed ? 800 : 600,
                                                color: changed ? changeColor : "#94a3b8",
                                            }}>
                                                {param.format(next)}
                                                {changed && (
                                                    <span style={{ marginLeft: "3px", fontSize: isMobile ? "8px" : "10px" }}>
                                                        {isHigher ? "▲" : "▼"}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer hint */}
                        <div style={{
                            marginTop: isMobile ? "8px" : "12px",
                            textAlign: "center",
                            fontSize: isMobile ? "9px" : "10px",
                            color: "#475569",
                            lineHeight: 1.5,
                        }}>
                            {t.nrFooter || "Changes apply when the next round starts after settle."}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
