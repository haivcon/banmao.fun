// Server-side cache utility for OKX API data
// Caches data in memory to share across all users and respect rate limits

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class APICache {
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private pendingRequests: Map<string, Promise<unknown>> = new Map();

    // Get cached data if not expired
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    // Set cached data with TTL (in milliseconds)
    set<T>(key: string, data: T, ttlMs: number): void {
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttlMs,
        });
    }

    // Get cache age in seconds
    getAge(key: string): number {
        const entry = this.cache.get(key);
        if (!entry) return Infinity;
        return Math.floor((Date.now() - entry.timestamp) / 1000);
    }

    // Check if we have a pending request for this key (prevent duplicate calls)
    hasPendingRequest(key: string): boolean {
        return this.pendingRequests.has(key);
    }

    // Get pending request promise
    getPendingRequest<T>(key: string): Promise<T> | null {
        return this.pendingRequests.get(key) as Promise<T> | null;
    }

    // Set pending request
    setPendingRequest<T>(key: string, promise: Promise<T>): void {
        this.pendingRequests.set(key, promise);
        // Auto-remove pending request after completion
        promise.finally(() => {
            this.pendingRequests.delete(key);
        });
    }

    // Clear specific cache entry
    clear(key: string): void {
        this.cache.delete(key);
    }

    // Clear all cache
    clearAll(): void {
        this.cache.clear();
    }
}

// Singleton instance - shared across all API routes
export const apiCache = new APICache();

// Cache keys
export const CACHE_KEYS = {
    PRICE: 'okx_price',
    TOKEN_STATS: 'okx_token_stats',
    HOLDERS: 'okx_holders',
} as const;

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
    PRICE: 10000,        // 10 seconds for price data
    TOKEN_STATS: 30000,  // 30 seconds for token stats
    HOLDERS: 300000,     // 5 minutes for holders (less frequent changes)
} as const;
