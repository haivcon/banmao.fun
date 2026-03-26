// ===== USE LEADERBOARD HOOK =====
// Manages fetching and caching of on-chain leaderboard data

import { useState, useEffect, useCallback } from 'react';
import { fetchOnchainLeaderboard, OnchainPlayer } from '../lib/onchainLeaderboard';

interface UseLeaderboardOptions {
    refreshInterval?: number; // ms, default 30000
    enabled?: boolean;
}

interface UseLeaderboardReturn {
    leaderboard: OnchainPlayer[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    getPlayerByAddress: (address: string) => OnchainPlayer | undefined;
    getPlayerRank: (address: string) => number;
}

export function useLeaderboard(
    options: UseLeaderboardOptions = {}
): UseLeaderboardReturn {
    const { refreshInterval = 30000, enabled = true } = options;

    const [leaderboard, setLeaderboard] = useState<OnchainPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await fetchOnchainLeaderboard();
            setLeaderboard(data);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        } finally {
            setIsLoading(false);
        }
    }, [enabled]);

    // Initial fetch and periodic refresh
    useEffect(() => {
        if (!enabled) return;

        refresh();

        const interval = setInterval(refresh, refreshInterval);
        return () => clearInterval(interval);
    }, [enabled, refreshInterval, refresh]);

    // Get player by address (case-insensitive)
    const getPlayerByAddress = useCallback((address: string) => {
        return leaderboard.find(
            p => p.address.toLowerCase() === address.toLowerCase()
        );
    }, [leaderboard]);

    // Get player rank (1-indexed, 0 if not found)
    const getPlayerRank = useCallback((address: string) => {
        const index = leaderboard.findIndex(
            p => p.address.toLowerCase() === address.toLowerCase()
        );
        return index >= 0 ? index + 1 : 0;
    }, [leaderboard]);

    return {
        leaderboard,
        isLoading,
        error,
        refresh,
        getPlayerByAddress,
        getPlayerRank,
    };
}

export default useLeaderboard;
