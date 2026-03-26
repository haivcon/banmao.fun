// app/game/banmaosnake/lib/onchainLeaderboard.ts
// Fetches leaderboard data from server API (shared across all devices)

export interface OnchainPlayer {
    address: string;
    name: string;
    avatar: number;
    totalClaimed: bigint;
    highestClaim: bigint; // Best single claim score
    claimCount: number;
    lastClaimTime: number;
    telegram?: string;
    twitter?: string;
    editCount?: number; // Profile edit count (max 3)
}

// Cache for leaderboard data
let cachedLeaderboard: OnchainPlayer[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10000; // 10 seconds cache

// API endpoint for leaderboard
const LEADERBOARD_API = '/api/snake-leaderboard';

// Fetch leaderboard from server
export async function fetchOnchainLeaderboard(): Promise<OnchainPlayer[]> {
    // Check cache
    const now = Date.now();
    if (cachedLeaderboard.length > 0 && now - lastFetchTime < CACHE_DURATION) {
        return cachedLeaderboard;
    }

    try {
        const response = await fetch(LEADERBOARD_API, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('Failed to fetch leaderboard:', response.status);
            return cachedLeaderboard;
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.leaderboard)) {
            // Convert string amounts to bigint
            const leaderboard: OnchainPlayer[] = data.leaderboard.map((entry: any) => {
                const totalClaimed = BigInt(entry.totalClaimed || '0');
                // Use highestClaim if available, otherwise fallback to totalClaimed
                const highestClaim = entry.highestClaim ? BigInt(entry.highestClaim) : totalClaimed;
                return {
                    address: entry.address,
                    name: entry.name || `Player ${entry.address.slice(0, 6)}`,
                    avatar: entry.avatar ?? 0,
                    totalClaimed,
                    highestClaim,
                    claimCount: entry.claimCount || 0,
                    lastClaimTime: entry.lastClaimTime || 0,
                    telegram: entry.telegram,
                    twitter: entry.twitter,
                    editCount: entry.editCount ?? 0,
                };
            });

            // Update cache
            cachedLeaderboard = leaderboard;
            lastFetchTime = now;

            console.log(`Fetched leaderboard: ${leaderboard.length} players`);
            return leaderboard;
        }

        return cachedLeaderboard;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return cachedLeaderboard;
    }
}

// Update leaderboard after successful claim
// SECURITY: Requires txHash to verify on-chain transaction
export async function updateLeaderboardAfterClaim(
    address: string,
    claimAmount: string,
    txHash: string,
    name?: string,
    avatar?: number,
    telegram?: string,
    twitter?: string
): Promise<boolean> {
    try {
        const response = await fetch(LEADERBOARD_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address,
                claimAmount,
                txHash,
                name,
                avatar,
                telegram,
                twitter
            })
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Failed to update leaderboard:', response.status, data.error);
            return false;
        }

        const data = await response.json();

        if (data.success) {
            // Invalidate cache to force refresh
            lastFetchTime = 0;
            console.log('Leaderboard updated successfully');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        return false;
    }
}

// Get player rank
export async function getOnchainPlayerRank(address: string): Promise<number> {
    const leaderboard = await fetchOnchainLeaderboard();
    const index = leaderboard.findIndex(p => p.address.toLowerCase() === address.toLowerCase());
    return index >= 0 ? index + 1 : 0;
}

// Format total claimed for display (convert from wei to token units)
export function formatClaimedAmount(amount: bigint): string {
    const tokenAmount = Number(amount) / 1e18;
    if (tokenAmount >= 1000000) {
        return (tokenAmount / 1000000).toFixed(1) + 'M';
    } else if (tokenAmount >= 1000) {
        return (tokenAmount / 1000).toFixed(1) + 'K';
    }
    return Math.floor(tokenAmount).toLocaleString();
}

// Update profile on leaderboard (name, avatar, social links)
// Returns { success, editCount, error? } for tracking edit limits
export async function updateProfileOnLeaderboard(
    address: string,
    name?: string,
    avatar?: number,
    telegram?: string,
    twitter?: string
): Promise<{ success: boolean; editCount?: number; error?: string }> {
    try {
        const response = await fetch(LEADERBOARD_API, {
            method: 'PATCH',  // Fixed: API uses PATCH, not PUT
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address,
                name,
                avatar,
                telegram,
                twitter
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to update profile:', response.status, data.error);
            return { success: false, editCount: data.editCount, error: data.error };
        }

        if (data.success) {
            // Invalidate cache to force refresh
            lastFetchTime = 0;
            console.log('Profile updated on leaderboard, editCount:', data.editCount);
            return { success: true, editCount: data.editCount };
        }

        return { success: false };
    } catch (error) {
        console.error('Error updating profile on leaderboard:', error);
        return { success: false };
    }
}
