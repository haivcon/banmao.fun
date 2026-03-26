/**
 * LocalStorage Helpers for BANMAO RPS
 * Handles commit info, room history, and deadline caching
 */

import type { LastCommitInfo, CommitInfoMap, RoomWithForfeit } from "./types";
import { normalizeRoomId } from "./utils";
import {
    HIST_LIMIT, MAX_TRACKED_ROOMS, ROOM_SCAN_LIMIT,
    ACTIVE_ROOM_TARGET, ACTIVE_ROOM_BACKFILL_SCAN_LIMIT
} from "./roomConstants";

// Re-export room constants for backward compatibility
export { MAX_TRACKED_ROOMS, ROOM_SCAN_LIMIT, ACTIVE_ROOM_TARGET, ACTIVE_ROOM_BACKFILL_SCAN_LIMIT };

// ===================== Storage Keys =====================

const COMMIT_STORAGE_PREFIX = "banmao_commit_";
const COMMIT_ARCHIVE_STORAGE_PREFIX = "banmao_commit_archive_";
const COMMIT_DEADLINE_CACHE_KEY = "banmao_commit_deadlines";
const REVEAL_DEADLINE_CACHE_KEY = "banmao_reveal_deadlines";

// ===================== Commit Info Storage =====================

export function loadCommitInfos(address: `0x${string}`): CommitInfoMap {
    if (typeof window === "undefined") return {};
    try {
        const stored = localStorage.getItem(`${COMMIT_STORAGE_PREFIX}${address}`);
        if (!stored) return {};
        return JSON.parse(stored) as CommitInfoMap;
    } catch {
        return {};
    }
}

export function loadArchivedCommitInfos(address: `0x${string}`): CommitInfoMap {
    if (typeof window === "undefined") return {};
    try {
        const stored = localStorage.getItem(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`);
        if (!stored) return {};
        return JSON.parse(stored) as CommitInfoMap;
    } catch {
        return {};
    }
}

export function saveCommitInfo(address: `0x${string}`, info: LastCommitInfo) {
    if (typeof window === "undefined") return;
    const current = loadCommitInfos(address);
    const idKey = normalizeRoomId(info.roomId);
    if (!idKey) return;
    current[idKey] = info;
    try {
        localStorage.setItem(`${COMMIT_STORAGE_PREFIX}${address}`, JSON.stringify(current));
    } catch {
        // Storage might be full
    }
}

export function saveArchivedCommitInfo(address: `0x${string}`, info: LastCommitInfo) {
    if (typeof window === "undefined") return;
    const current = loadArchivedCommitInfos(address);
    const idKey = normalizeRoomId(info.roomId);
    if (!idKey) return;
    current[idKey] = info;
    try {
        localStorage.setItem(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`, JSON.stringify(current));
    } catch {
        // Storage might be full
    }
}

function clearCommitInfoFromStorage(storageKey: string, roomId?: string) {
    if (typeof window === "undefined") return;
    if (!roomId) {
        localStorage.removeItem(storageKey);
        return;
    }
    let current: CommitInfoMap = {};
    try {
        current = JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
        return;
    }
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

export function clearCommitInfo(
    address: `0x${string}`,
    roomId?: string,
    options?: { preserveArchive?: boolean }
) {
    clearCommitInfoFromStorage(`${COMMIT_STORAGE_PREFIX}${address}`, roomId);
    if (options?.preserveArchive) return;
    clearCommitInfoFromStorage(`${COMMIT_ARCHIVE_STORAGE_PREFIX}${address}`, roomId);
}

// ===================== Room History Storage =====================

export function loadJoinedRooms(address: `0x${string}`): number[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(`banmao_joined_${address}`) || "[]");
    } catch {
        return [];
    }
}

export function saveJoinedRooms(address: `0x${string}`, ids: number[]) {
    if (typeof window === "undefined") return;
    const dedup = Array.from(new Set(ids));
    localStorage.setItem(`banmao_joined_${address}`, JSON.stringify(dedup.slice(0, HIST_LIMIT)));
}

export function addRoomToHistory(addr: `0x${string}`, id: number) {
    const cur = loadJoinedRooms(addr);
    const next = [id, ...cur.filter((x) => x !== id)].slice(0, HIST_LIMIT);
    saveJoinedRooms(addr, next);
    return next;
}

// ===================== Seen Results Storage =====================

export function loadSeenResultRooms(address: `0x${string}`): number[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(`banmao_results_${address}`);
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

export function saveSeenResultRooms(address: `0x${string}`, ids: number[]) {
    if (typeof window === "undefined") return;
    const dedup = Array.from(new Set(ids.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v >= 0)));
    localStorage.setItem(`banmao_results_${address}`, JSON.stringify(dedup.slice(0, HIST_LIMIT * 2)));
}

// ===================== Deadline Fallback Storage =====================

export function loadCommitDeadlineFallbacksFromStorage() {
    const map = new Map<number, number>();
    if (typeof window === "undefined") return map;
    try {
        const raw = window.localStorage.getItem(COMMIT_DEADLINE_CACHE_KEY);
        if (!raw) return map;
        const parsed = JSON.parse(raw);
        const addEntry = (id: unknown, deadline: unknown) => {
            const idNum = Number(id);
            const deadlineNum = Number(deadline);
            if (Number.isFinite(idNum) && idNum >= 0 && Number.isFinite(deadlineNum) && deadlineNum > 0) {
                map.set(idNum, Math.floor(deadlineNum));
            }
        };
        if (Array.isArray(parsed)) {
            parsed.forEach((entry) => {
                if (Array.isArray(entry) && entry.length >= 2) {
                    addEntry(entry[0], entry[1]);
                }
            });
        } else if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([id, deadline]) => addEntry(id, deadline));
        }
    } catch { }
    return map;
}

export function persistCommitDeadlineFallbacks(map: Map<number, number>) {
    if (typeof window === "undefined") return;
    const entries = Array.from(map.entries()).filter(([, deadline]) => Number.isFinite(deadline) && deadline > 0);
    if (entries.length === 0) {
        window.localStorage.removeItem(COMMIT_DEADLINE_CACHE_KEY);
    } else {
        window.localStorage.setItem(COMMIT_DEADLINE_CACHE_KEY, JSON.stringify(entries));
    }
}

export function loadRevealDeadlineFallbacksFromStorage() {
    const map = new Map<number, number>();
    if (typeof window === "undefined") return map;
    try {
        const raw = window.localStorage.getItem(REVEAL_DEADLINE_CACHE_KEY);
        if (!raw) return map;
        const parsed = JSON.parse(raw);
        const addEntry = (id: unknown, deadline: unknown) => {
            const idNum = Number(id);
            const deadlineNum = Number(deadline);
            if (Number.isFinite(idNum) && idNum >= 0 && Number.isFinite(deadlineNum) && deadlineNum > 0) {
                map.set(idNum, Math.floor(deadlineNum));
            }
        };
        if (Array.isArray(parsed)) {
            parsed.forEach((entry) => {
                if (Array.isArray(entry) && entry.length >= 2) {
                    addEntry(entry[0], entry[1]);
                }
            });
        } else if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([id, deadline]) => addEntry(id, deadline));
        }
    } catch { }
    return map;
}

export function persistRevealDeadlineFallbacks(map: Map<number, number>) {
    if (typeof window === "undefined") return;
    const entries = Array.from(map.entries()).filter(([, deadline]) => Number.isFinite(deadline) && deadline > 0);
    if (entries.length === 0) {
        window.localStorage.removeItem(REVEAL_DEADLINE_CACHE_KEY);
    } else {
        window.localStorage.setItem(REVEAL_DEADLINE_CACHE_KEY, JSON.stringify(entries));
    }
}

// ===================== Room Priority =====================

function roomIsFinalized(room: any): boolean {
    if (!room) return false;
    const state = Number(room.state ?? 0);
    if (state === 3) return true;
    if (state === 4) return true;
    if (room.forfeit) return true;
    return false;
}

export function prioritizeCachedRooms(rooms: RoomWithForfeit[]) {
    if (!Array.isArray(rooms) || rooms.length === 0) return [];

    const sorted = [...rooms].sort((a, b) => {
        const finalA = roomIsFinalized(a);
        const finalB = roomIsFinalized(b);
        if (finalA !== finalB) return finalA ? 1 : -1;

        const idA = Number(a?.id ?? 0);
        const idB = Number(b?.id ?? 0);
        const finiteA = Number.isFinite(idA) && idA > 0;
        const finiteB = Number.isFinite(idB) && idB > 0;

        if (finiteA && finiteB) {
            if (idA === idB) return 0;
            return idA > idB ? -1 : 1;
        }

        if (finiteA !== finiteB) {
            return finiteA ? -1 : 1;
        }

        return 0;
    });

    const activeCount = sorted.reduce((count, room) => (roomIsFinalized(room) ? count : count + 1), 0);
    const limit = Math.max(MAX_TRACKED_ROOMS, activeCount);
    if (sorted.length <= limit) return sorted;
    return sorted.slice(0, limit);
}

// ===================== Clipboard Helper =====================

export async function copyToClipboard(text: string) {
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
}

// ===================== Html2Canvas Loader =====================

type Html2CanvasFn = (element: HTMLElement | Document, options?: any) => Promise<HTMLCanvasElement>;

declare global {
    interface Window {
        html2canvas?: Html2CanvasFn;
    }
}

export async function ensureHtml2Canvas(): Promise<Html2CanvasFn | null> {
    if (typeof window === "undefined") return null;
    if (typeof window.html2canvas === "function") return window.html2canvas;

    try {
        await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>("script[data-html2canvas]");
            if (existing) {
                if (existing.dataset.ready === "1") {
                    resolve();
                } else {
                    existing.addEventListener("load", () => resolve(), { once: true });
                    existing.addEventListener("error", () => reject(new Error("html2canvas failed to load")), {
                        once: true,
                    });
                }
                return;
            }

            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
            script.async = true;
            script.dataset.html2canvas = "1";
            script.addEventListener(
                "load",
                () => {
                    script.dataset.ready = "1";
                    resolve();
                },
                { once: true }
            );
            script.addEventListener("error", () => reject(new Error("html2canvas failed to load")), { once: true });
            document.head.appendChild(script);
        });
    } catch (error) {
        console.error(error);
        return null;
    }

    return typeof window.html2canvas === "function" ? window.html2canvas : null;
}
