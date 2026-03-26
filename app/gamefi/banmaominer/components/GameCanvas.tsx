'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    GameState,
    GameItem,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    HOOK_PIVOT_X,
    HOOK_PIVOT_Y,
    INITIAL_STATE,
} from '../lib/gameConfig';
import {
    updateGameState,
    startLevel,
    getHookTip,
    checkLevelComplete,
    getLevelTarget,
} from '../lib/gameEngine';

interface GameCanvasProps {
    onScoreChange?: (score: number, totalScore: number) => void;
    onLevelComplete?: (level: number) => void;
    onGameOver?: (totalScore: number) => void;
    onStateChange?: (phase: string) => void;
}

export default function GameCanvas({
    onScoreChange,
    onLevelComplete,
    onGameOver,
    onStateChange,
}: GameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
    const gameStateRef = useRef<GameState>(gameState);
    const animationFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Keep ref in sync
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Notify parent of state changes
    useEffect(() => {
        onStateChange?.(gameState.phase);
        onScoreChange?.(gameState.score, gameState.totalScore);
    }, [gameState.phase, gameState.score, gameState.totalScore, onStateChange, onScoreChange]);

    // Draw game
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const state = gameStateRef.current;

        // Clear canvas
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw background gradient (underground)
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a3a');
        gradient.addColorStop(0.15, '#2a1a0a');
        gradient.addColorStop(1, '#0a0505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw surface line
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(CANVAS_WIDTH, 120);
        ctx.stroke();

        // Draw Banmao character at pivot
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐱', HOOK_PIVOT_X, 50);

        // Draw hook chain and claw
        const hookTip = getHookTip(state);

        // Chain
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(HOOK_PIVOT_X, HOOK_PIVOT_Y);
        ctx.lineTo(hookTip.x, hookTip.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Hook claw
        ctx.font = '24px serif';
        ctx.fillText('⚓', hookTip.x, hookTip.y + 8);

        // Draw caught item following hook
        if (state.caughtItem) {
            ctx.font = `${state.caughtItem.width}px serif`;
            ctx.fillText(state.caughtItem.emoji, hookTip.x, hookTip.y + 35);
        }

        // Draw items
        for (const item of state.items) {
            // Skip if caught
            if (state.caughtItem?.id === item.id) continue;

            // Item glow
            ctx.shadowColor = item.type === 'rugpull' ? '#ff0000' : '#ffd700';
            ctx.shadowBlur = item.type === 'jackpot' ? 20 : 10;

            // Draw emoji
            ctx.font = `${item.width}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(item.emoji, item.x + item.width / 2, item.y + item.height / 2 + item.width / 3);

            ctx.shadowBlur = 0;
        }

        // Draw HUD
        if (state.phase === 'playing') {
            // Level
            ctx.font = 'bold 20px "Space Mono", monospace';
            ctx.fillStyle = '#00f5ff';
            ctx.textAlign = 'left';
            ctx.fillText(`Level ${state.level}`, 20, 30);

            // Score
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`${state.score} / ${getLevelTarget(state.level)}`, CANVAS_WIDTH / 2, 30);

            // Timer
            ctx.textAlign = 'right';
            ctx.fillStyle = state.timeLeft <= 10 ? '#ff4444' : '#ffffff';
            ctx.fillText(`${state.timeLeft}s`, CANVAS_WIDTH - 20, 30);
        }

        // Menu overlay
        if (state.phase === 'menu') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.font = 'bold 48px "Space Mono", monospace';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20;
            ctx.fillText('🐱 Banmao Miner', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
            ctx.shadowBlur = 0;

            ctx.font = '24px "Space Mono", monospace';
            ctx.fillStyle = '#00f5ff';
            ctx.fillText('Click to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

            ctx.font = '16px "Space Mono", monospace';
            ctx.fillStyle = '#888';
            ctx.fillText('Catch tokens 🪙 and gems 💎 to earn points!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }

        // Level complete overlay
        if (state.phase === 'levelComplete') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.font = 'bold 40px "Space Mono", monospace';
            ctx.fillStyle = '#4ade80';
            ctx.textAlign = 'center';
            ctx.fillText('✅ Level Complete!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

            ctx.font = '24px "Space Mono", monospace';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

            ctx.font = '18px "Space Mono", monospace';
            ctx.fillStyle = '#00f5ff';
            ctx.fillText('Click for Next Level', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }

        // Game over overlay
        if (state.phase === 'gameOver') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.font = 'bold 40px "Space Mono", monospace';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText('💀 Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.font = '28px "Space Mono", monospace';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`Total Score: ${state.totalScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

            ctx.font = '18px "Space Mono", monospace';
            ctx.fillStyle = '#00f5ff';
            ctx.fillText('Click to Try Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        }
    }, []);

    // Game loop
    const gameLoop = useCallback((timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const delta = timestamp - lastTimeRef.current;

        // Update at ~60fps
        if (delta >= 16) {
            lastTimeRef.current = timestamp;

            if (gameStateRef.current.phase === 'playing') {
                const newState = updateGameState(gameStateRef.current);
                setGameState(newState);
            }
        }

        draw();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }, [draw]);

    // Start game loop
    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gameLoop]);

    // Timer countdown
    useEffect(() => {
        if (gameState.phase === 'playing') {
            timerRef.current = setInterval(() => {
                setGameState(prev => {
                    const newTimeLeft = prev.timeLeft - 1;

                    if (newTimeLeft <= 0) {
                        // Time's up - check if target reached
                        const result = checkLevelComplete({ ...prev, timeLeft: 0 });
                        if (result === 'complete') {
                            onLevelComplete?.(prev.level);
                            return { ...prev, phase: 'levelComplete', timeLeft: 0 };
                        } else {
                            onGameOver?.(prev.totalScore);
                            return { ...prev, phase: 'gameOver', timeLeft: 0 };
                        }
                    }

                    return { ...prev, timeLeft: newTimeLeft };
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameState.phase, onLevelComplete, onGameOver]);

    // Check for level completion when score changes
    useEffect(() => {
        if (gameState.phase === 'playing') {
            const result = checkLevelComplete(gameState);
            if (result === 'complete') {
                onLevelComplete?.(gameState.level);
                setGameState(prev => ({ ...prev, phase: 'levelComplete' }));
            }
        }
    }, [gameState.score, gameState.phase, gameState.level, onLevelComplete]);

    // Handle click/tap
    const handleClick = useCallback(() => {
        const state = gameStateRef.current;

        switch (state.phase) {
            case 'menu':
                // Start game
                setGameState(startLevel(1));
                break;

            case 'playing':
                // Drop hook if swinging
                if (state.hookState === 'swinging') {
                    setGameState(prev => ({ ...prev, hookState: 'extending' }));
                }
                break;

            case 'levelComplete':
                // Next level
                setGameState(prev => {
                    const nextLevel = prev.level + 1;
                    const newLevelState = startLevel(nextLevel);
                    return {
                        ...newLevelState,
                        totalScore: prev.totalScore,
                    };
                });
                break;

            case 'gameOver':
                // Restart
                setGameState(startLevel(1));
                break;
        }
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleClick}
            style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 16,
                border: '2px solid rgba(0, 245, 255, 0.5)',
                boxShadow: '0 0 30px rgba(0, 245, 255, 0.3)',
                cursor: 'pointer',
            }}
        />
    );
}
