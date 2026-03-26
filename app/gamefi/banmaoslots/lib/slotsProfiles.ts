// ===== SLOTS PLAYER PROFILES =====
// Player profile management with localStorage

import { SLOTS_AVATARS, SlotsAvatarIndex, getSlotsAvatarEmoji } from './slotsAvatars';

export interface SlotsPlayerProfile {
    address: string;
    name: string;
    avatar: SlotsAvatarIndex;
    telegram?: string;
    twitter?: string;
    totalSpins: number;
    totalWins: number;
    biggestWin: string; // Store as string to avoid BigInt serialization issues
    jackpotsWon: number;
    totalWagered: string;
    totalWon: string;
    lastPlayed: number;
}

const STORAGE_KEY = 'slots_profiles';

// Get all profiles from localStorage
function getAllProfiles(): Record<string, SlotsPlayerProfile> {
    if (typeof window === 'undefined') return {};
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

// Save all profiles to localStorage
function saveAllProfiles(profiles: Record<string, SlotsPlayerProfile>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

// Get profile for a specific wallet address
export function getSlotsProfile(address: string): SlotsPlayerProfile | null {
    const profiles = getAllProfiles();
    return profiles[address.toLowerCase()] || null;
}

// Create default profile for new player
export function createDefaultSlotsProfile(address: string): SlotsPlayerProfile {
    return {
        address: address.toLowerCase(),
        name: `Spinner ${address.slice(0, 6)}`,
        avatar: Math.floor(Math.random() * SLOTS_AVATARS.length) as SlotsAvatarIndex,
        totalSpins: 0,
        totalWins: 0,
        biggestWin: '0',
        jackpotsWon: 0,
        totalWagered: '0',
        totalWon: '0',
        lastPlayed: Date.now()
    };
}

// Save or update profile
export function saveSlotsProfile(profile: SlotsPlayerProfile): void {
    const profiles = getAllProfiles();
    profiles[profile.address.toLowerCase()] = {
        ...profile,
        address: profile.address.toLowerCase()
    };
    saveAllProfiles(profiles);
}

// Update stats after a spin
export function updateSlotsStats(
    address: string,
    betAmount: bigint,
    payout: bigint,
    isJackpot: boolean
): SlotsPlayerProfile {
    const profile = getSlotsProfile(address) || createDefaultSlotsProfile(address);

    profile.totalSpins += 1;
    profile.lastPlayed = Date.now();

    // Update wagered
    const prevWagered = BigInt(profile.totalWagered);
    profile.totalWagered = (prevWagered + betAmount).toString();

    // Update wins
    if (payout > BigInt(0)) {
        profile.totalWins += 1;
        const prevWon = BigInt(profile.totalWon);
        profile.totalWon = (prevWon + payout).toString();

        // Check for new biggest win
        const prevBiggest = BigInt(profile.biggestWin);
        if (payout > prevBiggest) {
            profile.biggestWin = payout.toString();
        }
    }

    // Update jackpots
    if (isJackpot) {
        profile.jackpotsWon += 1;
    }

    saveSlotsProfile(profile);
    return profile;
}

// Get leaderboard (top players by biggest win)
export function getSlotsLeaderboard(limit: number = 100): SlotsPlayerProfile[] {
    const profiles = getAllProfiles();
    return Object.values(profiles)
        .filter(p => BigInt(p.biggestWin) > BigInt(0))
        .sort((a, b) => {
            const bigA = BigInt(a.biggestWin);
            const bigB = BigInt(b.biggestWin);
            if (bigB > bigA) return 1;
            if (bigB < bigA) return -1;
            return 0;
        })
        .slice(0, limit);
}

// Get player rank
export function getSlotsPlayerRank(address: string): number {
    const leaderboard = getSlotsLeaderboard(100);
    const index = leaderboard.findIndex(p => p.address.toLowerCase() === address.toLowerCase());
    return index >= 0 ? index + 1 : 0;
}

// Re-export avatar functions
export { SLOTS_AVATARS, getSlotsAvatarEmoji };
export type { SlotsAvatarIndex };
