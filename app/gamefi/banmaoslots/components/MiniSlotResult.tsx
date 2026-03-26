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

interface MiniSlotResultProps {
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
    index: number;
    isSpinning?: boolean;
    delay?: number; // Animation delay in ms
}

export default function MiniSlotResult({
    symbols,
    payout,
    isJackpot,
    index,
    isSpinning = false,
    delay = 0,
}: MiniSlotResultProps) {
    const isWin = payout > BigInt(0);
    const payoutFormatted = (Number(payout) / 1e18).toLocaleString(undefined, {
        maximumFractionDigits: 2,
    });

    // Get dominant symbol color for win glow
    const symbolCounts = symbols.reduce((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);
    const dominantSymbol = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
    const glowColor = SYMBOL_COLORS[Number(dominantSymbol)];

    return (
        <div
            className={`mini-slot-result ${isWin ? 'win' : 'loss'} ${isJackpot ? 'jackpot' : ''}`}
            style={{
                animationDelay: `${delay}ms`,
                '--glow-color': glowColor,
            } as React.CSSProperties}
        >
            {/* Spin Number Badge */}
            <div className="spin-badge">#{index + 1}</div>

            {/* Symbols Row */}
            <div className="symbols-row">
                {isSpinning ? (
                    // Spinning placeholder
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="symbol spinning">
                            <span className="blur-spin">{SLOT_SYMBOLS[Math.floor(Math.random() * 6)]}</span>
                        </div>
                    ))
                ) : (
                    symbols.map((symbolIndex, i) => (
                        <div
                            key={i}
                            className="symbol"
                            style={{
                                animationDelay: `${i * 100 + delay}ms`,
                            }}
                        >
                            <span>{SLOT_SYMBOLS[symbolIndex]}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Payout */}
            {!isSpinning && (
                <div className={`payout ${isWin ? 'win' : ''}`}>
                    {isJackpot && <span className="jackpot-label">🎉 JACKPOT!</span>}
                    {isWin ? (
                        <span className="amount">+{payoutFormatted}</span>
                    ) : (
                        <span className="amount loss">0</span>
                    )}
                </div>
            )}

            <style jsx>{`
                .mini-slot-result {
                    position: relative;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 2px solid #333;
                    border-radius: 12px;
                    padding: 8px;
                    min-width: 140px;
                    animation: slideIn 0.4s ease-out forwards;
                    opacity: 0;
                    transform: translateY(20px);
                }

                .mini-slot-result.win {
                    border-color: var(--glow-color, #22c55e);
                    box-shadow: 0 0 15px var(--glow-color, rgba(34, 197, 94, 0.4));
                }

                .mini-slot-result.jackpot {
                    border-color: #ffd700;
                    box-shadow: 0 0 25px rgba(255, 215, 0, 0.6),
                                0 0 50px rgba(255, 215, 0, 0.3);
                    animation: slideIn 0.4s ease-out forwards, jackpotPulse 1s ease-in-out infinite;
                }

                .mini-slot-result.loss {
                    opacity: 0.7;
                }

                .spin-badge {
                    position: absolute;
                    top: -8px;
                    left: 8px;
                    background: #4a5568;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .symbols-row {
                    display: flex;
                    gap: 4px;
                    justify-content: center;
                    margin: 8px 0;
                }

                .symbol {
                    font-size: 24px;
                    animation: symbolPop 0.3s ease-out forwards;
                    opacity: 0;
                    transform: scale(0.5);
                }

                .symbol.spinning .blur-spin {
                    filter: blur(2px);
                    animation: spinSymbol 0.1s linear infinite;
                }

                .payout {
                    text-align: center;
                    font-size: 12px;
                    font-weight: bold;
                    color: #888;
                }

                .payout.win {
                    color: #22c55e;
                }

                .payout .amount.loss {
                    color: #666;
                }

                .jackpot-label {
                    display: block;
                    font-size: 10px;
                    color: #ffd700;
                    margin-bottom: 2px;
                }

                @keyframes slideIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes symbolPop {
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes spinSymbol {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(100%); }
                }

                @keyframes jackpotPulse {
                    0%, 100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.6); }
                    50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.9); }
                }
            `}</style>
        </div>
    );
}
