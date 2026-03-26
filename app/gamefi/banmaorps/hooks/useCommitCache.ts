"use client";

import { useState, useCallback, useEffect } from "react";
import { isHex } from "viem";
import { Choice, LastCommitInfo, CommitInfoMap } from "../lib/types";
import { normalizeRoomId } from "../lib/gameUtils";

const COMMIT_STORAGE_PREFIX = "banmao_commit_";
const COMMIT_ARCHIVE_STORAGE_PREFIX = "banmao_commit_archive_";

/**
 * Parse and validate a commit record from storage
 */
function parseCommitRecord(value: unknown): LastCommitInfo | null {
    if (!value || typeof value !== "object") return null;
    const maybe = value as Partial<LastCommitInfo>;
    if (
        typeof maybe.roomId === "string" &&
        typeof maybe.stakeHuman === "string" &&
        typeof maybe.choice === "number" &&
        typeof maybe.salt === "string"
    ) {
        const saltValue = maybe.salt as string;
        if (isHex(saltValue) && saltValue.length === 66) {
            const normalizedRoomId = normalizeRoomId(maybe.roomId);
            if (!normalizedRoomId) return null;
            return {
                roomId: normalizedRoomId,
                stakeHuman: maybe.stakeHuman,
                choice: maybe.choice as Choice,
                salt: saltValue as `0x${string}`,
            };
        }
    }
    return null;
}

/**
 * Load commit info map from localStorage
 */
function loadCommitInfoMap(storageKey: string): CommitInfoMap {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem(storageKey);
    if (!stored) return {};
    try {
        const parsed = JSON.parse(stored);
        if (!parsed) return {};
        if (Array.isArray(parsed)) return {};
        if (typeof parsed === "object") {
            // Handle legacy single-record format
            if ("roomId" in parsed) {
                const single = parseCommitRecord(parsed);
                if (single) {
                    const normalizedMap: CommitInfoMap = { [single.roomId]: single };
                    localStorage.setItem(storageKey, JSON.stringify(normalizedMap));
                    return normalizedMap;
                }
                return {};
            }

            // Standard map format
            const map: CommitInfoMap = {};
            let needsRewrite = false;
            for (const [rawKey, value] of Object.entries(parsed)) {
                const info = parseCommitRecord(value);
                if (info) {
                    map[info.roomId] = info;
                    if (rawKey !== info.roomId) needsRewrite = true;
                } else {
                    needsRewrite = true;
                }
            }
            if (needsRewrite) localStorage.setItem(storageKey, JSON.stringify(map));
            return map;
        }
    } catch {
        return {};
    }
    return {};
}

function loadCommitInfos(address: `0x${string}`): CommitInfoMap {
    return loadCommitInfoMap(`${COMMIT_STORAGE_PREFIX}${address}`);
}

function loadArchivedCommitInfos(address: `0x${string}`): CommitInfoMap {
    return loadCommitInfoMap(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`);
}

function saveCommitInfoToStorage(storageKey: string, info: LastCommitInfo) {
    if (typeof window === "undefined") return;
    const normalizedRoomId = normalizeRoomId(info.roomId);
    if (!normalizedRoomId) return;
    const current = loadCommitInfoMap(storageKey);
    const normalizedInfo: LastCommitInfo = { ...info, roomId: normalizedRoomId };
    current[normalizedRoomId] = normalizedInfo;
    localStorage.setItem(storageKey, JSON.stringify(current));
}

function saveCommitInfo(address: `0x${string}`, info: LastCommitInfo) {
    saveCommitInfoToStorage(`${COMMIT_STORAGE_PREFIX}${address}`, info);
}

function saveArchivedCommitInfo(address: `0x${string}`, info: LastCommitInfo) {
    saveCommitInfoToStorage(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`, info);
}

function clearCommitInfoFromStorage(storageKey: string, roomId?: string) {
    if (typeof window === "undefined") return;
    if (!roomId) {
        localStorage.removeItem(storageKey);
        return;
    }
    const current = loadCommitInfoMap(storageKey);
    const next = { ...current };
    let changed = false;
    const idsToDelete = new Set<string>();
    const rawKey = roomId.trim();
    if (rawKey) idsToDelete.add(rawKey);
    const normalized = normalizeRoomId(roomId);
    if (normalized) idsToDelete.add(normalized);
    idsToDelete.forEach((id) => {
        if (id in next) {
            delete next[id];
            changed = true;
        }
    });
    if (!changed) return;
    if (Object.keys(next).length === 0) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify(next));
}

function clearCommitInfoForAddress(
    address: `0x${string}`,
    roomId?: string,
    options?: { preserveArchive?: boolean }
) {
    clearCommitInfoFromStorage(`${COMMIT_STORAGE_PREFIX}${address}`, roomId);
    if (options?.preserveArchive) return;
    clearCommitInfoFromStorage(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`, roomId);
}

export interface UseCommitCacheReturn {
    commitInfoMap: CommitInfoMap;
    archivedCommitInfoMap: CommitInfoMap;
    saveCommit: (info: LastCommitInfo) => void;
    archiveCommit: (info: LastCommitInfo) => void;
    clearCommit: (roomId?: string, options?: { preserveArchive?: boolean }) => void;
    getCommitInfo: (roomId: string) => LastCommitInfo | null;
    reloadFromStorage: () => void;
}

/**
 * Hook to manage commit cache in localStorage
 */
export function useCommitCache(address: `0x${string}` | undefined): UseCommitCacheReturn {
    const [commitInfoMap, setCommitInfoMap] = useState<CommitInfoMap>({});
    const [archivedCommitInfoMap, setArchivedCommitInfoMap] = useState<CommitInfoMap>({});

    // Load from storage on mount and address change
    useEffect(() => {
        if (!address) {
            setCommitInfoMap({});
            setArchivedCommitInfoMap({});
            return;
        }
        setCommitInfoMap(loadCommitInfos(address));
        setArchivedCommitInfoMap(loadArchivedCommitInfos(address));
    }, [address]);

    const saveCommit = useCallback(
        (info: LastCommitInfo) => {
            if (!address) return;
            saveCommitInfo(address, info);
            setCommitInfoMap((prev) => {
                const normalizedRoomId = normalizeRoomId(info.roomId);
                if (!normalizedRoomId) return prev;
                return { ...prev, [normalizedRoomId]: { ...info, roomId: normalizedRoomId } };
            });
        },
        [address]
    );

    const archiveCommit = useCallback(
        (info: LastCommitInfo) => {
            if (!address) return;
            saveArchivedCommitInfo(address, info);
            setArchivedCommitInfoMap((prev) => {
                const normalizedRoomId = normalizeRoomId(info.roomId);
                if (!normalizedRoomId) return prev;
                return { ...prev, [normalizedRoomId]: { ...info, roomId: normalizedRoomId } };
            });
        },
        [address]
    );

    const clearCommit = useCallback(
        (roomId?: string, options?: { preserveArchive?: boolean }) => {
            if (!address) return;
            clearCommitInfoForAddress(address, roomId, options);

            if (!roomId) {
                setCommitInfoMap({});
                if (!options?.preserveArchive) setArchivedCommitInfoMap({});
                return;
            }

            const normalized = normalizeRoomId(roomId);
            setCommitInfoMap((prev) => {
                const next = { ...prev };
                if (roomId in next) delete next[roomId];
                if (normalized && normalized in next) delete next[normalized];
                return next;
            });

            if (!options?.preserveArchive) {
                setArchivedCommitInfoMap((prev) => {
                    const next = { ...prev };
                    if (roomId in next) delete next[roomId];
                    if (normalized && normalized in next) delete next[normalized];
                    return next;
                });
            }
        },
        [address]
    );

    const getCommitInfo = useCallback(
        (roomId: string): LastCommitInfo | null => {
            const normalized = normalizeRoomId(roomId);
            if (!normalized) return null;
            return commitInfoMap[normalized] ?? archivedCommitInfoMap[normalized] ?? null;
        },
        [commitInfoMap, archivedCommitInfoMap]
    );

    const reloadFromStorage = useCallback(() => {
        if (!address) return;
        setCommitInfoMap(loadCommitInfos(address));
        setArchivedCommitInfoMap(loadArchivedCommitInfos(address));
    }, [address]);

    return {
        commitInfoMap,
        archivedCommitInfoMap,
        saveCommit,
        archiveCommit,
        clearCommit,
        getCommitInfo,
        reloadFromStorage,
    };
}
