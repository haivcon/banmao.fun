/**
 * Commit Storage utilities for localStorage commit cache management
 */

import type { CommitInfoMap, LastCommitInfo, Choice } from "./types";

const COMMIT_STORAGE_PREFIX = "banmao_commit_";
const COMMIT_ARCHIVE_STORAGE_PREFIX = "banmao_commit_archive_";

/**
 * Parse a commit record from storage
 */
export function parseCommitRecord(value: unknown): LastCommitInfo | null {
    if (typeof value !== "object" || value === null) return null;
    const obj = value as Record<string, unknown>;

    const roomId = obj.roomId;
    const stakeHuman = obj.stakeHuman;
    const choice = obj.choice;
    const salt = obj.salt;

    if (typeof roomId !== "string") return null;
    if (typeof stakeHuman !== "string") return null;
    if (typeof choice !== "number" || ![1, 2, 3].includes(choice)) return null;
    if (typeof salt !== "string" || !/^0x[\da-fA-F]{64}$/.test(salt)) return null;

    return {
        roomId,
        stakeHuman,
        choice: choice as Choice,
        salt: salt as `0x${string}`,
    };
}

/**
 * Load commit info map from storage key
 */
export function loadCommitInfoMap(storageKey: string): CommitInfoMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return {};

        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return {};

        const result: CommitInfoMap = {};
        for (const [key, value] of Object.entries(parsed)) {
            const record = parseCommitRecord(value);
            if (record) {
                result[key] = record;
            }
        }
        return result;
    } catch {
        return {};
    }
}

/**
 * Load commit infos for address
 */
export function loadCommitInfos(address: `0x${string}`): CommitInfoMap {
    return loadCommitInfoMap(`${COMMIT_STORAGE_PREFIX}${address}`);
}

/**
 * Load archived commit infos for address
 */
export function loadArchivedCommitInfos(address: `0x${string}`): CommitInfoMap {
    return loadCommitInfoMap(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`);
}

/**
 * Save commit info to storage key
 */
export function saveCommitInfoToStorage(storageKey: string, info: LastCommitInfo): void {
    if (typeof window === "undefined") return;
    try {
        const existing = loadCommitInfoMap(storageKey);
        existing[info.roomId] = info;
        localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (error) {
        console.error("Failed to save commit info:", error);
    }
}

/**
 * Save commit info for address
 */
export function saveCommitInfo(address: `0x${string}`, info: LastCommitInfo): void {
    saveCommitInfoToStorage(`${COMMIT_STORAGE_PREFIX}${address}`, info);
}

/**
 * Save archived commit info for address
 */
export function saveArchivedCommitInfo(address: `0x${string}`, info: LastCommitInfo): void {
    saveCommitInfoToStorage(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`, info);
}

/**
 * Clear commit info from storage
 */
export function clearCommitInfoFromStorage(storageKey: string, roomId?: string): void {
    if (typeof window === "undefined") return;
    try {
        if (!roomId) {
            localStorage.removeItem(storageKey);
            return;
        }

        const existing = loadCommitInfoMap(storageKey);
        const normalizedRoomId = String(roomId).replace(/^#/, "").trim();

        delete existing[roomId];
        if (normalizedRoomId !== roomId) {
            delete existing[normalizedRoomId];
        }

        if (Object.keys(existing).length === 0) {
            localStorage.removeItem(storageKey);
        } else {
            localStorage.setItem(storageKey, JSON.stringify(existing));
        }
    } catch (error) {
        console.error("Failed to clear commit info:", error);
    }
}

/**
 * Clear commit info for address
 */
export function clearCommitInfo(
    address: `0x${string}`,
    roomId?: string,
    options?: { preserveArchive?: boolean }
): void {
    clearCommitInfoFromStorage(`${COMMIT_STORAGE_PREFIX}${address}`, roomId);
    if (options?.preserveArchive) return;
    clearCommitInfoFromStorage(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`, roomId);
}

export { COMMIT_STORAGE_PREFIX, COMMIT_ARCHIVE_STORAGE_PREFIX };
