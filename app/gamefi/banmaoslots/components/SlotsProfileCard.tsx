// ===== SLOTS PROFILE CARD COMPONENT =====
// Displays player profile with stats

import React from 'react';
import { createPortal } from 'react-dom';
import { SlotsPlayerProfile, getSlotsAvatarEmoji, SlotsAvatarIndex } from '../lib/slotsProfiles';
import { SlotsTranslations } from '../lib/i18n';
import { groupHistoryByTx, GroupedSpinHistory } from '../lib/historyUtils';

// PlayerPoolStats struct from Multi-Pool contract
interface PlayerPoolStats {
    totalBets: bigint;
    wins: bigint;
    losses: bigint;
    biggestWin: bigint;
    totalWagered: bigint;
    totalPayout: bigint;
}

interface SlotsProfileCardProps {
    profile: SlotsPlayerProfile;
    rank?: number;
    t: SlotsTranslations;
    onEditProfile?: () => void;
    playerStats?: PlayerPoolStats;
    playerWinRate?: string;
    onStatHover?: (id: string | null, pos?: { x: number, y: number }) => void;
    history?: any[]; // Personal spin history
    onSpinClick?: (spin: any) => void; // Click handler for spin details
    banmaoBalance?: bigint; // Wallet balance
    okbBalance?: bigint; // Native OKB balance
}

/**
 * Slots Profile Card - displays player's stats and profile info
 */
export function SlotsProfileCard({
    profile,
    rank,
    t,
    onEditProfile,
    playerStats,
    playerWinRate,
    onStatHover,
    history,
    onSpinClick,
    banmaoBalance,
    okbBalance
}: SlotsProfileCardProps) {
    const [showHistory, setShowHistory] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [tooltip, setTooltip] = React.useState<{ x: number, y: number, title?: string, content: string } | null>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const handleHover = (e: React.MouseEvent, title: string, content: string) => {
        setTooltip({
            x: e.clientX,
            y: e.clientY,
            title,
            content
        });
    };

    const handleLeave = () => {
        setTooltip(null);
    };

    const formatAmount = (value: bigint | string) => {
        const val = typeof value === 'string' ? BigInt(value) : value;
        const num = Number(val) / 1e18;
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toFixed(0);
    };

    const formatOkb = (value: bigint | undefined) => {
        if (!value) return '0.00';
        const num = Number(value) / 1e18;
        return num < 0.01 ? num.toFixed(4) : num.toFixed(2);
    };

    // Format timestamp to local time (uses device timezone automatically)
    const formatLocalTime = (timestamp: number) => {
        // timestamp can be in seconds (Unix) or milliseconds
        const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
        const date = new Date(ms);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Use stats from hook if available, otherwise from profile
    const displaySpins = playerStats ? Number(playerStats.totalBets) : profile.totalSpins;
    const displayWins = playerStats ? Number(playerStats.wins) : profile.totalWins;
    const displayBiggestWin = playerStats ? playerStats.biggestWin : profile.biggestWin;
    const displayWinRate = playerWinRate || (profile.totalSpins > 0
        ? ((profile.totalWins / profile.totalSpins) * 100).toFixed(1)
        : '0.0');


    // Calculate lucky streak from history
    const luckyStreak = React.useMemo(() => {
        if (!history || history.length === 0) return 0;
        let streak = 0;
        for (const spin of history) {
            if (spin.multiplier >= 1) streak++;
            else break;
        }
        return streak;
    }, [history]);

    // Calculate Profit/Loss
    const profitLoss = React.useMemo(() => {
        if (!playerStats) return BigInt(0);
        return playerStats.totalPayout - playerStats.totalWagered;
    }, [playerStats]);

    const profitNum = Number(profitLoss) / 1e18;
    const isProfit = profitNum >= 0;

    // XP & Level System
    const xp = React.useMemo(() => {
        const spinsXP = displaySpins * 10;
        const winsXP = displayWins * 50;
        const bigWinXP = Math.floor(Number(displayBiggestWin) / 1e18);
        return spinsXP + winsXP + bigWinXP;
    }, [displaySpins, displayWins, displayBiggestWin]);

    const level = React.useMemo(() => {
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
    const currentThreshold = level <= 10 ? levelThresholds[level - 1] : 100000 + (level - 10) * 50000;
    const nextThreshold = level < 10 ? levelThresholds[level] : currentThreshold + 50000;
    const xpProgress = Math.min(100, ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100);

    // Achievement Badges
    const badges = React.useMemo(() => {
        const earned = [];
        if (displaySpins >= 1) earned.push({ icon: '🎰', name: 'First Spin', desc: 'Complete your first spin' });
        if (displaySpins >= 100) earned.push({ icon: '💯', name: 'Century', desc: '100+ spins completed' });
        if (luckyStreak >= 5) earned.push({ icon: '🔥', name: 'Hot Streak', desc: '5+ consecutive wins' });
        if (Number(displayWinRate) >= 50) earned.push({ icon: '🍀', name: 'Lucky', desc: '50%+ win rate' });
        const wagered = playerStats ? Number(playerStats.totalWagered) / 1e18 : 0;
        if (wagered >= 1000) earned.push({ icon: '💎', name: 'High Roller', desc: '1000+ tokens wagered' });
        if (rank && rank <= 10) earned.push({ icon: '🏆', name: 'Champion', desc: 'Top 10 player' });
        return earned;
    }, [displaySpins, luckyStreak, displayWinRate, playerStats, rank]);

    // Sparkline from history (last 7 results)
    const sparkline = React.useMemo(() => {
        if (!history || history.length === 0) return '';
        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const recent = history.slice(0, 7).reverse();
        return recent.map(spin => {
            const mult = spin.multiplier || 0;
            if (mult <= 0) return chars[0];
            if (mult < 1) return chars[1];
            if (mult < 2) return chars[2];
            if (mult < 5) return chars[4];
            if (mult < 10) return chars[6];
            return chars[7];
        }).join('');
    }, [history]);

    return (
        <div style={{
            padding: 12,
            background: 'linear-gradient(145deg, rgba(168,85,247,0.12), rgba(0,0,0,0.3))',
            borderRadius: 20,
            border: '1px solid rgba(168,85,247,0.35)',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)'
        }}>
            {/* Header with Avatar & Name - CENTERED */}
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
                    {getSlotsAvatarEmoji(profile.avatar)}
                    <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 14, height: 14, borderRadius: '50%',
                        background: '#22c55e', border: '2px solid #1e293b'
                    }} />
                </div>

                {/* Name & Edit - Centered */}
                <div style={{
                    fontSize: 16, fontWeight: 900, color: '#fff',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Space Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 2
                }}>
                    {profile.name}
                    {onEditProfile && (
                        <button
                            onClick={onEditProfile}
                            style={{
                                background: 'rgba(168,85,247,0.2)',
                                border: 'none',
                                borderRadius: 8,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: 10,
                                color: '#a855f7',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(168,85,247,0.4)';
                                handleHover(e, 'Edit Profile', t.editProfile || 'Edit Profile');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(168,85,247,0.2)';
                                handleLeave();
                            }}
                        >
                            ✏️
                        </button>
                    )}
                </div>

                {/* Address */}
                <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                    {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                </div>

                {/* Rank Badge */}
                {rank && rank > 0 && (
                    <div style={{
                        fontSize: 11, color: '#fbbf24', fontWeight: 800,
                        display: 'flex', alignItems: 'center', gap: 4,
                        textTransform: 'uppercase', letterSpacing: '1px',
                        marginBottom: 6
                    }}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆'}
                        {t.rankLabel}{rank}
                    </div>
                )}

                {/* XP & Level Bar - Centered under header */}
                <div style={{
                    width: '100%', maxWidth: 280,
                    padding: '6px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 9999,
                    border: '1px solid rgba(168,85,247,0.15)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span
                            style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', cursor: 'help' }}
                            onMouseEnter={(e) => handleHover(e, (t as any).level || 'Level', (t as any).tooltipLevel || 'Your player level based on experience points earned from spinning')}
                            onMouseLeave={handleLeave}
                        >
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
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
            </div>

            {/* Wallet Balance Section - matching stat boxes style */}
            {(banmaoBalance !== undefined || okbBalance !== undefined) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 6 }}>
                    {/* BANMAO Balance */}
                    <div
                        className="stat-card"
                        style={{
                            padding: '8px 6px',
                            background: 'rgba(168, 85, 247, 0.08)',
                            borderRadius: 9999,
                            textAlign: 'center',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                            handleHover(e, t.banmaoBalanceLabel, t.banmaoBalanceDesc);
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)';
                            e.currentTarget.style.transform = 'scale(1)';
                            handleLeave();
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    >
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            🐱🍌 {banmaoBalance !== undefined ? formatAmount(banmaoBalance) : '---'}
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>$banmao</div>
                    </div>

                    {/* OKB Balance */}
                    <div
                        className="stat-card"
                        style={{
                            padding: '8px 6px',
                            background: 'rgba(0, 245, 255, 0.08)',
                            borderRadius: 9999,
                            textAlign: 'center',
                            border: '1px solid rgba(0, 245, 255, 0.25)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 245, 255, 0.2)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                            handleHover(e, t.okbBalanceLabel, t.okbBalanceDesc);
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 245, 255, 0.08)';
                            e.currentTarget.style.transform = 'scale(1)';
                            handleLeave();
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    >
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#00f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            💎 {okbBalance !== undefined ? formatOkb(okbBalance) : '---'}
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>OKB</div>
                    </div>
                </div>
            )}

            {/* Row 1: Profit/Loss + Win Streak */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 6 }}>
                {/* Profit/Loss */}
                <div
                    style={{
                        padding: '8px 6px',
                        background: isProfit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                        borderRadius: 9999,
                        textAlign: 'center',
                        border: `1px solid ${isProfit ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        cursor: 'help',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.background = isProfit ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
                        handleHover(e, (t as any).totalProfit || 'Total Profit', (t as any).tooltipProfit || 'Net profit/loss from all your spins (Payouts - Wagers)');
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.background = isProfit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
                        handleLeave();
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: 800, color: isProfit ? '#22c55e' : '#ef4444' }}>
                        {isProfit ? '📈' : '📉'} {isProfit ? '+' : ''}{profitNum >= 1000 ? `${(profitNum / 1000).toFixed(1)}K` : profitNum.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{(t as any).totalProfit || 'Total Profit'}</div>
                </div>

                {/* Win Streak */}
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
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{(t as any).winStreak || 'Win Streak'}</div>
                </div>
            </div>

            {/* Row 2: Stats Grid - 3 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
                <div
                    style={{ padding: '6px 4px', background: 'rgba(250,204,21,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(250,204,21,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(250,204,21,0.15)';
                        handleHover(e, t.totalSpins || 'Total Spins', t.tooltipTotalSpins || 'Total number of spins you have made');
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(250,204,21,0.08)'; handleLeave(); }}
                >
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#facc15' }}>{displaySpins}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{t.totalSpins}</div>
                </div>
                <div
                    style={{ padding: '6px 4px', background: 'rgba(34,197,94,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(34,197,94,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(34,197,94,0.15)';
                        handleHover(e, t.totalWins || 'Total Wins', t.tooltipTotalWins || 'Number of winning spins (1x or higher multiplier)');
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; handleLeave(); }}
                >
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{displayWins}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{t.totalWins}</div>
                </div>
                <div
                    style={{ padding: '6px 4px', background: 'rgba(168,85,247,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(168,85,247,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(168,85,247,0.15)';
                        handleHover(e, t.winRate || 'Win Rate', t.tooltipWinRate || 'Percentage of spins that resulted in a win');
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; handleLeave(); }}
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
                        handleHover(e, t.biggestWin || 'Biggest Win', t.tooltipBiggestWin || 'Your largest single win amount');
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(250,204,21,0.08)'; handleLeave(); }}
                >
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#facc15' }}>🏆 {formatAmount(displayBiggestWin)}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{t.biggestWin}</div>
                </div>
                <div
                    style={{ padding: '8px 6px', background: 'rgba(0,245,255,0.08)', borderRadius: 9999, textAlign: 'center', border: '1px solid rgba(0,245,255,0.2)', cursor: 'help', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = 'rgba(0,245,255,0.15)';
                        handleHover(e, (t as any).dayTrend || '7-Day Trend', (t as any).tooltipTrend || 'Visual chart of your recent 7 spin results');
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,245,255,0.08)'; handleLeave(); }}
                >
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#00f5ff', letterSpacing: 2 }}>
                        {sparkline || '▁▁▁▁▁▁▁'}
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{(t as any).dayTrend || '7-Day Trend'}</div>
                </div>
            </div>

            {/* Row 4: Achievement Badges */}
            {badges.length > 0 && (
                <div style={{ marginBottom: 6, padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 9999, border: '1px solid rgba(168,85,247,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>🏅</span>
                        {badges.map((badge, i) => {
                            // Get localized badge description
                            const badgeKey = badge.icon === '🎰' ? 'badgeFirstSpin'
                                : badge.icon === '💯' ? 'badgeCentury'
                                    : badge.icon === '🔥' ? 'badgeHotStreak'
                                        : badge.icon === '🍀' ? 'badgeLucky'
                                            : badge.icon === '💎' ? 'badgeHighRoller'
                                                : 'badgeChampion';
                            const localizedDesc = (t as any)[badgeKey] || `${badge.name}: ${badge.desc}`;
                            return (
                                <span key={i} style={{ fontSize: 14, cursor: 'help', transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.2)';
                                        handleHover(e, badge.name, localizedDesc);
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        handleLeave();
                                    }}
                                >
                                    {badge.icon}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Personal Spin History - Collapsible */}
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
                            📜 {(t as any).mySpins || 'My Spins'}
                        </span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>{showHistory ? '▲' : '▼'}</span>
                    </div>
                    {showHistory && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                            {groupHistoryByTx(history).slice(0, 10).map((group, i) => {
                                const isMulti = group.isMulti;
                                const count = group.count;

                                const payoutAmount = isMulti ? group.totalPayout : group.items[0].payout;
                                const payoutNum = Number(payoutAmount) / 1e18;
                                const isWin = payoutNum >= 1 || (isMulti && payoutNum > 0);

                                return (
                                    <div
                                        key={group.id || i}
                                        onClick={() => onSpinClick?.(isMulti ? group.items : group.items[0])}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: 6,
                                            borderLeft: isMulti ? '3px solid #a855f7' : (isWin ? '3px solid #22c55e' : '3px solid rgba(239, 68, 68, 0.5)'),
                                            cursor: 'pointer', fontSize: 11, transition: 'all 0.2s',
                                            gap: 8,
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'; }}
                                    >
                                        {/* Symbols or Multi-Label */}
                                        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {isMulti ? (
                                                <span style={{
                                                    color: '#a855f7',
                                                    fontWeight: 800,
                                                    fontSize: 10,
                                                    padding: '1px 5px',
                                                    background: 'rgba(168, 85, 247, 0.1)',
                                                    borderRadius: 4
                                                }}>
                                                    ⚡ {t.multiSpin || 'Multi-Spin'} x{count}
                                                </span>
                                            ) : (
                                                <span style={{ letterSpacing: 2 }}>{group.items[0].symbols}</span>
                                            )}
                                        </div>

                                        {/* Result */}
                                        <span style={{
                                            color: isWin ? '#22c55e' : '#ef4444',
                                            fontWeight: 700,
                                            flex: '0 0 auto',
                                        }}>
                                            {isWin ? `+${payoutNum.toFixed(0)}` : t.lostLabel}
                                        </span>

                                        {/* Local Time */}
                                        <span style={{
                                            color: '#64748b',
                                            fontSize: 9,
                                            flex: '1 1 auto',
                                            textAlign: 'right',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {formatLocalTime(group.timestamp)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Social Links if exist */}
            {(profile.telegram || profile.twitter) && (
                <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid rgba(168,85,247,0.2)',
                    display: 'flex', gap: 12, justifyContent: 'center'
                }}>
                    {profile.telegram && (
                        <a href={`https://t.me/${profile.telegram}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: '#0088cc', textDecoration: 'none', fontWeight: 600 }}>
                            📱 @{profile.telegram}
                        </a>
                    )}
                    {profile.twitter && (
                        <a href={`https://x.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: '#1da1f2', textDecoration: 'none', fontWeight: 600 }}>
                            𝕏 @{profile.twitter}
                        </a>
                    )}
                </div>
            )}


            {/* Custom Premium Tooltip */}
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
                    animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex', flexDirection: 'column', gap: 4
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
                    {/* Decorative corner accent */}
                    <div style={{
                        position: 'absolute', top: -1, left: -1,
                        width: 10, height: 10,
                        borderTop: '2px solid #a855f7', borderLeft: '2px solid #a855f7',
                        borderTopLeftRadius: 16
                    }} />
                    <div style={{
                        position: 'absolute', bottom: -1, right: -1,
                        width: 10, height: 10,
                        borderBottom: '2px solid #a855f7', borderRight: '2px solid #a855f7',
                        borderBottomRightRadius: 16
                    }} />
                </div>,
                document.body
            )}
        </div>
    );
}

export default SlotsProfileCard;
