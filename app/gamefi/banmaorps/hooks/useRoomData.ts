/**
 * useRoomData Hook
 * Handles room data fetching and deadline refresh operations
 */

"use client";

import { useCallback, MutableRefObject } from "react";
import type { RoomWithForfeit } from "../lib/types";
import { RPS, ZERO_ADDR, ZERO_COMMIT } from "../lib/gameUtils";
import { RPS_ABI } from "../lib/abis";

export interface RoomSnapshot {
    id: number;
    creator: `0x${string}`;
    opponent: `0x${string}`;
    stake: bigint;
    commitA: `0x${string}`;
    commitB: `0x${string}`;
    revealA: number;
    revealB: number;
    state: number;
    commitDeadline: number;
    revealDeadline: number;
}

export interface RoomDataCallbacks {
    rememberCommitDeadlineFallback: (roomId: number, deadline: number) => void;
    rememberCommitDuration: (roomId: number, duration: number) => void;
}

export interface UseRoomDataParams {
    publicClient: any | null;
    roomsRef: MutableRefObject<RoomWithForfeit[]>;
    commitDurationsRef: MutableRefObject<Map<number, number>>;
    callbacks: RoomDataCallbacks;
}

export interface UseRoomDataReturn {
    refreshCommitDeadline: (roomId: number) => Promise<void>;
    fetchRoomSnapshot: (roomIdNum: number) => Promise<RoomSnapshot | null>;
}

export function useRoomData({
    publicClient,
    roomsRef,
    commitDurationsRef,
    callbacks,
}: UseRoomDataParams): UseRoomDataReturn {
    const { rememberCommitDeadlineFallback, rememberCommitDuration } = callbacks;

    const refreshCommitDeadline = useCallback(
        async (roomId: number) => {
            if (!publicClient) return;
            if (!Number.isFinite(roomId) || roomId < 0) return;
            try {
                const rawRoom: any = await publicClient.readContract({
                    address: RPS,
                    abi: RPS_ABI,
                    functionName: "rooms",
                    args: [BigInt(Math.floor(roomId))],
                } as any);
                const commitDeadlineValue = Number(rawRoom?.[7] ?? rawRoom?.commitDeadline ?? 0);
                if (Number.isFinite(commitDeadlineValue) && commitDeadlineValue > 0) {
                    rememberCommitDeadlineFallback(Math.floor(roomId), commitDeadlineValue);
                    if (!commitDurationsRef.current.has(Math.floor(roomId))) {
                        const nowSec = Math.floor(Date.now() / 1000);
                        const remaining = commitDeadlineValue - nowSec;
                        if (remaining > 0) {
                            rememberCommitDuration(Math.floor(roomId), remaining);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to refresh commit deadline", error);
            }
        },
        [publicClient, rememberCommitDeadlineFallback, rememberCommitDuration, commitDurationsRef]
    );

    const fetchRoomSnapshot = useCallback(
        async (roomIdNum: number): Promise<RoomSnapshot | null> => {
            if (!Number.isFinite(roomIdNum) || roomIdNum < 0) return null;

            const cached = roomsRef.current.find((room) => room.id === roomIdNum);
            if (cached) {
                return {
                    id: cached.id,
                    creator: cached.creator,
                    opponent: cached.opponent,
                    stake: cached.stake,
                    commitA: cached.commitA,
                    commitB: cached.commitB,
                    revealA: Number(cached.revealA ?? 0),
                    revealB: Number(cached.revealB ?? 0),
                    state: Number(cached.state ?? 0),
                    commitDeadline: Number(cached.commitDeadline ?? 0),
                    revealDeadline: Number(cached.revealDeadline ?? 0),
                };
            }

            if (!publicClient) return null;
            try {
                const rawRoom: any = await publicClient.readContract({
                    address: RPS,
                    abi: RPS_ABI,
                    functionName: "rooms",
                    args: [BigInt(roomIdNum)],
                } as any);

                return {
                    id: roomIdNum,
                    creator: (rawRoom?.[0] ?? rawRoom?.creator ?? ZERO_ADDR) as `0x${string}`,
                    opponent: (rawRoom?.[1] ?? rawRoom?.opponent ?? ZERO_ADDR) as `0x${string}`,
                    stake:
                        typeof rawRoom?.[2] === "bigint"
                            ? (rawRoom?.[2] as bigint)
                            : BigInt(rawRoom?.[2] ?? rawRoom?.stake ?? 0),
                    commitA: (rawRoom?.[3] ?? rawRoom?.commitA ?? ZERO_COMMIT) as `0x${string}`,
                    commitB: (rawRoom?.[4] ?? rawRoom?.commitB ?? ZERO_COMMIT) as `0x${string}`,
                    revealA: Number(rawRoom?.[5] ?? rawRoom?.revealA ?? 0),
                    revealB: Number(rawRoom?.[6] ?? rawRoom?.revealB ?? 0),
                    state: Number(rawRoom?.[9] ?? rawRoom?.state ?? 0),
                    commitDeadline: Number(rawRoom?.[7] ?? rawRoom?.commitDeadline ?? 0),
                    revealDeadline: Number(rawRoom?.[8] ?? rawRoom?.revealDeadline ?? 0),
                };
            } catch (error) {
                console.error(error);
                return null;
            }
        },
        [publicClient, roomsRef]
    );

    return {
        refreshCommitDeadline,
        fetchRoomSnapshot,
    };
}
