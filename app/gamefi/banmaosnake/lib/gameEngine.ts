// ===== SNAKE GAME ENGINE =====
// Pure game logic functions - no React dependencies

import { COLS, ROWS, Pos, Direction, DIRECTION_VECTORS } from './gameConfig';

/**
 * Generate a random position that doesn't overlap with snake or obstacles
 */
export function generateSpawnPosition(
    snake: Pos[],
    obstacles: Pos[],
    existingItems: Pos[] = [],
    maxAttempts = 100
): Pos {
    let x = 0, y = 0, ok = false, attempts = 0;

    while (!ok && attempts++ < maxAttempts) {
        x = Math.floor(Math.random() * COLS);
        y = Math.floor(Math.random() * ROWS);

        // Check no collision with snake
        const hitSnake = snake.some(s => s.x === x && s.y === y);
        // Check no collision with obstacles
        const hitObs = obstacles.some(o => o.x === x && o.y === y);
        // Check no collision with existing items
        const hitItem = existingItems.some(i => i.x === x && i.y === y);

        ok = !hitSnake && !hitObs && !hitItem;
    }

    return { x, y };
}

/**
 * Check if position is valid (within bounds)
 */
export function isInBounds(pos: Pos): boolean {
    return pos.x >= 0 && pos.x < COLS && pos.y >= 0 && pos.y < ROWS;
}

/**
 * Check if snake hits wall
 */
export function checkWallCollision(head: Pos): boolean {
    return !isInBounds(head);
}

/**
 * Check if snake hits itself
 */
export function checkSelfCollision(snake: Pos[]): boolean {
    if (snake.length < 2) return false;
    const [head, ...body] = snake;
    return body.some(segment => segment.x === head.x && segment.y === head.y);
}

/**
 * Check if snake hits an obstacle
 */
export function checkObstacleCollision(head: Pos, obstacles: Pos[]): boolean {
    return obstacles.some(o => o.x === head.x && o.y === head.y);
}

/**
 * Check if snake head is at item position
 */
export function checkItemCollision(head: Pos, item: Pos): boolean {
    return head.x === item.x && head.y === item.y;
}

/**
 * Calculate next head position based on direction
 */
export function getNextPosition(head: Pos, direction: Direction): Pos {
    const delta = DIRECTION_VECTORS[direction];
    return {
        x: head.x + delta.x,
        y: head.y + delta.y,
    };
}

/**
 * Move snake in direction (returns new snake array)
 */
export function moveSnake(snake: Pos[], direction: Direction, grow = false): Pos[] {
    const head = snake[0];
    const newHead = getNextPosition(head, direction);

    if (grow) {
        // Don't remove tail - snake grows
        return [newHead, ...snake];
    } else {
        // Remove tail - snake moves
        return [newHead, ...snake.slice(0, -1)];
    }
}

/**
 * Wrap position around grid (teleport through walls)
 */
export function wrapPosition(pos: Pos): Pos {
    return {
        x: ((pos.x % COLS) + COLS) % COLS,
        y: ((pos.y % ROWS) + ROWS) % ROWS,
    };
}

/**
 * Generate random item type
 * 12% chance for power-up ('X'), 88% for coin ('T')
 */
export function randomItemType(): 'X' | 'T' {
    return Math.random() < 0.12 ? 'X' : 'T';
}

/**
 * Check if direction is opposite (can't reverse)
 */
export function isOppositeDirection(current: Direction, next: Direction): boolean {
    const opposites: Record<Direction, Direction> = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT',
    };
    return opposites[current] === next;
}

/**
 * Key/swipe to direction mapping
 */
export function keyToDirection(key: string): Direction | null {
    const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        W: 'UP',
        s: 'DOWN',
        S: 'DOWN',
        a: 'LEFT',
        A: 'LEFT',
        d: 'RIGHT',
        D: 'RIGHT',
    };
    return keyMap[key] || null;
}

/**
 * Calculate combo bonus points
 */
export function calculateComboBonus(comboCount: number): number {
    // Exponential bonus: 5, 10, 20, 40, 80...
    return Math.floor(5 * Math.pow(2, Math.min(comboCount - 1, 5)));
}

/**
 * Calculate player level from total claimed amount
 */
export interface LevelInfo {
    level: number;
    name: string;
    minPoints: number;
    maxPoints: number;
    progress: number;
}

export function getPlayerLevel(totalClaimed: bigint): LevelInfo {
    const levels = [
        { level: 1, name: 'Newbie', min: 0, max: 1000 },
        { level: 2, name: 'Beginner', min: 1000, max: 5000 },
        { level: 3, name: 'Player', min: 5000, max: 15000 },
        { level: 4, name: 'Fighter', min: 15000, max: 50000 },
        { level: 5, name: 'Warrior', min: 50000, max: 150000 },
        { level: 6, name: 'Champion', min: 150000, max: 500000 },
        { level: 7, name: 'Master', min: 500000, max: 1500000 },
        { level: 8, name: 'Grandmaster', min: 1500000, max: 5000000 },
        { level: 9, name: 'Legend', min: 5000000, max: 15000000 },
        { level: 10, name: 'Immortal', min: 15000000, max: Infinity },
    ];

    // Convert from wei to points (assuming 1e18 decimals)
    const points = Number(totalClaimed / BigInt(1e18));

    for (const lvl of levels) {
        if (points < lvl.max) {
            const progress = (points - lvl.min) / (lvl.max - lvl.min);
            return {
                level: lvl.level,
                name: lvl.name,
                minPoints: lvl.min,
                maxPoints: lvl.max,
                progress: Math.min(1, Math.max(0, progress)),
            };
        }
    }

    // Max level
    return {
        level: 10,
        name: 'Immortal',
        minPoints: 15000000,
        maxPoints: Infinity,
        progress: 1,
    };
}
