"use client";

import { useEffect, useState, useCallback } from 'react';
import { formatEther } from 'viem';

export interface ClaimRecord {
    amount: string;
    amountRaw: bigint;
    timestamp: number;
    blockNumber: bigint;
    transactionHash: string;
    user: string;
}

const FETCH_TIMEOUT = 20000; // 20 second timeout

export function useClaimHistory(triggerRefresh?: boolean) {
    const [claimHistory, setClaimHistory] = useState<ClaimRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchClaimHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const res = await fetch('/api/claim-history', {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await res.json();

            if (data.claims && Array.isArray(data.claims)) {
                const records: ClaimRecord[] = data.claims.map((claim: any) => ({
                    amount: formatEther(BigInt(claim.amount)),
                    amountRaw: BigInt(claim.amount),
                    timestamp: claim.timestamp || Math.floor(Date.now() / 1000),
                    blockNumber: BigInt(claim.blockNumber),
                    transactionHash: claim.transactionHash,
                    user: claim.user,
                }));

                setClaimHistory(records);
            } else {
                setClaimHistory([]);
            }
        } catch (err) {
            clearTimeout(timeoutId);

            if (err instanceof Error && err.name === 'AbortError') {
                setError('Request timed out');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to fetch');
            }
            // Keep existing data on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClaimHistory();
    }, [fetchClaimHistory]);

    useEffect(() => {
        if (triggerRefresh) {
            const timer = setTimeout(() => {
                fetchClaimHistory();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [triggerRefresh, fetchClaimHistory]);

    return {
        claimHistory,
        isLoading,
        error,
        refetch: fetchClaimHistory,
    };
}
