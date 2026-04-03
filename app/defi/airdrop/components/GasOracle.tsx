// Gas Oracle Widget — real-time gas price display with sparkline trend
"use client";

import React from "react";
import { useGasOracle } from "../hooks/useGasOracle";

interface GasOracleWidgetProps {
    t: (key: string) => string;
    compact?: boolean;
}

export default function GasOracleWidget({ t, compact = false }: GasOracleWidgetProps) {
    const { gasPriceGwei, history, level, isLoading, lastUpdate, refresh } = useGasOracle();

    const levelColors = {
        low: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#4ade80", label: "🟢" },
        medium: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", text: "#fbbf24", label: "🟡" },
        high: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171", label: "🔴" },
    };
    const c = levelColors[level];

    // Sparkline SVG
    const sparkline = () => {
        if (history.length < 2) return null;
        const prices = history.map(h => h.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 0.01;
        const w = compact ? 60 : 100;
        const h = compact ? 20 : 28;
        const points = prices.map((p, i) => {
            const x = (i / (prices.length - 1)) * w;
            const y = h - ((p - min) / range) * h;
            return `${x},${y}`;
        }).join(" ");

        return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
                <polyline
                    points={points}
                    fill="none"
                    stroke={c.text}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 0 3px ${c.text})` }}
                />
                {/* Current point dot */}
                {prices.length > 0 && (() => {
                    const lastX = w;
                    const lastY = h - ((prices[prices.length - 1] - min) / range) * h;
                    return <circle cx={lastX} cy={lastY} r="2.5" fill={c.text} />;
                })()}
            </svg>
        );
    };

    const ageSeconds = lastUpdate ? Math.round((Date.now() - lastUpdate) / 1000) : 0;

    if (compact) {
        return (
            <div
                onClick={refresh}
                style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 8,
                    background: c.bg, border: `1px solid ${c.border}`,
                    cursor: "pointer", fontSize: 12, transition: "all 0.2s",
                }}
                title={`Gas: ${gasPriceGwei.toFixed(4)} Gwei | ${t("gasOracleClick") || "Click to refresh"}`}
            >
                <span>{c.label}</span>
                <span style={{ color: c.text, fontWeight: 700, fontFamily: "monospace" }}>
                    {isLoading ? "..." : `${gasPriceGwei.toFixed(3)}`}
                </span>
                <span style={{ color: "#888", fontSize: 10 }}>Gwei</span>
                {sparkline()}
            </div>
        );
    }

    return (
        <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: c.bg, border: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", gap: 12,
            transition: "all 0.3s",
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{c.label}</span>
                    <span style={{ color: c.text, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>
                        {isLoading ? "..." : gasPriceGwei.toFixed(4)}
                    </span>
                    <span style={{ color: "#888", fontSize: 12 }}>Gwei</span>
                </div>
                <div style={{ color: "#888", fontSize: 11 }}>
                    {level === "low" ? (t("gasLevelLow") || "✅ Good time to send") :
                     level === "high" ? (t("gasLevelHigh") || "⚠️ Consider waiting — gas is high") :
                     (t("gasLevelMedium") || "Gas is moderate")}
                    {ageSeconds > 0 && <span style={{ marginLeft: 8, opacity: 0.5 }}>({ageSeconds}s ago)</span>}
                </div>
            </div>
            <div style={{ flexShrink: 0 }}>
                {sparkline()}
            </div>
            <button
                onClick={refresh}
                style={{
                    background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                    color: "#888", cursor: "pointer", padding: "4px 8px", fontSize: 11,
                }}
                title={t("gasOracleRefresh") || "Refresh"}
            >
                🔄
            </button>
        </div>
    );
}
