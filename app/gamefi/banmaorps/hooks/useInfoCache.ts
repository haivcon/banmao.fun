/**
 * useInfoCache Hook
 * Manages user stats calculation and caching to localStorage
 */

"use client";

import { useMemo, useEffect, useState } from "react";
import type { RoomWithForfeit } from "../lib/types";
import { roomIsFinalized, deriveFinalOutcome } from "../lib/gameUtils";

export interface UserStats {
    win: number;
    loss: number;
    draw: number;
    totalWinnings: bigint;
    totalLosses: bigint;
    rock: number;
    paper: number;
    scissors: number;
}

export interface CachedInfoState {
    balance: bigint | null;
    stats: UserStats;
}

const ZERO_BIGINT = BigInt(0);

const EMPTY_STATS: UserStats = {
    win: 0,
    loss: 0,
    draw: 0,
    totalWinnings: ZERO_BIGINT,
    totalLosses: ZERO_BIGINT,
    rock: 0,
    paper: 0,
    scissors: 0,
};

const INFO_CACHE_KEY = "rps_info_cache";

function userStatsEqual(a: UserStats | undefined, b: UserStats | undefined): boolean {
    if (!a || !b) return a === b;
    return (
        a.win === b.win &&
        a.loss === b.loss &&
        a.draw === b.draw &&
        a.totalWinnings === b.totalWinnings &&
        a.totalLosses === b.totalLosses &&
        a.rock === b.rock &&
        a.paper === b.paper &&
        a.scissors === b.scissors
    );
}

function serializeInfoForCache(info: CachedInfoState): { balance: string | null; stats: Record<string, string | number> } {
    return {
        balance: info.balance !== null ? info.balance.toString() : null,
        stats: {
            win: info.stats.win,
            loss: info.stats.loss,
            draw: info.stats.draw,
            totalWinnings: info.stats.totalWinnings.toString(),
            totalLosses: info.stats.totalLosses.toString(),
            rock: info.stats.rock,
            paper: info.stats.paper,
            scissors: info.stats.scissors,
        },
    };
}

function deserializeInfoFromCache(raw: unknown): CachedInfoState | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    try {
        const balance = typeof obj.balance === "string" ? BigInt(obj.balance) : null;
        const statsRaw = obj.stats as Record<string, unknown> | undefined;
        if (!statsRaw) return null;
        const stats: UserStats = {
            win: Number(statsRaw.win) || 0,
            loss: Number(statsRaw.loss) || 0,
            draw: Number(statsRaw.draw) || 0,
            totalWinnings: typeof statsRaw.totalWinnings === "string" ? BigInt(statsRaw.totalWinnings) : ZERO_BIGINT,
            totalLosses: typeof statsRaw.totalLosses === "string" ? BigInt(statsRaw.totalLosses) : ZERO_BIGINT,
            rock: Number(statsRaw.rock) || 0,
            paper: Number(statsRaw.paper) || 0,
            scissors: Number(statsRaw.scissors) || 0,
        };
        return { balance, stats };
    } catch {
        return null;
    }
}

export interface UseInfoCacheParams {
    addressLower: string | null;
    personalRooms: RoomWithForfeit[];
    balance: bigint | undefined;
    isClient: boolean;
}

export interface UseInfoCacheReturn {
    userStats: UserStats;
    infoBalance: bigint | null;
    infoStats: UserStats;
    cachedInfo: CachedInfoState | null;
}

export function useInfoCache({
    addressLower,
    personalRooms,
    balance,
    isClient,
}: UseInfoCacheParams): UseInfoCacheReturn {
    // Initialize cached info from localStorage
    const [cachedInfo, setCachedInfo] = useState<CachedInfoState | null>(() => {
        if (typeof window === "undefined") return null;
        try {
            const raw = window.localStorage.getItem(INFO_CACHE_KEY);
            if (!raw) return null;
            return deserializeInfoFromCache(JSON.parse(raw));
        } catch {
            return null;
        }
    });

    // Calculate user stats from personal rooms
    const userStats = useMemo<UserStats>(() => {
        if (!addressLower || personalRooms.length === 0) {
            return { ...EMPTY_STATS };
        }
        const finishedRooms = personalRooms.filter((room) => roomIsFinalized(room));
        let win = 0;
        let loss = 0;
        let draw = 0;
        let totalWinnings = ZERO_BIGINT;
        let totalLosses = ZERO_BIGINT;
        let rock = 0;
        let paper = 0;
        let scissors = 0;

        for (const room of finishedRooms) {
            const isCreator = room.creator?.toLowerCase?.() === addressLower;
            const outcome = deriveFinalOutcome(room);
            if (outcome.via === "forfeit") {
                continue;
            }
            if ((outcome.winner === "creator" && isCreator) || (outcome.winner === "opponent" && !isCreator)) {
                win++;
                totalWinnings += room.stake;
            } else if (outcome.winner === "draw") {
                draw++;
            } else {
                loss++;
                totalLosses += room.stake;
            }

            if (isCreator) {
                if (room.revealA === 1) rock++;
                else if (room.revealA === 2) paper++;
                else if (room.revealA === 3) scissors++;
            } else {
                if (room.revealB === 1) rock++;
                else if (room.revealB === 2) paper++;
                else if (room.revealB === 3) scissors++;
            }
        }

        return { win, loss, draw, totalWinnings, totalLosses, rock, paper, scissors };
    }, [personalRooms, addressLower]);

    // Cache info to localStorage
    useEffect(() => {
        if (!isClient || typeof window === "undefined") return;
        const hasFreshBalance = typeof balance === "bigint";
        const hasStatsData = personalRooms.length > 0;
        if (!hasFreshBalance && !hasStatsData) return;

        const nextInfo: CachedInfoState = {
            balance: hasFreshBalance ? (balance as bigint) : cachedInfo?.balance ?? null,
            stats: hasStatsData ? userStats : cachedInfo?.stats ?? userStats,
        };

        if (cachedInfo) {
            const sameBalance = (cachedInfo.balance ?? null) === (nextInfo.balance ?? null);
            const sameStats = userStatsEqual(cachedInfo.stats, nextInfo.stats);
            if (sameBalance && sameStats) return;
        }

        setCachedInfo(nextInfo);
        try {
            const serialized = serializeInfoForCache(nextInfo);
            window.localStorage.setItem(INFO_CACHE_KEY, JSON.stringify(serialized));
        } catch (error) {
            console.error("Failed to cache info data", error);
        }
    }, [balance, personalRooms.length, userStats, isClient, cachedInfo]);

    // Derived values with fallback to cache
    const infoBalance = useMemo(() => {
        if (typeof balance === "bigint") return balance as bigint;
        return cachedInfo?.balance ?? null;
    }, [balance, cachedInfo]);

    const infoStats = useMemo(() => {
        if (personalRooms.length > 0) return userStats;
        if (cachedInfo?.stats) return cachedInfo.stats;
        return userStats;
    }, [personalRooms.length, userStats, cachedInfo]);

    return {
        userStats,
        infoBalance,
        infoStats,
        cachedInfo,
    };
}
