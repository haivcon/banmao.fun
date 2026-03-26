// lib/gameConfig.ts - Game constants and types for Banmao Gold Miner

// Canvas dimensions
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Hook configuration
export const HOOK_PIVOT_X = CANVAS_WIDTH / 2;
export const HOOK_PIVOT_Y = 80;
export const HOOK_LENGTH = 60;
export const HOOK_SWING_SPEED = 0.02; // radians per frame
export const HOOK_MAX_ANGLE = Math.PI * 0.45; // 45 degrees each side
export const HOOK_EXTEND_SPEED = 8;
export const HOOK_RETRACT_SPEED = 4;

// Game timing
export const LEVEL_TIME = 60; // seconds per level
export const FPS = 60;

// Minimum points to claim
export const MIN_CLAIM_POINTS = 1000;

// Item types
export type ItemType = 'token' | 'gem' | 'jackpot' | 'rock' | 'rugpull' | 'airdrop';

export interface GameItem {
    id: string;
    type: ItemType;
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
    pullSpeed: number; // How fast hook retracts with this item
    emoji: string;
}

// Item configurations
export const ITEM_CONFIGS: Record<ItemType, {
    emoji: string;
    minValue: number;
    maxValue: number;
    width: number;
    height: number;
    pullSpeed: number;
    weight: number; // Spawn probability weight
}> = {
    token: {
        emoji: '🪙',
        minValue: 50,
        maxValue: 100,
        width: 30,
        height: 30,
        pullSpeed: 6,
        weight: 40,
    },
    gem: {
        emoji: '💎',
        minValue: 200,
        maxValue: 500,
        width: 40,
        height: 40,
        pullSpeed: 4,
        weight: 25,
    },
    jackpot: {
        emoji: '💰',
        minValue: 800,
        maxValue: 1500,
        width: 50,
        height: 50,
        pullSpeed: 2,
        weight: 5,
    },
    rock: {
        emoji: '🪨',
        minValue: 10,
        maxValue: 20,
        width: 45,
        height: 45,
        pullSpeed: 1.5,
        weight: 15,
    },
    rugpull: {
        emoji: '💣',
        minValue: -200,
        maxValue: -50,
        width: 35,
        height: 35,
        pullSpeed: 8,
        weight: 10,
    },
    airdrop: {
        emoji: '🎁',
        minValue: 100,
        maxValue: 1000,
        width: 35,
        height: 35,
        pullSpeed: 5,
        weight: 5,
    },
};

// Level configuration
export interface LevelConfig {
    level: number;
    targetScore: number;
    itemCount: number;
    timeLimit: number;
}

export const LEVELS: LevelConfig[] = [
    { level: 1, targetScore: 500, itemCount: 8, timeLimit: 60 },
    { level: 2, targetScore: 1000, itemCount: 10, timeLimit: 55 },
    { level: 3, targetScore: 1500, itemCount: 12, timeLimit: 50 },
    { level: 4, targetScore: 2000, itemCount: 14, timeLimit: 45 },
    { level: 5, targetScore: 3000, itemCount: 16, timeLimit: 45 },
    { level: 6, targetScore: 4000, itemCount: 18, timeLimit: 40 },
    { level: 7, targetScore: 5000, itemCount: 20, timeLimit: 40 },
    { level: 8, targetScore: 6500, itemCount: 22, timeLimit: 35 },
    { level: 9, targetScore: 8000, itemCount: 24, timeLimit: 35 },
    { level: 10, targetScore: 10000, itemCount: 26, timeLimit: 30 },
];

// Game state types
export type GamePhase = 'menu' | 'playing' | 'levelComplete' | 'gameOver' | 'claim';

export interface GameState {
    phase: GamePhase;
    level: number;
    score: number;
    totalScore: number; // Accumulated across all levels
    timeLeft: number;
    items: GameItem[];
    hookAngle: number;
    hookLength: number;
    hookState: 'swinging' | 'extending' | 'retracting';
    caughtItem: GameItem | null;
}

// Initial game state
export const INITIAL_STATE: GameState = {
    phase: 'menu',
    level: 1,
    score: 0,
    totalScore: 0,
    timeLeft: LEVEL_TIME,
    items: [],
    hookAngle: 0,
    hookLength: HOOK_LENGTH,
    hookState: 'swinging',
    caughtItem: null,
};
