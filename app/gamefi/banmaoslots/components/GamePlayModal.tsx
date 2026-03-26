'use client';

import React, { useState } from 'react';
import { SLOT_SYMBOLS, SymbolIndex } from '../lib/symbols';

interface GamePlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    poolName: string;
    poolId: bigint;
    minBet: number;
    maxBet: number;
    maxSafeBet: number;
    jackpot: number;
    betAmount: string;
    onBetChange: (value: string) => void;
    reels: SymbolIndex[];
    gameState: string;
    result: { symbols: SymbolIndex[]; payout: number; isJackpot: boolean } | null;
    onSpin: () => void;
    isSpinDisabled: boolean;
    buttonText: string;
    customSeed: string;
    onSeedChange: (value: string) => void;
    onRandomSeed: () => void;
}

export function GamePlayModal({
    isOpen,
    onClose,
    poolName,
    poolId,
    minBet,
    maxBet,
    maxSafeBet,
    jackpot,
    betAmount,
    onBetChange,
    reels,
    gameState,
    result,
    onSpin,
    isSpinDisabled,
    buttonText,
    customSeed,
    onSeedChange,
    onRandomSeed,
}: GamePlayModalProps) {
    const [showSeedInput, setShowSeedInput] = useState(false);

    if (!isOpen) return null;

    const effectiveMax = Math.min(maxBet, maxSafeBet);
    const isSpinning = gameState === 'committing' || gameState === 'waiting' || gameState === 'revealing';

    return (
        <div
            className="gameplay-modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="gameplay-modal"
                style={{
                    width: '90%',
                    maxWidth: 500,
                    background: 'linear-gradient(135deg, rgba(15, 5, 30, 0.98) 0%, rgba(25, 10, 45, 0.95) 100%)',
                    border: '2px solid rgba(139, 92, 246, 0.6)',
                    borderRadius: 20,
                    boxShadow: '0 0 50px rgba(139, 92, 246, 0.4), 0 30px 80px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.3) 0%, rgba(0, 255, 200, 0.1) 100%)',
                        borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontFamily: "'Orbitron', sans-serif",
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#00FFD0',
                            }}
                        >
                            🎰 {poolName}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(200, 180, 255, 0.7)' }}>
                            Pool #{poolId.toString()}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32,
                            height: 32,
                            border: 'none',
                            borderRadius: 8,
                            background: 'rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 18,
                            fontWeight: 'bold',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Jackpot Display */}
                <div
                    style={{
                        textAlign: 'center',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
                    }}
                >
                    <div style={{ fontSize: 10, color: '#facc15', letterSpacing: 2 }}>🏆 JACKPOT POOL 🏆</div>
                    <div
                        style={{
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: 24,
                            fontWeight: 800,
                            color: '#facc15',
                            textShadow: '0 0 15px rgba(250, 204, 21, 0.6)',
                        }}
                    >
                        {jackpot.toLocaleString()} <span style={{ fontSize: 12 }}>$BANMAO</span>
                    </div>
                </div>

                {/* Slot Reels */}
                <div style={{ padding: 20 }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 8,
                            padding: 16,
                            background: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: 12,
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                    >
                        {reels.map((symbol, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 70,
                                    height: 70,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 40,
                                    background: 'linear-gradient(180deg, rgba(20, 10, 35, 0.9) 0%, rgba(40, 25, 70, 0.8) 100%)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    animation: isSpinning ? 'pulse 0.5s ease-in-out infinite' : 'none',
                                }}
                            >
                                {SLOT_SYMBOLS[symbol]}
                            </div>
                        ))}
                    </div>

                    {/* Result Display */}
                    {gameState === 'result' && result && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 10,
                                textAlign: 'center',
                                background: result.payout > 0
                                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)'
                                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                                border: `1px solid ${result.payout > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}
                        >
                            <div style={{ fontWeight: 700, color: result.payout > 0 ? '#22c55e' : '#f87171' }}>
                                {result.isJackpot ? '🎉 JACKPOT!' : result.payout > 0 ? '✨ WIN!' : '👋 Try Again'}
                            </div>
                            {result.payout > 0 && (
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>
                                    +{result.payout.toLocaleString()} $BANMAO
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bet Controls */}
                <div style={{ padding: '0 20px 20px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 12,
                        }}
                    >
                        <span style={{ color: 'rgba(200, 180, 255, 0.8)', fontSize: 13 }}>BET:</span>
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => onBetChange(e.target.value)}
                            min={minBet}
                            max={effectiveMax}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: 'rgba(10, 5, 25, 0.8)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                borderRadius: 10,
                                color: '#fff',
                                fontFamily: "'Orbitron', sans-serif",
                                fontSize: 16,
                                textAlign: 'center',
                            }}
                            disabled={isSpinning}
                        />
                        <span style={{ color: '#facc15', fontWeight: 700 }}>$BANMAO</span>
                    </div>

                    <div style={{ fontSize: 10, color: 'rgba(200, 180, 255, 0.6)', textAlign: 'center', marginBottom: 16 }}>
                        Min: {minBet} | Max: {effectiveMax.toFixed(2)}
                    </div>

                    {/* Seed Input Toggle */}
                    <div style={{ marginBottom: 12 }}>
                        <button
                            onClick={() => setShowSeedInput(!showSeedInput)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: 'rgba(139, 92, 246, 0.15)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: 8,
                                color: 'rgba(200, 180, 255, 0.8)',
                                cursor: 'pointer',
                                fontSize: 11,
                            }}
                        >
                            🔐 {showSeedInput ? 'Hide' : 'Show'} Custom Seed (Provably Fair)
                        </button>
                        {showSeedInput && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    value={customSeed}
                                    onChange={(e) => onSeedChange(e.target.value)}
                                    placeholder="Enter or paste seed..."
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: 'rgba(10, 5, 25, 0.8)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        borderRadius: 8,
                                        color: 'rgba(200, 180, 255, 0.8)',
                                        fontSize: 10,
                                        fontFamily: 'monospace',
                                    }}
                                />
                                <button
                                    onClick={onRandomSeed}
                                    style={{
                                        padding: '8px 12px',
                                        background: 'rgba(0, 255, 200, 0.2)',
                                        border: '1px solid rgba(0, 255, 200, 0.4)',
                                        borderRadius: 8,
                                        color: '#00FFD0',
                                        cursor: 'pointer',
                                        fontSize: 11,
                                    }}
                                >
                                    🎲
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Spin Button */}
                    <button
                        onClick={onSpin}
                        disabled={isSpinDisabled}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: isSpinning
                                ? 'linear-gradient(180deg, #00A896 0%, #008B7A 100%)'
                                : 'linear-gradient(180deg, rgba(139, 92, 246, 1) 0%, rgba(109, 40, 217, 1) 100%)',
                            border: 'none',
                            borderRadius: 12,
                            color: '#fff',
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: 2,
                            cursor: isSpinDisabled ? 'not-allowed' : 'pointer',
                            opacity: isSpinDisabled ? 0.6 : 1,
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                        }}
                    >
                        🎰 {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GamePlayModal;
