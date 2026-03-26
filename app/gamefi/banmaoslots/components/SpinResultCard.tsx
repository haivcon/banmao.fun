'use client';

import React from 'react';

// Symbol emojis
const SLOT_SYMBOLS = ['🐱', '🍌', '💎', '🌟', '🍀', '7️⃣'];

// Symbol colors for styling
const SYMBOL_COLORS: Record<number, string> = {
    0: '#ffa500', // 🐱 Banmao Cat: Orange
    1: '#fde047', // 🍌 Banana: Yellow
    2: '#00bfff', // 💎 Diamond: Cyan
    3: '#ffd700', // 🌟 Star: Gold
    4: '#22c55e', // 🍀 Clover: Green
    5: '#1d4ed8', // 7️⃣ Seven: Blue
};

export interface SpinResultCardProps {
    index: number;
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
    betAmount: number;
    spinSeed?: string;
    txHash?: string;
    blockNumber?: number;
    t: any;
    onSelect?: () => void;
    animationDelay?: number; // For staggered reveal animation
}

export default function SpinResultCard({
    index,
    symbols,
    payout,
    isJackpot,
    betAmount,
    t,
    onSelect,
    animationDelay = 0,
}: SpinResultCardProps) {
    const isWin = payout > BigInt(0);
    const payoutNum = Number(payout) / 1e18;
    const multiplier = betAmount > 0 ? payoutNum / betAmount : 0;

    // Find matching symbols for highlighting
    const getMatchInfo = () => {
        const counts: Record<number, number[]> = {};
        symbols.forEach((s, i) => {
            if (!counts[s]) counts[s] = [];
            counts[s].push(i);
        });

        let maxCount = 0;
        let winningSymbol = -1;
        let winningIndices: number[] = [];

        Object.entries(counts).forEach(([symbol, indices]) => {
            if (indices.length >= 3 && indices.length > maxCount) {
                maxCount = indices.length;
                winningSymbol = parseInt(symbol);
                winningIndices = indices;
            }
        });

        return { maxCount, winningSymbol, winningIndices };
    };

    const { maxCount, winningSymbol, winningIndices } = getMatchInfo();
    const glowColor = winningSymbol >= 0 ? SYMBOL_COLORS[winningSymbol] : '#333';

    return (
        <div
            className={`spin-result-card ${isWin ? 'win' : 'lose'} ${isJackpot ? 'jackpot' : ''}`}
            onClick={onSelect}
            style={{
                '--glow-color': glowColor,
                '--animation-delay': `${animationDelay}ms`
            } as React.CSSProperties}
        >
            {/* Spin Number Badge */}
            <div className="spin-badge">#{index + 1}</div>

            {/* Status Header */}
            <div className="card-status">
                {isJackpot ? (
                    <span className="status jackpot-status">🎉 {t.jackpotTitle || 'JACKPOT'}</span>
                ) : isWin ? (
                    <span className="status win-status">✓ {t.youWinTitle || 'WIN'}</span>
                ) : (
                    <span className="status lose-status">✕ {t.noMatchTitle || 'No Match'}</span>
                )}
            </div>

            {/* Symbols Display */}
            <div className="symbols-container">
                {symbols.map((symbolIndex, i) => (
                    <div
                        key={i}
                        className={`symbol-box ${winningIndices.includes(i) ? 'highlight' : ''}`}
                        style={winningIndices.includes(i) ? {
                            '--symbol-color': SYMBOL_COLORS[symbolIndex]
                        } as React.CSSProperties : {}}
                    >
                        {SLOT_SYMBOLS[symbolIndex]}
                    </div>
                ))}
            </div>

            {/* Payout Display */}
            {isWin && (
                <div className="payout-display">
                    <span className="payout-multiplier">{multiplier.toFixed(0)}x</span>
                    <span className="payout-amount">+{payoutNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} $BANMAO</span>
                </div>
            )}

            <style jsx>{`
                .spin-result-card {
                    background: linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%);
                    border: 2px solid #2a2a4a;
                    border-radius: 14px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    min-height: 130px;
                    display: flex;
                    flex-direction: column;
                    animation: cardReveal 0.5s ease-out forwards;
                    animation-delay: var(--animation-delay);
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                }

                @keyframes cardReveal {
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .spin-result-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--glow-color), transparent);
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .spin-result-card:hover {
                    transform: translateY(-4px) scale(1.02);
                    border-color: #3a3a5a;
                }
                
                .spin-result-card:hover::before {
                    opacity: 1;
                }

                .spin-result-card.win {
                    border-color: var(--glow-color);
                    box-shadow: 
                        0 0 20px color-mix(in srgb, var(--glow-color) 30%, transparent),
                        inset 0 1px 0 rgba(255,255,255,0.1);
                }
                
                .spin-result-card.win::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 50% 0%, var(--glow-color), transparent 70%);
                    opacity: 0.08;
                    pointer-events: none;
                }

                .spin-result-card.jackpot {
                    border-color: #ffd700;
                    box-shadow: 
                        0 0 30px rgba(255, 215, 0, 0.4),
                        0 0 60px rgba(255, 215, 0, 0.2);
                    animation: cardReveal 0.5s ease-out forwards, jackpotPulse 1.5s ease-in-out infinite;
                }

                @keyframes jackpotPulse {
                    0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.4); }
                    50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.6), 0 0 80px rgba(255, 215, 0, 0.3); }
                }

                .spin-result-card.lose {
                    opacity: 0.65;
                    filter: saturate(0.8);
                }
                
                .spin-result-card.lose:hover {
                    opacity: 0.9;
                }

                .spin-badge {
                    position: absolute;
                    top: 6px;
                    left: 8px;
                    font-size: 15px;
                    font-weight: 700;
                    color: #666;
                    font-family: 'Space Mono', monospace;
                }

                .card-status {
                    text-align: center;
                    margin-bottom: 8px;
                    margin-top: 4px;
                }

                .status {
                    font-size: 11px;
                    font-weight: 800;
                    padding: 3px 10px;
                    border-radius: 20px;
                    letter-spacing: 0.5px;
                }

                .win-status {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.3);
                }

                .lose-status {
                    background: rgba(100, 100, 100, 0.1);
                    color: #666;
                    border: 1px solid rgba(100, 100, 100, 0.2);
                }

                .jackpot-status {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.2) 100%);
                    color: #ffd700;
                    border: 1px solid rgba(255, 215, 0, 0.4);
                    animation: jackpotTextPulse 1s ease-in-out infinite;
                }

                @keyframes jackpotTextPulse {
                    0%, 100% { text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
                    50% { text-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 25px rgba(255, 215, 0, 0.4); }
                }

                .symbols-container {
                    display: flex;
                    justify-content: center;
                    gap: 5px;
                    margin-bottom: 8px;
                    flex: 1;
                    align-items: center;
                }

                .symbol-box {
                    width: 36px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    background: linear-gradient(180deg, #0a0a1a 0%, #050510 100%);
                    border-radius: 6px;
                    border: 1px solid #2a2a4a;
                    transition: all 0.3s ease;
                }

                .symbol-box.highlight {
                    border-color: var(--symbol-color);
                    box-shadow: 
                        0 0 12px color-mix(in srgb, var(--symbol-color) 50%, transparent),
                        inset 0 0 8px color-mix(in srgb, var(--symbol-color) 20%, transparent);
                    animation: symbolPulse 0.6s ease-in-out infinite alternate;
                    transform: scale(1.05);
                }

                @keyframes symbolPulse {
                    from { filter: brightness(1); }
                    to { filter: brightness(1.2); }
                }

                .payout-display {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding-top: 6px;
                    border-top: 1px solid rgba(34, 197, 94, 0.2);
                }

                .payout-multiplier {
                    font-size: 18px;
                    font-weight: 900;
                    color: #22c55e;
                    font-family: 'Space Mono', monospace;
                    text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
                }

                .payout-amount {
                    font-size: 12px;
                    color: #4ade80;
                    font-family: 'Space Mono', monospace;
                }

                @media (max-width: 768px) {
                    .spin-result-card {
                        min-height: 2px;
                        padding: 2px;
                    }
                    
                    .symbol-box {
                        width: 18px;
                        height: 24px;
                        font-size: 12px;
                        border-radius: 2px;
                    }

                    .symbols-container {
                        gap: 1px;
                        margin-bottom: 2px;
                    }

                    .spin-badge {
                        font-size: 9px;
                        top: 2px;
                        left: 3px;
                    }

                    .status {
                        font-size: 7px;
                        padding: 1px 4px;
                    }

                    .card-status {
                        margin-bottom: 2px;
                        margin-top: 0px;
                    }

                    .payout-multiplier {
                        font-size: 10px;
                    }

                    .payout-amount {
                        font-size: 7px;
                    }

                    .payout-display {
                        padding-top: 2px;
                        gap: 2px;
                    }
                }
            `}</style>
        </div>
    );
}
