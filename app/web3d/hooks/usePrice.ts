// Custom hook to fetch real-time price data from OKX API
"use client";

import { useState, useEffect, useCallback } from "react";

interface PriceData {
    price: string;
    time: string;
    chainIndex: string;
    tokenContractAddress: string;
    network: string;
    symbol: string;
    isMock?: boolean;
    error?: string;
}

interface UsePriceReturn {
    price: string | null;
    priceUSD: string;
    network: string;
    symbol: string;
    lastUpdate: Date | null;
    isLoading: boolean;
    error: string | null;
    isMock: boolean;
    refetch: () => void;
}

export function usePrice(refreshInterval = 30000): UsePriceReturn {
    const [data, setData] = useState<PriceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchPrice = useCallback(async (retryCount = 0) => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/price");

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            console.error("[usePrice] ❌ Error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch price");

            // Retry with exponential backoff (max 2 retries)
            if (retryCount < 2) {
                const delay = retryCount === 0 ? 2000 : 5000;
                console.log(`[usePrice] Retrying in ${delay}ms (attempt ${retryCount + 1})`);
                setTimeout(() => fetchPrice(retryCount + 1), delay);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        // Initial fetch
        fetchPrice();

        // Auto-refresh price data
        const interval = setInterval(() => {
            if (isMounted) fetchPrice();
        }, refreshInterval);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchPrice, refreshInterval]);

    // Format price for display
    const formatPrice = (price: string | null): string => {
        if (!price) return "$0.00";
        const num = parseFloat(price);
        if (num < 0.0001) return `$${num.toFixed(8)}`;
        if (num < 0.01) return `$${num.toFixed(6)}`;
        if (num < 1) return `$${num.toFixed(4)}`;
        return `$${num.toFixed(2)}`;
    };

    return {
        price: data?.price || null,
        priceUSD: formatPrice(data?.price || null),
        network: data?.network || "X LAYER",
        symbol: data?.symbol || "$BANMAO",
        lastUpdate,
        isLoading,
        error,
        isMock: data?.isMock || false,
        refetch: fetchPrice,
    };
}
