/**
 * useRoomFiltering Hook
 * Filters and sorts rooms for display, computes room metadata
 */

"use client";

import { useMemo } from "react";
import type { RoomWithForfeit } from "../lib/types";
import { availability, RoomAvailability } from "../lib/roomUtils";
import { ZERO_ADDR, ZERO_COMMIT } from "../lib/gameUtils";

const ZERO_BIGINT = BigInt(0);
const ZERO_ADDR_LOWER = ZERO_ADDR.toLowerCase();

export interface EnhancedRoomView extends RoomWithForfeit {
    commitDeadline: number;
    revealDeadline: number;
}

export interface RoomMetaEntry {
    view: EnhancedRoomView;
    availability: RoomAvailability;
}

export interface UseRoomFilteringParams {
    rooms: RoomWithForfeit[];
    addressLower: string | null;
    enhanceRoomDeadlines: (room: RoomWithForfeit) => EnhancedRoomView;
    nowTs: number;
}

export interface UseRoomFilteringReturn {
    personalRooms: RoomWithForfeit[];
    visibleRooms: RoomWithForfeit[];
    roomMeta: Map<number, RoomMetaEntry>;
}

export function useRoomFiltering({
    rooms,
    addressLower,
    enhanceRoomDeadlines,
    nowTs,
}: UseRoomFilteringParams): UseRoomFilteringReturn {
    // Filter personal rooms (where viewer is creator or opponent)
    const personalRooms = useMemo(() => {
        if (!addressLower) return [];
        return rooms
            .filter((r) => {
                const creator = r.creator?.toLowerCase?.();
                const opponent = r.opponent?.toLowerCase?.();
                return creator === addressLower || opponent === addressLower;
            })
            .sort((a, b) => b.id - a.id);
    }, [rooms, addressLower]);

    // Compute visible rooms with metadata and sorting
    const { visibleRooms, roomMeta } = useMemo(() => {
        const meta = new Map<number, RoomMetaEntry>();

        rooms.forEach((room) => {
            const view = enhanceRoomDeadlines(room) as EnhancedRoomView;
            meta.set(room.id, {
                view,
                availability: availability(view, nowTs),
            });
        });

        const sorted = [...rooms].sort((a, b) => {
            const metaA = meta.get(a.id);
            const metaB = meta.get(b.id);
            if (!metaA || !metaB) return 0;

            // Helper to get priority group
            // 1. Actionable (My Turn)
            // 2. Open Lobby (Live, Joinable)
            // 3. Active (In Progress)
            // 4. Other (Expired, Finished, Canceled)
            const getPriority = (m: RoomMetaEntry) => {
                const r = m.view;

                // 1. Actionable
                if (addressLower) {
                    const isCreator = r.creator?.toLowerCase() === addressLower;
                    const isOpponent = r.opponent?.toLowerCase() === addressLower;

                    if (r.state === 1) { // Committing
                        if (isCreator && (!r.commitA || r.commitA === ZERO_COMMIT)) return 1;
                        if (isOpponent && (!r.commitB || r.commitB === ZERO_COMMIT)) return 1;
                    }
                    if (r.state === 2) { // Revealing
                        if (isCreator && (r.revealA === 0)) return 1;
                        if (isOpponent && (r.revealB === 0)) return 1;
                    }
                }

                // 2. Open Lobby (Joinable + Live)
                const isWait = r.state === 0;
                const isNoOpponent = !r.opponent || r.opponent === ZERO_ADDR_LOWER;
                if (isWait && isNoOpponent) {
                    // Check if live (not expired)
                    if (m.availability.live && !m.availability.expired) return 2;
                    // If expired, it goes to group 4
                    return 4;
                }

                // 3. Active (State 1 or 2)
                if (r.state === 1 || r.state === 2) return 3;

                // 4. Others
                return 4;
            };

            const pA = getPriority(metaA);
            const pB = getPriority(metaB);

            if (pA !== pB) return pA - pB;

            // Tie-breakers
            // Group 2 (Open Lobbies): Sort by Stake DESC (Highest first)
            if (pA === 2) {
                const sA = metaA.view.stake ?? ZERO_BIGINT;
                const sB = metaB.view.stake ?? ZERO_BIGINT;
                if (sA !== sB) {
                    return sA > sB ? -1 : 1;
                }
            }

            // Default: ID DESC (Newest first)
            return metaB.view.id - metaA.view.id;
        });

        const filtered = sorted.filter((room) => meta.has(room.id));

        return { visibleRooms: filtered, roomMeta: meta };
    }, [rooms, enhanceRoomDeadlines, nowTs]);

    return {
        personalRooms,
        visibleRooms,
        roomMeta,
    };
}
