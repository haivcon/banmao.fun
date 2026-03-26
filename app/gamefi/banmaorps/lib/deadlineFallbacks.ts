/**
 * Deadline fallback storage utilities for localStorage caching
 */

const COMMIT_DEADLINE_CACHE_KEY = "banmao_commit_deadlines";
const REVEAL_DEADLINE_CACHE_KEY = "banmao_reveal_deadlines";

/**
 * Load commit deadline fallbacks from localStorage
 */
export function loadCommitDeadlineFallbacksFromStorage(): Map<number, number> {
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

/**
 * Persist commit deadline fallbacks to localStorage
 */
export function persistCommitDeadlineFallbacks(map: Map<number, number>): void {
    if (typeof window === "undefined") return;
    const entries = Array.from(map.entries()).filter(([, deadline]) => Number.isFinite(deadline) && deadline > 0);
    if (entries.length === 0) {
        window.localStorage.removeItem(COMMIT_DEADLINE_CACHE_KEY);
    } else {
        window.localStorage.setItem(COMMIT_DEADLINE_CACHE_KEY, JSON.stringify(entries));
    }
}

/**
 * Load reveal deadline fallbacks from localStorage
 */
export function loadRevealDeadlineFallbacksFromStorage(): Map<number, number> {
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

/**
 * Persist reveal deadline fallbacks to localStorage
 */
export function persistRevealDeadlineFallbacks(map: Map<number, number>): void {
    if (typeof window === "undefined") return;
    const entries = Array.from(map.entries()).filter(([, deadline]) => Number.isFinite(deadline) && deadline > 0);
    if (entries.length === 0) {
        window.localStorage.removeItem(REVEAL_DEADLINE_CACHE_KEY);
    } else {
        window.localStorage.setItem(REVEAL_DEADLINE_CACHE_KEY, JSON.stringify(entries));
    }
}

export { COMMIT_DEADLINE_CACHE_KEY, REVEAL_DEADLINE_CACHE_KEY };
