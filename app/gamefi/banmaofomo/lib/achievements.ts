/**
 * Achievement System - Badge definitions and unlock logic
 * Stored in localStorage for persistence
 */

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    unlockedAt?: number;
}

export const ACHIEVEMENTS: Record<string, Omit<Achievement, "unlockedAt">> = {
    firstBlood: {
        id: "firstBlood",
        name: "First Blood",
        description: "Make your first attack",
        icon: "🔥",
        rarity: "common",
    },
    kingSlayer: {
        id: "kingSlayer",
        name: "King Slayer",
        description: "Dethrone the leader",
        icon: "👑",
        rarity: "rare",
    },
    lucky777: {
        id: "lucky777",
        name: "Lucky 777",
        description: "Roll a lucky number 777+",
        icon: "🎰",
        rarity: "epic",
    },
    lucky900: {
        id: "lucky900",
        name: "CRITICAL HIT",
        description: "Roll a lucky number 900+",
        icon: "💥",
        rarity: "legendary",
    },
    catWhisperer: {
        id: "catWhisperer",
        name: "Cat Whisperer",
        description: "Make 100 total attacks",
        icon: "🐱",
        rarity: "rare",
    },
    jackpotWinner: {
        id: "jackpotWinner",
        name: "Jackpot Winner",
        description: "Win a round",
        icon: "💰",
        rarity: "legendary",
    },
    champion: {
        id: "champion",
        name: "Champion",
        description: "Win 5 rounds",
        icon: "🏆",
        rarity: "legendary",
    },
    comboMaster: {
        id: "comboMaster",
        name: "Combo Master",
        description: "Get a 5x attack combo",
        icon: "⚡",
        rarity: "epic",
    },
    earlyBird: {
        id: "earlyBird",
        name: "Early Bird",
        description: "Attack within first 10 seconds of a round",
        icon: "🐦",
        rarity: "common",
    },
    nightOwl: {
        id: "nightOwl",
        name: "Night Owl",
        description: "Play between 2AM and 5AM",
        icon: "🦉",
        rarity: "rare",
    },
};

const STORAGE_KEY = "fomo_achievements";
const STATS_KEY = "fomo_player_stats";

export interface PlayerStats {
    totalAttacks: number;
    roundsWon: number;
    bestLucky: number;
    maxCombo: number;
    firstAttackTime?: number;
}

// Get unlocked achievements
export function getUnlockedAchievements(): Achievement[] {
    if (typeof window === "undefined") return [];

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load achievements:", e);
    }
    return [];
}

// Get player stats
export function getPlayerStats(): PlayerStats {
    if (typeof window === "undefined") {
        return { totalAttacks: 0, roundsWon: 0, bestLucky: 0, maxCombo: 0 };
    }

    try {
        const saved = localStorage.getItem(STATS_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load stats:", e);
    }
    return { totalAttacks: 0, roundsWon: 0, bestLucky: 0, maxCombo: 0 };
}

// Save player stats
export function savePlayerStats(stats: PlayerStats): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Check if achievement is unlocked
export function isUnlocked(achievementId: string): boolean {
    const unlocked = getUnlockedAchievements();
    return unlocked.some(a => a.id === achievementId);
}

// Unlock an achievement
export function unlockAchievement(achievementId: string): Achievement | null {
    if (isUnlocked(achievementId)) return null;

    const definition = ACHIEVEMENTS[achievementId];
    if (!definition) return null;

    const achievement: Achievement = {
        ...definition,
        unlockedAt: Date.now(),
    };

    const unlocked = getUnlockedAchievements();
    unlocked.push(achievement);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch (e) {
        console.error("Failed to save achievement:", e);
    }

    return achievement;
}

// Check and unlock achievements based on game events
export function checkAchievements(event: {
    type: "attack" | "win" | "becameLeader" | "combo";
    luckyNumber?: number;
    comboCount?: number;
    totalAttacks?: number;
    roundsWon?: number;
}): Achievement | null {
    const stats = getPlayerStats();

    switch (event.type) {
        case "attack":
            // First Blood
            if (stats.totalAttacks === 0) {
                stats.totalAttacks = 1;
                savePlayerStats(stats);
                return unlockAchievement("firstBlood");
            }

            stats.totalAttacks = (event.totalAttacks || stats.totalAttacks) + 1;

            // Cat Whisperer - 100 attacks
            if (stats.totalAttacks >= 100 && !isUnlocked("catWhisperer")) {
                savePlayerStats(stats);
                return unlockAchievement("catWhisperer");
            }

            // Lucky number achievements
            const lucky = event.luckyNumber || 0;
            if (lucky > stats.bestLucky) {
                stats.bestLucky = lucky;
            }

            if (lucky >= 900 && !isUnlocked("lucky900")) {
                savePlayerStats(stats);
                return unlockAchievement("lucky900");
            }

            if (lucky >= 777 && !isUnlocked("lucky777")) {
                savePlayerStats(stats);
                return unlockAchievement("lucky777");
            }

            // Night Owl - 2AM to 5AM
            const hour = new Date().getHours();
            if (hour >= 2 && hour < 5 && !isUnlocked("nightOwl")) {
                savePlayerStats(stats);
                return unlockAchievement("nightOwl");
            }

            savePlayerStats(stats);
            break;

        case "win":
            stats.roundsWon = (stats.roundsWon || 0) + 1;
            savePlayerStats(stats);

            // Jackpot Winner
            if (!isUnlocked("jackpotWinner")) {
                return unlockAchievement("jackpotWinner");
            }

            // Champion - 5 wins
            if (stats.roundsWon >= 5 && !isUnlocked("champion")) {
                return unlockAchievement("champion");
            }
            break;

        case "becameLeader":
            // King Slayer
            if (!isUnlocked("kingSlayer")) {
                return unlockAchievement("kingSlayer");
            }
            break;

        case "combo":
            const combo = event.comboCount || 0;
            if (combo > (stats.maxCombo || 0)) {
                stats.maxCombo = combo;
                savePlayerStats(stats);
            }

            // Combo Master - 5x combo
            if (combo >= 5 && !isUnlocked("comboMaster")) {
                return unlockAchievement("comboMaster");
            }
            break;
    }

    return null;
}

// Get rarity color
export function getRarityColor(rarity: Achievement["rarity"]): string {
    switch (rarity) {
        case "common": return "#9ca3af";
        case "rare": return "#3b82f6";
        case "epic": return "#8b5cf6";
        case "legendary": return "#ffd700";
        default: return "#9ca3af";
    }
}

// Reset achievements (for testing)
export function resetAchievements(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATS_KEY);
}
