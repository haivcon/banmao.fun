"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, LAUNCHPAD_DEPLOYMENT_BLOCK, IS_LAUNCHPAD_CONFIGURED } from "./contracts";

// ===== Types =====
interface TradeEvent {
    type: "buy" | "sell";
    trader: string;
    tokenAmount: bigint;
    okbAmount: bigint;
    newPrice: bigint;
    timestamp: number;
    txHash: string;
}

interface PricePoint {
    time: number;
    value: number;
}

// ===== Helpers =====
const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const formatOkb = (wei: bigint): string => {
    const num = Number(formatEther(wei));
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(6);
};
const formatTokens = (wei: bigint): string => {
    const num = Number(formatEther(wei));
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toFixed(2);
};
const timeAgo = (ts: number): string => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// ===== Price Chart Component =====
export function PriceChart({ tokenAddress, trades }: { tokenAddress: string; trades: TradeEvent[] }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Build price points from trades
    const pricePoints: PricePoint[] = useMemo(() => {
        if (trades.length === 0) return [];
        return trades
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((t) => ({
                time: t.timestamp,
                value: Number(formatEther(t.newPrice)),
            }));
    }, [trades]);

    useEffect(() => {
        if (!chartContainerRef.current || pricePoints.length === 0) return;

        let chart: any;
        let series: any;

        const initChart = async () => {
            try {
                const { createChart, ColorType, LineStyle } = await import("lightweight-charts");

                if (!chartContainerRef.current) return;

                chart = createChart(chartContainerRef.current, {
                    width: chartContainerRef.current.clientWidth,
                    height: 300,
                    layout: {
                        background: { type: ColorType.Solid, color: "transparent" },
                        textColor: "rgba(255, 255, 255, 0.5)",
                        fontFamily: "'Inter', sans-serif",
                    },
                    grid: {
                        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
                        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
                    },
                    crosshair: {
                        vertLine: { color: "rgba(245, 158, 11, 0.3)", labelBackgroundColor: "#f59e0b" },
                        horzLine: { color: "rgba(245, 158, 11, 0.3)", labelBackgroundColor: "#f59e0b" },
                    },
                    rightPriceScale: {
                        borderColor: "rgba(255, 255, 255, 0.08)",
                    },
                    timeScale: {
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        timeVisible: true,
                    },
                });

                series = chart.addLineSeries({
                    color: "#f59e0b",
                    lineWidth: 2,
                    priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
                });

                series.setData(pricePoints);
                chart.timeScale().fitContent();
                chartRef.current = chart;
                seriesRef.current = series;

                // Resize handler
                const resizeObserver = new ResizeObserver(() => {
                    if (chartContainerRef.current && chart) {
                        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                    }
                });
                resizeObserver.observe(chartContainerRef.current);

                return () => resizeObserver.disconnect();
            } catch (err) {
                console.warn("Failed to load chart:", err);
            }
        };

        initChart();

        return () => {
            if (chart) chart.remove();
        };
    }, [pricePoints]);

    // Update chart when new data arrives
    useEffect(() => {
        if (seriesRef.current && pricePoints.length > 0) {
            const lastPoint = pricePoints[pricePoints.length - 1];
            seriesRef.current.update(lastPoint);
        }
    }, [pricePoints]);

    if (pricePoints.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: "48px", textAlign: "center", color: "var(--lp-text-tertiary)" }}>
                <Activity size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <p style={{ color: "var(--lp-text-secondary)", fontWeight: 500 }}>Price chart will appear after trades</p>
                <p style={{ fontSize: "13px", marginTop: "8px" }}>Current price determined by bonding curve formula</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: "16px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} className="text-orange-500" /> Price Chart
            </h3>
            <div ref={chartContainerRef} style={{ width: "100%", borderRadius: "8px", overflow: "hidden" }} />
        </div>
    );
}

// ===== Trade History Component =====
export function TradeHistory({ trades }: { trades: TradeEvent[] }) {
    const sortedTrades = useMemo(
        () => [...trades].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30),
        [trades]
    );

    return (
        <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} className="text-orange-500" /> Recent Trades
            </h3>
            {sortedTrades.length === 0 ? (
                <p style={{ color: "var(--lp-text-tertiary)", fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                    No trades yet
                </p>
            ) : (
                <div style={{ display: "grid", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
                    {sortedTrades.map((trade, i) => (
                        <div
                            key={`${trade.txHash}-${i}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                background: trade.type === "buy"
                                    ? "rgba(34, 197, 94, 0.06)"
                                    : "rgba(239, 68, 68, 0.06)",
                                border: `1px solid ${trade.type === "buy" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)"}`,
                            }}
                        >
                            <div style={{
                                width: "28px", height: "28px", borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: trade.type === "buy" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            }}>
                                {trade.type === "buy"
                                    ? <ArrowUpRight size={14} style={{ color: "var(--lp-success)" }} />
                                    : <ArrowDownRight size={14} style={{ color: "var(--lp-danger)" }} />
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                                    <span style={{ fontWeight: 600, color: trade.type === "buy" ? "var(--lp-success)" : "var(--lp-danger)" }}>
                                        {trade.type === "buy" ? "Buy" : "Sell"}
                                    </span>
                                    <span style={{ color: "var(--lp-text-primary)", fontWeight: 500 }}>
                                        {formatOkb(trade.okbAmount)} OKB
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--lp-text-tertiary)", marginTop: "2px" }}>
                                    <span>{shortenAddr(trade.trader)}</span>
                                    <span>{formatTokens(trade.tokenAmount)} tokens • {timeAgo(trade.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ===== Hook: useTokenTrades =====
export function useTokenTrades(tokenAddress: string) {
    const [trades, setTrades] = useState<TradeEvent[]>([]);
    const publicClient = usePublicClient();

    // Fetch historical events
    useEffect(() => {
        if (!publicClient || !tokenAddress || !LAUNCHPAD_DEPLOYMENT_BLOCK || !IS_LAUNCHPAD_CONFIGURED) return;

        const fetchHistory = async () => {
            try {
                const [buyLogs, sellLogs] = await Promise.all([
                    publicClient.getLogs({
                        address: LAUNCHPAD_ADDRESS as `0x${string}`,
                        event: {
                            type: "event",
                            name: "TokenBought",
                            inputs: [
                                { type: "address", name: "tokenAddress", indexed: true },
                                { type: "address", name: "buyer", indexed: true },
                                { type: "uint256", name: "okbIn" },
                                { type: "uint256", name: "tokensOut" },
                                { type: "uint256", name: "newPrice" },
                                { type: "uint256", name: "timestamp" },
                            ],
                        },
                        args: { tokenAddress: tokenAddress as `0x${string}` },
                        fromBlock: LAUNCHPAD_DEPLOYMENT_BLOCK,
                    }),
                    publicClient.getLogs({
                        address: LAUNCHPAD_ADDRESS as `0x${string}`,
                        event: {
                            type: "event",
                            name: "TokenSold",
                            inputs: [
                                { type: "address", name: "tokenAddress", indexed: true },
                                { type: "address", name: "seller", indexed: true },
                                { type: "uint256", name: "tokensIn" },
                                { type: "uint256", name: "okbOut" },
                                { type: "uint256", name: "newPrice" },
                                { type: "uint256", name: "timestamp" },
                            ],
                        },
                        args: { tokenAddress: tokenAddress as `0x${string}` },
                        fromBlock: LAUNCHPAD_DEPLOYMENT_BLOCK,
                    }),
                ]);

                const buyTrades: TradeEvent[] = buyLogs.map((log: any) => ({
                    type: "buy" as const,
                    trader: log.args.buyer,
                    tokenAmount: log.args.tokensOut,
                    okbAmount: log.args.okbIn,
                    newPrice: log.args.newPrice,
                    timestamp: Number(log.args.timestamp),
                    txHash: log.transactionHash,
                }));

                const sellTrades: TradeEvent[] = sellLogs.map((log: any) => ({
                    type: "sell" as const,
                    trader: log.args.seller,
                    tokenAmount: log.args.tokensIn,
                    okbAmount: log.args.okbOut,
                    newPrice: log.args.newPrice,
                    timestamp: Number(log.args.timestamp),
                    txHash: log.transactionHash,
                }));

                setTrades([...buyTrades, ...sellTrades].sort((a, b) => a.timestamp - b.timestamp));
            } catch (err) {
                console.warn("Failed to fetch trade history:", err);
            }
        };

        fetchHistory();
    }, [publicClient, tokenAddress]);

    // Watch live buy events
    useWatchContractEvent({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        eventName: "TokenBought",
        args: { tokenAddress: tokenAddress as `0x${string}` },
        enabled: IS_LAUNCHPAD_CONFIGURED,
        onLogs(logs) {
            const newTrades = logs.map((log: any) => ({
                type: "buy" as const,
                trader: log.args.buyer,
                tokenAmount: log.args.tokensOut,
                okbAmount: log.args.okbIn,
                newPrice: log.args.newPrice,
                timestamp: Number(log.args.timestamp),
                txHash: log.transactionHash,
            }));
            setTrades((prev) => [...prev, ...newTrades]);
        },
    });

    // Watch live sell events
    useWatchContractEvent({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        eventName: "TokenSold",
        args: { tokenAddress: tokenAddress as `0x${string}` },
        enabled: IS_LAUNCHPAD_CONFIGURED,
        onLogs(logs) {
            const newTrades = logs.map((log: any) => ({
                type: "sell" as const,
                trader: log.args.seller,
                tokenAmount: log.args.tokensIn,
                okbAmount: log.args.okbOut,
                newPrice: log.args.newPrice,
                timestamp: Number(log.args.timestamp),
                txHash: log.transactionHash,
            }));
            setTrades((prev) => [...prev, ...newTrades]);
        },
    });

    return trades;
}
