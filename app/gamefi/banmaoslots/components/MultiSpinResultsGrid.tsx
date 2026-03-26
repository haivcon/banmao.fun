'use client';

import React, { useState, useEffect } from 'react';
import MiniSlotResult from './MiniSlotResult';

export interface SpinResultData {
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
}

interface MultiSpinResultsGridProps {
    results: SpinResultData[];
    spinCount: number;
    isRevealing: boolean;
    totalBet: bigint;
    t: any; // Translation object, access as t.key
    onClose?: () => void;
}

export default function MultiSpinResultsGrid({
    results,
    spinCount,
    isRevealing,
    totalBet,
    t,
    onClose,
}: MultiSpinResultsGridProps) {
    const [revealedCount, setRevealedCount] = useState(0);

    // Progressive reveal animation
    useEffect(() => {
        if (results.length > revealedCount) {
            const timer = setTimeout(() => {
                setRevealedCount(results.length);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [results.length, revealedCount]);

    // Calculate totals
    const totalPayout = results.reduce((sum, r) => sum + r.payout, BigInt(0));
    const totalPayoutNum = Number(totalPayout) / 1e18;
    const totalBetNum = Number(totalBet) / 1e18;
    const netProfit = totalPayoutNum - totalBetNum;
    const hasJackpot = results.some(r => r.isJackpot);
    const winCount = results.filter(r => r.payout > BigInt(0)).length;

    // Determine grid columns based on spin count
    const getGridCols = () => {
        if (spinCount <= 2) return 2;
        if (spinCount <= 4) return 2;
        if (spinCount <= 6) return 3;
        return 5; // 7-10 spins
    };

    const gridCols = getGridCols();

    if (spinCount <= 1) return null; // Don't show for single spins

    return (
        <div className="multi-spin-container">
            {/* Header */}
            <div className="header">
                <h3>🎰 {t.multiSpin || 'Multi-Spin'}: {spinCount}x</h3>
                {onClose && (
                    <button onClick={onClose} className="close-btn">✕</button>
                )}
            </div>

            {/* Results Grid */}
            <div
                className="results-grid"
                style={{
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                }}
            >
                {/* Show spinning placeholders for pending results */}
                {isRevealing && results.length < spinCount && (
                    Array(spinCount - results.length).fill(0).map((_, i) => (
                        <MiniSlotResult
                            key={`spinning-${i}`}
                            symbols={[0, 0, 0, 0, 0]}
                            payout={BigInt(0)}
                            isJackpot={false}
                            index={results.length + i}
                            isSpinning={true}
                        />
                    ))
                )}

                {/* Revealed results */}
                {results.map((result, index) => (
                    <MiniSlotResult
                        key={index}
                        symbols={result.symbols}
                        payout={result.payout}
                        isJackpot={result.isJackpot}
                        index={index}
                        delay={index * 200}
                    />
                ))}
            </div>

            {/* Summary Footer */}
            {results.length === spinCount && (
                <div className={`summary ${netProfit >= 0 ? 'profit' : 'loss'}`}>
                    <div className="stats">
                        <span className="wins">{winCount}/{spinCount} {t.wins || 'wins'}</span>
                        {hasJackpot && <span className="jackpot-badge">🎉 JACKPOT!</span>}
                    </div>
                    <div className="totals">
                        <div className="bet-info">
                            <span>{t.totalBet || 'Total Bet'}:</span>
                            <span>{totalBetNum.toLocaleString()}</span>
                        </div>
                        <div className="payout-info">
                            <span>{t.totalPayout || 'Total Payout'}:</span>
                            <span className={netProfit >= 0 ? 'win' : 'loss'}>
                                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .multi-spin-container {
                    background: linear-gradient(135deg, #0f0f23 0%, #1a1a3a 100%);
                    border: 2px solid #333;
                    border-radius: 16px;
                    padding: 16px;
                    margin: 16px 0;
                    animation: fadeIn 0.3s ease-out;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #333;
                }

                .header h3 {
                    margin: 0;
                    color: #00f5ff;
                    font-size: 16px;
                }

                .close-btn {
                    background: transparent;
                    border: none;
                    color: #666;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 4px 8px;
                    transition: color 0.2s;
                }

                .close-btn:hover {
                    color: #fff;
                }

                .results-grid {
                    display: grid;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .summary {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    padding: 12px 16px;
                    border: 1px solid #333;
                }

                .summary.profit {
                    border-color: #22c55e;
                    background: rgba(34, 197, 94, 0.1);
                }

                .summary.loss {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }

                .stats {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 8px;
                    font-size: 12px;
                }

                .wins {
                    color: #22c55e;
                    font-weight: bold;
                }

                .jackpot-badge {
                    color: #ffd700;
                    animation: pulse 1s infinite;
                }

                .totals {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                }

                .bet-info, .payout-info {
                    display: flex;
                    gap: 8px;
                }

                .bet-info span:first-child,
                .payout-info span:first-child {
                    color: #888;
                }

                .payout-info .win {
                    color: #22c55e;
                    font-weight: bold;
                }

                .payout-info .loss {
                    color: #ef4444;
                    font-weight: bold;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}
