'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { slotsSounds } from '../lib/sounds';

interface SlotLeverProps {
    onPull: () => void;
    isSpinning: boolean;
    disabled: boolean;
    primaryColor?: string;
    gameState?: string; // GameStatus from useSlotsGame
}

type LeverState = 'idle' | 'pulling' | 'pulled' | 'returning';

export function SlotLever({
    onPull,
    isSpinning,
    disabled,
    primaryColor = '#a855f7',
    gameState = 'idle'
}: SlotLeverProps) {
    const [leverState, setLeverState] = useState<LeverState>('idle');
    const [pullProgress, setPullProgress] = useState(0); // 0 = top, 1 = fully pulled
    const leverRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const isDraggingRef = useRef(false);

    // Determine if lever should be locked down
    const isLockedDown = isSpinning || gameState === 'committing' || gameState === 'waiting' || gameState === 'ready_to_reveal' || gameState === 'revealing';

    // Spring back animation when spin completes
    useEffect(() => {
        if (!isLockedDown && leverState === 'pulled') {
            // Spring back with bounce
            setLeverState('returning');
            slotsSounds.leverRelease?.();

            // Animate spring back
            let progress = 1;
            const springBack = () => {
                progress -= 0.08;
                if (progress <= -0.1) {
                    // Overshoot bounce
                    progress = -0.1;
                    setTimeout(() => {
                        setPullProgress(0);
                        setLeverState('idle');
                    }, 100);
                    setPullProgress(Math.max(0, progress));
                    return;
                }
                setPullProgress(Math.max(0, progress));
                if (progress > 0) {
                    requestAnimationFrame(springBack);
                } else {
                    setLeverState('idle');
                }
            };
            requestAnimationFrame(springBack);
        }
    }, [isLockedDown, leverState]);

    // Handle click to pull (simple interaction)
    const handleClick = useCallback(() => {
        if (disabled || isLockedDown || leverState !== 'idle') return;

        // Animate pull down
        setLeverState('pulling');
        slotsSounds.leverPull?.();

        let progress = 0;
        const pullDown = () => {
            progress += 0.15;
            if (progress >= 1) {
                setPullProgress(1);
                setLeverState('pulled');
                onPull();
                return;
            }
            setPullProgress(progress);
            requestAnimationFrame(pullDown);
        };
        requestAnimationFrame(pullDown);
    }, [disabled, isLockedDown, leverState, onPull]);

    // Handle drag interaction
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled || isLockedDown || leverState !== 'idle') return;

        isDraggingRef.current = true;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startYRef.current = clientY;
        setLeverState('pulling');

        e.preventDefault();
    };

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - startYRef.current;
        const maxPull = 100; // pixels to full pull
        const progress = Math.min(1, Math.max(0, deltaY / maxPull));

        setPullProgress(progress);

        // Play sound at certain thresholds
        if (progress > 0.3 && progress < 0.35) {
            slotsSounds.click?.();
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        if (pullProgress >= 0.8) {
            // Full pull - trigger spin
            setPullProgress(1);
            setLeverState('pulled');
            slotsSounds.leverPull?.();
            onPull();
        } else {
            // Not enough pull - spring back
            setLeverState('returning');
            let progress = pullProgress;
            const springBack = () => {
                progress -= 0.1;
                if (progress <= 0) {
                    setPullProgress(0);
                    setLeverState('idle');
                    return;
                }
                setPullProgress(progress);
                requestAnimationFrame(springBack);
            };
            requestAnimationFrame(springBack);
        }
    }, [pullProgress, onPull]);

    // Global mouse/touch events
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Calculate rotation based on pull progress (0 = 0deg, 1 = 45deg)
    const rotation = pullProgress * 45;
    const handleOffset = pullProgress * 60; // Handle moves down

    return (
        <div
            ref={leverRef}
            style={{
                position: 'relative',
                width: 80,
                height: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                userSelect: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            {/* Wall Mount Bracket - connects to machine */}
            <div style={{
                position: 'absolute',
                left: -25,
                top: '55%',
                transform: 'translateY(-50%)',
                width: 35,
                height: 60,
                background: 'linear-gradient(90deg, #3a3a4a 0%, #5a5a6a 50%, #4a4a5a 100%)',
                borderRadius: '8px 0 0 8px',
                boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.1), -3px 0 8px rgba(0,0,0,0.5)',
                border: '1px solid #666',
                borderRight: 'none',
                zIndex: 0,
            }}>
                {/* Bracket bolt holes */}
                <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #777, #222)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #777, #222)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
                }} />
            </div>

            {/* Lever Housing/Base - where shaft pivots */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                width: 55,
                height: 45,
                background: 'linear-gradient(180deg, #5a5a6a 0%, #3a3a4a 50%, #2a2a3a 100%)',
                borderRadius: 12,
                boxShadow: `
                    inset 0 2px 4px rgba(255,255,255,0.15), 
                    0 6px 12px rgba(0,0,0,0.6),
                    0 0 20px rgba(0,0,0,0.3)
                `,
                border: '2px solid #555',
                zIndex: 1,
            }}>
                {/* Decorative ring around pivot point */}
                <div style={{
                    position: 'absolute',
                    top: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 40%, #888, #444)',
                    border: '2px solid #666',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                }}>
                    {/* Center bolt */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, #aaa, #555)',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                    }} />
                </div>
            </div>

            {/* Lever Arm Container - Rotates */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 55,
                    transformOrigin: 'center bottom',
                    transform: `rotate(${rotation}deg)`,
                    transition: leverState === 'returning' ? 'transform 0.15s ease-out' : 'none',
                    zIndex: 2,
                }}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
            >
                {/* Lever Shaft */}
                <div style={{
                    width: 16,
                    height: 120,
                    background: 'linear-gradient(90deg, #555 0%, #888 25%, #bbb 50%, #888 75%, #555 100%)',
                    borderRadius: 6,
                    boxShadow: '3px 0 6px rgba(0,0,0,0.4), -2px 0 3px rgba(255,255,255,0.1)',
                    position: 'relative',
                }}>
                    {/* Shaft ridges for grip */}
                    {[15, 35, 55, 75, 95].map((top, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            top,
                            left: 3,
                            right: 3,
                            height: 3,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.3), rgba(255,255,255,0.15))',
                            borderRadius: 2,
                        }} />
                    ))}
                </div>

                {/* Lever Handle Grip - chrome collar */}
                <div style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 25,
                    background: 'linear-gradient(180deg, #777 0%, #444 50%, #333 100%)',
                    borderRadius: '8px 8px 6px 6px',
                    boxShadow: '0 -3px 6px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.1)',
                    border: '1px solid #555',
                }} />

                {/* RED BALL - The iconic handle - BIGGER! */}
                <div style={{
                    position: 'absolute',
                    top: -70,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, #ff8888 0%, #ff4444 30%, #dd0000 60%, #aa0000 85%, #880000 100%)`,
                    boxShadow: `
                        inset -6px -6px 12px rgba(0,0,0,0.5),
                        inset 6px 6px 12px rgba(255,180,180,0.4),
                        0 6px 16px rgba(0,0,0,0.6),
                        0 0 ${isLockedDown ? '30px' : '15px'} ${isLockedDown ? primaryColor : 'rgba(255,50,50,0.5)'}
                    `,
                    cursor: disabled ? 'not-allowed' : 'grab',
                    transition: 'box-shadow 0.3s, transform 0.1s',
                }}>
                    {/* Main highlight reflection */}
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 12,
                        width: 18,
                        height: 12,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.6)',
                        filter: 'blur(3px)',
                    }} />
                    {/* Secondary highlight */}
                    <div style={{
                        position: 'absolute',
                        top: 5,
                        left: 8,
                        width: 8,
                        height: 5,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.8)',
                        filter: 'blur(1px)',
                    }} />
                </div>
            </div>

            {/* "PULL" Label */}
            {!isLockedDown && leverState === 'idle' && (
                <div style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 9,
                    fontWeight: 700,
                    color: primaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    textShadow: `0 0 10px ${primaryColor}`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    whiteSpace: 'nowrap',
                }}>
                    ↓ PULL
                </div>
            )}

            {/* Spinning indicator */}
            {isLockedDown && (
                <div style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 16,
                    animation: 'spin 1s linear infinite',
                }}>
                    🎰
                </div>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes spin {
                    from { transform: translateX(-50%) rotate(0deg); }
                    to { transform: translateX(-50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default SlotLever;
