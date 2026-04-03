// Gas Price Oracle — real-time gas price tracking for XLayer
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePublicClient } from "wagmi";

export interface GasOracleData {
    /** Current gas price in Gwei */
    gasPriceGwei: number;
    /** 5-minute history for sparkline */
    history: { timestamp: number; price: number }[];
    /** Trend: "low" | "medium" | "high" */
    level: "low" | "medium" | "high";
    /** Is currently fetching */
    isLoading: boolean;
    /** Last update timestamp */
    lastUpdate: number;
    /** Force refresh */
    refresh: () => void;
}

const HISTORY_MAX = 20; // 20 entries × 15s = 5 minutes
const POLL_INTERVAL = 15000; // 15 seconds

// XLayer thresholds (Gwei)
const LOW_THRESHOLD = 0.15;
const HIGH_THRESHOLD = 0.5;

export function useGasOracle(): GasOracleData {
    const publicClient = usePublicClient();
    const [gasPriceGwei, setGasPriceGwei] = useState(0.1);
    const [history, setHistory] = useState<{ timestamp: number; price: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchGasPrice = useCallback(async () => {
        if (!publicClient) return;
        try {
            const gasPrice = await publicClient.getGasPrice();
            const gwei = Number(gasPrice) / 1e9;
            const now = Date.now();
            setGasPriceGwei(gwei);
            setLastUpdate(now);
            setHistory(prev => {
                const next = [...prev, { timestamp: now, price: gwei }];
                return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next;
            });
            setIsLoading(false);
        } catch (err) {
            console.warn("[GasOracle] Failed to fetch gas price:", err);
        }
    }, [publicClient]);

    useEffect(() => {
        fetchGasPrice();
        intervalRef.current = setInterval(fetchGasPrice, POLL_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchGasPrice]);

    const level: "low" | "medium" | "high" = gasPriceGwei <= LOW_THRESHOLD ? "low" : gasPriceGwei >= HIGH_THRESHOLD ? "high" : "medium";

    return {
        gasPriceGwei,
        history,
        level,
        isLoading,
        lastUpdate,
        refresh: fetchGasPrice,
    };
}
