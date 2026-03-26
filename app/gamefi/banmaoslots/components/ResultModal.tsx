"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SLOT_SYMBOLS, PAYOUT_TABLE } from '../lib/abis';

interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlayAgain: () => void;
    result: {
        symbols: number[];
        payout: number;
        isJackpot: boolean;
    } | null;
    betAmount: string;
    t: any;
}

// Find longest consecutive run of same symbol
function analyzeResult(symbols: number[]) {
    const totalCounts: Record<number, number> = {};
    symbols.forEach(s => { totalCounts[s] = (totalCounts[s] || 0) + 1; });

    let bestSymbol = symbols[0], bestCount = 1, bestStartIdx = 0;
    let currentSymbol = symbols[0], currentCount = 1, currentStartIdx = 0;

    for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === currentSymbol) {
            currentCount++;
            if (currentCount > bestCount) {
                bestCount = currentCount;
                bestSymbol = currentSymbol;
                bestStartIdx = currentStartIdx;
            }
        } else {
            currentSymbol = symbols[i];
            currentCount = 1;
            currentStartIdx = i;
        }
    }

    const isWinning = bestCount >= 3;
    const matchedIndices: number[] = [];
    if (isWinning) {
        for (let i = bestStartIdx; i < bestStartIdx + bestCount; i++) matchedIndices.push(i);
    }

    return { counts: totalCounts, bestSymbol, bestCount, matchedIndices, isWinning, totalCounts };
}

// CSS Animations
const cyberStyles = `
@keyframes cyberPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
@keyframes cyberGlow {
    0%, 100% { box-shadow: 0 0 20px var(--glow-color), 0 0 40px var(--glow-color), inset 0 0 20px rgba(255,255,255,0.05); }
    50% { box-shadow: 0 0 30px var(--glow-color), 0 0 60px var(--glow-color), inset 0 0 30px rgba(255,255,255,0.1); }
}
@keyframes scanLine {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
}
@keyframes hologramFlicker {
    0%, 100% { opacity: 1; transform: scale(1); }
    5% { opacity: 0.8; transform: scale(1.002); }
    10% { opacity: 1; transform: scale(0.998); }
    15% { opacity: 0.9; transform: scale(1); }
}
@keyframes neonPulse {
    0%, 100% { text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor; }
    50% { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor; }
}
@keyframes symbolHover {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
}
@keyframes gridMove {
    0% { background-position: 0 0; }
    100% { background-position: 50px 50px; }
}
@keyframes cyberFadeIn {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes cyberFadeInSimple {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
}
@keyframes particleFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
}
`;

export default function ResultModal({ isOpen, onClose, onPlayAgain, result, betAmount, t }: ResultModalProps) {
    const [animationPhase, setAnimationPhase] = useState(0);

    useEffect(() => {
        if (isOpen && result) {
            setAnimationPhase(0);
            setTimeout(() => setAnimationPhase(1), 100);
            setTimeout(() => setAnimationPhase(2), 400);
            setTimeout(() => setAnimationPhase(3), 700);
        }
    }, [isOpen, result]);

    if (!isOpen || !result) return null;

    const analysis = analyzeResult(result.symbols);
    const bet = parseFloat(betAmount) || 0;
    const multiplier = analysis.isWinning
        ? (PAYOUT_TABLE[analysis.bestSymbol as keyof typeof PAYOUT_TABLE]?.[analysis.bestCount] || 0)
        : 0;
    const isWin = result.payout > 0;
    const isJackpot = result.isJackpot;

    // Cyber color scheme
    const accentColor = isJackpot ? '#FFD700' : isWin ? '#00FF88' : '#FF3366';
    const glowColor = isJackpot ? 'rgba(255, 215, 0, 0.5)' : isWin ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 51, 102, 0.3)';
    const borderColor = isJackpot ? '#FFD700' : isWin ? '#00FF88' : '#8B5CF6';

    // Use portal to render modal outside parent container (fixes stacking context issues)
    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            <style>{cyberStyles}</style>

            {/* Backdrop with grid effect */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: `
                        radial-gradient(ellipse at center, rgba(20, 0, 40, 0.95) 0%, rgba(5, 0, 15, 0.98) 100%),
                        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100, 50, 200, 0.03) 2px, rgba(100, 50, 200, 0.03) 4px)
                    `,
                    backdropFilter: 'blur(12px)',
                    zIndex: 1000,
                }}
            />

            {/* Scan line effect */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 0%, rgba(100, 50, 200, 0.1) 50%, transparent 100%)',
                height: '100px',
                animation: 'scanLine 3s linear infinite',
                pointerEvents: 'none',
                zIndex: 1001,
            }} />

            {/* Floating particles for jackpot */}
            {isJackpot && (
                <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1001, overflow: 'hidden' }}>
                    {[...Array(30)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: '4px',
                            height: '4px',
                            background: '#FFD700',
                            clipPath: 'polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `particleFloat ${2 + Math.random() * 3}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                            boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD700',
                        }} />
                    ))}
                </div>
            )}

            {/* Main Modal Container - Flexbox centering to avoid animation transform conflicts */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    zIndex: 1002,
                }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div
                    style={{
                        maxWidth: '440px',
                        maxHeight: 'calc(100vh - 40px)',
                        overflowY: 'auto',
                        background: `
                            linear-gradient(135deg, rgba(15, 5, 30, 0.98) 0%, rgba(30, 10, 50, 0.95) 50%, rgba(15, 5, 30, 0.98) 100%)
                        `,
                        clipPath: 'polygon(0 20px, 20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px))',
                        border: `2px solid ${borderColor}`,
                        boxShadow: `
                            0 0 30px ${glowColor},
                            0 0 60px ${glowColor},
                            inset 0 0 30px rgba(100, 50, 200, 0.1),
                            0 25px 50px rgba(0, 0, 0, 0.5)
                        `,
                        position: 'relative',
                        animation: 'cyberFadeInSimple 0.4s ease-out',
                        ['--glow-color' as any]: glowColor,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Grid overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `
                        linear-gradient(90deg, transparent 49%, rgba(100, 50, 200, 0.1) 50%, transparent 51%),
                        linear-gradient(0deg, transparent 49%, rgba(100, 50, 200, 0.1) 50%, transparent 51%)
                    `,
                        backgroundSize: '20px 20px',
                        animation: 'gridMove 20s linear infinite',
                        pointerEvents: 'none',
                        opacity: 0.3,
                    }} />

                    {/* Header */}
                    <div style={{
                        background: isJackpot
                            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 150, 0, 0.2) 100%)'
                            : isWin
                                ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 200, 100, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(100, 50, 200, 0.2) 100%)',
                        padding: '20px',
                        textAlign: 'center',
                        borderBottom: `1px solid ${borderColor}40`,
                        position: 'relative',
                    }}>
                        {/* Cyber corners */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />

                        <div style={{
                            fontSize: isJackpot ? '28px' : '22px',
                            fontWeight: 900,
                            fontFamily: "'Space Mono', monospace",
                            color: accentColor,
                            textTransform: 'uppercase',
                            letterSpacing: '3px',
                            animation: 'neonPulse 2s ease-in-out infinite',
                            textShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}`,
                        }}>
                            {isJackpot ? `🎰 ${t.jackpotTitle} 🎰` : isWin ? `✨ ${t.winTitle} ✨` : `💫 ${t.tryAgainTitle} 💫`}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'rgba(200, 180, 255, 0.7)',
                            marginTop: '8px',
                            fontFamily: "'Space Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                        }}>
                            {isWin ? t.winMessage : t.betterLuck}
                        </div>
                    </div>

                    {/* Symbols Display */}
                    <div style={{ padding: '24px 20px', position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '10px',
                            marginBottom: '24px',
                            opacity: animationPhase >= 1 ? 1 : 0,
                            transform: animationPhase >= 1 ? 'scale(1)' : 'scale(0.8)',
                            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}>
                            {result.symbols.map((symbol, index) => {
                                const isMatched = analysis.matchedIndices.includes(index);
                                return (
                                    <div key={index} style={{
                                        width: '60px',
                                        height: '60px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '32px',
                                        background: isMatched
                                            ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`
                                            : 'linear-gradient(135deg, rgba(30, 20, 60, 0.8) 0%, rgba(20, 10, 40, 0.9) 100%)',
                                        border: isMatched ? `2px solid ${accentColor}` : '1px solid rgba(139, 92, 246, 0.3)',
                                        clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
                                        boxShadow: isMatched
                                            ? `0 0 20px ${accentColor}60, inset 0 0 15px ${accentColor}20`
                                            : 'inset 0 0 10px rgba(0, 0, 0, 0.3)',
                                        animation: isMatched ? 'symbolHover 1s ease-in-out infinite' : 'none',
                                        animationDelay: `${index * 0.1}s`,
                                        position: 'relative',
                                    }}>
                                        {isMatched && (
                                            <div style={{
                                                position: 'absolute',
                                                inset: -2,
                                                clipPath: 'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))',
                                                background: `linear-gradient(45deg, ${accentColor}, transparent, ${accentColor})`,
                                                backgroundSize: '200% 200%',
                                                animation: 'cyberGlow 2s ease-in-out infinite',
                                                ['--glow-color' as any]: accentColor,
                                                opacity: 0.5,
                                                zIndex: -1,
                                            }} />
                                        )}
                                        {SLOT_SYMBOLS[symbol]}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Result Details Panel */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(20, 10, 40, 0.9) 0%, rgba(30, 15, 50, 0.8) 100%)',
                            clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            padding: '16px',
                            marginBottom: '16px',
                            opacity: animationPhase >= 2 ? 1 : 0,
                            transform: animationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'all 0.4s ease-out 0.2s',
                            position: 'relative',
                        }}>
                            {/* Corner decorations */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '15px', height: '15px', borderBottom: '1px solid rgba(139, 92, 246, 0.5)', borderLeft: '1px solid rgba(139, 92, 246, 0.5)' }} />
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '15px', height: '15px', borderBottom: '1px solid rgba(139, 92, 246, 0.5)', borderRight: '1px solid rgba(139, 92, 246, 0.5)' }} />

                            <div style={{
                                fontSize: '11px',
                                color: '#8B5CF6',
                                fontFamily: "'Space Mono', monospace",
                                letterSpacing: '2px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <span style={{ width: '8px', height: '8px', background: '#8B5CF6', transform: 'rotate(45deg)' }} />
                                {t.analysisReport}
                            </div>

                            {isWin ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '24px' }}>{SLOT_SYMBOLS[analysis.bestSymbol]}</span>
                                        <span style={{ fontSize: '18px', color: accentColor, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                                            ×{analysis.bestCount}
                                        </span>
                                    </div>
                                    <div style={{
                                        background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`,
                                        border: `1px solid ${accentColor}50`,
                                        clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                        padding: '8px 16px',
                                        display: 'inline-block',
                                    }}>
                                        <span style={{ color: accentColor, fontWeight: 700, fontFamily: "'Space Mono', monospace", fontSize: '16px', textTransform: 'uppercase' }}>
                                            {isJackpot ? `🏆 ${t.jackpotBonus}` : `${multiplier}× ${t.multiplierLabel}`}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        color: '#FF6B9D',
                                        fontSize: '13px',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}>
                                        <span>⚠️</span>
                                        <span>{t.need3ToWin}</span>
                                    </div>
                                    <div style={{
                                        background: 'rgba(255, 51, 102, 0.1)',
                                        border: '1px solid rgba(255, 51, 102, 0.3)',
                                        clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                        padding: '10px',
                                    }}>
                                        <div style={{ fontSize: '12px', color: 'rgba(200, 180, 255, 0.7)', marginBottom: '4px' }}>
                                            {t.yourBest}:
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '20px' }}>{SLOT_SYMBOLS[analysis.bestSymbol]}</span>
                                            <span style={{ color: '#FF6B9D', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                                                ×{analysis.bestCount} {t.onlyHad}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payout Panel */}
                        <div style={{
                            background: isWin
                                ? `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}05 100%)`
                                : 'linear-gradient(135deg, rgba(255, 51, 102, 0.1) 0%, rgba(255, 51, 102, 0.05) 100%)',
                            clipPath: 'polygon(0 16px, 16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px))',
                            border: `1px solid ${isWin ? accentColor : 'rgba(255, 51, 102, 0.3)'}40`,
                            padding: '20px',
                            textAlign: 'center',
                            opacity: animationPhase >= 3 ? 1 : 0,
                            transform: animationPhase >= 3 ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'all 0.4s ease-out 0.4s',
                            position: 'relative',
                        }}>
                            <div style={{
                                fontSize: '11px',
                                color: isWin ? accentColor : '#FF6B9D',
                                letterSpacing: '2px',
                                marginBottom: '8px',
                                fontFamily: "'Space Mono', monospace",
                                textTransform: 'uppercase',
                            }}>
                                💰 {t.payout || t.spinDetails}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'rgba(200, 180, 255, 0.6)',
                                marginBottom: '8px',
                            }}>
                                {t.betLabelShort}: {bet.toLocaleString()} $BANMAO
                            </div>
                            <div style={{
                                fontSize: isWin ? '36px' : '28px',
                                fontWeight: 900,
                                fontFamily: "'Space Mono', monospace",
                                color: isWin ? accentColor : '#FF6B9D',
                                textShadow: isWin ? `0 0 20px ${accentColor}` : 'none',
                                animation: isWin ? 'neonPulse 2s ease-in-out infinite' : 'none',
                            }}>
                                {isWin ? '+' : ''}{result.payout.toLocaleString()} <span style={{ fontSize: '16px' }}>$BANMAO</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '0 20px 20px',
                    }}>
                        <button
                            onClick={onPlayAgain}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                                border: 'none',
                                clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
                                color: isJackpot || isWin ? '#000' : '#FFF',
                                fontSize: '15px',
                                fontWeight: 700,
                                fontFamily: "'Space Mono', monospace",
                                letterSpacing: '1px',
                                cursor: 'pointer',
                                boxShadow: `0 0 20px ${accentColor}60`,
                                transition: 'all 0.3s ease',
                                textTransform: 'uppercase',
                            }}
                        >
                            🎰 {t.spinAgain}
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '14px 20px',
                                background: 'transparent',
                                border: '1px solid rgba(139, 92, 246, 0.5)',
                                clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
                                color: 'rgba(200, 180, 255, 0.8)',
                                fontSize: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div >
        </>,
        document.body
    );
}
