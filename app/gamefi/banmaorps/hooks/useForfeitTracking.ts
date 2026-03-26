"use client";

import { useState, useRef, useCallback } from "react";
import { ForfeitRecord, MinimalPublicClient, RoomSnapshot } from "../lib/types";
import {
    normalizeForfeitAddress,
    normalizeForfeitPayout,
    extractForfeitRecord,
    fetchLatestForfeitLog,
    RPS,
    FORFEIT_FETCH_COOLDOWN_MS,
} from "../lib/gameUtils";
import { RPS_ABI } from "../lib/abis";
import { getAbiItem } from "viem";

export interface ForfeitFetchMeta {
    lastAttempt: number;
    settled: boolean;
}

export interface UseForfeitTrackingReturn {
    forfeitResults: Record<number, ForfeitRecord>;
    forfeitResultsRef: React.MutableRefObject<Record<number, ForfeitRecord>>;
    updateForfeitResult: (roomId: number, info: ForfeitRecord | null | undefined) => void;
    fetchForfeitForRoom: (roomId: number, latestBlock?: bigint | null) => Promise<ForfeitRecord | null>;
    shouldFetchForfeit: (roomId: number) => boolean;
    rememberForfeitFetch: (roomId: number, settled: boolean) => void;
    hasFetchedForfeit: (roomId: number) => boolean;
}

/**
 * Hook to track forfeit results for rooms
 */
export function useForfeitTracking(
    publicClient: MinimalPublicClient | null | undefined
): UseForfeitTrackingReturn {
    const [forfeitResults, setForfeitResults] = useState<Record<number, ForfeitRecord>>({});
    const forfeitResultsRef = useRef<Record<number, ForfeitRecord>>({});
    const forfeitFetchMetaRef = useRef<Map<number, ForfeitFetchMeta>>(new Map());
    const fetchedForfeitIdsRef = useRef<Set<number>>(new Set());

    // Get the Forfeited event ABI
    const forfeitEventAbi = (() => {
        try {
            return getAbiItem({ abi: RPS_ABI, name: "Forfeited" });
        } catch {
            return null;
        }
    })();

    const rememberForfeitFetch = useCallback((roomId: number, settled: boolean) => {
        if (!Number.isFinite(roomId) || roomId <= 0) return;
        const normalized = Math.floor(roomId);
        forfeitFetchMetaRef.current.set(normalized, {
            lastAttempt: Date.now(),
            settled,
        });
        if (settled) {
            fetchedForfeitIdsRef.current.add(normalized);
        }
    }, []);

    const shouldFetchForfeit = useCallback((roomId: number): boolean => {
        if (!Number.isFinite(roomId) || roomId <= 0) return false;
        const normalized = Math.floor(roomId);
        const meta = forfeitFetchMetaRef.current.get(normalized);
        if (!meta) return true;
        if (meta.settled) return false;
        const elapsed = Date.now() - meta.lastAttempt;
        return elapsed >= FORFEIT_FETCH_COOLDOWN_MS;
    }, []);

    const hasFetchedForfeit = useCallback((roomId: number): boolean => {
        if (!Number.isFinite(roomId) || roomId <= 0) return false;
        return fetchedForfeitIdsRef.current.has(Math.floor(roomId));
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

    const fetchForfeitForRoom = useCallback(
        async (roomId: number, latestBlock?: bigint | null): Promise<ForfeitRecord | null> => {
            if (!publicClient || !forfeitEventAbi) return null;
            if (!Number.isFinite(roomId) || roomId <= 0) return null;

            const normalized = Math.floor(roomId);
            rememberForfeitFetch(normalized, false);

            try {
                const log = await fetchLatestForfeitLog({
                    publicClient,
                    event: forfeitEventAbi,
                    roomId: normalized,
                    latestBlock,
                });

                const record = extractForfeitRecord(log);
                if (record) {
                    updateForfeitResult(normalized, record);
                    return record;
                }
                return null;
            } catch (error) {
                console.error("Failed to fetch forfeit log for room", normalized, error);
                return null;
            }
        },
        [publicClient, forfeitEventAbi, rememberForfeitFetch, updateForfeitResult]
    );

    return {
        forfeitResults,
        forfeitResultsRef,
        updateForfeitResult,
        fetchForfeitForRoom,
        shouldFetchForfeit,
        rememberForfeitFetch,
        hasFetchedForfeit,
    };
}
