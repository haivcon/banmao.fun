'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { LandingTranslations } from '../../../web3d/locals';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, XLAYER_CHAIN_ID } from '../contracts';
import './panels.css';

interface LeaderboardPanelProps {
    t: (key: keyof LandingTranslations) => string;
    isConnected: boolean;
    formatNumber: (value: number | bigint | undefined) => string;
    onClose: () => void;
    onCollapse?: () => void;
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
    address?: `0x${string}`;
    LOCK_OPTIONS_INFO?: Array<{ id: number; name: string; color: string; multiplier: number; days?: number }>;
}

// Shorten address for display
function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function LeaderboardPanel({
    t, isConnected, formatNumber, onClose, onCollapse, style,
    isExpanded, onExpand, address, LOCK_OPTIONS_INFO
}: LeaderboardPanelProps) {
    const [activeTab, setActiveTab] = useState<'amount' | 'lock'>('amount');

    // Fetch stakers page (unsorted)
    const { data: topStakersData, isLoading } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakersPage',
        args: [BigInt(0), BigInt(50)], // Get first 50, sort in frontend
        chainId: XLAYER_CHAIN_ID,
    });

    // Fetch total stakers count
    const { data: totalStakers } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getTotalStakers',
        chainId: XLAYER_CHAIN_ID,
    });

    // Parse leaderboard data
    let leaderboardData: Array<{ address: string; amount: bigint; lockOptionId: number }> = [];

    if (topStakersData) {
        const data = topStakersData as { stakers: string[]; amounts: bigint[]; maxLockOptionIds: number[] } | [string[], bigint[], number[]];

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

    // Sort by lock option if that tab is active, otherwise by amount
    const sortedData = activeTab === 'lock'
        ? [...leaderboardData].sort((a, b) => b.lockOptionId - a.lockOptionId || Number(b.amount - a.amount))
        : [...leaderboardData].sort((a, b) => Number(b.amount - a.amount));

    // Add ranks after sorting
    const rankedData = sortedData.map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Find user's rank
    const userRank = address
        ? sortedData.findIndex(d => d.address.toLowerCase() === address.toLowerCase()) + 1
        : 0;

    const getLockName = (lockId: number) => {
        return LOCK_OPTIONS_INFO?.find(o => o.id === lockId)?.name || `Option ${lockId}`;
    };

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const renderContent = () => (
        <div className={`leaderboard-panel-content ${isExpanded ? 'expanded' : 'compact'}`}>
            {/* Tabs */}
            <div className="leaderboard-tabs">
                <button
                    className={`tab ${activeTab === 'amount' ? 'active' : ''}`}
                    onClick={() => setActiveTab('amount')}
                >
                    💰 Số lượng
                </button>
                <button
                    className={`tab ${activeTab === 'lock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lock')}
                >
                    🔒 Thời gian khóa
                </button>
            </div>

            {/* Total Stats */}
            <div className="leaderboard-stats">
                <span>👥 {totalStakers ? Number(totalStakers) : 0} stakers</span>
                {userRank > 0 && <span className="user-rank">🏆 Bạn: #{userRank}</span>}
            </div>

            {/* Leaderboard Table - Scrollable */}
            <div className="leaderboard-table">
                {isLoading ? (
                    <div className="loading-state">⏳ Đang tải...</div>
                ) : rankedData.length === 0 ? (
                    <div className="empty-state">Chưa có ai stake</div>
                ) : (
                    rankedData.map((entry) => {
                        const isCurrentUser = address && entry.address.toLowerCase() === address.toLowerCase();

                        return (
                            <div
                                key={entry.address}
                                className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''} ${entry.rank <= 3 ? 'top3' : ''}`}
                            >
                                <span className="rank">{getMedalEmoji(entry.rank)}</span>
                                <span className="address" title={entry.address}>
                                    {shortenAddress(entry.address)}
                                    {isCurrentUser && ' (Bạn)'}
                                </span>
                                <span className="amount">{formatNumber(entry.amount)}</span>
                                <span className="lock-badge" data-lock={entry.lockOptionId}>
                                    {getLockName(entry.lockOptionId)}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    // EXPANDED PANEL
    if (isExpanded) {
        return (
            <div className="circular-panel-component circular-panel-expanded panel-leaderboard" onClick={(e) => e.stopPropagation()}>
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">🏆 Bảng Xếp Hạng</h2>
                </div>
                <div className="circular-panel-content">
                    {renderContent()}
                </div>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onCollapse ? onCollapse() : onClose(); }}>
                    {t('closeBtn')}
                </button>
            </div>
        );
    }

    // COMPACT PANEL
    return (
        <div className="circular-panel-component panel-leaderboard" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">🏆 Bảng Xếp Hạng</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                {renderContent()}
            </div>
        </div>
    );
}
