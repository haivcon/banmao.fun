'use client';

import React, { useState } from 'react';
import { StakingTranslations } from '../i18n';
import './panels.css';

interface StatsPanelProps {
    t: (key: keyof StakingTranslations) => string;
    globalStats: {
        totalStaked: bigint;
        totalShares: bigint;
        rewardBucket: bigint;
        rewardRate: bigint;
        minStake: bigint;
        maxStake: bigint;
        penalty: bigint;
        gracePeriod: bigint;
    };
    healthCheck: {
        daysLeft: bigint;
    } | null;
    userInfo: { amount: bigint } | null;
    isConnected: boolean;
    pendingReward: bigint;
    vipTier: string;
    walletBalance: number | bigint | undefined; // Added wallet balance
    formatNumber: (value: number | bigint | undefined) => string;
    onClose: () => void;
    onCollapse?: () => void; // Collapse expanded panel back to compact
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
}

interface StatItemProps {
    label: string;
    value: string;
    description: string;
    onClick: () => void;
    isHighlighted?: boolean;
    colorType?: 'default' | 'success' | 'warning' | 'danger' | 'personal';
}

function StatItem({ label, value, description, onClick, isHighlighted, colorType = 'default' }: StatItemProps) {
    return (
        <div
            className={`stat-item stat-color-${colorType} ${isHighlighted ? 'highlighted' : ''}`}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title={description}
        >
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
        </div>
    );
}

export function StatsPanel({
    t, globalStats, healthCheck, userInfo, isConnected, pendingReward, vipTier,
    walletBalance, formatNumber, onClose, onCollapse, style, isExpanded, onExpand
}: StatsPanelProps) {
    const [selectedStat, setSelectedStat] = useState<string | null>(null);

    const formatDays = (seconds: bigint) => {
        const totalHours = Number(seconds) / 3600;
        const days = Math.floor(totalHours / 24);
        const hours = Math.floor(totalHours % 24);

        if (days === 0) {
            return `${hours}${t('timeHoursShort')}`;
        } else if (hours === 0) {
            return `${days}${t('timeDaysShort')}`;
        } else {
            return `${days}${t('timeDaysShort')} ${hours}${t('timeHoursShort')}`;
        }
    };

    // Format specifically for Grace Period (seconds)
    const formatGraceSeconds = (seconds: bigint) => {
        return `${Number(seconds)}${t('timeSecondsShort')}`;
    };

    const formatPercent = (value: bigint) => {
        // Penalty is in basis points (10000 = 100%), so divide by 100 to get percentage
        return `${Number(value) / 100}%`;
    };

    // Determine color type based on values
    const getDaysLeftColorType = (): 'success' | 'warning' | 'danger' => {
        if (!healthCheck) return 'warning';
        const days = Number(healthCheck.daysLeft);
        if (days > 365) return 'success';
        if (days > 30) return 'warning';
        return 'danger';
    };

    const getPenaltyColorType = (): 'default' | 'warning' | 'danger' => {
        const penalty = Number(globalStats.penalty);
        if (penalty >= 500) return 'danger';
        if (penalty >= 100) return 'warning';
        return 'default';
    };

    // Contract stats (global/system)
    const contractStats = [
        {
            id: 'totalLocked',
            label: t('stakingTotalLocked'),
            value: formatNumber(globalStats.totalStaked),
            desc: t('statsTotalLockedDesc'),
            colorType: 'default' as const
        },
        {
            id: 'rewardPool',
            label: t('stakingRewardPool'),
            value: formatNumber(globalStats.rewardBucket),
            desc: t('statsRewardPoolDesc'),
            colorType: 'success' as const
        },
        {
            id: 'totalShares',
            label: t('statsTotalShares'),
            value: formatNumber(globalStats.totalShares),
            desc: t('statsTotalSharesDesc'),
            colorType: 'default' as const
        },
        {
            id: 'rewardRate',
            label: t('statsRewardRate'),
            value: formatNumber(globalStats.rewardRate * BigInt(86400)) + t('statsDaySymbol'),
            desc: t('statsRewardRateDesc'),
            colorType: 'success' as const
        },
        {
            id: 'rewardRatePerSec',
            label: t('statsRewardRatePerSec'),
            value: Number(globalStats.rewardRate) / 1e18 > 0
                ? (Number(globalStats.rewardRate) / 1e18).toFixed(6) + t('statsSecSymbol')
                : '0.000000' + t('statsSecSymbol'),
            desc: t('statsRewardRatePerSecDesc'),
            colorType: 'success' as const
        },
        {
            id: 'daysLeft',
            label: t('statsDaysLeft'),
            value: healthCheck ? `${Number(healthCheck.daysLeft)}` : '—',
            desc: t('statsDaysLeftDesc'),
            colorType: getDaysLeftColorType()
        },
        {
            id: 'minStake',
            label: t('statsMinStake'),
            value: formatNumber(globalStats.minStake),
            desc: t('statsMinStakeDesc'),
            colorType: 'default' as const
        },
        {
            id: 'maxStake',
            label: t('statsMaxStake'),
            value: formatNumber(globalStats.maxStake),
            desc: t('statsMaxStakeDesc'),
            colorType: 'default' as const
        },
        {
            id: 'penalty',
            label: t('statsPenalty'),
            value: formatPercent(globalStats.penalty),
            desc: t('statsPenaltyDesc'),
            colorType: getPenaltyColorType()
        },
        {
            id: 'gracePeriod',
            label: t('statsGracePeriod'),
            value: formatGraceSeconds(globalStats.gracePeriod),
            desc: t('statsGracePeriodDesc'),
            colorType: 'default' as const
        },
    ];

    // Personal stats (user-specific)
    const personalStats = [
        {
            id: 'walletBalance',
            label: t('walletBalance'),
            value: isConnected ? formatNumber(walletBalance) : '—',
            desc: t('walletBalanceDesc'),
            colorType: 'personal' as const
        },
        {
            id: 'yourStake',
            label: t('stakingYourStake'),
            value: isConnected && userInfo ? formatNumber(userInfo.amount) : '—',
            desc: t('statsYourStakeDesc'),
            colorType: 'personal' as const
        },
        {
            id: 'pendingReward',
            label: t('statsPendingReward'),
            value: isConnected ? formatNumber(pendingReward) : '—',
            desc: t('statsPendingRewardDesc'),
            colorType: pendingReward > BigInt(0) ? 'success' as const : 'personal' as const
        },
        {
            id: 'vipTier',
            label: t('statsVipTier'),
            value: isConnected ? vipTier : '—',
            desc: t('statsVipTierDesc'),
            colorType: 'personal' as const
        },
    ];

    const stats = [...contractStats, ...personalStats];

    const renderTooltip = () => {
        if (!selectedStat) return null;
        const stat = stats.find(s => s.id === selectedStat);
        if (!stat) return null;

        return (
            <div
                className="stat-tooltip"
                onClick={(e) => { e.stopPropagation(); setSelectedStat(null); }}
            >
                <div className="stat-tooltip-title">{stat.label}</div>
                <div className="stat-tooltip-desc">{stat.desc}</div>
                <div className="stat-tooltip-hint">{t('tooltipTapToClose')}</div>
            </div>
        );
    };

    // When expanded, render as larger centered circular panel
    if (isExpanded) {
        return (
            <div
                className="circular-panel-component circular-panel-expanded panel-stats"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">{t('panelStats')}</h2>
                </div>
                <div className="circular-panel-content stats-expanded-content">
                    {/* Contract Stats Section */}
                    <div className="stats-section">
                        <div className="stats-section-header stats-section-contract">📊 {t('stakingContractStats')}</div>
                        <div className="stats-grid-extended">
                            {contractStats.map(stat => (
                                <StatItem
                                    key={stat.id}
                                    label={stat.label}
                                    value={stat.value}
                                    description={stat.desc}
                                    onClick={() => setSelectedStat(stat.id)}
                                    isHighlighted={selectedStat === stat.id}
                                    colorType={stat.colorType}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Personal Stats Section */}
                    <div className="stats-section">
                        <div className="stats-section-header stats-section-personal">👤 {t('stakingPersonalStats')}</div>
                        <div className="stats-grid-extended stats-grid-personal">
                            {personalStats.map(stat => (
                                <StatItem
                                    key={stat.id}
                                    label={stat.label}
                                    value={stat.value}
                                    description={stat.desc}
                                    onClick={() => setSelectedStat(stat.id)}
                                    isHighlighted={selectedStat === stat.id}
                                    colorType={stat.colorType}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="stats-hint">{t('statsClickForInfo')}</div>
                </div>
                {/* Tooltip rendered at panel level */}
                {renderTooltip()}
                {/* Close button at bottom center - collapses to compact instead of closing */}
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onCollapse ? onCollapse() : onClose(); }}>{t('closeBtn')}</button>
            </div>
        );
    }

    // Compact circular view - next to orb (shows ALL stats in smaller font)
    return (
        <div className="circular-panel-component panel-stats" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">{t('panelStats')}</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                <div className="stats-grid-compact">
                    {stats.map(stat => (
                        <div key={stat.id} className="stat-item-compact">
                            <div className="stat-label-compact">{stat.label}</div>
                            <div className="stat-value-compact">{stat.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
