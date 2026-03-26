// ===== USE DONOR LEADERBOARD HOOK =====
// Manages fetching and caching of donor leaderboard data

import { useState, useEffect, useCallback } from 'react';

export interface DonorProfile {
    address: string;
    name: string;
    avatar: number;
    totalDonated: string;
    donationCount: number;
    badge: {
        tier: string;
        icon: string;
        color: string;
    };
    telegram?: string;
    twitter?: string;
}

interface UseDonorLeaderboardOptions {
    refreshInterval?: number; // ms, default 120000 (2 minutes)
    enabled?: boolean;
}

interface UseDonorLeaderboardReturn {
    donors: DonorProfile[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    getDonorByAddress: (address: string) => DonorProfile | undefined;
    getMyDonorProfile: (address: string | undefined) => DonorProfile | null;
}

export function useDonorLeaderboard(
    options: UseDonorLeaderboardOptions = {}
): UseDonorLeaderboardReturn {
    const { refreshInterval = 120000, enabled = true } = options;

    const [donors, setDonors] = useState<DonorProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/donors');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.leaderboard) {
                    setDonors(data.leaderboard);
                }
            }
        } catch (err) {
            console.error('Error fetching donors:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch donors');
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

    // Get donor by address (case-insensitive)
    const getDonorByAddress = useCallback((address: string) => {
        return donors.find(
            d => d.address.toLowerCase() === address.toLowerCase()
        );
    }, [donors]);

    // Get current user's donor profile
    const getMyDonorProfile = useCallback((address: string | undefined) => {
        if (!address) return null;
        return getDonorByAddress(address) || null;
    }, [getDonorByAddress]);

    return {
        donors,
        isLoading,
        error,
        refresh,
        getDonorByAddress,
        getMyDonorProfile,
    };
}

export default useDonorLeaderboard;
