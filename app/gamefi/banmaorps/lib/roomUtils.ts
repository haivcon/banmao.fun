/**
 * Room utility functions
 */

import { RoomWithForfeit } from "./types";
import { ZERO_ADDR, roomIsFinalized, resolveForfeitOutcome } from "./gameUtils";

export interface RoomAvailability {
    label: string;
    live: boolean;
    expired: boolean;
    claimable: boolean;
    deadline: number;
    phase: string;
}

/**
 * Helper for UI "available/countdown/claimable" + expired status
 */
export function availability(room: any, nowOverride?: number): RoomAvailability {
    const now = nowOverride ?? Math.floor(Date.now() / 1000);
    const s = room.state as number;

    if (resolveForfeitOutcome(room)) {
        return { label: "Finished", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
    }

    // WAIT: Room has no opponent (show joinable within commit window)
    if (s === 0 && room.opponent === ZERO_ADDR) {
        const hasDeadline = !!room.commitDeadline && room.commitDeadline > 0;
        const live = hasDeadline ? now < room.commitDeadline : true; // if contract hasn't set deadline => consider joinable
        return {
            label: live ? "Joinable" : "Wait",
            live,
            expired: !live,
            claimable: hasDeadline ? now >= room.commitDeadline : false,
            deadline: hasDeadline ? room.commitDeadline : 0,
            phase: "commit",
        };
    }

    if (s === 1) {
        const live = room.commitDeadline > 0 ? now < room.commitDeadline : true;
        return {
            label: live ? "Committing" : "Commit expired",
            live,
            expired: !live,
            claimable: room.commitDeadline > 0 ? now >= room.commitDeadline : false,
            deadline: room.commitDeadline || 0,
            phase: "commit",
        };
    }

    if (s === 2) {
        const live = room.revealDeadline > 0 ? now < room.revealDeadline : true;
        return {
            label: live ? "Revealing" : "Reveal expired",
            live,
            expired: !live,
            claimable: room.revealDeadline > 0 ? now >= room.revealDeadline : false,
            deadline: room.revealDeadline || 0,
            phase: "reveal",
        };
    }

    if (s === 3) return { label: "Finished", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
    if (s === 4) {
        if (roomIsFinalized(room)) {
            return { label: "Finished", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
        }
        return { label: "Canceled", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
    }
    return { label: "Unknown", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
}

/**
 * Prioritize cached rooms by relevance (non-finalized first, then by ID)
 */
export function prioritizeCachedRooms(rooms: RoomWithForfeit[]): RoomWithForfeit[] {
    if (!Array.isArray(rooms) || rooms.length === 0) return [];

    const sorted = [...rooms].sort((a, b) => {
        const finalA = roomIsFinalized(a);
        const finalB = roomIsFinalized(b);
        if (finalA !== finalB) return finalA ? 1 : -1;

        const idA = Number(a?.id ?? 0);
        const idB = Number(b?.id ?? 0);
        if (!Number.isFinite(idA)) return 1;
        if (!Number.isFinite(idB)) return -1;
        return idB - idA;
    });

    return sorted;
}
