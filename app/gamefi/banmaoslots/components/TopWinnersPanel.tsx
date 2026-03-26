// ===== LEADERBOARD PANEL COMPONENT =====
// Displays slots leaderboard with player and pool rankings
// Features: Top 100, Virtual Scrolling, Hidden Scrollbar

import React, { useState, useRef, useCallback } from 'react';
import { formatTokenAmount } from '../lib/abis';
import { SlotsTranslations } from '../lib/i18n';
import { getSlotsAvatarEmoji, SlotsAvatarIndex } from '../lib/slotsProfiles';
import { getPlayerTier, TierInfo, TimeFilter, LeaderboardSortBy } from '../lib/tiers';

export interface SlotWinner {
    address: string;
    name?: string;
    avatar?: number;
    highestWin: bigint;
    totalWonAmount: bigint; // Total amount won in wei, NOT win count
    totalSpins: number;
    totalWins?: number; // Number of winning spins (from API)
    totalWagered?: bigint; // Total amount wagered (for profit calculation)
    jackpotsWon: number;
    telegram?: string;
    twitter?: string;
    // Time-based stats (from API)
    todayWon?: bigint;
    todaySpins?: number;
    lastSpinTime?: number; // Timestamp of last spin for time filtering
}

export interface PoolStats {
    poolId: bigint;
    name: string;
    owner: string;
    balance: bigint;
    totalSpins: number;
    playerWins: number;
    playerLosses: number;
    winRateForPlayers: number;
}

type LeaderboardTab = 'biggestWin' | 'mostSpins' | 'profit' | 'winRate' | 'jackpotKings' | 'highRollers';

const ITEM_HEIGHT = 36; // Height of each row in pixels
const VISIBLE_COUNT = 13; // Number of visible items
const MAX_ITEMS = 100; // Top 100

interface TopWinnersPanelProps {
    winners: SlotWinner[];
    pools?: PoolStats[];
    t: SlotsTranslations;
    onWinnerClick?: (winner: SlotWinner, rank: number) => void;
    onPoolClick?: (pool: PoolStats) => void;
    onSortChange?: (sortBy: LeaderboardTab) => void;
    isLoading?: boolean;
    currentPlayerAddress?: string;
}

export function TopWinnersPanel({
    winners,
    pools = [],
    t,
    onWinnerClick,
    onPoolClick,
    onSortChange,
    isLoading = false,
    currentPlayerAddress
}: TopWinnersPanelProps) {
    const [activeTab, setActiveTab] = useState<LeaderboardTab>('biggestWin');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate profit for sorting
    const getProfit = (w: SlotWinner) => {
        const won = Number(w.totalWonAmount || BigInt(0)) / 1e18;
        const wagered = Number(w.totalWagered || BigInt(0)) / 1e18;
        return won - wagered;
    };

    // Calculate win rate for sorting
    const getWinRate = (w: SlotWinner) => {
        if (!w.totalSpins || w.totalSpins < 50) return -1; // Require min 50 spins
        return ((w.totalWins || 0) / w.totalSpins) * 100;
    };

    // Filter by time period
    const getTimeFilteredWinners = (list: SlotWinner[]): SlotWinner[] => {
        const now = Date.now();
        switch (timeFilter) {
            case 'today':
                const todayStart = now - 24 * 60 * 60 * 1000; // Last 24 hours
                return list.filter(w => (w.lastSpinTime || 0) >= todayStart);
            case 'week':
                const weekStart = now - 7 * 24 * 60 * 60 * 1000; // Last 7 days
                return list.filter(w => (w.lastSpinTime || 0) >= weekStart);
            case 'month':
                const monthStart = now - 30 * 24 * 60 * 60 * 1000; // Last 30 days
                return list.filter(w => (w.lastSpinTime || 0) >= monthStart);
            default: // 'all'
                return list;
        }
    };

    // Sort winners based on active tab (after time filtering)
    const sortedWinners = React.useMemo(() => {
        const timeFiltered = getTimeFilteredWinners([...winners]);
        switch (activeTab) {
            case 'biggestWin':
                return timeFiltered.sort((a, b) => Number(b.highestWin - a.highestWin)).slice(0, MAX_ITEMS);
            case 'mostSpins':
                return timeFiltered.sort((a, b) => b.totalSpins - a.totalSpins).slice(0, MAX_ITEMS);
            case 'profit':
                return timeFiltered.sort((a, b) => getProfit(b) - getProfit(a)).slice(0, MAX_ITEMS);
            case 'winRate':
                return timeFiltered.filter(w => w.totalSpins >= 50).sort((a, b) => getWinRate(b) - getWinRate(a)).slice(0, MAX_ITEMS);
            case 'jackpotKings':
                // Only show players with at least 1 jackpot win
                const jackpotWinners = timeFiltered.filter(w => (w.jackpotsWon || 0) > 0);
                return jackpotWinners.sort((a, b) => (b.jackpotsWon || 0) - (a.jackpotsWon || 0)).slice(0, MAX_ITEMS);
            case 'highRollers':
                return timeFiltered.sort((a, b) => Number((b.totalWagered || BigInt(0)) - (a.totalWagered || BigInt(0)))).slice(0, MAX_ITEMS);
            default:
                return timeFiltered.slice(0, MAX_ITEMS);
        }
    }, [winners, activeTab, timeFilter]);

    const items = sortedWinners;
    const totalHeight = items.length * ITEM_HEIGHT;

    // Calculate visible range
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const endIndex = Math.min(startIndex + VISIBLE_COUNT + 2, items.length);
    const offsetY = startIndex * ITEM_HEIGHT;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Reset scroll when tab changes
    React.useEffect(() => {
        setScrollTop(0);
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [activeTab]);

    const tabs: { id: LeaderboardTab; icon: string; label: string; category: 'player' | 'pool' }[] = [
        // Player Tabs
        { id: 'biggestWin', icon: '🏆', label: (t as any).topWinnersTab || 'Biggest Win', category: 'player' },
        { id: 'mostSpins', icon: '🎰', label: (t as any).mostSpinsTab || 'Most Spins', category: 'player' },
        { id: 'profit', icon: '💰', label: (t as any).tabProfit || 'Profit', category: 'player' },
        { id: 'winRate', icon: '🎯', label: (t as any).tabWinRate || 'Win Rate', category: 'player' },
        { id: 'jackpotKings', icon: '👑', label: (t as any).tabJackpotKings || 'Jackpot Kings', category: 'player' },
        { id: 'highRollers', icon: '💎', label: (t as any).tabHighRollers || 'High Rollers', category: 'player' },
    ];


    // Render a single player row
    const renderPlayerRow = (winner: SlotWinner, idx: number) => {
        const isTop3 = idx < 3;
        const isCurrentPlayer = currentPlayerAddress?.toLowerCase() === winner.address.toLowerCase();
        const tier = getPlayerTier(winner.totalSpins);

        let statValue = '';
        let statIcon = '';

        switch (activeTab) {
            case 'mostSpins':
                statValue = `${winner.totalSpins.toLocaleString()}`;
                statIcon = '🎰';
                break;
            case 'profit':
                const profit = (Number(winner.totalWonAmount) - Number(winner.totalWagered || BigInt(0))) / 1e18;
                statValue = `${profit >= 0 ? '+' : ''}${Math.abs(profit) >= 1000 ? (profit / 1000).toFixed(1) + 'K' : profit.toFixed(0)}`;
                statIcon = profit >= 0 ? '📈' : '📉';
                break;
            case 'winRate':
                const rate = winner.totalSpins > 0 ? ((winner.totalWins || 0) / winner.totalSpins * 100) : 0;
                statValue = `${rate.toFixed(1)}%`;
                statIcon = '🎯';
                break;

            case 'jackpotKings':
                statValue = `${winner.jackpotsWon}`;
                statIcon = '👑';
                break;
            case 'highRollers':
                statValue = formatTokenAmount(winner.totalWagered || BigInt(0));
                statIcon = '💎';
                break;
            default: // biggestWin
                statValue = formatTokenAmount(winner.highestWin);
                statIcon = '🏆';
        }

        return (
            <div
                key={winner.address}
                onClick={() => onWinnerClick?.(winner, idx + 1)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                    height: ITEM_HEIGHT - 4,
                    background: isCurrentPlayer
                        ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 255, 255, 0.05))'
                        : idx === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.15), transparent)'
                            : idx === 1 ? 'linear-gradient(135deg, rgba(203,213,225,0.15), transparent)'
                                : idx === 2 ? 'linear-gradient(135deg, rgba(249,115,22,0.15), transparent)'
                                    : 'rgba(0,0,0,0.2)',
                    borderRadius: 9999,
                    border: isCurrentPlayer
                        ? '1px solid rgba(0, 255, 255, 0.4)'
                        : idx === 0 ? '1px solid rgba(251,191,36,0.4)'
                            : idx === 1 ? '1px solid rgba(203,213,225,0.4)'
                                : idx === 2 ? '1px solid rgba(249,115,22,0.4)'
                                    : '1px solid rgba(255,255,255,0.05)',
                    cursor: onWinnerClick ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    marginBottom: 4,
                    position: 'relative',
                    marginLeft: 2, marginRight: 2,
                    // Use CSS animation with delay in shorthand to avoid warning
                    animation: `floatUpDown ${4 + (idx % 3)}s ease-in-out ${idx * 0.2}s infinite`
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.animationPlayState = 'paused';
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.zIndex = '10';
                    e.currentTarget.style.boxShadow = isCurrentPlayer ? '0 0 15px rgba(0,255,255,0.3)'
                        : idx === 0 ? '0 0 20px rgba(251,191,36,0.4)'
                            : idx === 1 ? '0 0 20px rgba(203,213,225,0.4)'
                                : idx === 2 ? '0 0 20px rgba(249,115,22,0.4)'
                                    : '0 0 10px rgba(255,255,255,0.1)';
                    // Keep background slightly brighter on hover
                    e.currentTarget.style.background = isCurrentPlayer ? 'rgba(0, 255, 255, 0.25)'
                        : idx === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.25), transparent)'
                            : idx === 1 ? 'linear-gradient(135deg, rgba(203,213,225,0.25), transparent)'
                                : idx === 2 ? 'linear-gradient(135deg, rgba(249,115,22,0.25), transparent)'
                                    : 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.animationPlayState = 'running';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '1';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = isCurrentPlayer
                        ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 255, 255, 0.05))'
                        : idx === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.15), transparent)'
                            : idx === 1 ? 'linear-gradient(135deg, rgba(203,213,225,0.15), transparent)'
                                : idx === 2 ? 'linear-gradient(135deg, rgba(249,115,22,0.15), transparent)'
                                    : 'rgba(0,0,0,0.2)';
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                    <span style={{ fontSize: 16 }}>
                        {getSlotsAvatarEmoji((winner.avatar || 0) as SlotsAvatarIndex)}
                    </span>
                    <span style={{ fontSize: 8, marginTop: -4 }}>{tier.icon}</span>
                </div>

                <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#f97316' : '#64748b', textAlign: 'center' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isCurrentPlayer ? '#00FFFF' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {winner.name || `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`}
                    </div>
                    <div style={{ fontSize: 8, color: tier.color, fontWeight: 600 }}>
                        {t[`tier${tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}` as keyof SlotsTranslations] || tier.name}
                    </div>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: activeTab === 'profit' ? (statIcon === '📈' ? '#22c55e' : '#ef4444') : '#4ade80', textAlign: 'right' }}>
                    <div>{statValue}</div>
                    <div style={{ fontSize: 8, color: '#64748b', fontWeight: 400 }}>
                        {activeTab === 'profit' ? t.netProfit :
                            activeTab === 'winRate' ? t.tabWinRate :
                                activeTab === 'highRollers' ? t.bet :
                                    ''}
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div style={{
            padding: 12,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(0,0,0,0.2))',
            clipPath: 'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))',
            border: '1px solid rgba(255,255,255,0.08)'
        }}>
            {/* Hide scrollbar styles */}
            <style>{`
                .virtual-scroll-container::-webkit-scrollbar { display: none; }
                .virtual-scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Category Labels */}
            {/* Category Labels - Removed as per user request */}

            {/* Time Filters */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'center' }}>
                {(['today', 'week', 'month', 'all'] as const).map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.animation = 'none';
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(251,191,36,0.3)';
                            e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = timeFilter === filter ? 'rgba(251,191,36,0.3)' : 'transparent';
                            e.currentTarget.style.animation = timeFilter === filter ? 'selectPulse 2s infinite ease-in-out' : 'none';
                        }}
                        style={{
                            padding: '4px 8px', fontSize: 9, borderRadius: 12,
                            background: timeFilter === filter ? 'rgba(251,191,36,0.2)' : 'rgba(0,0,0,0.2)',
                            color: timeFilter === filter ? '#fbbf24' : '#64748b',
                            border: timeFilter === filter ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
                            cursor: 'pointer', flex: 1, textAlign: 'center', position: 'relative',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            animation: timeFilter === filter ? 'selectPulse 2s infinite ease-in-out' : 'none'
                        }}
                    >
                        {t[`time${filter.charAt(0).toUpperCase() + filter.slice(1)}` as keyof SlotsTranslations]}
                    </button>
                ))}
            </div>

            {/* Tabs (Wrapped) */}
            <div style={{
                display: 'flex', gap: 6, marginBottom: 8, paddingBottom: 6,
                borderBottom: '1px solid rgba(251,191,36,0.3)',
                flexWrap: 'wrap', justifyContent: 'center'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.category === 'player' && onSortChange) {
                                onSortChange(tab.id);
                            }
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.animation = 'none';
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = tab.category === 'player' ? '0 0 12px rgba(251,191,36,0.4)' : '0 0 12px rgba(34,197,94,0.4)';
                            e.currentTarget.style.zIndex = '10';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.animation = activeTab === tab.id ? 'selectPulse 2s infinite ease-in-out' : 'none';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.zIndex = '1';
                        }}
                        style={{
                            padding: '5px 8px',
                            background: activeTab === tab.id
                                ? tab.category === 'player'
                                    ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1))'
                                    : 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))'
                                : 'rgba(0,0,0,0.3)',
                            border: activeTab === tab.id
                                ? tab.category === 'player'
                                    ? '1px solid rgba(251,191,36,0.5)'
                                    : '1px solid rgba(34,197,94,0.5)'
                                : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            color: activeTab === tab.id
                                ? tab.category === 'player' ? '#fbbf24' : '#22c55e'
                                : '#94a3b8',
                            fontSize: 9,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            position: 'relative',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            animation: activeTab === tab.id ? 'selectPulse 2s infinite ease-in-out' : 'none'
                        }}
                    >
                        <span style={{ fontSize: 12 }}>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Virtual Scroll Container */}
            <div
                ref={containerRef}
                className="virtual-scroll-container"
                onScroll={handleScroll}
                style={{
                    height: VISIBLE_COUNT * ITEM_HEIGHT + 20, // Add buffer
                    overflowY: 'auto',
                    position: 'relative',
                    padding: '10px 4px 10px 4px' // Padding top/bottom to prevent breathe clipping
                }}
            >
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 20 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                        <div>{t.loadingWinners}</div>
                    </div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 20 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🎰</div>
                        <div>{t.noWinnersYet}</div>
                    </div>
                ) : (
                    <div style={{ height: totalHeight, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
                            {(sortedWinners.slice(startIndex, endIndex) as SlotWinner[]).map((item, i) => renderPlayerRow(item, startIndex + i))}
                        </div>
                    </div>
                )}
            </div>

            {/* Item count & Click hint */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>
                    {items.length > 0 ? `Top ${items.length}` : ''}
                </span>
                {items.length > 0 && (onWinnerClick || onPoolClick) && (
                    <span style={{ fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
                        👆 {t.clickToViewProfile}
                    </span>
                )}
            </div>
        </div >
    );
}

export default TopWinnersPanel;
