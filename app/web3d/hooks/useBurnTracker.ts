// Hook to fetch burned $BANMAO token amount via API
"use client";

import { useState, useEffect, useCallback } from "react";

export interface BurnTrackerData {
    burnedAmount: string;
    isLoading: boolean;
}

export function useBurnTracker(refreshInterval: number = 30000): BurnTrackerData {
    const [burnedAmount, setBurnedAmount] = useState<string>("Loading...");
    const [isLoading, setIsLoading] = useState(true);

    const fetchBurnStats = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/burn-stats");

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (data.burnedAmount) {
                setBurnedAmount(data.burnedAmount);
            }
        } catch (error) {
            console.error("[useBurnTracker] Error fetching burn stats:", error);
            // Keep previous value on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        // Initial fetch
        fetchBurnStats();

        // Periodic refresh
        const interval = setInterval(() => {
            if (isMounted) fetchBurnStats();
        }, refreshInterval);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchBurnStats, refreshInterval]);

    return {
        burnedAmount,
        isLoading,
    };
}
