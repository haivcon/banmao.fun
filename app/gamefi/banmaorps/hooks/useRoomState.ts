/**
 * Custom hook for managing game room state
 * Tracks current room, available rooms, and active room filters
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { RoomWithForfeit } from "../lib/types";

export interface RoomFilter {
    showOnlyMine: boolean;
    showOnlyActive: boolean;
    showOnlyActionable: boolean;
}

const DEFAULT_FILTER: RoomFilter = {
    showOnlyMine: false,
    showOnlyActive: true,
    showOnlyActionable: false,
};

export function useRoomState(viewerAddress: string | null = null) {
    // Current selected room
    const [roomId, setRoomId] = useState("");

    // Filter settings
    const [filter, setFilter] = useState<RoomFilter>(DEFAULT_FILTER);

    // Track visited rooms
    const visitedRoomsRef = useRef<Set<number>>(new Set());

    // Mark room as visited
    const markVisited = useCallback((id: number) => {
        visitedRoomsRef.current.add(id);
    }, []);

    // Check if room is visited
    const isVisited = useCallback((id: number): boolean => {
        return visitedRoomsRef.current.has(id);
    }, []);

    // Clear visited rooms
    const clearVisited = useCallback(() => {
        visitedRoomsRef.current.clear();
    }, []);

    // Get filtered rooms based on filter settings
    const getFilteredRooms = useCallback(
        (rooms: RoomWithForfeit[]): RoomWithForfeit[] => {
            if (!rooms || rooms.length === 0) return [];

            let result = [...rooms];

            // Filter by ownership
            if (filter.showOnlyMine && viewerAddress) {
                const addr = viewerAddress.toLowerCase();
                result = result.filter(
                    (r) =>
                        r.creator?.toLowerCase() === addr ||
                        r.opponent?.toLowerCase() === addr
                );
            }

            // Filter by active state (not finished/canceled)
            if (filter.showOnlyActive) {
                result = result.filter((r) => r.state < 3); // 0=Wait, 1=Committing, 2=Revealing
            }

            return result;
        },
        [filter, viewerAddress]
    );

    // Toggle filter
    const toggleFilter = useCallback((key: keyof RoomFilter) => {
        setFilter((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Set specific filter value
    const setFilterValue = useCallback((key: keyof RoomFilter, value: boolean) => {
        setFilter((prev) => ({ ...prev, [key]: value }));
    }, []);

    // Reset filters
    const resetFilters = useCallback(() => {
        setFilter(DEFAULT_FILTER);
    }, []);

    // Check if current room is selected
    const isRoomSelected = useCallback(
        (id: number | string): boolean => {
            return String(id) === roomId;
        },
        [roomId]
    );

    // Select room and mark as visited
    const selectRoom = useCallback((id: number | string) => {
        const idStr = String(id);
        setRoomId(idStr);
        if (id && typeof id === "number") {
            markVisited(id);
        }
    }, [markVisited]);

    return {
        roomId,
        setRoomId: selectRoom,
        filter,
        setFilter,
        toggleFilter,
        setFilterValue,
        resetFilters,
        getFilteredRooms,
        markVisited,
        isVisited,
        clearVisited,
        isRoomSelected,
        visitedRoomsRef,
    };
}
