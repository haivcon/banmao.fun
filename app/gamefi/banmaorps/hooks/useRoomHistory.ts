"use client";

import { useState, useCallback, useEffect } from "react";
import { HIST_LIMIT } from "../lib/roomConstants";

const JOINED_ROOMS_PREFIX = "banmao_joined_";
const SEEN_RESULTS_PREFIX = "banmao_results_";

/**
 * Load joined rooms from localStorage
 */
function loadJoinedRooms(address: `0x${string}`): number[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(`${JOINED_ROOMS_PREFIX}${address}`) || "[]");
    } catch {
        return [];
    }
}

/**
 * Save joined rooms to localStorage
 */
function saveJoinedRooms(address: `0x${string}`, ids: number[]) {
    if (typeof window === "undefined") return;
    const dedup = Array.from(new Set(ids));
    localStorage.setItem(`${JOINED_ROOMS_PREFIX}${address}`, JSON.stringify(dedup.slice(0, HIST_LIMIT)));
}

/**
 * Load seen result rooms from localStorage
 */
function loadSeenResultRooms(address: `0x${string}`): number[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(`${SEEN_RESULTS_PREFIX}${address}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v) && v >= 0);
    } catch {
        return [];
    }
}

/**
 * Save seen result rooms to localStorage
 */
function saveSeenResultRooms(address: `0x${string}`, ids: number[]) {
    if (typeof window === "undefined") return;
    const dedup = Array.from(new Set(ids.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v >= 0)));
    localStorage.setItem(`${SEEN_RESULTS_PREFIX}${address}`, JSON.stringify(dedup.slice(0, HIST_LIMIT * 2)));
}

export interface UseRoomHistoryReturn {
    joinedRooms: number[];
    seenResultRooms: number[];
    freshResultRooms: number[];
    setJoinedRooms: React.Dispatch<React.SetStateAction<number[]>>;
    setSeenResultRooms: React.Dispatch<React.SetStateAction<number[]>>;
    setFreshResultRooms: React.Dispatch<React.SetStateAction<number[]>>;
    addRoomToHistory: (id: number) => number[];
    markResultSeen: (id: number) => void;
    markResultFresh: (id: number) => void;
    clearFreshResult: (id: number) => void;
    reloadFromStorage: () => void;
}

/**
 * Hook to manage room history (joined rooms, seen results, fresh results)
 */
export function useRoomHistory(address: `0x${string}` | undefined): UseRoomHistoryReturn {
    const [joinedRooms, setJoinedRooms] = useState<number[]>([]);
    const [seenResultRooms, setSeenResultRooms] = useState<number[]>([]);
    const [freshResultRooms, setFreshResultRooms] = useState<number[]>([]);

    // Load from storage on mount and address change
    useEffect(() => {
        if (!address) {
            setJoinedRooms([]);
            setSeenResultRooms([]);
            setFreshResultRooms([]);
            return;
        }
        setJoinedRooms(loadJoinedRooms(address));
        setSeenResultRooms(loadSeenResultRooms(address));
    }, [address]);

    const addRoomToHistory = useCallback(
        (id: number): number[] => {
            if (!address) return [];
            const cur = loadJoinedRooms(address);
            const next = [id, ...cur.filter((x) => x !== id)].slice(0, HIST_LIMIT);
            saveJoinedRooms(address, next);
            setJoinedRooms(next);
            return next;
        },
        [address]
    );

    const markResultSeen = useCallback(
        (id: number) => {
            if (!address) return;
            setSeenResultRooms((prev) => {
                const next = [...new Set([id, ...prev])].slice(0, HIST_LIMIT * 2);
                saveSeenResultRooms(address, next);
                return next;
            });
        },
        [address]
    );

    const markResultFresh = useCallback((id: number) => {
        setFreshResultRooms((prev) => {
            if (prev.includes(id)) return prev;
            return [...prev, id];
        });
    }, []);

    const clearFreshResult = useCallback((id: number) => {
        setFreshResultRooms((prev) => prev.filter((x) => x !== id));
    }, []);

    const reloadFromStorage = useCallback(() => {
        if (!address) return;
        setJoinedRooms(loadJoinedRooms(address));
        setSeenResultRooms(loadSeenResultRooms(address));
    }, [address]);

    return {
        joinedRooms,
        seenResultRooms,
        freshResultRooms,
        setJoinedRooms,
        setSeenResultRooms,
        setFreshResultRooms,
        addRoomToHistory,
        markResultSeen,
        markResultFresh,
        clearFreshResult,
        reloadFromStorage,
    };
}
