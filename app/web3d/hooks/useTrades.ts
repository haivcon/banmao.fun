// Custom hook to fetch recent trades from OKX API
"use client";

import { useState, useEffect, useCallback } from "react";

export interface TradeItem {
    id: string;
    type: "buy" | "sell";
    volume: string;
    price: string;
    time: string;
    userAddress: string;
    dexName: string;
}

interface UseTradesReturn {
    trades: TradeItem[];
    isLoading: boolean;
    error: string | null;
    isMock: boolean;
}

// Format time ago
export function formatTimeAgo(timestamp: string): string {
    const now = Date.now();
    const diff = now - parseInt(timestamp);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

// Format USD volume
export function formatVolume(volume: string): string {
    const num = parseFloat(volume);
    if (isNaN(num)) return "$0";
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    if (num >= 1) return `$${num.toFixed(2)}`;
    return `$${num.toFixed(4)}`;
}

// Shorten address
export function shortenAddress(addr: string): string {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}..${addr.slice(-4)}`;
}

export function useTrades(refreshInterval = 15000): UseTradesReturn {
    const [trades, setTrades] = useState<TradeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMock, setIsMock] = useState(false);

    const fetchTrades = useCallback(async () => {
        try {
            const response = await fetch("/api/okx/trades");
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const result = await response.json();
            if (result.success && result.trades) {
                setTrades(result.trades);
                setIsMock(result.isMock || false);
            }
            setError(null);
        } catch (err) {
            console.error("[useTrades] Error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch trades");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        fetchTrades();

        const interval = setInterval(() => {
            if (isMounted) fetchTrades();
        }, refreshInterval);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchTrades, refreshInterval]);

    return { trades, isLoading, error, isMock };
}
