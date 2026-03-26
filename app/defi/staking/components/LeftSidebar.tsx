'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSound } from '../hooks/useSound';
import { createPortal } from 'react-dom';
import { useReadContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, XLAYER_CHAIN_ID } from '../contracts';
import { useStakingTranslations } from '../i18n';
import { CopyableKeyword, ExplorerButton } from './CopyableKeyword';

interface LeftSidebarProps {
    formatNumber: (value: number | bigint | undefined) => string;
    address?: `0x${string}`;
    LOCK_OPTIONS_INFO?: Array<{ id: number; name: string; color: string; multiplier: number; days?: number }>;
}

interface StakingTransaction {
    type: 'stake' | 'unstake' | 'claim' | 'compound';
    amount: bigint;
    txHash: string;
    blockNumber: bigint;
    timestamp?: number;
    lockDays?: number;
    expiry?: number;
}

interface SelectedStaker {
    address: string;
    amount: bigint;
    lockOptionId: number;
    rank: number;
}

function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortenTxHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

// Virtual scroll row height
const ROW_HEIGHT = 32;
const VISIBLE_ROWS = 8;

const LEADERBOARD_ITEM_HEIGHT = 36;

export function LeftSidebar({ formatNumber, address, LOCK_OPTIONS_INFO }: LeftSidebarProps) {
    const { t } = useStakingTranslations();
    const { playClick, playHover } = useSound();
    const [activeTab, setActiveTab] = useState<'amount' | 'lock'>('amount');
    const [selectedStaker, setSelectedStaker] = useState<SelectedStaker | null>(null);
    const [stakingHistory, setStakingHistory] = useState<StakingTransaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingTooLong, setIsLoadingTooLong] = useState(false);
    const [copied, setCopied] = useState(false);

    // Virtual scroll state for transaction history
    const [scrollTop, setScrollTop] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Virtual scroll state for leaderboard
    const [leaderboardScrollTop, setLeaderboardScrollTop] = useState(0);
    const leaderboardScrollRef = useRef<HTMLDivElement>(null);
    const [leaderboardVisibleItems, setLeaderboardVisibleItems] = useState(15);

    // Responsive visible items
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setLeaderboardVisibleItems(25);
            } else {
                setLeaderboardVisibleItems(15);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const publicClient = usePublicClient();

    // Get stakers page (unsorted - we sort in frontend)
    const { data: stakersData, isLoading: isLoadingStakers } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakersPage',
        args: [BigInt(0), BigInt(50)], // Get first 50 stakers
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s // Auto-refresh every 5 seconds
    });

    // Get total stakers
    const { data: totalStakers } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getTotalStakers',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    // Parse and sort stakers data in frontend
    const sortedData = useMemo(() => {
        const leaderboardData: Array<{ address: string; amount: bigint; lockOptionId: number }> = [];

        if (stakersData) {
            const data = stakersData as { stakers: string[]; amounts: bigint[]; maxLockOptionIds: number[] } | [string[], bigint[], number[]];

            let stakers: string[], amounts: bigint[], lockIds: number[];
            if (Array.isArray(data)) {
                [stakers, amounts, lockIds] = data;
            } else {
                stakers = data.stakers;
                amounts = data.amounts;
                lockIds = data.maxLockOptionIds;
            }

            for (let i = 0; i < stakers.length; i++) {
                if (amounts[i] > BigInt(0)) {
                    leaderboardData.push({
                        address: stakers[i],
                        amount: amounts[i],
                        lockOptionId: lockIds[i],
                    });
                }
            }
        }

        // Sort in frontend
        if (activeTab === 'lock') {
            return leaderboardData.sort((a, b) =>
                b.lockOptionId - a.lockOptionId || Number(b.amount - a.amount)
            );
        } else {
            return leaderboardData.sort((a, b) =>
                Number(b.amount - a.amount)
            );
        }
    }, [stakersData, activeTab]);

    // Add ranks after sorting
    const rankedData = sortedData.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
    }));

    // Find user rank
    const userRank = address
        ? rankedData.findIndex(d => d.address.toLowerCase() === address.toLowerCase()) + 1
        : 0;

    const getLockName = (lockId: number) => {
        return LOCK_OPTIONS_INFO?.find(o => o.id === lockId)?.name || `L${lockId}`;
    };

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getTypeEmoji = (type: string) => {
        switch (type) {
            case 'stake': return '🔒';
            case 'unstake': return '🔓';
            case 'claim': return '💰';
            case 'compound': return '🔄';
            default: return '📄';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'stake': return '#22c55e';
            case 'unstake': return '#ef4444';
            case 'claim': return '#f59e0b';
            case 'compound': return '#a855f7';
            default: return '#6b7280';
        }
    };

    // Handle copy address
    const handleCopyAddress = (addr: string) => {
        navigator.clipboard.writeText(addr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch staking history when a staker is selected
    // Fetch staking history when a staker is selected
    useEffect(() => {
        const fetchStakingHistory = async () => {
            if (!selectedStaker) return;

            setIsLoadingHistory(true);
            setIsLoadingTooLong(false);
            setStakingHistory([]);

            // Set timeout to show explorer link after 10 seconds (increased from 5s)
            const timeoutId = setTimeout(() => {
                setIsLoadingTooLong(true);
            }, 10000);

            try {
                const response = await fetch(`/api/staking-history?address=${selectedStaker.address}`);
                const data = await response.json();

                if (data.success && data.transactions) {
                    const mappedTransactions: StakingTransaction[] = data.transactions.map((tx: any) => ({
                        type: tx.type,
                        amount: BigInt(tx.amount),
                        txHash: tx.txHash,
                        blockNumber: BigInt(tx.blockNumber),
                        timestamp: tx.timestamp,
                        lockDays: tx.lockDays,
                        expiry: tx.expiry
                    }));
                    setStakingHistory(mappedTransactions);
                } else {
                    setStakingHistory([]);
                }
            } catch (err) {
                console.error('Failed to fetch staking history:', err);
                setStakingHistory([]);
            } finally {
                clearTimeout(timeoutId);
                setIsLoadingHistory(false);
                setIsLoadingTooLong(false);
            }
        };

        fetchStakingHistory();
    }, [selectedStaker]);

    // Virtual scroll handler
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Calculate visible rows for virtual scrolling
    const virtualScrollData = useMemo(() => {
        const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
        const endIndex = Math.min(startIndex + VISIBLE_ROWS + 2, stakingHistory.length);
        const visibleItems = stakingHistory.slice(startIndex, endIndex);
        const offsetY = startIndex * ROW_HEIGHT;
        const totalHeight = stakingHistory.length * ROW_HEIGHT;
        return { visibleItems, offsetY, totalHeight, startIndex };
    }, [stakingHistory, scrollTop]);

    return (
        <div className="left-sidebar-container">
            <div
                className="sidebar-panel leaderboard-panel"
                onMouseEnter={playHover}
                onClick={playClick}
            >
                <div className="panel-header">
                    <div className="panel-title">{t('leaderboardTitle')}</div>
                </div>
                <div className="panel-content">
                    {/* Tabs */}
                    <div className="tabs">
                        <button
                            className={`tab-btn ${activeTab === 'amount' ? 'active' : ''}`}
                            onClick={() => setActiveTab('amount')}
                        >
                            {t('tabAmount')}
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'lock' ? 'active' : ''}`}
                            onClick={() => setActiveTab('lock')}
                        >
                            {t('tabLock')}
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="stats-row">
                        <span>👥 {totalStakers ? Number(totalStakers) : 0} {t('stakers')}</span>
                        {userRank > 0 && <span className="highlight">🏆 {t('yourRank')} #{userRank}</span>}
                    </div>

                    {/* Rankings - Scrollable with 15 visible items */}
                    {isLoadingStakers ? (
                        <div className="loading-state">{t('loading')}</div>
                    ) : rankedData.length === 0 ? (
                        <div className="empty-state">{t('noStakers')}</div>
                    ) : (
                        <div
                            ref={leaderboardScrollRef}
                            className="leaderboard-scroll-container"
                            onScroll={(e) => setLeaderboardScrollTop((e.target as HTMLDivElement).scrollTop)}
                            style={{
                                maxHeight: rankedData.length > leaderboardVisibleItems
                                    ? `${leaderboardVisibleItems * LEADERBOARD_ITEM_HEIGHT}px`
                                    : 'auto',
                                overflowY: rankedData.length > leaderboardVisibleItems ? 'auto' : 'hidden',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                            }}
                        >
                            <div style={{
                                height: rankedData.length > leaderboardVisibleItems
                                    ? `${rankedData.length * LEADERBOARD_ITEM_HEIGHT}px`
                                    : 'auto',
                                position: 'relative'
                            }}>
                                {(() => {
                                    const startIndex = rankedData.length > leaderboardVisibleItems
                                        ? Math.floor(leaderboardScrollTop / LEADERBOARD_ITEM_HEIGHT)
                                        : 0;
                                    const endIndex = rankedData.length > leaderboardVisibleItems
                                        ? Math.min(startIndex + leaderboardVisibleItems + 2, rankedData.length)
                                        : rankedData.length;
                                    const visibleItems = rankedData.slice(startIndex, endIndex);

                                    return visibleItems.map((entry, idx) => {
                                        const isCurrentUser = address && entry.address.toLowerCase() === address.toLowerCase();
                                        const actualIndex = startIndex + idx;

                                        return (
                                            <div
                                                key={entry.address}
                                                className={`ranking-row clickable ${isCurrentUser ? 'current-user' : ''} ${entry.rank <= 3 ? 'top-3' : ''}`}
                                                onClick={() => setSelectedStaker({ ...entry, rank: entry.rank })}
                                                style={rankedData.length > leaderboardVisibleItems ? {
                                                    position: 'absolute',
                                                    top: `${actualIndex * LEADERBOARD_ITEM_HEIGHT}px`,
                                                    left: 0,
                                                    right: 0,
                                                    height: `${LEADERBOARD_ITEM_HEIGHT}px`,
                                                    cursor: 'pointer',
                                                } : { cursor: 'pointer' }}
                                            >
                                                <span className="rank">{getMedalEmoji(entry.rank)}</span>
                                                <span className="addr" title={entry.address}>
                                                    {shortenAddress(entry.address)}
                                                </span>
                                                <span className="value">{formatNumber(entry.amount)}</span>
                                                <span className="badge">{getLockName(entry.lockOptionId)}</span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Explorer Guide - Enhanced with Copyable Keywords */}
                    <div style={{
                        margin: '8px 12px',
                        padding: '12px 14px',
                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.08))',
                        border: '1px solid rgba(100, 150, 220, 0.2)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                            🔎 {t('leaderboardExplorerGuide')}
                        </div>

                        {/* Copyable Keywords */}
                        <div style={{
                            padding: '10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '12px',
                        }}>
                            <div style={{
                                fontSize: '10px',
                                color: '#64748b',
                                marginBottom: '8px',
                            }}>
                                💡 {t('leaderboardSearchTip')}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                <CopyableKeyword keyword="stake" />
                                <CopyableKeyword keyword="unstakeById" />
                            </div>
                        </div>

                        {/* Explorer Button */}
                        <ExplorerButton
                            href={`https://www.okx.com/web3/explorer/xlayer/address/${STAKING_CONTRACT_ADDRESS}?tab=Transactions`}
                            label={t('searchOnExplorer')}
                        />
                    </div>
                </div>
            </div>

            {/* Staker Detail Modal - Rendered via Portal to escape stacking context */}
            {selectedStaker && typeof document !== 'undefined' && createPortal(
                <div className="staker-detail-modal" onClick={() => setSelectedStaker(null)}>
                    <div className="staker-detail-content" onClick={(e) => e.stopPropagation()}>
                        <div className="staker-detail-header">
                            <div className="staker-detail-title">{t('stakerDetail')}</div>
                            <button className="staker-detail-close" onClick={() => setSelectedStaker(null)}>✕</button>
                        </div>

                        {/* Staker Info */}
                        <div className="staker-info-grid">
                            <div className="staker-info-item">
                                <span className="info-label">{t('rank')}</span>
                                <span className="info-value">{getMedalEmoji(selectedStaker.rank)}</span>
                            </div>
                            <div className="staker-info-item">
                                <span className="info-label">{t('totalStake')}</span>
                                <span className="info-value">{formatNumber(selectedStaker.amount)}</span>
                            </div>
                            <div className="staker-info-item">
                                <span className="info-label">{t('lockDuration')}</span>
                                <span className="info-value">{getLockName(selectedStaker.lockOptionId)}</span>
                            </div>
                        </div>

                        {/* Address with copy */}
                        <div className="staker-detail-address">
                            <a
                                href={`https://www.okx.com/web3/explorer/xlayer/address/${selectedStaker.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ flex: 1, color: '#22c55e', textDecoration: 'none', wordBreak: 'break-all', fontSize: '11px' }}
                                title={t('viewOnExplorer')}
                            >
                                {selectedStaker.address} 🔗
                            </a>
                            <button className="copy-btn" onClick={() => handleCopyAddress(selectedStaker.address)}>
                                {copied ? t('copied') : t('copy')}
                            </button>
                        </div>

                        {/* Transaction History with Virtual Scrolling */}
                        <div className="staker-tx-section">
                            <div className="staker-tx-header">
                                {t('transactionHistory')} ({stakingHistory.length})
                            </div>
                            {isLoadingHistory ? (
                                <div className="loading-state" style={{
                                    padding: '30px',
                                    textAlign: 'center',
                                    color: '#22c55e',
                                    textShadow: '0 0 10px rgba(34, 197, 94, 0.3)',
                                    fontFamily: '"Chakra Petch", sans-serif'
                                }}>
                                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>⚡ {t('loading')}</div>
                                    {isLoadingTooLong && (
                                        <div style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(34, 197, 94, 0.9)' }}>
                                            {t('loadingBlockchain')}
                                            <div style={{ marginTop: '6px' }}>
                                                <a
                                                    href={`https://www.okx.com/web3/explorer/xlayer/address/${STAKING_CONTRACT_ADDRESS}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: '#fff',
                                                        textDecoration: 'underline',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    🔗 {t('viewOnExplorerDirect')}
                                                </a>
                                            </div>
                                            <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.7 }}>
                                                (Check Contract: {shortenAddress(STAKING_CONTRACT_ADDRESS)})
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : stakingHistory.length === 0 ? (
                                <div className="empty-state" style={{
                                    padding: '30px',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontStyle: 'italic',
                                    fontFamily: '"Chakra Petch", sans-serif'
                                }}>
                                    <div style={{ marginBottom: '10px' }}>{t('noTransactions')}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(34, 197, 94, 0.8)' }}>
                                        <a
                                            href={`https://www.okx.com/web3/explorer/xlayer/address/${selectedStaker.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#22c55e',
                                                textDecoration: 'underline',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            🔗 {t('viewOnExplorerDirect')}
                                        </a>
                                        <div style={{ marginTop: '4px', opacity: 0.7 }}>
                                            (Check full history on explorer)
                                        </div>
                                    </div>
                                </div>
                            ) : stakingHistory.length > VISIBLE_ROWS ? (
                                /* Virtual Scrolling for long lists */
                                <div
                                    ref={scrollContainerRef}
                                    className="staker-tx-list virtual-scroll"
                                    onScroll={handleScroll}
                                    style={{
                                        height: `${VISIBLE_ROWS * ROW_HEIGHT}px`,
                                        overflowY: 'auto',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ height: `${virtualScrollData.totalHeight}px`, position: 'relative' }}>
                                        <div style={{ transform: `translateY(${virtualScrollData.offsetY}px)` }}>
                                            {virtualScrollData.visibleItems.map((tx, idx) => (
                                                <div
                                                    key={`${tx.txHash}-${virtualScrollData.startIndex + idx}`}
                                                    className="staker-tx-item"
                                                    style={{ height: 'auto', minHeight: `${ROW_HEIGHT}px`, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                                                        <span className="tx-type" style={{ color: getTypeColor(tx.type), marginRight: '8px', fontSize: '14px' }}>
                                                            {getTypeEmoji(tx.type)}
                                                        </span>
                                                        <a
                                                            href={`https://www.okx.com/web3/explorer/xlayer/tx/${tx.txHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="tx-hash"
                                                            style={{ color: '#a855f7', textDecoration: 'none', flex: 1, fontSize: '12px' }}
                                                        >
                                                            {shortenTxHash(tx.txHash)}
                                                        </a>
                                                        <span className="tx-amount" style={{ color: getTypeColor(tx.type), fontWeight: 'bold', fontSize: '12px' }}>
                                                            {tx.type === 'unstake' ? '-' : '+'}{Number(formatEther(tx.amount)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingLeft: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                                        <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}</span>
                                                        {tx.expiry && (
                                                            <span style={{ color: '#f59e0b' }}>
                                                                🔓 {new Date(tx.expiry).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Normal list for short lists */
                                <div className="staker-tx-list">
                                    {stakingHistory.map((tx, idx) => (
                                        <div
                                            key={`${tx.txHash}-${idx}`}
                                            className="staker-tx-item"
                                            style={{ height: 'auto', minHeight: `${ROW_HEIGHT}px`, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                                                <span className="tx-type" style={{ color: getTypeColor(tx.type), marginRight: '8px', fontSize: '14px' }}>
                                                    {getTypeEmoji(tx.type)}
                                                </span>
                                                <a
                                                    href={`https://www.okx.com/web3/explorer/xlayer/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="tx-hash"
                                                    style={{ color: '#a855f7', textDecoration: 'none', flex: 1, fontSize: '12px' }}
                                                >
                                                    {shortenTxHash(tx.txHash)}
                                                </a>
                                                <span className="tx-amount" style={{ color: getTypeColor(tx.type), fontWeight: 'bold', fontSize: '12px' }}>
                                                    {tx.type === 'unstake' ? '-' : '+'}{Number(formatEther(tx.amount)).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingLeft: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                                <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}</span>
                                                {tx.expiry && (
                                                    <span style={{ color: '#f59e0b' }}>
                                                        🔓 {new Date(tx.expiry).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Summary Stats */}
                        {/* Summary Stats - Only show if has history */}
                        {stakingHistory.length > 0 && (
                            <div className="staker-summary">
                                <div className="summary-item">
                                    <span>🔒 Stakes:</span>
                                    <span>{stakingHistory.filter(t => t.type === 'stake').length}</span>
                                </div>
                                <div className="summary-item">
                                    <span>🔓 Unstakes:</span>
                                    <span>{stakingHistory.filter(t => t.type === 'unstake').length}</span>
                                </div>
                                <div className="summary-item">
                                    <span>💰 Claims:</span>
                                    <span>{stakingHistory.filter(t => t.type === 'claim').length}</span>
                                </div>
                                <div className="summary-item">
                                    <span>🔄 Compounds:</span>
                                    <span>{stakingHistory.filter(t => t.type === 'compound').length}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                , document.body)}
        </div>
    );
}
