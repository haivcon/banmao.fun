// Custom hook to fetch token stats from OKX API
// Now also fetches advanced info (top10 holders, LP burned, risk, tags)
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TokenStats {
    price: string;
    marketCap: string;
    liquidity: string;
    holders: string;
    circSupply: string;
    volume24H: string;
    volume1H: string;
    volume4H?: string;
    priceChange24H: string;
    priceChange1H: string;
    priceChange4H?: string;
    priceChange5M: string;
    maxPrice: string;
    minPrice: string;
    txs24H: string;
    tradeNum: string;
    time: string;
    isMock?: boolean;
    error?: string;
}

export interface AdvancedInfo {
    top10HoldPercent: string;
    lpBurnedPercent: string;
    riskControlLevel: string;
    tokenTags: string[];
    devHoldingPercent: string;
    bundleHoldingPercent: string;
    suspiciousHoldingPercent: string;
    sniperHoldingPercent: string;
    creatorAddress: string;
    createTime: string;
    totalFee: string;
}

interface UseTokenStatsReturn {
    stats: TokenStats | null;
    advancedInfo: AdvancedInfo | null;
    formattedStats: {
        marketCap: string;
        circSupply: string;
        holders: string;
        volume24H: string;
        volume1H: string;
        volume4H: string;
        priceChange24H: string;
        priceChange4H: string;
        liquidity: string;
        txs24H: string;
        tradeNum: string;
        maxPrice: string;
        minPrice: string;
        top10HoldPercent: string;
        lpBurnedPercent: string;
        riskLevel: string;
    };
    isLoading: boolean;
    error: string | null;
    isMock: boolean;
    refetch: () => void;
}

// localStorage key for cached holders
const CACHED_HOLDERS_KEY = "banmao_cached_holders";

// Get cached holders from localStorage
function getCachedHolders(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(CACHED_HOLDERS_KEY);
    } catch {
        return null;
    }
}

// Save valid holders to localStorage
function setCachedHolders(holders: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(CACHED_HOLDERS_KEY, holders);
    } catch {
        // Ignore storage errors
    }
}

// Check if holders value is valid (not 0, not empty)
function isValidHolders(holders: string | undefined): boolean {
    if (!holders) return false;
    const num = parseFloat(holders);
    return !isNaN(num) && num > 0;
}

// Format numbers with thousand separators (no abbreviation)
function formatNumber(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "0";

    // For very small numbers (decimals)
    if (num < 1 && num > 0) return num.toFixed(6);

    // Format with thousand separators, max 2 decimal places
    return num.toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });
}

// Format USD price
function formatPrice(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return "$0";
    if (num < 0.00001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    if (num < 1) return `$${num.toFixed(4)}`;
    return `$${formatNumber(num)}`;
}

// Format percentage
function formatPercent(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) return "0%";
    const prefix = num >= 0 ? "+" : "";
    return `${prefix}${num.toFixed(2)}%`;
}

// Map risk level number to label
function getRiskLabel(level: string): string {
    switch (level) {
        case "1": return "🟢 Low";
        case "2": return "🟡 Medium";
        case "3": return "🟠 Med-High";
        case "4": return "🔴 High";
        case "5": return "🔴 High";
        default: return "⚪ N/A";
    }
}

export function useTokenStats(refreshInterval = 60000): UseTokenStatsReturn {
    const [stats, setStats] = useState<TokenStats | null>(null);
    const [advancedInfo, setAdvancedInfo] = useState<AdvancedInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Keep track of last valid holders value (in-memory backup)
    const lastValidHolders = useRef<string | null>(null);

    // Initialize from localStorage on mount
    useEffect(() => {
        const cached = getCachedHolders();
        if (cached) {
            lastValidHolders.current = cached;
        }
    }, []);

    const fetchStats = useCallback(async (retryCount = 0) => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/token-stats");

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const result = await response.json();

            // Handle holders caching: if API returns 0 or invalid, use cached
            if (isValidHolders(result.holders)) {
                // Valid holders - cache it
                lastValidHolders.current = result.holders;
                setCachedHolders(result.holders);
                setStats(result);
            } else {
                // Invalid holders - use cached value
                const cachedHolders = lastValidHolders.current || getCachedHolders();
                if (cachedHolders) {
                    console.log("[useTokenStats] API returned holders=0, using cached:", cachedHolders);
                    setStats({
                        ...result,
                        holders: cachedHolders,
                    });
                } else {
                    // No cache available, use API result anyway
                    setStats(result);
                }
            }

            setError(null);
        } catch (err) {
            console.error("[useTokenStats] Error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch stats");

            // Retry with exponential backoff (max 2 retries)
            if (retryCount < 2) {
                const delay = retryCount === 0 ? 2000 : 5000;
                console.log(`[useTokenStats] Retrying in ${delay}ms (attempt ${retryCount + 1})`);
                setTimeout(() => fetchStats(retryCount + 1), delay);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch advanced info (less frequently)
    const fetchAdvancedInfo = useCallback(async () => {
        try {
            const response = await fetch("/api/okx/advanced-info");
            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.data) {
                setAdvancedInfo(result.data);
            }
        } catch (err) {
            console.error("[useTokenStats] Advanced info error:", err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        // Initial fetch
        fetchStats();
        fetchAdvancedInfo();

        // Periodic refresh - stats every refreshInterval, advanced info every 5 minutes
        const statsInterval = setInterval(() => {
            if (isMounted) fetchStats();
        }, refreshInterval);

        const advancedInterval = setInterval(() => {
            if (isMounted) fetchAdvancedInfo();
        }, 300000); // 5 minutes

        return () => {
            isMounted = false;
            clearInterval(statsInterval);
            clearInterval(advancedInterval);
        };
    }, [fetchStats, fetchAdvancedInfo, refreshInterval]);

    // Get holders value - prefer valid API, then cached, then default
    const getHoldersValue = (): string => {
        if (stats && isValidHolders(stats.holders)) {
            return stats.holders;
        }
        return lastValidHolders.current || getCachedHolders() || "0";
    };

    // Pre-formatted stats for display
    const formattedStats = {
        marketCap: stats ? `$${formatNumber(stats.marketCap)}` : "$0",
        circSupply: stats ? formatNumber(stats.circSupply) : "0",
        holders: formatNumber(getHoldersValue()),
        volume24H: stats ? `$${formatNumber(stats.volume24H)}` : "$0",
        volume1H: stats ? `$${formatNumber(stats.volume1H)}` : "$0",
        volume4H: stats?.volume4H ? `$${formatNumber(stats.volume4H)}` : "$0",
        priceChange24H: stats ? formatPercent(stats.priceChange24H) : "0%",
        priceChange4H: stats?.priceChange4H ? formatPercent(stats.priceChange4H) : "0%",
        liquidity: stats ? `$${formatNumber(stats.liquidity)}` : "$0",
        txs24H: stats ? formatNumber(stats.txs24H) : "0",
        tradeNum: stats ? formatNumber(stats.tradeNum) : "0",
        maxPrice: stats ? formatPrice(stats.maxPrice) : "$0",
        minPrice: stats ? formatPrice(stats.minPrice) : "$0",
        top10HoldPercent: advancedInfo?.top10HoldPercent ? `${parseFloat(advancedInfo.top10HoldPercent).toFixed(1)}%` : "—",
        lpBurnedPercent: advancedInfo?.lpBurnedPercent ? `${parseFloat(advancedInfo.lpBurnedPercent).toFixed(1)}%` : "—",
        riskLevel: advancedInfo ? getRiskLabel(advancedInfo.riskControlLevel) : "—",
    };

    return {
        stats,
        advancedInfo,
        formattedStats,
        isLoading,
        error,
        isMock: stats?.isMock || false,
        refetch: fetchStats,
    };
}
