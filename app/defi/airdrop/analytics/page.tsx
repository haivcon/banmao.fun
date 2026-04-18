"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "../airdrop.css";

interface AirdropRecord {
    sender: string;
    token_symbol: string;
    total_amount: number;
    recipient_count: number;
    created_at: string;
}

interface StatsData {
    total_airdrops: number;
    total_recipients: number;
    total_amount: number;
    unique_senders: number;
}

export default function AirdropAnalyticsPage() {
    const [records, setRecords] = useState<AirdropRecord[]>([]);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

    useEffect(() => {
        Promise.all([
            fetch("/api/airdrop-records?type=stats").then(r => r.json()),
            fetch("/api/airdrop-records?type=recent&limit=100").then(r => r.json()),
        ]).then(([statsRes, recordsRes]) => {
            if (statsRes.success) setStats(statsRes.data);
            if (recordsRes.success) setRecords(recordsRes.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Group records by date for timeline chart
    const dailyData = useCallback(() => {
        const days: Record<string, { count: number; recipients: number; amount: number }> = {};
        const cutoff = timeRange === "7d" ? Date.now() - 7 * 86400000 :
                       timeRange === "30d" ? Date.now() - 30 * 86400000 : 0;

        records.filter(r => new Date(r.created_at).getTime() > cutoff).forEach(r => {
            const day = new Date(r.created_at).toLocaleDateString();
            if (!days[day]) days[day] = { count: 0, recipients: 0, amount: 0 };
            days[day].count++;
            days[day].recipients += r.recipient_count || 0;
            days[day].amount += r.total_amount || 0;
        });

        return Object.entries(days).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    }, [records, timeRange]);

    // Top senders
    const topSenders = useCallback(() => {
        const senders: Record<string, { count: number; recipients: number; amount: number }> = {};
        records.forEach(r => {
            const key = r.sender;
            if (!senders[key]) senders[key] = { count: 0, recipients: 0, amount: 0 };
            senders[key].count++;
            senders[key].recipients += r.recipient_count || 0;
            senders[key].amount += r.total_amount || 0;
        });
        return Object.entries(senders)
            .sort(([, a], [, b]) => b.amount - a.amount)
            .slice(0, 10);
    }, [records]);

    // Bar chart SVG
    const BarChart = ({ data, height = 120 }: { data: [string, { count: number; recipients: number; amount: number }][]; height?: number }) => {
        if (data.length === 0) return <div style={{ padding: 20, textAlign: "center", color: "#666" }}>No data</div>;
        const maxVal = Math.max(...data.map(([, d]) => d.recipients), 1);
        const barW = Math.max(8, Math.min(40, 600 / data.length - 4));
        const w = data.length * (barW + 4) + 20;

        return (
            <div style={{ overflowX: "auto", padding: "8px 0" }}>
                <svg width={w} height={height + 30} viewBox={`0 0 ${w} ${height + 30}`}>
                    {data.map(([label, d], i) => {
                        const h = (d.recipients / maxVal) * height;
                        const x = i * (barW + 4) + 10;
                        return (
                            <g key={i}>
                                <rect x={x} y={height - h} width={barW} height={h} rx={3}
                                    fill="url(#barGrad)" opacity={0.8} />
                                <text x={x + barW / 2} y={height - h - 4} textAnchor="middle"
                                    fill="#60a5fa" fontSize="9" fontWeight="600">{d.recipients}</text>
                                {data.length <= 14 && (
                                    <text x={x + barW / 2} y={height + 14} textAnchor="middle"
                                        fill="#666" fontSize="8" transform={`rotate(-45, ${x + barW / 2}, ${height + 14})`}>
                                        {label.split("/").slice(0, 2).join("/")}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        );
    };

    return (
        <div className="defi-airdrop-page dark" style={{ minHeight: "100vh" }}>
            <header className="defi-airdrop-header">
                <div className="defi-airdrop-nav">
                    <Link href="/defi/airdrop" className="defi-airdrop-back">← Back to Airdrop</Link>
                    <div className="defi-airdrop-brand">
                        <span>📊 Airdrop Analytics</span>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
                {loading ? (
                    <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                        Loading analytics...
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div style={{
                            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12, marginBottom: 24,
                        }}>
                            {[
                                { label: "Total Airdrops", value: stats?.total_airdrops || 0, icon: "🪂", color: "#60a5fa" },
                                { label: "Wallets Reached", value: stats?.total_recipients || 0, icon: "👥", color: "#4ade80" },
                                { label: "Unique Senders", value: stats?.unique_senders || 0, icon: "💎", color: "#a78bfa" },
                                { label: "Total Distributed", value: `${((stats?.total_amount || 0) / 1e6).toFixed(1)}M`, icon: "💰", color: "#fbbf24" },
                            ].map((card, i) => (
                                <div key={i} style={{
                                    padding: "16px 20px", borderRadius: 14,
                                    background: "linear-gradient(135deg, rgba(15,15,35,0.9), rgba(25,15,50,0.8))",
                                    border: `1px solid ${card.color}22`,
                                }}>
                                    <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: card.color, fontFamily: "monospace" }}>
                                        {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                                    </div>
                                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{card.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Time Range Filter + Recipients Chart */}
                        <div style={{
                            padding: 20, borderRadius: 14,
                            background: "rgba(15,15,35,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                            marginBottom: 20,
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
                                    📈 Recipients Over Time
                                </h3>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {(["7d", "30d", "all"] as const).map(r => (
                                        <button key={r} onClick={() => setTimeRange(r)} style={{
                                            padding: "4px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                                            background: timeRange === r ? "rgba(96,165,250,0.2)" : "transparent",
                                            border: timeRange === r ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
                                            color: timeRange === r ? "#60a5fa" : "#888", fontWeight: 600,
                                        }}>
                                            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <BarChart data={dailyData()} />
                        </div>

                        {/* Top Senders Table */}
                        <div style={{
                            padding: 20, borderRadius: 14,
                            background: "rgba(15,15,35,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                            marginBottom: 20,
                        }}>
                            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
                                🏆 Top Senders
                            </h3>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600 }}>#</th>
                                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Wallet</th>
                                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Airdrops</th>
                                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Recipients</th>
                                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSenders().map(([addr, data], i) => (
                                            <tr key={addr} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                <td style={{ padding: "10px 12px", color: i < 3 ? "#fbbf24" : "#666" }}>
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                                </td>
                                                <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#ccc" }}>
                                                    {addr.slice(0, 6)}...{addr.slice(-4)}
                                                </td>
                                                <td style={{ padding: "10px 12px", textAlign: "right", color: "#60a5fa" }}>{data.count}</td>
                                                <td style={{ padding: "10px 12px", textAlign: "right", color: "#4ade80" }}>{data.recipients.toLocaleString()}</td>
                                                <td style={{ padding: "10px 12px", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>
                                                    {data.amount >= 1e6 ? `${(data.amount / 1e6).toFixed(1)}M` : data.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div style={{
                            padding: 20, borderRadius: 14,
                            background: "rgba(15,15,35,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
                                ⏰ Recent Activity
                            </h3>
                            <div style={{ maxHeight: 300, overflowY: "auto" }}>
                                {records.slice(0, 20).map((r, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                                    }}>
                                        <div>
                                            <span style={{ fontFamily: "monospace", color: "#ccc", fontSize: 12 }}>
                                                {r.sender.slice(0, 6)}...{r.sender.slice(-4)}
                                            </span>
                                            <span style={{ color: "#666", fontSize: 11, marginLeft: 8 }}>
                                                → {r.recipient_count} wallets
                                            </span>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 600 }}>
                                                {r.total_amount >= 1e6 ? `${(r.total_amount / 1e6).toFixed(1)}M` : r.total_amount?.toLocaleString()} ${r.token_symbol}
                                            </span>
                                            <div style={{ fontSize: 10, color: "#666" }}>
                                                {new Date(r.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>

            <footer style={{ textAlign: "center", padding: "24px 16px", color: "#666", fontSize: 12 }}>
                🐱 Powered by Banmao.Fun — <Link href="/defi/airdrop" style={{ color: "#60a5fa" }}>Back to Airdrop Tool</Link>
            </footer>
        </div>
    );
}
