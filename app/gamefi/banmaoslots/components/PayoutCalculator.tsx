"use client";

import React, { useState, useRef, useEffect } from 'react';
import { SlotsTranslations } from '../lib/i18n';
import { SLOT_SYMBOLS, PAYOUT_TABLE } from '../lib/abis';

// Symbol probabilities from smart contract (out of 1000)
// uint16[6] public symbolProbabilities = [50, 80, 150, 200, 250, 270];
const SYMBOL_WEIGHT = [50, 80, 150, 200, 250, 270]; // per 1000
const TOTAL_WEIGHT = 1000;

// Calculate probability for a specific symbol to match 3, 4, or 5 times
// P(k matches) ≈ C(5,k) * p^k * (1-p)^(5-k) for first k consecutive positions
// For slot matching: we need at least k symbols matching from position 0
function calculateMatchProbabilities(symbolWeight: number) {
    const p = symbolWeight / TOTAL_WEIGHT; // probability of this symbol appearing

    // For 3+ matches: symbol must appear in positions 0,1,2 (and optionally 3,4)
    // P(exactly 3) = p^3 * (1-p)^2 * (adjust for sequential requirement)
    // Simplified model for consecutive matches from start:
    // P(3+) = p^3
    // P(4+) = p^4  
    // P(5) = p^5

    // More accurate: P(at least 3 consecutive from start)
    // = P(3) + P(4) + P(5)
    // P(exactly 3) ≈ p^3 * (1-p)
    // P(exactly 4) ≈ p^4 * (1-p)
    // P(exactly 5) = p^5

    const p3 = Math.pow(p, 3) * (1 - p); // exactly 3 matches: p^3 * (1-p) - returns raw probability (0-1)
    const p4 = Math.pow(p, 4) * (1 - p); // exactly 4 matches: p^4 * (1-p) - returns raw probability (0-1)
    const p5 = Math.pow(p, 5);           // exactly 5 matches: p^5 - returns raw probability (0-1)

    return {
        match3: p3, // raw probability (0-1)
        match4: p4, // raw probability (0-1)
        match5: p5, // raw probability (0-1)
    };
}

// Pre-calculate probabilities for each symbol
const SYMBOL_PROBABILITIES = SYMBOL_WEIGHT.map(w => calculateMatchProbabilities(w));

export function PayoutCalculator({ t }: { t: SlotsTranslations }) {
    const [showCalculator, setShowCalculator] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [showMechanism, setShowMechanism] = useState(false);
    const [showSecurity, setShowSecurity] = useState(false);
    const [showMultiSpin, setShowMultiSpin] = useState(false);
    const [multiSpinZoom, setMultiSpinZoom] = useState(false);
    const [betAmount, setBetAmount] = useState<string>("100");
    const [spinCount, setSpinCount] = useState<number>(1);
    const [selectedOption, setSelectedOption] = useState<string>("0-3");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [expandedSymbol, setExpandedSymbol] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = React.useMemo(() => {
        const opts: { value: string; label: string; emoji: string; count: number; multiplier: number; isJackpot: boolean }[] = [];
        SLOT_SYMBOLS.forEach((symbol, sIdx) => {
            [3, 4, 5].forEach(count => {
                const multiplier = PAYOUT_TABLE[sIdx as keyof typeof PAYOUT_TABLE][count as 3 | 4 | 5];
                opts.push({
                    value: `${sIdx}-${count}`,
                    label: `${count}${t.matchCountLabel}`,
                    emoji: symbol,
                    count,
                    multiplier,
                    isJackpot: sIdx === 0 && count === 5
                });
            });
        });
        return opts;
    }, []);

    const currentSelection = options.find(o => o.value === selectedOption) || options[0];
    const bet = parseInt(betAmount) || 0;
    const win = Math.floor(bet * currentSelection.multiplier);
    const profit = win - bet;

    // Symbol data matching the original design - with individual probabilities (V2 values)
    // Probabilities from contract: 🐱 5%, 🍌 8%, 💎 15%, ⭐ 20%, ☘️ 25%, 7️⃣ 27%
    const symbolData = [
        { emoji: '🐱', name: t.symbolBanmao || 'Banmao Cat', m3: '9x', m4: '45x', m5: '175x+JP', color: '#fbbf24', special: true, prob: SYMBOL_PROBABILITIES[0], baseProb: 5 },
        { emoji: '🍌', name: t.symbolBanana || 'Banana', m3: '7x', m4: '35x', m5: '125x', color: '#facc15', prob: SYMBOL_PROBABILITIES[1], baseProb: 8 },
        { emoji: '💎', name: t.symbolDiamond || 'Diamond', m3: '4.5x', m4: '17x', m5: '70x', color: '#60a5fa', prob: SYMBOL_PROBABILITIES[2], baseProb: 15 },
        { emoji: '⭐', name: t.symbolStar || 'Star', m3: '2.5x', m4: '13x', m5: '45x', color: '#22c55e', prob: SYMBOL_PROBABILITIES[3], baseProb: 20 },
        { emoji: '☘️', name: t.symbolClover || 'Clover', m3: '1.8x', m4: '7x', m5: '22x', color: '#22c55e', prob: SYMBOL_PROBABILITIES[4], baseProb: 25 },
        { emoji: '7️⃣', name: t.symbolSeven || 'Seven', m3: '1.3x', m4: '4.5x', m5: '13x', color: '#ef4444', prob: SYMBOL_PROBABILITIES[5], baseProb: 27 },
    ];

    const handleSymbolClick = (idx: number) => {
        setExpandedSymbol(expandedSymbol === idx ? null : idx);
    };

    return (
        <div style={{
            padding: 12,
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(139, 92, 246, 0.1))',
            borderRadius: 10,
            fontFamily: "'Space Mono', monospace"
        }}>
            {/* Main Payout Table - Primary Focus */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 50px 50px 70px',
                gap: 4,
                padding: '6px 8px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 6,
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(200, 180, 255, 0.8)'
            }}>
                <div>{t.symbol || 'Symbol'}</div>
                <div style={{ textAlign: 'center' }}>3x</div>
                <div style={{ textAlign: 'center' }}>4x</div>
                <div style={{ textAlign: 'center' }}>5x</div>
            </div>

            {symbolData.map((row, idx) => (
                <React.Fragment key={idx}>
                    <div
                        className="payout-row"
                        onClick={() => handleSymbolClick(idx)}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 50px 50px 70px',
                            gap: 4,
                            padding: '5px 8px',
                            background: expandedSymbol === idx
                                ? 'rgba(139, 92, 246, 0.25)'
                                : row.special ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0,0,0,0.2)',
                            borderRadius: expandedSymbol === idx ? '4px 4px 0 0' : 4,
                            marginBottom: expandedSymbol === idx ? 0 : 3,
                            fontSize: 10,
                            border: row.special ? '1px solid rgba(251, 191, 36, 0.3)' : expandedSymbol === idx ? '1px solid rgba(139, 92, 246, 0.4)' : 'none',
                            borderBottom: expandedSymbol === idx ? 'none' : undefined,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: row.color, fontWeight: 700 }}>
                            <span style={{ fontSize: 14 }}>{row.emoji}</span> {row.name}
                            <span style={{ fontSize: 8, color: '#64748b', marginLeft: 'auto' }}>
                                {expandedSymbol === idx ? '▲' : '▼'}
                            </span>
                        </div>
                        <div style={{ textAlign: 'center', color: '#fff' }}>{row.m3}</div>
                        <div style={{ textAlign: 'center', color: '#fff' }}>{row.m4}</div>
                        <div style={{ textAlign: 'center', color: row.special ? '#fbbf24' : '#fff', fontWeight: row.special ? 800 : 400 }}>{row.m5}</div>
                    </div>

                    {/* Probability Dropdown */}
                    {expandedSymbol === idx && (
                        <div style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderTop: 'none',
                            borderRadius: '0 0 6px 6px',
                            padding: '8px 10px',
                            marginBottom: 3,
                            animation: 'slideDown 0.2s ease-out'
                        }}>
                            <div style={{
                                fontSize: 9,
                                color: '#a78bfa',
                                marginBottom: 6,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>📊 {t.probabilityLabel || 'Probability per spin'}</span>
                                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 400 }}>
                                    {t.symbolAppearRate || 'Symbol rate'}: {row.baseProb}%
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                {/* 3 Match */}
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 4,
                                    padding: '6px 8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>3x {t.matchLabel || 'match'}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>
                                        {(row.prob.match3 * 100) < 0.01 ? (row.prob.match3 * 100).toFixed(4) : (row.prob.match3 * 100).toFixed(2)}%
                                    </div>
                                    <div style={{ fontSize: 8, color: '#64748b' }}>
                                        1:{row.prob.match3 > 0 ? Math.round(1 / row.prob.match3).toLocaleString() : '∞'}
                                    </div>
                                </div>
                                {/* 4 Match */}
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 4,
                                    padding: '6px 8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>4x {t.matchLabel || 'match'}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#facc15' }}>
                                        {(row.prob.match4 * 100) < 0.01 ? (row.prob.match4 * 100).toFixed(4) : (row.prob.match4 * 100).toFixed(3)}%
                                    </div>
                                    <div style={{ fontSize: 8, color: '#64748b' }}>
                                        1:{row.prob.match4 > 0 ? Math.round(1 / row.prob.match4).toLocaleString() : '∞'}
                                    </div>
                                </div>
                                {/* 5 Match */}
                                <div style={{
                                    background: row.special ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0,0,0,0.3)',
                                    borderRadius: 4,
                                    padding: '6px 8px',
                                    textAlign: 'center',
                                    border: row.special ? '1px solid rgba(251, 191, 36, 0.3)' : 'none'
                                }}>
                                    <div style={{ fontSize: 9, color: row.special ? '#fbbf24' : '#94a3b8', marginBottom: 2 }}>
                                        5x {t.matchLabel || 'match'} {row.special && '🏆'}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: row.special ? '#fbbf24' : '#ef4444' }}>
                                        {(row.prob.match5 * 100).toFixed(6)}%
                                    </div>
                                    <div style={{ fontSize: 8, color: '#64748b' }}>
                                        1:{row.prob.match5 > 0 ? Math.round(1 / row.prob.match5).toLocaleString() : '∞'}
                                    </div>
                                </div>
                            </div>
                            {/* Expected Value mini-info */}
                            <div style={{
                                marginTop: 6,
                                fontSize: 8,
                                color: '#64748b',
                                textAlign: 'center',
                                fontStyle: 'italic'
                            }}>
                                💡 {t.probabilityNote || 'Odds ratio shows how many spins on average to hit'}
                            </div>
                        </div>
                    )}
                </React.Fragment>
            ))}

            {/* Jackpot Bonus Note */}
            <div style={{
                marginTop: 10,
                fontSize: 10,
                color: '#fbbf24',
                textAlign: 'center',
                fontStyle: 'italic',
                textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
            }}>
                🏆 {t.jackpotBonusNote}
            </div>

            {/* Explanation Section */}
            <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: 6,
                fontSize: 9,
                color: '#e9d5ff',
                lineHeight: 1.4
            }}>
                ℹ️ {t.payoutExplanation || 'Win by matching 3, 4, or 5 identical symbols consecutively. The Jackpot is won with 5 Banmao Cats.'}
            </div>

            {/* Secondary Tools Section - 2x2 Grid */}
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {/* Rules Toggle */}
                <button
                    onClick={() => { setShowRules(!showRules); setShowCalculator(false); setShowMechanism(false); setShowSecurity(false); setShowMultiSpin(false); }}
                    style={{
                        background: showRules ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        color: '#a78bfa',
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                    }}
                >
                    📜 {t.rulesLabel}
                </button>

                {/* Calculator Toggle */}
                <button
                    onClick={() => { setShowCalculator(!showCalculator); setShowRules(false); setShowMechanism(false); setShowSecurity(false); setShowMultiSpin(false); }}
                    style={{
                        background: showCalculator ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        color: '#22c55e',
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                    }}
                >
                    🧮 {t.calculatorTitle?.replace('🧮 ', '')}
                </button>

                {/* Mechanism Toggle */}
                <button
                    onClick={() => { setShowMechanism(!showMechanism); setShowRules(false); setShowCalculator(false); setShowSecurity(false); setShowMultiSpin(false); }}
                    style={{
                        background: showMechanism ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        color: '#60a5fa',
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                    }}
                >
                    📊 {t.mechanismBtn}
                </button>

                {/* Security Toggle */}
                <button
                    onClick={() => { setShowSecurity(!showSecurity); setShowRules(false); setShowCalculator(false); setShowMechanism(false); setShowMultiSpin(false); }}
                    style={{
                        background: showSecurity ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        color: '#ef4444',
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                    }}
                >
                    🔐 {t.securityBtn}
                </button>

                {/* Multi-Spin Toggle */}
                <button
                    onClick={() => { setShowMultiSpin(!showMultiSpin); setShowRules(false); setShowCalculator(false); setShowMechanism(false); setShowSecurity(false); }}
                    style={{
                        gridColumn: 'span 2',
                        background: showMultiSpin ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        color: '#fbbf24',
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                    }}
                >
                    🔄 {t.multiSpinBtn}
                </button>
            </div>

            {/* Rules Panel */}
            {showRules && (
                <div style={{
                    marginTop: 10,
                    padding: 12,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    fontSize: 9,
                    color: '#e2e8f0',
                    lineHeight: 1.6
                }}>
                    {/* How to Win */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#a855f7', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            🎰 {t.rulesHowToWin || 'How to Win'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div>• {t.rulesWinCondition || 'Match 3, 4, or 5 identical symbols anywhere on the 5 reels'}</div>
                            <div>• {t.rulesHigherPays || 'More matches = Higher multiplier payout'}</div>
                        </div>
                    </div>

                    {/* Symbol Probabilities */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#facc15', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            📊 {t.rulesSymbolProb || 'Symbol Probabilities'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1', fontSize: 8 }}>
                            <div>🐱 Banmao: 5% | 🍌 Banana: 8% | 💎 Diamond: 15%</div>
                            <div>⭐ Star: 20% | ☘️ Clover: 25% | 7️⃣ Seven: 27%</div>
                        </div>
                    </div>

                    {/* Entry Limits */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            💰 {t.rulesEntryLimits || 'Entry Limits'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div>• {t.rulesMinEntry || 'Minimum: Set by pool owner (default 100)'}</div>
                            <div>• {t.rulesMaxEntry || 'Maximum: Set by pool owner (default 10,000)'}</div>
                            <div>• {t.rulesRateLimit || 'Speed limit: Max 60 spins per minute'}</div>
                        </div>
                    </div>

                    {/* Jackpot */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            🏆 {t.rulesJackpotTitle || 'Jackpot (Super Prize)'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div>• {t.rulesJackpotCondition || 'Condition: 5x Banmao Cats (🐱🐱🐱🐱🐱)'}</div>
                            <div>• {t.rulesJackpotPrize || 'Prize: 175x entry + 450x Jackpot multiplier'}</div>
                            <div>• {t.rulesJackpotPool || 'Bonus: 100% of Jackpot Pool added to winnings'}</div>
                            <div>• {t.rulesJackpotContrib || 'Contribution: 2% of each entry → Jackpot Pool'}</div>
                        </div>
                    </div>

                    {/* Fairness */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            � {t.rulesFairnessTitle || 'Provably Fair'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div>• {t.rulesCommitReveal || 'Commit-Reveal: 2-step process prevents cheating'}</div>
                            <div>• {t.rulesBlockDelay || 'Security: 2-block delay before reveal (anti-miner)'}</div>
                            <div>• {t.rulesVerifiable || 'Verifiable: All results can be verified on-chain'}</div>
                        </div>
                    </div>

                    {/* Platform Fee */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            📋 {t.rulesPlatformFee || 'Fees & RTP'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div>• {t.rulesFeeAmount || 'Platform fee: 2% of each entry'}</div>
                            <div>• {t.rulesRTP || 'Target RTP: ~95% (Return to Player)'}</div>
                        </div>
                    </div>

                    {/* Refund Policy */}
                    <div>
                        <div style={{ color: '#f97316', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                            🔄 {t.rulesRefundTitle || 'Refund Policy'}
                        </div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div>• {t.rulesRefundTimeout || 'Timeout: 256 blocks (~10-20 minutes)'}</div>
                            <div>• {t.rulesRefundAction || 'Action: Click Refund to get 100% entry back'}</div>
                            <div>• {t.rulesRefundNote || 'Note: Expired commits forfeit entry if not claimed'}</div>
                        </div>
                    </div>
                </div>
            )}
            {/* Calculator Panel - Multi-Spin Style */}
            {showCalculator && (
                <div style={{
                    marginTop: 10,
                    padding: 10,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    fontSize: 9,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    maxHeight: 400,
                    overflowY: 'auto'
                }}>
                    {/* Header with Inputs */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 11 }}>
                            {t.calculatorTitle || 'Bảng Tính Tiền Thưởng'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#94a3b8', fontSize: 8 }}>Token/Spin:</span>
                            <input
                                type="number"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                min="100"
                                max="10000"
                                style={{
                                    width: 80,
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(250, 204, 21, 0.4)',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    color: '#facc15',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ color: '#facc15', fontSize: 8 }}>$BANMAO</span>
                        </div>
                    </div>

                    {/* 3-Match Payout Table (Green) */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#22c55e', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            {t.multiSpinCol3Match || '3x Khớp'} - {t.payoutLabel || 'Tiền Thưởng'}
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '30px 1fr 1fr 1fr 1fr 1fr',
                            gap: 1,
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            fontSize: 13
                        }}>
                            {/* Header */}
                            <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 4, fontWeight: 600, color: '#22c55e' }}></div>
                            <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 4, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>×1</div>
                            <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 4, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>×2</div>
                            <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 4, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>×3</div>
                            <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 4, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>×5</div>
                            <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 4, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>×10</div>
                            {symbolData.map((s, idx) => {
                                const bet = Number(betAmount) || 100;
                                const m3 = PAYOUT_TABLE[idx as keyof typeof PAYOUT_TABLE][3];
                                const win = (multiplier: number) => Math.floor(bet * multiplier * m3);
                                return (
                                    <React.Fragment key={`3m-${idx}`}>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 4, textAlign: 'center' }}>{s.emoji}</div>
                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 4, color: '#94a3b8', textAlign: 'center' }}>{win(1).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 4, color: '#94a3b8', textAlign: 'center' }}>{win(2).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 4, color: '#94a3b8', textAlign: 'center' }}>{win(3).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 4, color: '#94a3b8', textAlign: 'center' }}>{win(5).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: 4, color: '#22c55e', textAlign: 'center', fontWeight: 600 }}>{win(10).toLocaleString()}</div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4-Match Payout Table (Blue) */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            {t.multiSpinCol4Match || '4x Khớp'} - {t.payoutLabel || 'Tiền Thưởng'}
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '30px 1fr 1fr 1fr 1fr 1fr',
                            gap: 1,
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            fontSize: 13
                        }}>
                            {/* Header */}
                            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa' }}></div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>×1</div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>×2</div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>×3</div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>×5</div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>×10</div>
                            {symbolData.map((s, idx) => {
                                const bet = Number(betAmount) || 100;
                                const m4 = PAYOUT_TABLE[idx as keyof typeof PAYOUT_TABLE][4];
                                const win = (multiplier: number) => Math.floor(bet * multiplier * m4);
                                return (
                                    <React.Fragment key={`4m-${idx}`}>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 2, textAlign: 'center' }}>{s.emoji}</div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{win(1).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{win(2).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{win(3).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{win(5).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: 2, color: '#60a5fa', textAlign: 'center', fontWeight: 600 }}>{win(10).toLocaleString()}</div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5-Match Payout Table (Purple/Gold) */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            {t.multiSpinCol5Match || '5x Khớp'} - {t.payoutLabel || 'Tiền Thưởng'} 🏆
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '30px 1fr 1fr 1fr 1fr 1fr',
                            gap: 1,
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            fontSize: 13
                        }}>
                            {/* Header */}
                            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: 2, fontWeight: 600, color: '#a78bfa' }}></div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: 2, fontWeight: 600, color: '#a78bfa', textAlign: 'center' }}>×1</div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: 2, fontWeight: 600, color: '#a78bfa', textAlign: 'center' }}>×2</div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: 2, fontWeight: 600, color: '#a78bfa', textAlign: 'center' }}>×3</div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: 2, fontWeight: 600, color: '#a78bfa', textAlign: 'center' }}>×5</div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.3)', padding: 2, fontWeight: 600, color: '#a78bfa', textAlign: 'center' }}>×10</div>
                            {symbolData.map((s, idx) => {
                                const bet = Number(betAmount) || 100;
                                const m5 = PAYOUT_TABLE[idx as keyof typeof PAYOUT_TABLE][5];
                                const isJackpot = idx === 0;
                                const win = (multiplier: number) => Math.floor(bet * multiplier * m5);
                                return (
                                    <React.Fragment key={`5m-${idx}`}>
                                        <div style={{ background: isJackpot ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0,0,0,0.2)', padding: 2, textAlign: 'center' }}>{s.emoji}</div>
                                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: 2, color: isJackpot ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{win(1).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: 2, color: isJackpot ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{win(2).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: 2, color: isJackpot ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{win(3).toLocaleString()}</div>
                                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: 2, color: isJackpot ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{win(5).toLocaleString()}</div>
                                        <div style={{ background: isJackpot ? 'rgba(251, 191, 36, 0.2)' : 'rgba(139, 92, 246, 0.15)', padding: 2, color: isJackpot ? '#fbbf24' : '#a78bfa', textAlign: 'center', fontWeight: 600 }}>{win(10).toLocaleString()}{isJackpot && ' 🏆'}</div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fee Info */}
                    <div style={{
                        padding: 6,
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 4,
                        fontSize: 7,
                        color: '#94a3b8',
                        textAlign: 'center'
                    }}>
                        💡 {t.feeNote || 'Phí: Platform 2% + Jackpot Pool 2% = 4% tổng cược'}
                    </div>
                </div>
            )}

            {/* Mechanism Panel */}
            {showMechanism && (
                <div style={{
                    marginTop: 10,
                    padding: 10,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontSize: 9,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    maxHeight: 400,
                    overflowY: 'auto'
                }}>
                    <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 11, marginBottom: 8 }}>
                        {t.mechanismTitle}
                    </div>

                    {/* Random Source */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.mechanismRandomSource}</div>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{t.mechanismRandomDesc}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>• {t.mechanismEntropy1}</div>
                            <div>• {t.mechanismEntropy2}</div>
                            <div>• {t.mechanismEntropy3}</div>
                            <div>• {t.mechanismEntropy4}</div>
                            <div>• {t.mechanismEntropy5}</div>
                        </div>
                    </div>

                    {/* Symbol Generation */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.mechanismSymbolGen}</div>
                        <div style={{ color: '#cbd5e1' }}>{t.mechanismSymbolGenDesc}</div>
                    </div>

                    {/* Commit-Reveal */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.mechanismCommitReveal}</div>
                        <div style={{ color: '#22c55e', marginBottom: 2 }}>{t.mechanismCommitDesc}</div>
                        <div style={{ color: '#60a5fa' }}>{t.mechanismRevealDesc}</div>
                    </div>

                    {/* Payout Calculation */}
                    <div style={{ marginBottom: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.mechanismPayoutTitle || '💰 Payout Calculation'}</div>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{t.mechanismPayoutDesc}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.mechanismPayoutStep1}</div>
                            <div>{t.mechanismPayoutStep2}</div>
                            <div>{t.mechanismPayoutStep3}</div>
                            <div>{t.mechanismPayoutStep4}</div>
                            <div style={{ color: '#ef4444', fontWeight: 600 }}>{t.mechanismPayoutJackpot}</div>
                        </div>
                    </div>

                    {/* Fee Structure */}
                    <div style={{ marginBottom: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.mechanismFeeTitle || '📊 Fee Structure'}</div>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{t.mechanismFeeDesc}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.mechanismFee1}</div>
                            <div>{t.mechanismFee2}</div>
                            <div>{t.mechanismFee3}</div>
                        </div>
                        <div style={{ color: '#fbbf24', marginTop: 4, fontWeight: 500 }}>{t.mechanismFeeNote}</div>
                    </div>

                    {/* Multi-Spin Mechanism */}
                    <div style={{ marginBottom: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.mechanismMultiSpinTitle || '🔄 Multi-Spin'}</div>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{t.mechanismMultiSpinDesc}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.mechanismMultiSpin1}</div>
                            <div>{t.mechanismMultiSpin2}</div>
                            <div>{t.mechanismMultiSpin3}</div>
                            <div>{t.mechanismMultiSpin4}</div>
                            <div>{t.mechanismMultiSpin5}</div>
                        </div>
                    </div>

                    {/* Expired Commit Handling */}
                    <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>{t.mechanismExpiredTitle || '⏰ Expired Commits'}</div>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{t.mechanismExpiredDesc}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.mechanismExpired1}</div>
                            <div>{t.mechanismExpired2}</div>
                            <div style={{ color: '#ef4444', fontWeight: 600 }}>{t.mechanismExpired3}</div>
                            <div>{t.mechanismExpired4}</div>
                        </div>
                        <div style={{ color: '#fbbf24', marginTop: 4, fontWeight: 600, background: 'rgba(239,68,68,0.15)', padding: '4px 6px', borderRadius: 4 }}>
                            {t.mechanismExpiredNote}
                        </div>
                    </div>
                </div>
            )}

            {/* Security Panel */}
            {showSecurity && (
                <div style={{
                    marginTop: 10,
                    padding: 10,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: 9,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    maxHeight: 400,
                    overflowY: 'auto'
                }}>
                    <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 11, marginBottom: 8 }}>
                        {t.securityTitle}
                    </div>

                    {/* Why Cannot Cheat Header */}
                    <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 6 }}>{t.securityNoCheat}</div>

                    {/* House Cannot Cheat */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: 3 }}>{t.securityHouseCantCheat}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.securityHouseProof1}</div>
                            <div>{t.securityHouseProof2}</div>
                            <div>{t.securityHouseProof3}</div>
                        </div>
                    </div>

                    {/* Player Cannot Cheat */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#a78bfa', fontWeight: 600, marginBottom: 3 }}>{t.securityPlayerCantCheat}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.securityPlayerProof1}</div>
                            <div>{t.securityPlayerProof2}</div>
                            <div>{t.securityPlayerProof3}</div>
                        </div>
                    </div>

                    {/* Miner Cannot Cheat */}
                    <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#f97316', fontWeight: 600, marginBottom: 3 }}>{t.securityMinerCantCheat}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.securityMinerProof1}</div>
                            <div>{t.securityMinerProof2}</div>
                            <div>{t.securityMinerProof3}</div>
                        </div>
                    </div>

                    {/* OpenZeppelin Protections */}
                    <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>{t.securityOpenZeppelin || '🛡️ OpenZeppelin Protections'}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.securityOZ1}</div>
                            <div>{t.securityOZ2}</div>
                            <div>{t.securityOZ3}</div>
                            <div>{t.securityOZ4}</div>
                        </div>
                    </div>

                    {/* Fund Protections */}
                    <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>{t.securityProtections}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.securityCommitReveal}</div>
                            <div>{t.securityBlockhash}</div>
                            <div>{t.securityNonce}</div>
                            <div>{t.securityProtectedFunds}</div>
                            <div>{t.securityRateLimit}</div>
                        </div>
                    </div>

                    {/* Immutable Constants */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 4 }}>{t.securityConstants || '🔒 Immutable Constants'}</div>
                        <div style={{ paddingLeft: 10, color: '#cbd5e1' }}>
                            <div>{t.securityConstant1}</div>
                            <div>{t.securityConstant2}</div>
                            <div>{t.securityConstant3}</div>
                        </div>
                    </div>

                    {/* Conclusion */}
                    <div style={{
                        padding: '6px 8px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        borderRadius: 4,
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#22c55e',
                        fontWeight: 600
                    }}>
                        {t.securityConclusion}
                    </div>
                </div>
            )}

            {/* Multi-Spin Panel */}
            {showMultiSpin && (
                <div style={{
                    marginTop: 10,
                    padding: multiSpinZoom ? 16 : 10,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    fontSize: multiSpinZoom ? 18 : 13,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    maxHeight: multiSpinZoom ? 600 : 400,
                    overflowY: 'auto'
                }}>
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>
                            {t.multiSpinTitle}
                        </div>
                    </div>

                    {/* Per-Symbol Probability Table */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#facc15', fontWeight: 600, marginBottom: 6 }}>{t.multiSpinTableHeader}</div>

                        {/* 3-Match Table */}
                        <div style={{ marginBottom: multiSpinZoom ? 16 : 8 }}>
                            <div style={{ color: '#22c55e', fontWeight: 600, fontSize: multiSpinZoom ? 16 : 12, marginBottom: multiSpinZoom ? 6 : 3 }}>{t.multiSpinCol3Match}</div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: multiSpinZoom ? '50px 1fr 1fr 1fr 1fr' : '30px 1fr 1fr 1fr 1fr',
                                gap: multiSpinZoom ? 2 : 1,
                                background: 'rgba(0,0,0,0.4)',
                                borderRadius: 4,
                                overflow: 'hidden',
                                fontSize: multiSpinZoom ? 12 : 10
                            }}>
                                {/* Header */}
                                <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 2, fontWeight: 600, color: '#22c55e' }}></div>
                                <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 2, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>1x</div>
                                <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 2, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>3x</div>
                                <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 2, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>5x</div>
                                <div style={{ background: 'rgba(34, 197, 94, 0.3)', padding: 2, fontWeight: 600, color: '#22c55e', textAlign: 'center' }}>10x</div>
                                {symbolData.map((s, idx) => {
                                    const p3 = s.prob.match3;
                                    return (
                                        <React.Fragment key={`3m-${idx}`}>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 2, textAlign: 'center' }}>{s.emoji}</div>
                                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{(p3 * 100).toFixed(3)}%</div>
                                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{((1 - Math.pow(1 - p3, 3)) * 100).toFixed(3)}%</div>
                                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{((1 - Math.pow(1 - p3, 5)) * 100).toFixed(3)}%</div>
                                            <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: 2, color: '#22c55e', textAlign: 'center', fontWeight: 600 }}>{((1 - Math.pow(1 - p3, 10)) * 100).toFixed(2)}%</div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 4-Match Table */}
                        <div style={{ marginBottom: multiSpinZoom ? 16 : 8 }}>
                            <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: multiSpinZoom ? 16 : 12, marginBottom: multiSpinZoom ? 6 : 3 }}>{t.multiSpinCol4Match}</div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: multiSpinZoom ? '50px 1fr 1fr 1fr 1fr' : '30px 1fr 1fr 1fr 1fr',
                                gap: multiSpinZoom ? 2 : 1,
                                background: 'rgba(0,0,0,0.4)',
                                borderRadius: 4,
                                overflow: 'hidden',
                                fontSize: multiSpinZoom ? 12 : 10
                            }}>
                                {/* Header */}
                                <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa' }}></div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>1x</div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>3x</div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>5x</div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: 2, fontWeight: 600, color: '#60a5fa', textAlign: 'center' }}>10x</div>
                                {symbolData.map((s, idx) => {
                                    const p4 = s.prob.match4;
                                    return (
                                        <React.Fragment key={`4m-${idx}`}>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 2, textAlign: 'center' }}>{s.emoji}</div>
                                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{(p4 * 100).toFixed(4)}%</div>
                                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{((1 - Math.pow(1 - p4, 3)) * 100).toFixed(4)}%</div>
                                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 2, color: '#94a3b8', textAlign: 'center' }}>{((1 - Math.pow(1 - p4, 5)) * 100).toFixed(4)}%</div>
                                            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: 2, color: '#60a5fa', textAlign: 'center', fontWeight: 600 }}>{((1 - Math.pow(1 - p4, 10)) * 100).toFixed(3)}%</div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 5-Match Table */}
                        <div style={{ marginBottom: multiSpinZoom ? 16 : 8 }}>
                            <div style={{ color: '#a855f7', fontWeight: 600, fontSize: multiSpinZoom ? 16 : 12, marginBottom: multiSpinZoom ? 6 : 3 }}>{t.multiSpinCol5Match}</div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: multiSpinZoom ? '50px 1fr 1fr 1fr 1fr' : '30px 1fr 1fr 1fr 1fr',
                                gap: multiSpinZoom ? 2 : 1,
                                background: 'rgba(0,0,0,0.4)',
                                borderRadius: 4,
                                overflow: 'hidden',
                                fontSize: multiSpinZoom ? 12 : 10
                            }}>
                                {/* Header */}
                                <div style={{ background: 'rgba(168, 85, 247, 0.3)', padding: 2, fontWeight: 600, color: '#a855f7' }}></div>
                                <div style={{ background: 'rgba(168, 85, 247, 0.3)', padding: 2, fontWeight: 600, color: '#a855f7', textAlign: 'center' }}>1x</div>
                                <div style={{ background: 'rgba(168, 85, 247, 0.3)', padding: 2, fontWeight: 600, color: '#a855f7', textAlign: 'center' }}>3x</div>
                                <div style={{ background: 'rgba(168, 85, 247, 0.3)', padding: 2, fontWeight: 600, color: '#a855f7', textAlign: 'center' }}>5x</div>
                                <div style={{ background: 'rgba(168, 85, 247, 0.3)', padding: 2, fontWeight: 600, color: '#a855f7', textAlign: 'center' }}>10x</div>
                                {symbolData.map((s, idx) => {
                                    const p5 = s.prob.match5;
                                    return (
                                        <React.Fragment key={`5m-${idx}`}>
                                            <div style={{ background: idx === 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0,0,0,0.2)', padding: 2, textAlign: 'center' }}>{s.emoji}</div>
                                            <div style={{ background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(168, 85, 247, 0.1)', padding: 2, color: idx === 0 ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{(p5 * 100).toFixed(5)}%</div>
                                            <div style={{ background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(168, 85, 247, 0.1)', padding: 2, color: idx === 0 ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{((1 - Math.pow(1 - p5, 3)) * 100).toFixed(5)}%</div>
                                            <div style={{ background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(168, 85, 247, 0.1)', padding: 2, color: idx === 0 ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{((1 - Math.pow(1 - p5, 5)) * 100).toFixed(5)}%</div>
                                            <div style={{ background: idx === 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(168, 85, 247, 0.15)', padding: 2, color: idx === 0 ? '#fbbf24' : '#a855f7', textAlign: 'center', fontWeight: 600 }}>{((1 - Math.pow(1 - p5, 10)) * 100).toFixed(4)}%</div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ color: '#64748b', fontSize: 7, marginTop: 4, fontStyle: 'italic' }}>{t.multiSpinFormula}</div>
                    </div>

                    {/* Important Notes */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>{t.multiSpinNote}</div>
                        <div style={{ paddingLeft: 8, color: '#cbd5e1' }}>
                            <div style={{ marginBottom: 2 }}>• {t.multiSpinNote1}</div>
                            <div style={{ marginBottom: 2 }}>• {t.multiSpinNote2}</div>
                            <div style={{ marginBottom: 2 }}>• {t.multiSpinNote3}</div>
                            <div>• {t.multiSpinNote4}</div>
                        </div>
                    </div>

                    {/* Practical Example */}
                    <div style={{
                        padding: '8px 10px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: 6,
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                        <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 6 }}>{t.multiSpinExample}</div>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{t.multiSpinExampleDesc}</div>
                        <div style={{ paddingLeft: 8, marginBottom: 6 }}>
                            <div style={{ color: '#facc15' }}>• {t.multiSpinExampleTotal}</div>
                            <div style={{ color: '#22c55e' }}>• {t.multiSpinExample3Match}</div>
                            <div style={{ color: '#ef4444' }}>• {t.multiSpinExampleLose}</div>
                        </div>
                        <div style={{ color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>{t.multiSpinExampleResults}</div>
                        <div style={{ paddingLeft: 8 }}>
                            <div style={{ color: '#ef4444' }}>• {t.multiSpinResult0}</div>
                            <div style={{ color: '#22c55e' }}>• {t.multiSpinResult1}</div>
                            <div style={{ color: '#60a5fa' }}>• {t.multiSpinResult2}</div>
                            <div style={{ color: '#fbbf24', fontWeight: 600 }}>• {t.multiSpinResultJP}</div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .payout-row:hover {
                    background: rgba(139, 92, 246, 0.2) !important;
                    transform: translateX(2px);
                }
            `}</style>
        </div>
    );
}
