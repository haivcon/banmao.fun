// ===== VIEW PLAYER PANEL =====
// Displays another player's profile - matches SlotsProfileCard layout exactly
// Uses shared data from parent + onSpinClick for shared modal

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DraggablePanel } from './DraggablePanel';
import { SlotsTranslations } from '../lib/i18n';
import { getSlotsAvatarEmoji, SlotsAvatarIndex } from '../lib/slotsProfiles';
import { SlotWinner } from './TopWinnersPanel';
import { getPlayerTier, getPlayerAchievements, ACHIEVEMENTS, TierInfo } from '../lib/tiers';
import { groupHistoryByTx, GroupedSpinHistory } from '../lib/historyUtils';

// Slot symbols - must match lib/abis.ts
const SLOT_SYMBOLS = ['🐱', '🍌', '💎', '🌟', '🍀', '7️⃣'];

interface ViewPlayerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimize?: () => void;
    player: SlotWinner | null;
    t: SlotsTranslations;
    zIndex?: number;
    onFocus?: () => void;
    rank?: number;
    // Shared data & callback - matches SlotsProfileCard pattern
    playerHistory?: any[]; // If provided, use this instead of fetching
    onSpinClick?: (spin: any) => void; // Use shared modal from parent
}

export function ViewPlayerPanel({
    isOpen,
    onClose,
    onMinimize,
    player,
    t,
    zIndex = 10000,
    onFocus,
    rank,
    playerHistory, // From parent if available
    onSpinClick, // Use parent's modal
}: ViewPlayerPanelProps) {
    const [copied, setCopied] = useState(false);
    const [fetchedHistory, setFetchedHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, title?: string, content: string } | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const handleHover = (e: React.MouseEvent, title: string, content: string) => {
        setTooltip({ x: e.clientX, y: e.clientY, title, content });
    };
    const handleLeave = () => setTooltip(null);

    // Use playerHistory if provided, otherwise fetch
    const history = playerHistory || fetchedHistory;

    // Fetch player history only if playerHistory not provided
    useEffect(() => {
        if (playerHistory) return; // Use parent's data, don't fetch
        if (!isOpen || !player?.address) {
            setFetchedHistory([]);
            return;
        }

        setLoadingHistory(true);
        fetch(`/api/slots/history-chain?address=${player.address}&limit=20`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setFetchedHistory(data.history || []);
                setLoadingHistory(false);
            })
            .catch(() => setLoadingHistory(false));
    }, [isOpen, player?.address, playerHistory]);

    // Convert result array to emoji symbols (same as SlotsProfileCard uses spin.symbols directly)
    const getSymbolsDisplay = useCallback((spin: any): string => {
        // If symbols is already emoji string, return it
        if (spin.symbols && typeof spin.symbols === 'string' && !spin.symbols.includes(',')) {
            return spin.symbols;
        }
        // If result is an array, convert to emojis
        if (spin.result && Array.isArray(spin.result)) {
            return spin.result.map((idx: number) => SLOT_SYMBOLS[idx] || '❓').join('');
        }
        // If symbols is a comma-separated string like "5,3,1,1,4", convert it
        if (spin.symbols && typeof spin.symbols === 'string') {
            const indices = spin.symbols.split(',').map((s: string) => parseInt(s.trim()));
            return indices.map((idx: number) => SLOT_SYMBOLS[idx] || '❓').join('');
        }
        return '❓❓❓❓❓';
    }, []);

    // Format local time (same as SlotsProfileCard)
    const formatLocalTime = (timestamp: number) => {
        const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
        const date = new Date(ms);
        return date.toLocaleString(undefined, {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    // Format token amounts
    const formatAmount = (value: bigint | undefined | string): string => {
        if (!value) return '0';
        try {
            const val = typeof value === 'string' ? BigInt(value) : value;
            const num = Number(val) / 1e18;
            if (isNaN(num)) return '0';
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
            return num.toFixed(0);
        } catch { return '0'; }
    };

    // Use stats from API (player.totalSpins, player.totalWins) for consistency
    // Fallback to history count only if API data not available
    const totalSpins = player?.totalSpins ?? history.length;
    const totalWins = player?.totalWins ?? history.filter((s: any) => s.multiplier >= 1).length;
    const displayWinRate = totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(1) : '0.0';

    // Calculate lucky streak from history (same as SlotsProfileCard)
    const luckyStreak = useMemo(() => {
        if (!history || history.length === 0) return 0;
        let streak = 0;
        for (const spin of history) {
            if (spin.multiplier >= 1) streak++;
            else break;
        }
        return streak;
    }, [history]);

    // Sparkline from history (last 7 results) - same as SlotsProfileCard
    const sparkline = useMemo(() => {
        if (!history || history.length === 0) return '▁▁▁▁▁▁▁';
        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const recent = history.slice(0, 7).reverse();
        return recent.map((spin: any) => {
            const mult = spin.multiplier || 0;
            if (mult <= 0) return chars[0];
            if (mult < 1) return chars[1];
            if (mult < 2) return chars[2];
            if (mult < 5) return chars[4];
            if (mult < 10) return chars[6];
            return chars[7];
        }).join('');
    }, [history]);

    // XP & Level calculation (same as SlotsProfileCard)
    const xp = useMemo(() => {
        if (!player) return 0;
        const spinsXP = totalSpins * 10;
        const winsXP = totalWins * 50;
        let bigWinXP = 0;
        try { bigWinXP = Math.floor(Number(player.highestWin || BigInt(0)) / 1e18); } catch { }
        return spinsXP + winsXP + bigWinXP;
    }, [player, totalSpins, totalWins]);

    const level = useMemo(() => {
        if (xp < 100) return 1;
        if (xp < 500) return 2;
        if (xp < 1000) return 3;
        if (xp < 2500) return 4;
        if (xp < 5000) return 5;
        if (xp < 10000) return 6;
        if (xp < 25000) return 7;
        if (xp < 50000) return 8;
        if (xp < 100000) return 9;
        return 10 + Math.floor((xp - 100000) / 50000);
    }, [xp]);

    const levelThresholds = [0, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    const currentThreshold = level <= 10 ? levelThresholds[level - 1] || 0 : 100000 + (level - 10) * 50000;
    const nextThreshold = level < 10 ? levelThresholds[level] || 100 : currentThreshold + 50000;
    const xpProgress = Math.min(100, ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100) || 0;

    // Tier and Achievements from shared logic
    const tier = getPlayerTier(totalSpins);

    // Achievement Badges
    const badges = useMemo(() => {
        if (!player) return [];

        const achievementIds = getPlayerAchievements({
            totalSpins,
            totalWins,
            totalWonAmount: typeof player.totalWonAmount === 'bigint' ? player.totalWonAmount : BigInt(player.totalWonAmount || 0),
            totalWagered: typeof player.totalWagered === 'bigint' ? player.totalWagered : BigInt(player.totalWagered || 0),
            jackpotWins: player.jackpotsWon || 0,
            winStreak: luckyStreak
        });

        return achievementIds.map(id => {
            const ach = ACHIEVEMENTS[id];
            return {
                id,
                icon: ach.icon,
                name: (t[`ach${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof SlotsTranslations] as string) || ach.name,
                desc: (t[`achDesc${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof SlotsTranslations] as string) || ach.description,
                color: ach.color
            };
        });
    }, [totalSpins, totalWins, player, luckyStreak, t]);

    const copyAddress = () => {
        if (player?.address) {
            navigator.clipboard.writeText(player.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // EARLY RETURN AFTER ALL HOOKS
    if (!isOpen || !player) return null;

    return (
        <>
            <DraggablePanel
                id={`view-player-${player.address}`}
                title={t.playerProfile || 'Hồ Sơ Người Chơi'}
                icon="👤"
                isOpen={isOpen}
                onClose={onClose}
                onMinimize={onMinimize}
                zIndex={zIndex}
                onFocus={onFocus}
                defaultPosition={{ x: 100 + Math.random() * 50, y: 60 + Math.random() * 30 }}
                defaultSize={{ width: 360, height: 520 }}
                minSize={{ width: 320, height: 400 }}
            >
                {/* Hide scrollbar styles */}
                <style>{`
                    .view-player-scroll::-webkit-scrollbar { display: none; }
                    .view-player-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>

                <div className="view-player-scroll" style={{
                    padding: 12,
                    maxHeight: 480,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    background: 'linear-gradient(145deg, rgba(168,85,247,0.12), rgba(0,0,0,0.3))',
                    borderRadius: 12,
                }}>
                    {/* Header with Avatar & Name - CENTERED (same as SlotsProfileCard) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10 }}>
                        {/* Avatar */}
                        <div style={{
                            width: 56, height: 56,
                            borderRadius: 16,
                            background: 'linear-gradient(145deg, rgba(168,85,247,0.4), rgba(124,58,237,0.3))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 34,
                            border: '2px solid rgba(168,85,247,0.6)',
                            boxShadow: '0 0 20px rgba(168,85,247,0.3)',
                            position: 'relative',
                            marginBottom: 8
                        }}>
                            {getSlotsAvatarEmoji((player.avatar || 0) as SlotsAvatarIndex)}
                            <div style={{
                                position: 'absolute', bottom: -2, right: -2,
                                width: 14, height: 14, borderRadius: '50%',
                                background: '#22c55e', border: '2px solid #1e293b'
                            }} />
                        </div>

                        {/* Name */}
                        <div style={{
                            fontSize: 16, fontWeight: 900, color: '#fff',
                            fontFamily: "'Space Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 2
                        }}>
                            {player.name || `Spinner ${player.address?.slice(0, 6)}`}
                        </div>

                        {/* Address with copy */}
                        <div
                            onClick={copyAddress}
                            style={{
                                fontSize: 10, color: '#94a3b8', fontFamily: "'Space Mono', monospace",
                                marginBottom: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                            }}
                        >
                            {player.address.slice(0, 6)}...{player.address.slice(-4)} {copied ? '✅' : '📋'}
                        </div>

                        {/* Rank Badge & Tier Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {rank && rank > 0 && (
                                <div style={{
                                    fontSize: 11, color: '#fbbf24', fontWeight: 800,
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    textTransform: 'uppercase', letterSpacing: '1px',
                                }}>
                                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆'}
                                    #{rank}
                                </div>
                            )}

                            <div style={{
                                fontSize: 10, color: tier.color, fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 6,
                                background: `${tier.color}15`, border: `1px solid ${tier.color}30`
                            }}>
                                {tier.icon || '🎖️'} {t[`tier${tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}` as keyof SlotsTranslations] || tier.name}
                            </div>
                        </div>

                        {/* XP & Level Bar */}
                        <div style={{
                            width: '100%', maxWidth: 280,
                            padding: '6px 10px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: 9999,
                            border: '1px solid rgba(168,85,247,0.15)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>
                                    ⭐ {(t as any).level || 'Level'} {level}
                                </span>
                                <span style={{ fontSize: 9, color: '#94a3b8' }}>{xp.toLocaleString()} {(t as any).xpLabel || 'XP'}</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 9999, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${xpProgress}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #fbbf24, #f97316)',
                                    borderRadius: 9999,
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Row 1: Total Won + Win Streak */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 6 }}>
                        <div
                            style={{
                                padding: '8px 6px',
                                background: 'rgba(34,197,94,0.08)',
                                borderRadius: 9999,
                                textAlign: 'center',
                                border: '1px solid rgba(34,197,94,0.3)',
                                cursor: 'help',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.background = 'rgba(34,197,94,0.15)';
                                handleHover(e, (t as any).totalWon || 'Total Won', (t as any).tooltipTotalWon || 'Total amount of tokens won from all spins');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = 'rgba(34,197,94,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>
                                🐱🍌 {formatAmount(player.totalWonAmount)}
                            </div>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{(t as any).totalWon || 'Tổng Thắng'}</div>
                        </div>
                        <div
                            style={{
                                padding: '8px 6px',
                                background: luckyStreak >= 3 ? 'rgba(249,115,22,0.15)' : 'rgba(250,204,21,0.08)',
                                borderRadius: 9999,
                                textAlign: 'center',
                                border: `1px solid ${luckyStreak >= 3 ? 'rgba(249,115,22,0.4)' : 'rgba(250,204,21,0.2)'}`,
                                cursor: 'help',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.background = luckyStreak >= 3 ? 'rgba(249,115,22,0.25)' : 'rgba(250,204,21,0.15)';
                                handleHover(e, (t as any).winStreak || 'Win Streak', (t as any).tooltipStreak || 'Current consecutive winning spins');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = luckyStreak >= 3 ? 'rgba(249,115,22,0.15)' : 'rgba(250,204,21,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: luckyStreak >= 3 ? '#f97316' : '#facc15' }}>
                                🔥 {luckyStreak}
                            </div>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{(t as any).winStreak || 'Chuỗi Thắng'}</div>
                        </div>
                    </div>

                    {/* Row 2: Stats Grid - 3 columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
                        <div
                            style={{ padding: '6px 4px', background: 'rgba(250,204,21,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(250,204,21,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(250,204,21,0.15)';
                                handleHover(e, t.totalSpins || 'Total Spins', t.tooltipTotalSpins || 'Total number of spins made');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(250,204,21,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#facc15' }}>{totalSpins}</div>
                            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{t.totalSpins}</div>
                        </div>
                        <div
                            style={{ padding: '6px 4px', background: 'rgba(34,197,94,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(34,197,94,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(34,197,94,0.15)';
                                handleHover(e, t.totalWins || 'Total Wins', t.tooltipTotalWins || 'Total number of winning spins');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(34,197,94,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{totalWins}</div>
                            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{t.totalWins}</div>
                        </div>
                        <div
                            style={{ padding: '6px 4px', background: 'rgba(168,85,247,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(168,85,247,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(168,85,247,0.15)';
                                handleHover(e, t.winRate || 'Win Rate', t.tooltipWinRate || 'Percentage of winning spins');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(168,85,247,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#a855f7' }}>{displayWinRate}%</div>
                            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{t.winRate}</div>
                        </div>
                    </div>

                    {/* Row 3: Biggest Win + Sparkline */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 6 }}>
                        <div
                            style={{ padding: '8px 6px', background: 'rgba(250,204,21,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(250,204,21,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = 'rgba(250,204,21,0.15)';
                                handleHover(e, t.biggestWin || 'Biggest Win', t.tooltipBiggestWin || 'Largest single win amount');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(250,204,21,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#facc15' }}>🏆 {formatAmount(player.highestWin)}</div>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{t.biggestWin}</div>
                        </div>
                        <div
                            style={{ padding: '8px 6px', background: 'rgba(0,245,255,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(0,245,255,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = 'rgba(0,245,255,0.15)';
                                handleHover(e, (t as any).dayTrend || '7-Day Trend', (t as any).tooltipTrend || 'Recent spin results - higher bars mean bigger wins');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,245,255,0.08)';
                                handleLeave();
                            }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#00f5ff', letterSpacing: 2 }}>
                                {sparkline}
                            </div>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{(t as any).dayTrend || '7-Day Trend'}</div>
                        </div>
                    </div>

                    {/* Row 4: Achievement Badges - Expanded */}
                    {badges.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginBottom: 4, paddingLeft: 4 }}>
                                🎖️ {(t as any).achievements || 'Achievements'}
                            </div>
                            <div style={{
                                display: 'flex', gap: 6, flexWrap: 'wrap',
                                padding: '8px', background: 'rgba(0,0,0,0.2)',
                                borderRadius: 10, border: '1px solid rgba(168,85,247,0.15)'
                            }}>
                                {badges.map((badge, i) => (
                                    <div key={i}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '4px 8px', borderRadius: 6,
                                            background: `${badge.color}15`, border: `1px solid ${badge.color}30`,
                                            cursor: 'help'
                                        }}
                                        onMouseEnter={(e) => handleHover(e, badge.name, badge.desc)}
                                        onMouseLeave={handleLeave}
                                    >
                                        <span style={{ fontSize: 14 }}>{badge.icon}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Social Links */}
                    {(player.telegram || player.twitter) && (
                        <div style={{
                            marginBottom: 6, paddingTop: 8, paddingBottom: 8,
                            borderTop: '1px solid rgba(168,85,247,0.2)',
                            display: 'flex', gap: 12, justifyContent: 'center'
                        }}>
                            {player.telegram && (
                                <a href={`https://t.me/${player.telegram}`} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 12, color: '#0088cc', textDecoration: 'none', fontWeight: 600 }}>
                                    📱 @{player.telegram}
                                </a>
                            )}
                            {player.twitter && (
                                <a href={`https://x.com/${player.twitter}`} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 12, color: '#1da1f2', textDecoration: 'none', fontWeight: 600 }}>
                                    𝕏 @{player.twitter}
                                </a>
                            )}
                        </div>
                    )}

                    {/* Spin History - Collapsible (EXACT SAME as SlotsProfileCard) */}
                    {history && history.length > 0 && (
                        <div style={{
                            marginTop: 12, paddingTop: 12,
                            borderTop: '1px solid rgba(168,85,247,0.2)'
                        }}>
                            <div
                                onClick={() => setShowHistory(!showHistory)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', marginBottom: showHistory ? 10 : 0
                                }}
                            >
                                <span style={{ fontSize: 11, color: '#00FFFF', fontWeight: 600 }}>
                                    📜 {(t as any).spinHistory || 'Spin History'}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>{showHistory ? '▲' : '▼'}</span>
                            </div>
                            {showHistory && (
                                <div style={{ marginTop: 8 }}>
                                    {/* Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '0.8fr 1fr 1.5fr 1fr 1fr',
                                        padding: '0 10px 8px',
                                        fontSize: 9,
                                        color: '#94a3b8',
                                        borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        fontWeight: 700
                                    }}>
                                        <div>{t.timeLabel || "Time"}</div>
                                        <div>{t.poolLabel || "Pool"}</div>
                                        <div style={{ textAlign: 'center' }}>{t.resultLabel || "Result"}</div>
                                        <div style={{ textAlign: 'right' }}>{t.betLabelShort || "Bet"}</div>
                                        <div style={{ textAlign: 'right' }}>{t.payoutLabel || "Payout"}</div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 220, overflowY: 'auto' }} className="hide-scrollbar">
                                        {groupHistoryByTx(history).slice(0, 30).map((group, i) => {
                                            const isMulti = group.isMulti;
                                            const count = group.count;

                                            const payoutAmount = isMulti ? group.totalPayout : group.items[0].payout;
                                            const betAmount = isMulti ? group.totalBet : group.items[0].betAmount;

                                            const payoutNum = Number(payoutAmount) / 1e18;
                                            const betNum = Number(betAmount) / 1e18;
                                            const isWin = payoutNum > 0;

                                            return (
                                                <div
                                                    key={group.id || i}
                                                    onClick={() => onSpinClick?.(isMulti ? group.items : group.items[0])}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '0.8fr 1fr 1.5fr 1fr 1fr',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
                                                        fontSize: 10,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    {isMulti && (
                                                        <div style={{
                                                            position: 'absolute', top: 0, left: 0, width: '2px', height: '100%',
                                                            background: 'linear-gradient(180deg, #a855f7, #3b82f6)'
                                                        }} />
                                                    )}

                                                    {/* Time */}
                                                    <div style={{ color: '#64748b', fontSize: 9 }}>
                                                        {group.timestamp ? new Date(group.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </div>

                                                    {/* Pool */}
                                                    <div style={{ color: '#a78bfa', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 4 }}>
                                                        {group.poolName || '--'}
                                                    </div>

                                                    {/* Symbols or Multi-Label */}
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {isMulti ? (
                                                            <div style={{
                                                                color: '#a855f7', fontWeight: 800, fontSize: 9, padding: '1px 4px',
                                                                background: 'rgba(168, 85, 247, 0.1)', borderRadius: 4, border: '1px solid rgba(168, 85, 247, 0.2)'
                                                            }}>
                                                                ⚡ x{count}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: 1 }}>
                                                                {group.items[0].result?.slice(0, 5).map((s: number, j: number) => (
                                                                    <span key={j} style={{ fontSize: 11, opacity: isWin ? 1 : 0.6 }}>
                                                                        {SLOT_SYMBOLS[s] || '❓'}
                                                                    </span>
                                                                )) || <span style={{ letterSpacing: 2 }}>{getSymbolsDisplay(group.items[0])}</span>}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bet */}
                                                    <div style={{ textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                        {betNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </div>

                                                    {/* Payout */}
                                                    <div style={{
                                                        textAlign: 'right', color: isWin ? '#22c55e' : '#ef4444',
                                                        fontWeight: 700, fontFamily: 'monospace'
                                                    }}>
                                                        {isWin ? `+${payoutNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : (t.lostLabel || 'Lost')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading/Empty state for history */}
                    {!playerHistory && loadingHistory && (
                        <div style={{ textAlign: 'center', padding: 15, color: '#94a3b8', fontSize: 10 }}>⏳ Đang tải...</div>
                    )}

                    {/* View-only notice */}
                    <div style={{ marginTop: 8, textAlign: 'center', fontSize: 8, color: '#64748b', fontStyle: 'italic' }}>
                        👁️ Chế độ xem • Không thể chỉnh sửa
                    </div>
                </div>
            </DraggablePanel>

            {/* Premium Tooltip */}
            {tooltip && mounted && createPortal(
                <div style={{
                    position: 'fixed',
                    top: tooltip.y + 15,
                    left: tooltip.x + 15,
                    zIndex: 999999,
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(168, 85, 247, 0.5)',
                    borderRadius: 16,
                    padding: '12px 16px',
                    boxShadow: '0 10px 40px -5px rgba(0,0,0,0.8), 0 0 20px rgba(168, 85, 247, 0.3)',
                    maxWidth: 260,
                    pointerEvents: 'none',
                }}>
                    {tooltip.title && (
                        <div style={{
                            fontSize: 12, fontWeight: 800,
                            color: '#facc15',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: 4, marginBottom: 2
                        }}>
                            {tooltip.title}
                        </div>
                    )}
                    <div style={{
                        fontSize: 11, color: '#e2e8f0',
                        lineHeight: 1.5, fontWeight: 500,
                        fontFamily: "'Space Mono', monospace"
                    }}>
                        {tooltip.content}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default ViewPlayerPanel;
