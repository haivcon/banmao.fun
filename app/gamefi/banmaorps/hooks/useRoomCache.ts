/**
 * Custom hook for managing room cache
 * Handles caching and retrieval of room data from localStorage
 */

import { useCallback, useRef, useState } from "react";
import type { RoomWithForfeit, CachedRoomEntry, CachedInfoState, UserStatsShape } from "../lib/types";
import {
    prioritizeCachedRooms,
    MAX_TRACKED_ROOMS
} from "../lib/storage";
import {
    serializeRoomForCache,
    reviveRoomFromCache,
    serializeInfoForCache,
    reviveInfoFromCache,
    roomsEqual,
} from "../lib/utils";

interface UseRoomCacheOptions {
    roomsCacheKey: string;
    infoCacheKey: string;
}

export function useRoomCache({ roomsCacheKey, infoCacheKey }: UseRoomCacheOptions) {
    const [cachedRooms, setCachedRooms] = useState<RoomWithForfeit[]>([]);
    const [cachedInfo, setCachedInfo] = useState<CachedInfoState | null>(null);

    const stableRoomsRawRef = useRef<RoomWithForfeit[] | null>(null);
    const roomsRef = useRef<RoomWithForfeit[]>([]);

    // Load rooms cache from localStorage
    const loadRoomsCache = useCallback(() => {
        if (typeof window === "undefined") return [];
        try {
            const raw = localStorage.getItem(roomsCacheKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            const revived = parsed
                .map((entry: CachedRoomEntry) => reviveRoomFromCache(entry))
                .filter((r: RoomWithForfeit | null): r is RoomWithForfeit => r !== null);
            const prioritized = prioritizeCachedRooms(revived);
            setCachedRooms(prioritized);
            return prioritized;
        } catch {
            return [];
        }
    }, [roomsCacheKey]);

    // Save rooms cache to localStorage
    const saveRoomsCache = useCallback((rooms: RoomWithForfeit[]) => {
        if (typeof window === "undefined") return;
        if (!rooms || rooms.length === 0) return;

        const prioritized = prioritizeCachedRooms(rooms);
        const serialized = prioritized
            .slice(0, MAX_TRACKED_ROOMS)
            .map(serializeRoomForCache);

        try {
            localStorage.setItem(roomsCacheKey, JSON.stringify(serialized));
            setCachedRooms(prioritized);
        } catch {
            // Storage might be full
        }
    }, [roomsCacheKey]);

    // Load info cache from localStorage
    const loadInfoCache = useCallback(() => {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem(infoCacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const revived = reviveInfoFromCache(parsed);
            if (revived) {
                setCachedInfo(revived);
            }
            return revived;
        } catch {
            return null;
        }
    }, [infoCacheKey]);

    // Save info cache to localStorage
    const saveInfoCache = useCallback((info: CachedInfoState) => {
        if (typeof window === "undefined") return;
        try {
            const serialized = serializeInfoForCache(info);
            localStorage.setItem(infoCacheKey, JSON.stringify(serialized));
            setCachedInfo(info);
        } catch {
            // Storage might be full
        }
    }, [infoCacheKey]);

    // Clear all caches
    const clearCaches = useCallback(() => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(roomsCacheKey);
        localStorage.removeItem(infoCacheKey);
        setCachedRooms([]);
        setCachedInfo(null);
    }, [roomsCacheKey, infoCacheKey]);

    // Update rooms ref
    const updateRoomsRef = useCallback((rooms: RoomWithForfeit[]) => {
        if (!roomsEqual(roomsRef.current, rooms)) {
            roomsRef.current = rooms;
        }
    }, []);

    return {
        cachedRooms,
        cachedInfo,
        roomsRef,
        stableRoomsRawRef,
        loadRoomsCache,
        saveRoomsCache,
        loadInfoCache,
        saveInfoCache,
        clearCaches,
        updateRoomsRef,
        setCachedRooms,
        setCachedInfo,
    };
}
