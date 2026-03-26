/**
 * HistoryTimeline - Visual Timeline Chart of Past Rounds
 * Shows jackpot progression, winners, and round durations in a horizontal scrollable timeline
 */
"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";

interface RoundData {
    roundId: number;
    jackpot: bigint;
    winner: string;
    totalAttacks: number;
    duration: number; // in seconds
    winType: string; // "soft" | "hard"
}

interface HistoryTimelineProps {
    rounds: RoundData[];
    currentRound: number;
}

export default function HistoryTimeline({ rounds, currentRound }: HistoryTimelineProps) {
    const processedRounds = useMemo(() => {
        if (!rounds || rounds.length === 0) return [];

        const maxJackpot = Math.max(...rounds.map(r => Number(formatUnits(r.jackpot, 18))));

        return rounds.map(r => {
            const jackpotValue = Number(formatUnits(r.jackpot, 18));
            return {
                ...r,
                jackpotValue,
                barHeight: maxJackpot > 0 ? (jackpotValue / maxJackpot) * 100 : 50,
                formattedJackpot: jackpotValue >= 1000000
                    ? `${(jackpotValue / 1000000).toFixed(1)}M`
                    : jackpotValue >= 1000
                        ? `${(jackpotValue / 1000).toFixed(0)}K`
                        : jackpotValue.toFixed(0),
                durationFormatted: formatDuration(r.duration),
                shortenedWinner: r.winner ? `${r.winner.slice(0, 4)}...${r.winner.slice(-3)}` : "N/A",
            };
        });
    }, [rounds]);

    if (processedRounds.length === 0) {
        return (
            <div style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
                color: "#606070",
                fontSize: "13px",
            }}>
                📊 No round history available yet
            </div>
        );
    }

    return (
        <div style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid rgba(255, 215, 0, 0.1)",
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ color: "#ffd700", margin: 0, fontSize: "14px", fontWeight: 700 }}>
                    📊 Jackpot History
                </h4>
                <span style={{ color: "#606070", fontSize: "11px" }}>
                    Last {processedRounds.length} rounds
                </span>
            </div>

            {/* Timeline Chart - Horizontal scrollable bars */}
            <div style={{
                display: "flex",
                gap: "4px",
                alignItems: "flex-end",
                height: "120px",
                overflowX: "auto",
                overflowY: "hidden",
                paddingBottom: "4px",
                WebkitOverflowScrolling: "touch",
            }}>
                {processedRounds.map((round, index) => {
                    const isWin = round.winType === "soft";
                    const barColor = isWin
                        ? "linear-gradient(180deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(180deg, #ef4444, #dc2626)";

                    return (
                        <motion.div
                            key={round.roundId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: `${Math.max(round.barHeight, 8)}%`, opacity: 1 }}
                            transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                            title={`Round ${round.roundId}\nJackpot: ${round.formattedJackpot}\nWinner: ${round.shortenedWinner}\nType: ${round.winType.toUpperCase()} WIN\nDuration: ${round.durationFormatted}\nAttacks: ${round.totalAttacks}`}
                            style={{
                                flex: "0 0 auto",
                                width: processedRounds.length > 20 ? "14px" : "24px",
                                minWidth: "10px",
                                background: barColor,
                                borderRadius: "4px 4px 0 0",
                                position: "relative",
                                cursor: "pointer",
                                transition: "filter 0.2s",
                                boxShadow: `0 0 6px ${isWin ? "rgba(251, 191, 36, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                            }}
                            whileHover={{ filter: "brightness(1.3)", scale: 1.05 }}
                        >
                            {/* Jackpot label on tall bars */}
                            {round.barHeight > 40 && (
                                <div style={{
                                    position: "absolute",
                                    top: "4px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    fontSize: "8px",
                                    fontWeight: 700,
                                    color: "rgba(255,255,255,0.9)",
                                    whiteSpace: "nowrap",
                                    writingMode: "vertical-lr",
                                    textOrientation: "mixed",
                                }}>
                                    {round.formattedJackpot}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                marginTop: "12px",
                paddingTop: "8px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#fbbf24" }} />
                    <span style={{ color: "#a0a0b0", fontSize: "10px" }}>Soft Win</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#ef4444" }} />
                    <span style={{ color: "#a0a0b0", fontSize: "10px" }}>Hard Win</span>
                </div>
            </div>

            {/* Stats Summary */}
            {processedRounds.length >= 2 && (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                    marginTop: "12px",
                }}>
                    <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <div style={{ color: "#ffd700", fontSize: "14px", fontWeight: 700 }}>
                            {processedRounds.reduce((sum, r) => sum + r.jackpotValue, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ color: "#606070", fontSize: "9px", marginTop: "2px" }}>Total Jackpots</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <div style={{ color: "#fbbf24", fontSize: "14px", fontWeight: 700 }}>
                            {processedRounds.filter(r => r.winType === "soft").length}
                        </div>
                        <div style={{ color: "#606070", fontSize: "9px", marginTop: "2px" }}>Soft Wins</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <div style={{ color: "#ef4444", fontSize: "14px", fontWeight: 700 }}>
                            {processedRounds.filter(r => r.winType === "hard").length}
                        </div>
                        <div style={{ color: "#606070", fontSize: "9px", marginTop: "2px" }}>Hard Wins</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
