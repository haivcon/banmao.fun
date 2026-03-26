// ===== SNAKE GAME CONFIGURATION =====
// All game-related constants and types

// Grid Configuration
export const GRID = 20;
export const COLS = 33;
export const ROWS = 33;
export const W = COLS * GRID; // Canvas width: 660
export const H = ROWS * GRID; // Canvas height: 660

// Game Speed & Timing
export const INIT_SPEED = 120; // Initial snake speed (ms per move)
export const SPEED_FAST = 60;  // Speed in super mode

// Gas System
export const GAS_MAX = 100;
export const GAS_DECAY = 0.5; // Gas reduction per move
export const GAS_REFILL = 30; // Gas refill per coin

// Scoring
export const MIN_CLAIM = 100; // Minimum score to claim rewards
export const COIN_SCORE = 10;
export const POWERUP_SCORE = 50;
export const COMBO_BONUS_BASE = 5; // Base combo bonus points

// Game Items
export const MAX_OBSTACLES = 12;
export const OBSTACLE_SPAWN_INTERVAL = 5000; // ms
export const SUPER_MODE_DURATION = 8000; // ms
export const COMBO_TIMEOUT = 1500; // ms before combo resets

// Power-up Types
export type PowerUpType = 'coin' | 'gas' | 'super' | 'shield';

// Food Item Configuration
export interface FoodItem {
    x: number;
    y: number;
    type: PowerUpType;
}

// Position type
export type Pos = { x: number; y: number };

// Game State type
export type GameState = 'MENU' | 'PLAY' | 'PAUSE' | 'OVER' | 'CLAIM';

// Direction type
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Direction vectors
export const DIRECTION_VECTORS: Record<Direction, Pos> = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

// Test mode flag
export const TEST_MODE = false; // ← Set false for production!

// Colors
export const COLORS = {
    snakeHead: '#22d3ee',
    snakeBody: '#06b6d4',
    snakeGlow: 'rgba(34, 211, 238, 0.6)',
    superModeGlow: 'rgba(0, 255, 255, 0.8)',
    coin: '#fbbf24',
    powerup: '#a855f7',
    obstacle: '#ef4444',
    background: '#0a0a1a',
    gridLine: 'rgba(34, 211, 238, 0.05)',
};
