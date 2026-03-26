/**
 * TimerPrizeDetail - Modal panel showing prize breakdown
 * when user clicks on the Soft or Hard timer clock.
 * Shows real-time estimates based on current game state.
 */
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUnits } from "viem";
import { V11_FUND_DISTRIBUTION } from "../lib/constants";
import { LocaleStrings } from "../lib/i18n/types";
import type { TopAttacker } from "../lib/types";

interface TimerPrizeDetailProps {
    type: 'soft' | 'hard';
    isOpen: boolean;
    onClose: () => void;
    // Game state
    jackpotPool: bigint;
    currentLeader: `0x${string}`;
    totalAttacks: bigint;
    topAttackers: TopAttacker[];
    attackCost: bigint;
    // Config
    winnerPercent?: number;
    topAttackersPercent?: number;
    minAttacksForReward?: number;
    // i18n
    t: LocaleStrings;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const EXPLORER_BASE = "https://web3.okx.com/explorer/x-layer/address/";

export default function TimerPrizeDetail({
    type,
    isOpen,
    onClose,
    jackpotPool,
    currentLeader,
    totalAttacks,
    topAttackers,
    attackCost,
    winnerPercent = 75,
    topAttackersPercent = 25,
    minAttacksForReward = 10,
    t,
}: TimerPrizeDetailProps) {
    // Mobile detection
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const poolValue = Number(formatUnits(jackpotPool, 18));
    const costPerGift = Number(formatUnits(attackCost, 18));
    const totalAtks = Number(totalAttacks);

    // For Hard Win: 30% seed deducted first
    const isHard = type === 'hard';
    const seedDeduction = isHard ? Math.round(poolValue * 30 / 100) : 0;
    const distributablePool = poolValue - seedDeduction;

    // Winner & Top 10 shares
    const winnerShare = Math.round(distributablePool * winnerPercent / 100);
    const top10Share = Math.round(distributablePool * topAttackersPercent / 100);

    // Calculate individual top 10 shares
    const qualifiedAttackers = topAttackers.filter(a => Number(a.attacks) >= minAttacksForReward);
    const totalQualifiedAttacks = qualifiedAttackers.reduce((sum, a) => sum + Number(a.attacks), 0);

    const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    const fmt = (n: number) => Math.round(n).toLocaleString();

    // Per-gift distribution
    const perGift = {
        jackpot: Math.round(costPerGift * V11_FUND_DISTRIBUTION.JACKPOT / 100),
        dividends: Math.round(costPerGift * V11_FUND_DISTRIBUTION.DIVIDENDS / 100),
        seed: Math.round(costPerGift * V11_FUND_DISTRIBUTION.SEED_FUND / 100),
        staking: Math.round(costPerGift * V11_FUND_DISTRIBUTION.STAKING / 100),
        burn: Math.round(costPerGift * V11_FUND_DISTRIBUTION.BURN / 100),
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        padding: '16px',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ duration: 0.25, type: 'spring', damping: 25 }}
                        style={{
                            width: '100%',
                            maxWidth: isMobile ? '88vw' : '420px',
                            maxHeight: isMobile ? '78vh' : '85vh',
                            overflowY: 'auto',
                            background: 'linear-gradient(145deg, #1a1a2e, #0f0f23)',
                            borderRadius: isMobile ? '14px' : '20px',
                            border: isHard
                                ? '1px solid rgba(34, 211, 238, 0.3)'
                                : '1px solid rgba(250, 204, 21, 0.3)',
                            boxShadow: isHard
                                ? '0 20px 60px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
                                : '0 20px 60px rgba(250, 204, 21, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                            padding: '0',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: isMobile ? '14px 14px 10px' : '20px 20px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div>
                                <div style={{
                                    fontSize: isMobile ? '14px' : '16px',
                                    fontWeight: 800,
                                    color: isHard ? '#22d3ee' : '#facc15',
                                    marginBottom: '2px',
                                }}>
                                    {isHard ? t.timerDetailHardTitle : t.timerDetailSoftTitle}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {t.timerDetailTitle}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: isMobile ? '12px 14px 14px' : '16px 20px 20px' }}>
                            {totalAtks === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '30px 20px',
                                    color: '#94a3b8',
                                    fontSize: '14px',
                                }}>
                                    🐱 {t.timerDetailNoAttacks}
                                </div>
                            ) : (
                                <>
                                    {/* Total Pool */}
                                    <div style={{
                                        background: isHard
                                            ? 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(59,130,246,0.08))'
                                            : 'linear-gradient(135deg, rgba(250,204,21,0.08), rgba(245,158,11,0.08))',
                                        borderRadius: isMobile ? '8px' : '12px',
                                        padding: isMobile ? '10px' : '14px',
                                        marginBottom: '12px',
                                        border: isHard
                                            ? '1px solid rgba(34,211,238,0.15)'
                                            : '1px solid rgba(250,204,21,0.15)',
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                                            {t.timerDetailTotalPool}
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? '20px' : '24px',
                                            fontWeight: 800,
                                            background: isHard
                                                ? 'linear-gradient(135deg, #22d3ee, #3b82f6)'
                                                : 'linear-gradient(135deg, #facc15, #f59e0b)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}>
                                            {fmt(poolValue)} $BANMAO
                                        </div>
                                    </div>

                                    {/* Hard Win: Seed Deduction */}
                                    {isHard && seedDeduction > 0 && (
                                        <div style={{
                                            background: 'rgba(74, 222, 128, 0.08)',
                                            borderRadius: '10px',
                                            padding: '10px 14px',
                                            marginBottom: '12px',
                                            border: '1px solid rgba(74, 222, 128, 0.15)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '13px',
                                        }}>
                                            <span style={{ color: '#4ade80' }}>{t.timerDetailSeedNext}</span>
                                            <span style={{ color: '#4ade80', fontWeight: 700 }}>
                                                -{fmt(seedDeduction)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Current Leader / Winner */}
                                    <div style={{
                                        background: 'rgba(255, 215, 0, 0.06)',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        marginBottom: '12px',
                                        border: '1px solid rgba(255, 215, 0, 0.12)',
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                                            {t.timerDetailCurrentLeader}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {currentLeader === ZERO_ADDR ? (
                                                <span style={{
                                                    fontFamily: "'Fira Code', monospace",
                                                    color: '#ffd700',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                }}>—</span>
                                            ) : (
                                                <a
                                                    href={`${EXPLORER_BASE}${currentLeader}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontFamily: "'Fira Code', monospace",
                                                        color: '#ffd700',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        textDecoration: 'none',
                                                        borderBottom: '1px dashed rgba(255,215,0,0.3)',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = '#ffd700'}
                                                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'rgba(255,215,0,0.3)'}
                                                >
                                                    {shortAddr(currentLeader)} ↗
                                                </a>
                                            )}
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                    {t.timerDetailWinnerPrize} ({winnerPercent}%)
                                                </div>
                                                <div style={{
                                                    fontSize: isMobile ? '16px' : '18px',
                                                    fontWeight: 800,
                                                    color: '#ffd700',
                                                }}>
                                                    {fmt(winnerShare)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top 10 Prize */}
                                    <div style={{
                                        background: 'rgba(168, 85, 247, 0.06)',
                                        borderRadius: isMobile ? '8px' : '10px',
                                        padding: isMobile ? '8px 10px' : '12px 14px',
                                        marginBottom: '12px',
                                        border: '1px solid rgba(168, 85, 247, 0.12)',
                                    }}>
                                        <div style={{
                                            fontSize: '11px',
                                            color: '#94a3b8',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                        }}>
                                            <span>🏆 {t.timerDetailTop10Prize} ({topAttackersPercent}%)</span>
                                            <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '13px' }}>
                                                {fmt(top10Share)} $BANMAO
                                            </span>
                                        </div>

                                        {/* Top 10 breakdown table */}
                                        {topAttackers.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {topAttackers.slice(0, 10).map((attacker, i) => {
                                                    const atkCount = Number(attacker.attacks);
                                                    const isQualified = atkCount >= minAttacksForReward;
                                                    const share = isQualified && totalQualifiedAttacks > 0
                                                        ? (atkCount / totalQualifiedAttacks) * top10Share
                                                        : 0;
                                                    return (
                                                        <div
                                                            key={attacker.addr}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                background: i === 0
                                                                    ? 'rgba(255, 215, 0, 0.06)'
                                                                    : 'rgba(255,255,255,0.02)',
                                                                fontSize: '11px',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{
                                                                    width: '18px',
                                                                    textAlign: 'center',
                                                                    color: i < 3 ? '#ffd700' : '#64748b',
                                                                    fontWeight: i < 3 ? 700 : 400,
                                                                    fontSize: '10px',
                                                                }}>
                                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                                                </span>
                                                                <a
                                                                    href={`${EXPLORER_BASE}${attacker.addr}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{
                                                                        fontFamily: "'Fira Code', monospace",
                                                                        color: '#cbd5e1',
                                                                        fontSize: '10px',
                                                                        textDecoration: 'none',
                                                                        borderBottom: '1px dashed rgba(203,213,225,0.3)',
                                                                        transition: 'all 0.2s',
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#ffd700'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                                                                >
                                                                    {shortAddr(attacker.addr)} ↗
                                                                </a>
                                                                <span style={{ color: '#64748b', fontSize: '9px' }}>
                                                                    ({atkCount}x)
                                                                </span>
                                                            </div>
                                                            <div>
                                                                {isQualified ? (
                                                                    <span style={{ color: '#a855f7', fontWeight: 600 }}>
                                                                        {fmt(share)}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#ef4444', fontSize: '9px' }}>
                                                                        {t.timerDetailNotQualified}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
                                                —
                                            </div>
                                        )}
                                    </div>

                                    {/* Per-Gift Distribution */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        marginBottom: '12px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                                            📊 {t.timerDetailDistribution} ({costPerGift.toLocaleString()} $BANMAO)
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                                            <div style={distItemStyle('#ffd700', 'rgba(255,215,0,0.08)')}>
                                                <span>🏆 Jackpot {V11_FUND_DISTRIBUTION.JACKPOT}%</span>
                                                <span style={{ color: '#ffd700', fontWeight: 600 }}>+{fmt(perGift.jackpot)}</span>
                                            </div>
                                            <div style={distItemStyle('#22d3ee', 'rgba(34,211,238,0.08)')}>
                                                <span>👥 Dividends {V11_FUND_DISTRIBUTION.DIVIDENDS}%</span>
                                                <span style={{ color: '#22d3ee', fontWeight: 600 }}>+{fmt(perGift.dividends)}</span>
                                            </div>
                                            <div style={distItemStyle('#4ade80', 'rgba(74,222,128,0.08)')}>
                                                <span>🌱 Seed {V11_FUND_DISTRIBUTION.SEED_FUND}%</span>
                                                <span style={{ color: '#4ade80', fontWeight: 600 }}>+{fmt(perGift.seed)}</span>
                                            </div>
                                            <div style={distItemStyle('#a855f7', 'rgba(168,85,247,0.08)')}>
                                                <span>💎 Staking {V11_FUND_DISTRIBUTION.STAKING}%</span>
                                                <span style={{ color: '#a855f7', fontWeight: 600 }}>+{fmt(perGift.staking)}</span>
                                            </div>
                                            <div style={{ ...distItemStyle('#ef4444', 'rgba(239,68,68,0.08)'), gridColumn: 'span 2' }}>
                                                <span>🔥 Burn {V11_FUND_DISTRIBUTION.BURN}%</span>
                                                <span style={{ color: '#ef4444', fontWeight: 600 }}>+{fmt(perGift.burn)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Disclaimer */}
                                    <div style={{
                                        fontSize: '10px',
                                        color: '#64748b',
                                        textAlign: 'center',
                                        lineHeight: 1.5,
                                        padding: '0 8px',
                                    }}>
                                        {t.timerDetailDisclaimer}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Helper style for distribution grid items */
function distItemStyle(color: string, bg: string): React.CSSProperties {
    return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: '6px',
        background: bg,
        color: '#94a3b8',
    };
}
