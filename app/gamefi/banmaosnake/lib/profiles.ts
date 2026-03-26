import { AVATARS, AvatarIndex } from './avatars';

export interface PlayerProfile {
    address: string;
    name: string;
    avatar: AvatarIndex;
    telegram?: string;
    twitter?: string;
    highScore: number;
    lastPlayed: number;
}

const STORAGE_KEY = 'snake_profiles';
const LEADERBOARD_KEY = 'snake_leaderboard';

// Get all profiles from localStorage
function getAllProfiles(): Record<string, PlayerProfile> {
    if (typeof window === 'undefined') return {};
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

// Save all profiles to localStorage
function saveAllProfiles(profiles: Record<string, PlayerProfile>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

// Get profile for a specific wallet address
export function getProfile(address: string): PlayerProfile | null {
    const profiles = getAllProfiles();
    return profiles[address.toLowerCase()] || null;
}

// Create default profile for new player
export function createDefaultProfile(address: string): PlayerProfile {
    return {
        address: address.toLowerCase(),
        name: `Player ${address.slice(0, 6)}`,
        avatar: Math.floor(Math.random() * AVATARS.length) as AvatarIndex,
        highScore: 0,
        lastPlayed: Date.now()
    };
}

// Save or update profile
export function saveProfile(profile: PlayerProfile): void {
    const profiles = getAllProfiles();
    profiles[profile.address.toLowerCase()] = {
        ...profile,
        address: profile.address.toLowerCase()
    };
    saveAllProfiles(profiles);
}

// Update high score if new score is higher
export function updateHighScore(address: string, score: number): boolean {
    const profile = getProfile(address) || createDefaultProfile(address);
    if (score > profile.highScore) {
        profile.highScore = score;
        profile.lastPlayed = Date.now();
        saveProfile(profile);
        return true;
    }
    return false;
}

// Get leaderboard (top N players sorted by highScore)
export function getLeaderboard(limit: number = 100): PlayerProfile[] {
    const profiles = getAllProfiles();
    return Object.values(profiles)
        .filter(p => p.highScore > 0)
        .sort((a, b) => b.highScore - a.highScore)
        .slice(0, limit);
}

// Get player rank
export function getPlayerRank(address: string): number {
    const leaderboard = getLeaderboard(100);
    const index = leaderboard.findIndex(p => p.address.toLowerCase() === address.toLowerCase());
    return index >= 0 ? index + 1 : 0;
}

// Get avatar emoji by index
export function getAvatarEmoji(index: AvatarIndex): string {
    return AVATARS[index] || AVATARS[0];
}
