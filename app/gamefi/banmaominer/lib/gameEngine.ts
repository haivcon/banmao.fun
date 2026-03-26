// lib/gameEngine.ts - Game physics and logic for Banmao Gold Miner

import {
    GameState,
    GameItem,
    ItemType,
    ITEM_CONFIGS,
    LEVELS,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    HOOK_PIVOT_X,
    HOOK_PIVOT_Y,
    HOOK_LENGTH,
    HOOK_SWING_SPEED,
    HOOK_MAX_ANGLE,
    HOOK_EXTEND_SPEED,
    HOOK_RETRACT_SPEED,
    INITIAL_STATE,
} from './gameConfig';

// Generate unique ID
let itemIdCounter = 0;
export function generateItemId(): string {
    return `item-${++itemIdCounter}`;
}

// Random number in range
function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

// Weighted random item type selection
export function getRandomItemType(): ItemType {
    const totalWeight = Object.values(ITEM_CONFIGS).reduce((sum, cfg) => sum + cfg.weight, 0);
    let random = Math.random() * totalWeight;

    for (const [type, config] of Object.entries(ITEM_CONFIGS)) {
        random -= config.weight;
        if (random <= 0) {
            return type as ItemType;
        }
    }
    return 'token';
}

// Create a game item
export function createItem(type: ItemType, x: number, y: number): GameItem {
    const config = ITEM_CONFIGS[type];
    return {
        id: generateItemId(),
        type,
        x,
        y,
        width: config.width,
        height: config.height,
        value: Math.round(randomInRange(config.minValue, config.maxValue)),
        pullSpeed: config.pullSpeed,
        emoji: config.emoji,
    };
}

// Generate items for a level
export function generateLevelItems(level: number): GameItem[] {
    const levelConfig = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    const items: GameItem[] = [];

    // Mining area (below the surface)
    const minY = 150;
    const maxY = CANVAS_HEIGHT - 50;
    const minX = 50;
    const maxX = CANVAS_WIDTH - 50;

    for (let i = 0; i < levelConfig.itemCount; i++) {
        const type = getRandomItemType();
        const config = ITEM_CONFIGS[type];

        // Try to place item without overlapping
        let attempts = 0;
        let x: number, y: number;
        let overlapping: boolean;

        do {
            x = randomInRange(minX, maxX - config.width);
            y = randomInRange(minY, maxY - config.height);
            overlapping = items.some(item =>
                Math.abs(item.x - x) < (item.width + config.width) / 2 + 10 &&
                Math.abs(item.y - y) < (item.height + config.height) / 2 + 10
            );
            attempts++;
        } while (overlapping && attempts < 20);

        items.push(createItem(type, x, y));
    }

    return items;
}

// Get hook tip position
export function getHookTip(state: GameState): { x: number; y: number } {
    const x = HOOK_PIVOT_X + Math.sin(state.hookAngle) * state.hookLength;
    const y = HOOK_PIVOT_Y + Math.cos(state.hookAngle) * state.hookLength;
    return { x, y };
}

// Check collision between hook and item
export function checkCollision(hookX: number, hookY: number, item: GameItem): boolean {
    const dx = hookX - (item.x + item.width / 2);
    const dy = hookY - (item.y + item.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (item.width / 2 + 15); // 15 = hook collision radius
}

// Direction for hook swing
let swingDirection = 1;

// Update game state (called every frame)
export function updateGameState(state: GameState): GameState {
    const newState = { ...state };

    if (state.phase !== 'playing') return newState;

    // Update hook based on state
    switch (state.hookState) {
        case 'swinging':
            // Swing hook back and forth
            newState.hookAngle += HOOK_SWING_SPEED * swingDirection;
            if (newState.hookAngle >= HOOK_MAX_ANGLE) {
                swingDirection = -1;
            } else if (newState.hookAngle <= -HOOK_MAX_ANGLE) {
                swingDirection = 1;
            }
            break;

        case 'extending':
            // Extend hook downward
            newState.hookLength += HOOK_EXTEND_SPEED;

            const tip = getHookTip(newState);

            // Check for item collision
            for (const item of state.items) {
                if (checkCollision(tip.x, tip.y, item)) {
                    newState.hookState = 'retracting';
                    newState.caughtItem = item;
                    break;
                }
            }

            // Check if hook reached bottom or sides
            if (tip.y >= CANVAS_HEIGHT - 20 || tip.x <= 10 || tip.x >= CANVAS_WIDTH - 10) {
                newState.hookState = 'retracting';
            }
            break;

        case 'retracting':
            const retractSpeed = state.caughtItem
                ? state.caughtItem.pullSpeed
                : HOOK_RETRACT_SPEED;

            newState.hookLength -= retractSpeed;

            // Check if fully retracted
            if (newState.hookLength <= HOOK_LENGTH) {
                newState.hookLength = HOOK_LENGTH;
                newState.hookState = 'swinging';

                // Score the caught item
                if (state.caughtItem) {
                    newState.score += state.caughtItem.value;
                    newState.totalScore += state.caughtItem.value;
                    // Remove item from array
                    newState.items = state.items.filter(i => i.id !== state.caughtItem!.id);
                    newState.caughtItem = null;
                }
            }
            break;
    }

    return newState;
}

// Start a new level
export function startLevel(level: number): GameState {
    const levelConfig = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    itemIdCounter = 0;
    swingDirection = 1;

    return {
        ...INITIAL_STATE,
        phase: 'playing',
        level,
        timeLeft: levelConfig.timeLimit,
        items: generateLevelItems(level),
        score: 0,
    };
}

// Check level completion
export function checkLevelComplete(state: GameState): 'continue' | 'complete' | 'failed' {
    const levelConfig = LEVELS[Math.min(state.level - 1, LEVELS.length - 1)];

    if (state.score >= levelConfig.targetScore) {
        return 'complete';
    }

    if (state.timeLeft <= 0) {
        return 'failed';
    }

    return 'continue';
}

// Get level target score
export function getLevelTarget(level: number): number {
    const levelConfig = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    return levelConfig.targetScore;
}
