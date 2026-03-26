// ===== SNAKE GAME CANVAS RENDERER =====
// Canvas drawing utility functions for the Snake game

import { GRID, COLS, ROWS, W, H, Pos, COLORS } from './gameConfig';

/**
 * Create dark gradient background
 */
export function drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, '#0a0e1a');
    gradient.addColorStop(1, '#12182a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
}

/**
 * Draw subtle grid dots
 */
export function drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            ctx.beginPath();
            ctx.arc(i * GRID + GRID / 2, j * GRID + GRID / 2, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Draw super mode border glow
 */
export function drawSuperModeBorder(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ff';
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.shadowBlur = 0;
}

/**
 * Draw obstacles (red rounded squares)
 */
export function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Pos[]): void {
    obstacles.forEach(o => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f43f5e';
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.roundRect(o.x * GRID + 2, o.y * GRID + 2, GRID - 4, GRID - 4, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

/**
 * Draw power-up item (lightning bolt emoji)
 */
export function drawPowerUp(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const centerX = x * GRID + GRID / 2;
    const centerY = y * GRID + GRID / 2;

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fbbf24';
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${GRID}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', centerX, centerY);
    ctx.shadowBlur = 0;
}

/**
 * Draw coin/token item (golden circle)
 */
export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const centerX = x * GRID + GRID / 2;
    const centerY = y * GRID + GRID / 2;

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fbbf24';

    const gradient = ctx.createRadialGradient(
        centerX - 2, centerY - 2, 1,
        centerX, centerY, GRID / 2.5
    );
    gradient.addColorStop(0, '#fef08a');
    gradient.addColorStop(1, '#f59e0b');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, GRID / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

/**
 * Draw snake head with eyes
 */
export function drawSnakeHead(
    ctx: CanvasRenderingContext2D,
    pos: Pos,
    direction: Pos,
    superMode: boolean
): void {
    const centerX = pos.x * GRID + GRID / 2;
    const centerY = pos.y * GRID + GRID / 2;

    // Gradient for head
    const gradient = ctx.createRadialGradient(
        centerX - 2, centerY - 2, 1,
        centerX, centerY, GRID / 2
    );

    if (superMode) {
        gradient.addColorStop(0, '#a5f3fc');
        gradient.addColorStop(1, '#22d3ee');
    } else {
        gradient.addColorStop(0, '#fef08a');
        gradient.addColorStop(1, '#eab308');
    }

    ctx.fillStyle = gradient;
    ctx.shadowBlur = 12;
    ctx.shadowColor = superMode ? '#0ff' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(centerX, centerY, GRID / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw eyes
    ctx.fillStyle = '#1e293b';
    const eyeX = centerX + direction.x * 3;
    const eyeY = centerY + direction.y * 3;
    ctx.beginPath();
    ctx.arc(eyeX - 3, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(eyeX + 3, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw snake body segment
 */
export function drawSnakeBody(
    ctx: CanvasRenderingContext2D,
    pos: Pos,
    index: number,
    totalLength: number,
    superMode: boolean
): void {
    const alpha = 1 - index / totalLength * 0.4;
    const centerX = pos.x * GRID + GRID / 2;
    const centerY = pos.y * GRID + GRID / 2;

    const gradient = ctx.createRadialGradient(
        centerX - 1, centerY - 1, 0,
        centerX, centerY, GRID / 2
    );

    if (superMode) {
        gradient.addColorStop(0, `rgba(165,243,252,${alpha})`);
        gradient.addColorStop(1, `rgba(34,211,238,${alpha})`);
    } else {
        gradient.addColorStop(0, `rgba(254,240,138,${alpha})`);
        gradient.addColorStop(1, `rgba(234,179,8,${alpha})`);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(pos.x * GRID + 1, pos.y * GRID + 1, GRID - 2, GRID - 2, 4);
    ctx.fill();
}

/**
 * Draw entire snake
 */
export function drawSnake(
    ctx: CanvasRenderingContext2D,
    snake: Pos[],
    direction: Pos,
    superMode: boolean
): void {
    snake.forEach((segment, index) => {
        if (index === 0) {
            drawSnakeHead(ctx, segment, direction, superMode);
        } else {
            drawSnakeBody(ctx, segment, index, snake.length, superMode);
        }
    });
}

/**
 * Draw game item (coin or power-up)
 */
export function drawItem(
    ctx: CanvasRenderingContext2D,
    item: { x: number; y: number; type: 'X' | 'T' } | null
): void {
    if (!item) return;

    if (item.type === 'X') {
        drawPowerUp(ctx, item.x, item.y);
    } else {
        drawCoin(ctx, item.x, item.y);
    }
}

/**
 * Clear canvas with background
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
}

/**
 * Full game render function
 */
export function renderGame(
    ctx: CanvasRenderingContext2D,
    snake: Pos[],
    direction: Pos,
    item: { x: number; y: number; type: 'X' | 'T' } | null,
    obstacles: Pos[],
    superMode: boolean
): void {
    drawBackground(ctx);
    drawGrid(ctx);

    if (superMode) {
        drawSuperModeBorder(ctx);
    }

    drawObstacles(ctx, obstacles);
    drawItem(ctx, item);
    drawSnake(ctx, snake, direction, superMode);
}
