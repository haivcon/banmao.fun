// ===== PROFESSIONAL MOBILE D-PAD COMPONENT =====
// Compact, responsive touch controls with effects for mobile & tablet

import React, { useState, useCallback } from 'react';
import { sounds } from '../lib/sounds';

export type Direction = 'U' | 'D' | 'L' | 'R';

interface DPadProps {
    onMove: (direction: Direction) => void;
    windowWidth?: number;
    soundEnabled?: boolean;
}

/**
 * Professional D-Pad component with responsive sizing
 * Features: circular outer ring, square buttons, sound, vibration, visual feedback
 */
export function DPad({ onMove, windowWidth = 400, soundEnabled = true }: DPadProps) {
    const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
    const [ripple, setRipple] = useState<{ direction: Direction; key: number } | null>(null);

    // Responsive sizing - outer ring size
    // min 240px, max 300px for proper button spacing
    const containerSize = Math.max(240, Math.min(300, windowWidth * 0.55));
    const buttonSize = containerSize * 0.30;
    const iconSize = buttonSize * 0.45;

    // Play button sound
    const playButtonSound = useCallback(() => {
        if (soundEnabled) {
            try {
                sounds.click();
            } catch { }
        }
    }, [soundEnabled]);

    const handleTouch = (e: React.TouchEvent<HTMLButtonElement>, direction: Direction) => {
        e.preventDefault();
        e.stopPropagation();

        setActiveDirection(direction);
        setRipple({ direction, key: Date.now() });

        onMove(direction);
        playButtonSound();

        // Vibration feedback
        if (navigator.vibrate) navigator.vibrate(12);

        // Clear ripple after animation
        setTimeout(() => setRipple(null), 300);

        // Auto-reset after short delay as fallback
        setTimeout(() => setActiveDirection(null), 150);
    };

    const handleTouchEnd = () => {
        setActiveDirection(null);
    };

    const handleTouchCancel = () => {
        setActiveDirection(null);
    };

    // Button styles with press effects
    const getButtonStyle = (direction: Direction): React.CSSProperties => {
        const isActive = activeDirection === direction;
        return {
            width: buttonSize,
            height: buttonSize,
            borderRadius: 12,
            border: isActive
                ? '2px solid rgba(59, 130, 246, 0.8)'
                : '1px solid rgba(59, 130, 246, 0.25)',
            background: isActive
                ? 'linear-gradient(145deg, #3b82f6, #1d4ed8)'
                : 'linear-gradient(145deg, rgba(51, 65, 85, 0.9), rgba(30, 41, 59, 0.95))',
            boxShadow: isActive
                ? '0 0 25px rgba(59,130,246,0.8), 0 0 50px rgba(59,130,246,0.4), inset 0 0 10px rgba(59,130,246,0.3)'
                : '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.05s ease-out',
            transform: isActive ? 'scale(0.9)' : 'scale(1)',
            position: 'absolute' as const,
            overflow: 'hidden',
        };
    };

    // Arrow icon component
    const ArrowIcon = ({ direction }: { direction: Direction }) => {
        const rotations = { U: 0, R: 90, D: 180, L: 270 };
        const isActive = activeDirection === direction;
        return (
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                style={{
                    transform: `rotate(${rotations[direction]}deg)`,
                    filter: isActive ? 'drop-shadow(0 0 4px #fff)' : 'none',
                    transition: 'filter 0.1s ease'
                }}
            >
                <path
                    d="M12 4L20 14H14V20H10V14H4L12 4Z"
                    fill={isActive ? '#ffffff' : '#94a3b8'}
                    stroke={isActive ? '#ffffff' : '#64748b'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
        );
    };

    // Ripple effect component
    const RippleEffect = ({ direction }: { direction: Direction }) => {
        if (!ripple || ripple.direction !== direction) return null;
        return (
            <span
                key={ripple.key}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: buttonSize,
                    height: buttonSize,
                    background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%) scale(0)',
                    animation: 'dpad-ripple 0.3s ease-out forwards',
                    pointerEvents: 'none',
                }}
            />
        );
    };

    // Position calculations for circular layout - increased spacing
    const centerOffset = containerSize / 2 - buttonSize / 2;
    const buttonOffset = containerSize * 0.35;

    return (
        <>
            {/* Ripple animation keyframes */}
            <style>{`
                @keyframes dpad-ripple {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                }
                @keyframes dpad-glow {
                    0%, 100% { box-shadow: 0 0 10px rgba(59,130,246,0.2); }
                    50% { box-shadow: 0 0 20px rgba(59,130,246,0.4); }
                }
            `}</style>

            <div
                className="dpad-mobile"
                style={{
                    position: 'fixed',
                    bottom: 'clamp(20px, 4vh, 40px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    touchAction: 'none',
                    opacity: 0.92,
                }}
            >
                {/* Outer circular ring */}
                <div
                    style={{
                        width: containerSize,
                        height: containerSize,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
                        boxShadow: `
                            0 4px 16px rgba(0, 0, 0, 0.5),
                            inset 0 1px 2px rgba(255, 255, 255, 0.05),
                            inset 0 -1px 2px rgba(0, 0, 0, 0.2)
                        `,
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        position: 'relative',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    {/* Center circle */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: buttonSize * 1,
                            height: buttonSize * 1,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(30,41,59,0.95) 0%, rgba(15,23,42,1) 100%)',
                            border: '2px solid rgba(59,130,246,0.15)',
                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                        }}
                    />

                    {/* Up button */}
                    <button
                        style={{
                            ...getButtonStyle('U'),
                            top: centerOffset - buttonOffset,
                            left: centerOffset,
                        }}
                        onTouchStart={(e) => handleTouch(e, 'U')}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                    >
                        <RippleEffect direction="U" />
                        <ArrowIcon direction="U" />
                    </button>

                    {/* Right button */}
                    <button
                        style={{
                            ...getButtonStyle('R'),
                            top: centerOffset,
                            left: centerOffset + buttonOffset,
                        }}
                        onTouchStart={(e) => handleTouch(e, 'R')}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                    >
                        <RippleEffect direction="R" />
                        <ArrowIcon direction="R" />
                    </button>

                    {/* Down button */}
                    <button
                        style={{
                            ...getButtonStyle('D'),
                            top: centerOffset + buttonOffset,
                            left: centerOffset,
                        }}
                        onTouchStart={(e) => handleTouch(e, 'D')}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                    >
                        <RippleEffect direction="D" />
                        <ArrowIcon direction="D" />
                    </button>

                    {/* Left button */}
                    <button
                        style={{
                            ...getButtonStyle('L'),
                            top: centerOffset,
                            left: centerOffset - buttonOffset,
                        }}
                        onTouchStart={(e) => handleTouch(e, 'L')}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                    >
                        <RippleEffect direction="L" />
                        <ArrowIcon direction="L" />
                    </button>
                </div>
            </div>
        </>
    );
}

export default DPad;
