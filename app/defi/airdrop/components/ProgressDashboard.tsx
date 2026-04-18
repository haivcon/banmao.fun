// Progress Dashboard — real-time metrics during airdrop sending
"use client";

import React, { useMemo } from "react";
import { SendResult } from "./airdropTypes";

interface ProgressDashboardProps {
    t: (key: string) => string;
    results: SendResult[];
    totalEntries: number;
    sendStartTime: number;
    gasPriceGwei?: number;
    isActive: boolean;
}

export default function ProgressDashboard({ t, results, totalEntries, sendStartTime, gasPriceGwei, isActive }: ProgressDashboardProps) {
    const stats = useMemo(() => {
        const success = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const elapsed = sendStartTime ? (Date.now() - sendStartTime) / 1000 : 0;
        const txPerSec = elapsed > 0 ? success.length / elapsed : 0;
        const remaining = totalEntries - results.length;
        const eta = txPerSec > 0 ? remaining / txPerSec : 0;
        const successRate = results.length > 0 ? (success.length / results.length) * 100 : 0;
        const totalSent = success.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        return { success: success.length, failed: failed.length, elapsed, txPerSec, remaining, eta, successRate, totalSent };
    }, [results, totalEntries, sendStartTime]);

    const formatTime = (s: number) => {
        if (s < 60) return `${Math.round(s)}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
        return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    };

    // Donut chart SVG
    const donut = () => {
        const total = stats.success + stats.failed;
        if (total === 0) return null;
        const successAngle = (stats.success / total) * 360;
        const r = 32, cx = 40, cy = 40;
        const successArc = describeArc(cx, cy, r, 0, successAngle);
        const failArc = describeArc(cx, cy, r, successAngle, 360);

        return (
            <svg width={80} height={80} viewBox="0 0 80 80">
                {stats.failed > 0 && <path d={failArc} fill="none" stroke="#ef4444" strokeWidth="6" />}
                {stats.success > 0 && <path d={successArc} fill="none" stroke="#22c55e" strokeWidth="6" />}
                <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
                    {Math.round(stats.successRate)}%
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="#888" fontSize="9">
                    {t("progressSuccessRate") || "Success"}
                </text>
            </svg>
        );
    };

    // Speed bar (rolling last 10 results)
    const speedBar = () => {
        const recent = results.slice(-20);
        if (recent.length < 2) return null;
        const bars = recent.map((r, i) => ({
            success: r.success,
            height: 10 + Math.random() * 15, // Visual variation
        }));

        return (
            <svg width={120} height={30} viewBox="0 0 120 30">
                {bars.map((b, i) => (
                    <rect
                        key={i}
                        x={i * 6}
                        y={30 - b.height}
                        width={4}
                        height={b.height}
                        rx={1}
                        fill={b.success ? "#22c55e" : "#ef4444"}
                        opacity={0.6 + (i / bars.length) * 0.4}
                    />
                ))}
            </svg>
        );
    };

    if (!isActive && results.length === 0) return null;

    return (
        <div style={{
            padding: "16px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(15,15,35,0.9), rgba(25,15,50,0.9))",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16,
            alignItems: "center",
        }}>
            {/* Left: Donut */}
            <div style={{ display: "flex", justifyContent: "center" }}>
                {donut()}
            </div>

            {/* Center: Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                <StatItem label={t("progressSent") || "Sent"} value={`${results.length}/${totalEntries}`} color="#60a5fa" />
                <StatItem label={t("progressSuccess") || "Success"} value={`${stats.success}`} color="#4ade80" />
                <StatItem label={t("progressFailed") || "Failed"} value={`${stats.failed}`} color="#f87171" />
                <StatItem label={t("progressSpeed") || "Speed"} value={`${stats.txPerSec.toFixed(1)} tx/s`} color="#a78bfa" />
                <StatItem label={t("progressElapsed") || "Elapsed"} value={formatTime(stats.elapsed)} color="#888" />
                <StatItem label={t("progressETA") || "ETA"} value={stats.remaining > 0 ? formatTime(stats.eta) : "—"} color="#fbbf24" />
                {gasPriceGwei !== undefined && (
                    <StatItem label="Gas" value={`${gasPriceGwei.toFixed(3)} Gwei`} color="#888" />
                )}
                <StatItem label={t("progressTotalSent") || "Total"} value={stats.totalSent.toLocaleString()} color="#22d3ee" />
            </div>

            {/* Right: Speed Bar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {speedBar()}
                <span style={{ fontSize: 9, color: "#666" }}>{t("progressRecentTx") || "Recent TX"}</span>
            </div>
        </div>
    );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
        </div>
    );
}

// Arc helper for donut chart
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const start = { x: cx + r * Math.cos(rad(endAngle)), y: cy + r * Math.sin(rad(endAngle)) };
    const end = { x: cx + r * Math.cos(rad(startAngle)), y: cy + r * Math.sin(rad(startAngle)) };
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}
