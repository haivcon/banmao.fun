/**
 * Cache version management for BANMAO RPS
 * 
 * This module handles cache versioning and cleanup to ensure users
 * get fresh data when deploying new versions to Vercel.
 */

// Version của cache schema - TĂNG khi thay đổi cấu trúc data
// Khi bạn deploy version mới và muốn xóa cache cũ, hãy tăng số này
export const CACHE_SCHEMA_VERSION = "v2";

// Build timestamp - tự động từ env hoặc fallback
export const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || "dev";

// Cache version storage key
const CACHE_VERSION_KEY = "banmao_cache_version";

// Legacy cache keys that should be cleaned up
const LEGACY_CACHE_KEYS = [
    "banmao_rooms_cache_v1",
    "banmao_info_cache_v1",
];

/**
 * Build a cache key with version suffix
 */
export function buildCacheKey(baseKey: string): string {
    return `${baseKey}_${CACHE_SCHEMA_VERSION}`;
}

/**
 * Remove legacy cache keys that are no longer used
 */
export function cleanupLegacyCache(): void {
    if (typeof window === "undefined") return;

    LEGACY_CACHE_KEYS.forEach((key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            // Ignore errors - localStorage might be blocked
            console.warn(`Failed to remove legacy cache key: ${key}`, error);
        }
    });
}

/**
 * Check if the current cache version matches the expected version.
 * If not, clean up legacy caches and update the stored version.
 * 
 * @returns true if cache was valid, false if cache was invalidated
 */
export function checkCacheVersion(): boolean {
    if (typeof window === "undefined") return false;

    try {
        const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
        const isValid = storedVersion === CACHE_SCHEMA_VERSION;

        if (!isValid) {
            // Clear all legacy caches
            cleanupLegacyCache();

            // Store the new version
            localStorage.setItem(CACHE_VERSION_KEY, CACHE_SCHEMA_VERSION);

            console.info(
                `[BANMAO] Cache schema updated: ${storedVersion || "none"} → ${CACHE_SCHEMA_VERSION}`
            );

            return false; // Cache was invalidated
        }

        return true; // Cache is valid
    } catch (error) {
        console.warn("[BANMAO] Failed to check cache version", error);
        return false;
    }
}

/**
 * Force clear all BANMAO-related caches
 * Useful for debugging or manual cache reset
 */
export function clearAllCaches(): void {
    if (typeof window === "undefined") return;

    const keysToRemove: string[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("banmao_")) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => {
            try {
                localStorage.removeItem(key);
            } catch { }
        });

        console.info(`[BANMAO] Cleared ${keysToRemove.length} cache entries`);
    } catch (error) {
        console.warn("[BANMAO] Failed to clear caches", error);
    }
}
