// ===== TIER AND ACHIEVEMENT SYSTEM =====
// Player tiers based on total spins and achievement badges

export type TierName = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';

export interface TierInfo {
    name: TierName;
    icon: string;
    minSpins: number;
    color: string;
    gradient: string;
}

// Tier definitions - based on total spins
export const TIERS: TierInfo[] = [
    { name: 'legend', icon: '👑', minSpins: 50000, color: '#FF00FF', gradient: 'linear-gradient(135deg, #FF00FF, #8B00FF)' },
    { name: 'diamond', icon: '💎', minSpins: 10000, color: '#00FFFF', gradient: 'linear-gradient(135deg, #00FFFF, #0088FF)' },
    { name: 'gold', icon: '🥇', minSpins: 5000, color: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
    { name: 'silver', icon: '🥈', minSpins: 1000, color: '#C0C0C0', gradient: 'linear-gradient(135deg, #C0C0C0, #808080)' },
    { name: 'bronze', icon: '🥉', minSpins: 0, color: '#CD7F32', gradient: 'linear-gradient(135deg, #CD7F32, #8B4513)' },
];

// Get player's tier based on total spins
export function getPlayerTier(totalSpins: number): TierInfo {
    for (const tier of TIERS) {
        if (totalSpins >= tier.minSpins) {
            return tier;
        }
    }
    return TIERS[TIERS.length - 1]; // Bronze fallback
}

// Get next tier info for progress display
export function getNextTier(totalSpins: number): { current: TierInfo; next: TierInfo | null; progress: number } {
    const current = getPlayerTier(totalSpins);
    const currentIndex = TIERS.findIndex(t => t.name === current.name);
    const next = currentIndex > 0 ? TIERS[currentIndex - 1] : null;

    if (!next) {
        return { current, next: null, progress: 100 };
    }

    const spinsInCurrentTier = totalSpins - current.minSpins;
    const spinsNeeded = next.minSpins - current.minSpins;
    const progress = Math.min(100, (spinsInCurrentTier / spinsNeeded) * 100);

    return { current, next, progress };
}

// ===== ACHIEVEMENT SYSTEM =====

export type AchievementId =
    | 'sharpshooter'
    | 'onFire'
    | 'millionaire'
    | 'luckyCharm'
    | 'bigSpender'
    | 'jackpotHunter'
    | 'centurion'
    | 'veteran';

export interface Achievement {
    id: AchievementId;
    icon: string;
    color: string;
    name: string;
    description: string;
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
    sharpshooter: { id: 'sharpshooter', icon: '🎯', color: '#22c55e', name: 'Sharpshooter', description: 'Win rate > 40% (min 50 spins)' },
    onFire: { id: 'onFire', icon: '🔥', color: '#f97316', name: 'On Fire', description: '10+ win streak' },
    millionaire: { id: 'millionaire', icon: '💰', color: '#fbbf24', name: 'Millionaire', description: 'Won 1M+ tokens' },
    luckyCharm: { id: 'luckyCharm', icon: '🍀', color: '#10b981', name: 'Lucky Charm', description: 'Won 5+ jackpots' },
    bigSpender: { id: 'bigSpender', icon: '💳', color: '#a855f7', name: 'Big Spender', description: 'Wagered 10M+ tokens' },
    jackpotHunter: { id: 'jackpotHunter', icon: '🎰', color: '#ec4899', name: 'Jackpot Hunter', description: 'Won 10+ jackpots' },
    centurion: { id: 'centurion', icon: '💯', color: '#3b82f6', name: 'Centurion', description: 'Completed 100+ spins' },
    veteran: { id: 'veteran', icon: '⭐', color: '#eab308', name: 'Veteran', description: 'Completed 1000+ spins' },
};

// Check which achievements a player has earned
export function getPlayerAchievements(stats: {
    totalSpins: number;
    totalWins: number;
    totalWonAmount: bigint;
    totalWagered: bigint;
    jackpotWins: number;
    winStreak?: number;
}): AchievementId[] {
    const earned: AchievementId[] = [];

    const winRate = stats.totalSpins > 0 ? (stats.totalWins / stats.totalSpins) * 100 : 0;
    const totalWonNum = Number(stats.totalWonAmount) / 1e18;
    const totalWageredNum = Number(stats.totalWagered) / 1e18;

    // Sharpshooter: Win rate > 40% (min 50 spins)
    if (stats.totalSpins >= 50 && winRate >= 40) {
        earned.push('sharpshooter');
    }

    // On Fire: 10+ win streak
    if (stats.winStreak && stats.winStreak >= 10) {
        earned.push('onFire');
    }

    // Millionaire: Won 1M+ tokens
    if (totalWonNum >= 1000000) {
        earned.push('millionaire');
    }

    // Lucky Charm: 5+ jackpots
    if (stats.jackpotWins >= 5) {
        earned.push('luckyCharm');
    }

    // Big Spender: Wagered 10M+ tokens
    if (totalWageredNum >= 10000000) {
        earned.push('bigSpender');
    }

    // Jackpot Hunter: 10+ jackpots
    if (stats.jackpotWins >= 10) {
        earned.push('jackpotHunter');
    }

    // Centurion: 100+ spins
    if (stats.totalSpins >= 100) {
        earned.push('centurion');
    }

    // Veteran: 1000+ spins
    if (stats.totalSpins >= 1000) {
        earned.push('veteran');
    }

    return earned;
}

// ===== LEADERBOARD SORTING OPTIONS =====

export type LeaderboardSortBy =
    | 'biggestWin'
    | 'mostSpins'
    | 'profit'
    | 'winRate'
    | 'hotToday'
    | 'jackpotKings'
    | 'highRollers';

export type TimeFilter = 'today' | 'week' | 'month' | 'all';

export interface LeaderboardTab {
    id: LeaderboardSortBy;
    icon: string;
    translationKey: string;
}

export const PLAYER_LEADERBOARD_TABS: LeaderboardTab[] = [
    { id: 'biggestWin', icon: '🏆', translationKey: 'topWinnersTab' },
    { id: 'mostSpins', icon: '🎰', translationKey: 'mostSpinsTab' },
    { id: 'profit', icon: '💰', translationKey: 'tabProfit' },
    { id: 'winRate', icon: '🎯', translationKey: 'tabWinRate' },
    { id: 'jackpotKings', icon: '🎰', translationKey: 'tabJackpotKings' },
    { id: 'highRollers', icon: '💎', translationKey: 'tabHighRollers' },
];

export const TIME_FILTERS: { id: TimeFilter; translationKey: string }[] = [
    { id: 'today', translationKey: 'timeToday' },
    { id: 'week', translationKey: 'timeWeek' },
    { id: 'month', translationKey: 'timeMonth' },
    { id: 'all', translationKey: 'timeAll' },
];
