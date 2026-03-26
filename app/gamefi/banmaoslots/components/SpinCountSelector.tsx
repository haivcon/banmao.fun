// SpinCountSelector.tsx - Professional multi-spin count selector
'use client';

import React, { useState } from 'react';
import { slotsSounds } from '../lib/sounds';

interface SpinCountSelectorProps {
    spinCount: number;
    setSpinCount: (count: number) => void;
    betPerSpin: number;
    isSpinning: boolean;
    style: { primary: string; glow: string };
    onSetMaxBet?: () => void; // Callback to auto-set max bet when changing spinCount
    t?: {
        multiSpin?: string;
        spins?: string;
        totalBet?: string;
        spinHelpMulti?: string; // "💡 {count} spins × {bet} = {total} total bet, ~{gas}% gas savings"
        spinHelpSingle?: string; // "💡 Select multiple spins to save on gas fees!"
    };
}

const SPIN_OPTIONS = [1, 2, 3, 5, 10];

export default function SpinCountSelector({
    spinCount,
    setSpinCount,
    betPerSpin,
    isSpinning,
    style,
    onSetMaxBet,
    t
}: SpinCountSelectorProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const totalBet = betPerSpin * spinCount;

    // Calculate gas savings percentage
    const getGasSavings = (count: number) => Math.round((1 - (1 + count * 0.3) / count) * 100);

    // Handle spin count change
    const handleSpinCountChange = (count: number) => {
        setSpinCount(count);
        // Auto-set max bet when changing spin count
        if (onSetMaxBet) {
            setTimeout(() => onSetMaxBet(), 50);
        }
        // Close after selection
        setTimeout(() => setIsExpanded(false), 200);
    };

    // Build help text with i18n
    const getHelpText = () => {
        if (spinCount > 1) {
            const template = t?.spinHelpMulti || '💡 {count} spins × {bet} = {total} total bet, ~{gas}% gas savings';
            return template
                .replace('{count}', spinCount.toString())
                .replace('{bet}', betPerSpin.toFixed(2))
                .replace('{total}', totalBet.toFixed(2))
                .replace('{gas}', getGasSavings(spinCount).toString());
        }
        return t?.spinHelpSingle || '💡 Select multiple spins to save on gas fees!';
    };

    return (
        <div style={{
            marginBottom: 10,
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 99,
            border: `1px solid ${style.primary}20`,
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
        }}>
            {/* Header - Always visible */}
            <div
                onClick={() => { if (!isSpinning) { slotsSounds.click(); setIsExpanded(!isExpanded); } }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                    background: isExpanded ? `${style.primary}10` : 'transparent',
                    transition: 'background 0.2s'
                }}
            >
                {/* Left: Icon + Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: `linear-gradient(135deg, ${style.primary}40, ${style.primary}20)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14
                    }}>
                        🎰
                    </div>
                    <div>
                        <div style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            fontWeight: 500,
                            letterSpacing: '0.5px'
                        }}>
                            {t?.multiSpin || 'MULTI-SPIN'}
                        </div>
                        <div style={{
                            fontSize: 13,
                            color: '#fff',
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace"
                        }}>
                            {spinCount}× {t?.spins || 'Spins'}
                        </div>
                    </div>
                </div>

                {/* Right: Total Bet + Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {spinCount > 1 && (
                        <div style={{
                            background: `${style.primary}25`,
                            padding: '3px 8px',
                            borderRadius: 16,
                            fontSize: 10,
                            color: style.primary,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace"
                        }}>
                            {t?.totalBet || 'Total'}: {totalBet.toFixed(2)}
                        </div>
                    )}
                    <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: `${style.primary}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        color: style.primary,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                    }}>
                        ▼
                    </div>
                </div>
            </div>

            {/* Expanded Content - Spin Options */}
            <div style={{
                maxHeight: isExpanded ? 100 : 0,
                opacity: isExpanded ? 1 : 0,
                overflow: isExpanded ? 'visible' : 'hidden',
                transition: 'all 0.3s ease',
                padding: isExpanded ? '4px 12px 12px' : '0 12px',
            }}>
                <style>{`
                    .spin-count-btn:hover:not(:disabled) {
                        transform: scale(1.1) !important;
                        border-color: ${style.primary} !important;
                        background: linear-gradient(135deg, ${style.primary}50, ${style.primary}30) !important;
                        color: #fff !important;
                        box-shadow: 0 4px 15px ${style.glow} !important;
                    }
                `}</style>
                <div style={{
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'center'
                }}>
                    {SPIN_OPTIONS.map(count => {
                        const isSelected = spinCount === count;

                        return (
                            <button
                                key={count}
                                className="spin-count-btn"
                                onClick={() => { slotsSounds.click(); handleSpinCountChange(count); }}
                                onMouseEnter={() => slotsSounds.hover()}
                                disabled={isSpinning}
                                style={{
                                    flex: 1,
                                    maxWidth: 50,
                                    height: 36,
                                    borderRadius: 99,
                                    border: isSelected
                                        ? `2px solid ${style.primary}`
                                        : `1px solid ${style.primary}30`,
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${style.primary}40, ${style.primary}20)`
                                        : `rgba(0,0,0,0.3)`,
                                    color: isSelected ? '#fff' : '#94a3b8',
                                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    fontFamily: "'Space Mono', monospace",
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: isSelected
                                        ? `0 3px 10px ${style.glow}`
                                        : 'none',
                                    overflow: 'hidden',
                                }}
                            >
                                <span>{count}×</span>
                            </button>
                        );
                    })}
                </div>

                {/* Info text - i18n supported */}
                <div style={{
                    marginTop: 8,
                    textAlign: 'center',
                    fontSize: 9,
                    color: '#64748b',
                    lineHeight: 1.4
                }}>
                    {getHelpText()}
                </div>
            </div>
        </div>
    );
}
