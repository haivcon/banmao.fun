// lib/gameVisitTracker.ts
// Track game visits globally via API (synced across all users)

export interface GameVisitStats {
    gameId: string;
    visits24h: number;
    totalVisits: number;
    rank: number;
}

// Record a visit to a game (async - calls API)
export async function recordGameVisit(gameId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        // Generate a simple visitor fingerprint
        const visitorId = getVisitorId();

        await fetch('/api/game-visits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, visitorId }),
        });
    } catch (error) {
        console.error('Failed to record game visit:', error);
        // Silently fail - don't block user navigation
    }
}

// Get visit stats for all games (async - calls API)
export async function getGameVisitStats(gameIds: string[]): Promise<Record<string, GameVisitStats>> {
    if (typeof window === 'undefined') {
        // Return empty stats for SSR
        const emptyStats: Record<string, GameVisitStats> = {};
        gameIds.forEach(id => {
            emptyStats[id] = { gameId: id, visits24h: 0, totalVisits: 0, rank: gameIds.indexOf(id) + 1 };
        });
        return emptyStats;
    }

    try {
        const response = await fetch(`/api/game-visits?gameIds=${gameIds.join(',')}`);

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (!data.success || !data.stats) {
            throw new Error('Invalid API response');
        }

        // Transform API response to match expected format
        const stats: Record<string, GameVisitStats> = {};
        gameIds.forEach(id => {
            const apiStat = data.stats[id] || { visits24h: 0, rank: gameIds.length };
            stats[id] = {
                gameId: id,
                visits24h: apiStat.visits24h || 0,
                totalVisits: apiStat.visits24h || 0, // For now, same as 24h
                rank: apiStat.rank || gameIds.indexOf(id) + 1,
            };
        });

        return stats;
    } catch (error) {
        console.error('Failed to get game visit stats:', error);
        // Return default stats on error
        const defaultStats: Record<string, GameVisitStats> = {};
        gameIds.forEach((id, index) => {
            defaultStats[id] = { gameId: id, visits24h: 0, totalVisits: 0, rank: index + 1 };
        });
        return defaultStats;
    }
}

// Get sorted game IDs by visit count (most visited first)
export async function getSortedGameIds(gameIds: string[]): Promise<string[]> {
    const stats = await getGameVisitStats(gameIds);
    return gameIds.slice().sort((a, b) => {
        const visitsA = stats[a]?.visits24h || 0;
        const visitsB = stats[b]?.visits24h || 0;
        return visitsB - visitsA;
    });
}

// Get badge type based on rank and visit count
export function getBadgeForRank(rank: number, visits24h: number): 'hot' | 'top1' | 'top2' | 'top3' | null {
    // Only show badges if there are actual visits
    if (visits24h === 0) return null;

    if (rank === 1 && visits24h >= 10) return 'hot'; // Most visited with significant visits = HOT
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    return null;
}

// Generate a simple visitor ID (client-side fingerprint)
function getVisitorId(): string {
    if (typeof window === 'undefined') return 'SSR-visitor';

    // Try to get from localStorage first
    const storageKey = 'banmao_visitor_id';
    let visitorId = null;

    try {
        visitorId = localStorage.getItem(storageKey);
    } catch (e) {
        // Ignore localStorage errors
    }

    if (!visitorId) {
        // Generate a new one
        visitorId = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        try {
            localStorage.setItem(storageKey, visitorId);
        } catch {
            // localStorage not available
        }
    }

    return visitorId;
}
