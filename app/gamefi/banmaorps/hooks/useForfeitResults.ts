/**
 * Custom hook for tracking forfeit results
 */

import { useCallback, useRef, useState } from "react";
import type { ForfeitRecord } from "../lib/types";
import { normalizeForfeitAddress } from "../lib/utils";

export function useForfeitResults() {
    const [forfeitResults, setForfeitResults] = useState<Record<number, ForfeitRecord>>({});
    const forfeitResultsRef = useRef<Record<number, ForfeitRecord>>({});
    const forfeitFetchMetaRef = useRef<Map<number, { lastAttempt: number; settled: boolean }>>(new Map());
    const fetchedForfeitIdsRef = useRef<Set<number>>(new Set());

    const rememberForfeitFetch = useCallback((roomId: number, settled: boolean) => {
        if (!Number.isFinite(roomId) || roomId <= 0) return;
        const normalized = Math.floor(roomId);
        forfeitFetchMetaRef.current.set(normalized, {
            lastAttempt: Date.now(),
            settled,
        });
    }, []);

    const updateForfeitResult = useCallback(
        (roomId: number, info: ForfeitRecord | null | undefined) => {
            const normalizedId = Number.isFinite(roomId) ? Math.floor(roomId) : NaN;
            if (!Number.isFinite(normalizedId) || normalizedId < 0 || !info) return;

            const current = forfeitResultsRef.current[normalizedId] ?? {};
            const incomingLoser = normalizeForfeitAddress(info.loser ?? null);
            const incomingWinner = normalizeForfeitAddress(info.winner ?? null);
            const currentLoser = normalizeForfeitAddress(current.loser ?? null);
            const currentWinner = normalizeForfeitAddress(current.winner ?? null);
            const incomingPayout = typeof info.payout === "bigint" ? info.payout : null;
            const currentPayout = typeof current.payout === "bigint" ? current.payout : null;

            const merged: ForfeitRecord = {
                loser: incomingLoser ?? currentLoser ?? null,
                winner: incomingWinner ?? currentWinner ?? null,
                payout: incomingPayout ?? currentPayout ?? null,
            };

            const nextLoser = merged.loser ?? null;
            const nextWinner = merged.winner ?? null;
            const nextPayout = merged.payout ?? null;
            if (!nextLoser && !nextWinner && !nextPayout) return;

            if (
                currentLoser === nextLoser &&
                currentWinner === nextWinner &&
                currentPayout === nextPayout
            ) {
                return;
            }

            const next = { ...forfeitResultsRef.current, [normalizedId]: merged };
            forfeitResultsRef.current = next;
            setForfeitResults(next);
            rememberForfeitFetch(normalizedId, true);
        },
        [rememberForfeitFetch]
    );

    const hasFetchedForfeit = useCallback((roomId: number): boolean => {
        return fetchedForfeitIdsRef.current.has(roomId);
    }, []);

    const markForfeitFetched = useCallback((roomId: number): void => {
        fetchedForfeitIdsRef.current.add(roomId);
    }, []);

    const getForfeitMeta = useCallback((roomId: number) => {
        return forfeitFetchMetaRef.current.get(roomId);
    }, []);

    const getForfeitResult = useCallback((roomId: number): ForfeitRecord | null => {
        return forfeitResultsRef.current[roomId] ?? null;
    }, []);

    return {
        forfeitResults,
        forfeitResultsRef,
        forfeitFetchMetaRef,
        fetchedForfeitIdsRef,
        rememberForfeitFetch,
        updateForfeitResult,
        hasFetchedForfeit,
        markForfeitFetched,
        getForfeitMeta,
        getForfeitResult,
    };
}
