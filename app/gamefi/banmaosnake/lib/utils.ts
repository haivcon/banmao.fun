// ===== SNAKE GAME UTILITY FUNCTIONS =====
// Helper functions for formatting, clipboard, and player data

/**
 * Format large numbers compactly (1000 -> 1K, 1000000 -> 1M)
 */
export const formatCompact = (num: number): string => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
};

/**
 * Badge definition
 */
export interface Badge {
    icon: string;
    name: string;
    color: string;
}

/**
 * Player stats for badge calculation
 */
export interface PlayerStats {
    totalClaimed: bigint;
    claimCount: number;
    highestClaim: bigint;
}

/**
 * Badge System: Get badges earned by player
 */
export const getPlayerBadges = (player: PlayerStats, rank?: number): Badge[] => {
    const badges: Badge[] = [];
    const total = Number(player.totalClaimed) / 1e18;
    const highest = Number(player.highestClaim) / 1e18;

    // Rank badges
    if (rank === 1) badges.push({ icon: '👑', name: 'Champion', color: '#fbbf24' });
    else if (rank === 2) badges.push({ icon: '🥈', name: 'Runner-up', color: '#94a3b8' });
    else if (rank === 3) badges.push({ icon: '🥉', name: 'Bronze', color: '#cd7f32' });
    else if (rank && rank <= 10) badges.push({ icon: '🏆', name: 'Top 10', color: '#a855f7' });
    else if (rank && rank <= 100) badges.push({ icon: '⭐', name: 'Top 100', color: '#3b82f6' });

    // Activity badges
    if (player.claimCount >= 100) badges.push({ icon: '🔥', name: 'Enthusiast', color: '#ef4444' });
    else if (player.claimCount >= 50) badges.push({ icon: '💪', name: 'Active', color: '#22c55e' });
    else if (player.claimCount >= 10) badges.push({ icon: '🎮', name: 'Gamer', color: '#6366f1' });
    else if (player.claimCount >= 1) badges.push({ icon: '🐣', name: 'Newcomer', color: '#fbbf24' });

    // Score badges
    if (total >= 100000) badges.push({ icon: '💎', name: 'Whale', color: '#06b6d4' });
    if (highest >= 1000) badges.push({ icon: '🎯', name: 'Sharpshooter', color: '#ec4899' });

    return badges.slice(0, 4); // Max 4 badges
};

/**
 * Get level border style based on level
 */
export const getLevelBorderStyle = (level: number): React.CSSProperties => {
    switch (level) {
        case 6: return { border: '3px solid', borderImage: 'linear-gradient(45deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #10b981, #f59e0b) 1', animation: 'borderGlow 2s infinite' };
        case 5: return { border: '3px solid #fbbf24', boxShadow: '0 0 20px rgba(251,191,36,0.5)' };
        case 4: return { border: '3px solid #a855f7', boxShadow: '0 0 15px rgba(168,85,247,0.4)' };
        case 3: return { border: '2px solid #8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.3)' };
        default: return { border: '2px solid #22d3ee' };
    }
};

/**
 * Avatar categories for selection
 */
export const avatarCategories = [
    { name: '🐱 Pets', avatars: [0, 1, 2, 3, 4, 5, 6] as const },
    { name: '🦁 Wild', avatars: [7, 8, 9, 10, 11, 12, 13] as const },
    { name: '🐔 Farm', avatars: [14, 15, 16, 17, 18, 19, 20] as const },
    { name: '🐸 Fantasy', avatars: [21, 22, 23, 24, 25, 26, 27] as const },
    { name: '✨ Premium', avatars: [28, 29, 30, 31, 32, 33, 34] as const, premium: true },
];

/**
 * Premium avatar check (unlock at level 4+)
 */
export const isPremiumAvatar = (avatarIdx: number): boolean => avatarIdx >= 28;
export const canUsePremiumAvatar = (level: number): boolean => level >= 4;

// Need React for CSSProperties
import React from 'react';
