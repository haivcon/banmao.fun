/**
 * Custom hook for managing deadline fallbacks
 * Persists and retrieves commit/reveal deadlines from localStorage
 */

import { useCallback, useRef } from "react";
import {
    loadCommitDeadlineFallbacksFromStorage,
    loadRevealDeadlineFallbacksFromStorage,
    persistCommitDeadlineFallbacks,
    persistRevealDeadlineFallbacks,
} from "../lib/storage";
import { DEFAULT_COMMIT_WINDOW } from "../lib/constants";

export function useDeadlineFallbacks() {
    const localCommitDeadlinesRef = useRef<Map<number, number>>(new Map());
    const localRevealDeadlinesRef = useRef<Map<number, number>>(new Map());
    const commitDurationsRef = useRef<Map<number, number>>(new Map());

    // Sync functions
    const syncCommitDeadlineFallbacks = useCallback(() => {
        if (typeof window === "undefined") return;
        persistCommitDeadlineFallbacks(localCommitDeadlinesRef.current);
    }, []);

    const syncRevealDeadlineFallbacks = useCallback(() => {
        if (typeof window === "undefined") return;
        persistRevealDeadlineFallbacks(localRevealDeadlinesRef.current);
    }, []);

    // Remember commit deadline fallback
    const rememberCommitDeadlineFallback = useCallback(
        (roomId: number, deadline: number) => {
            if (!Number.isFinite(roomId) || roomId < 0) return;
            if (!Number.isFinite(deadline) || deadline <= 0) return;
            const normalized = Math.floor(deadline);
            const current = localCommitDeadlinesRef.current.get(roomId);
            if (current === normalized) return;
            localCommitDeadlinesRef.current.set(roomId, normalized);
            syncCommitDeadlineFallbacks();
        },
        [syncCommitDeadlineFallbacks]
    );

    // Remember commit duration
    const rememberCommitDuration = useCallback((roomId: number, duration: number) => {
        if (!Number.isFinite(roomId) || roomId < 0) return;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const normalizedRoomId = Math.floor(roomId);
        const normalizedDuration = Math.floor(duration);
        commitDurationsRef.current.set(normalizedRoomId, normalizedDuration);
    }, []);

    // Get commit duration for room
    const getCommitDurationForRoom = useCallback(
        (roomId?: number | null) => {
            if (typeof roomId === "number" && Number.isFinite(roomId)) {
                const normalized = Math.floor(roomId);
                const stored = commitDurationsRef.current.get(normalized);
                if (stored && stored > 0) return stored;
            }
            return DEFAULT_COMMIT_WINDOW;
        },
        []
    );

    // Remember reveal deadline fallback
    const rememberRevealDeadlineFallback = useCallback(
        (roomId: number, deadline: number) => {
            if (!Number.isFinite(roomId) || roomId < 0) return;
            if (!Number.isFinite(deadline) || deadline <= 0) return;
            const normalized = Math.floor(deadline);
            const current = localRevealDeadlinesRef.current.get(roomId);
            if (current === normalized) return;
            localRevealDeadlinesRef.current.set(roomId, normalized);
            syncRevealDeadlineFallbacks();
        },
        [syncRevealDeadlineFallbacks]
    );

    // Clear all fallbacks
    const clearCommitDeadlineFallbacks = useCallback(() => {
        localCommitDeadlinesRef.current.clear();
        syncCommitDeadlineFallbacks();
    }, [syncCommitDeadlineFallbacks]);

    const clearRevealDeadlineFallbacks = useCallback(() => {
        localRevealDeadlinesRef.current.clear();
        syncRevealDeadlineFallbacks();
    }, [syncRevealDeadlineFallbacks]);

    // Load from storage
    const loadFromStorage = useCallback(() => {
        const commitFallbacks = loadCommitDeadlineFallbacksFromStorage();
        const revealFallbacks = loadRevealDeadlineFallbacksFromStorage();

        commitFallbacks.forEach((deadline, roomId) => {
            localCommitDeadlinesRef.current.set(roomId, deadline);
        });

        revealFallbacks.forEach((deadline, roomId) => {
            localRevealDeadlinesRef.current.set(roomId, deadline);
        });
    }, []);

    // Get commit deadline for room
    const getCommitDeadline = useCallback((roomId: number): number => {
        return localCommitDeadlinesRef.current.get(roomId) ?? 0;
    }, []);

    // Get reveal deadline for room
    const getRevealDeadline = useCallback((roomId: number): number => {
        return localRevealDeadlinesRef.current.get(roomId) ?? 0;
    }, []);

    return {
        // Refs for direct access
        localCommitDeadlinesRef,
        localRevealDeadlinesRef,
        commitDurationsRef,

        // Sync functions
        syncCommitDeadlineFallbacks,
        syncRevealDeadlineFallbacks,

        // Remember functions
        rememberCommitDeadlineFallback,
        rememberCommitDuration,
        rememberRevealDeadlineFallback,

        // Get functions
        getCommitDurationForRoom,
        getCommitDeadline,
        getRevealDeadline,

        // Clear functions
        clearCommitDeadlineFallbacks,
        clearRevealDeadlineFallbacks,

        // Load from storage
        loadFromStorage,
    };
}
