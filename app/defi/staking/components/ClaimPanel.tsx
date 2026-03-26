'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { StakingTranslations } from '../i18n';
import { formatEther } from 'viem';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, XLAYER_CHAIN_ID } from '../contracts';
import './panels.css';

interface LockOptionInfo {
    id: number;
    name: string;
    nameKey?: string;
    days: number;
    multiplier: number;
    color: string;
}

interface ClaimPanelProps {
    t: (key: keyof StakingTranslations) => string;
    isLoading: boolean;
    pendingReward: bigint | undefined;
    formatNumber: (value: number | bigint | undefined) => string;
    handleClaim: () => void;
    onClose: () => void;
    onCollapse?: () => void;
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
    address?: `0x${string}`;
    stakeIds?: bigint[];
    userTotalShares?: bigint;
    globalTotalShares?: bigint;
    rewardRatePerSecond?: bigint;
    devFee?: bigint;
    lockOptionsInfo?: LockOptionInfo[];
    lang?: string;
    rewardBucket?: bigint;
}

// Fetch stake entry
function useStakeEntryData(address: `0x${string}` | undefined, stakeId: bigint) {
    const { data } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakeEntry',
        args: address ? [address, stakeId] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });
    if (!data) return null;
    if (Array.isArray(data)) {
        const [amount, shares, lockEndTime, startTime, lockOptionId, active, isLocked, inGracePeriod] = data as unknown as [bigint, bigint, bigint, bigint, number, boolean, boolean, boolean];
        return { id: Number(stakeId), amount, shares, lockEndTime, startTime, lockOptionId, active, isLocked, inGracePeriod };
    }
    const entry = data as unknown as { amount: bigint; shares: bigint; lockEndTime: bigint; startTime: bigint; lockOptionId: number; active: boolean; isLocked: boolean; inGracePeriod: boolean };
    return { id: Number(stakeId), ...entry };
}

function StakeEntriesLoader({ address, stakeIds, onEntriesLoaded }: {
    address: `0x${string}`;
    stakeIds: bigint[];
    onEntriesLoaded: (entries: any[]) => void;
}) {
    const entry0 = useStakeEntryData(address, stakeIds[0] || BigInt(0));
    const entry1 = useStakeEntryData(address, stakeIds[1] || BigInt(0));
    const entry2 = useStakeEntryData(address, stakeIds[2] || BigInt(0));
    const entry3 = useStakeEntryData(address, stakeIds[3] || BigInt(0));

    useEffect(() => {
        const entries: any[] = [];
        [entry0, entry1, entry2, entry3].forEach((entry, idx) => {
            if (entry && entry.active && idx < stakeIds.length) entries.push(entry);
        });
        if (entries.length > 0) onEntriesLoaded(entries);
    }, [entry0, entry1, entry2, entry3, stakeIds.length, onEntriesLoaded]);

    return null;
}

// Stake Detail Popup
function StakeDetailPopup({ entry, lockOption, estimatedReward, poolSharePercent, t, onClose }: {
    entry: any; lockOption: LockOptionInfo | undefined; estimatedReward: number; poolSharePercent: number; t: (key: keyof StakingTranslations) => string; onClose: () => void;
}) {
    const now = Math.floor(Date.now() / 1000);
    const lockEndTime = Number(entry.lockEndTime);
    const startTime = Number(entry.startTime);
    const timeRemaining = Math.max(0, lockEndTime - now);
    const daysRemaining = Math.floor(timeRemaining / 86400);
    const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);

    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <>
            <div className="stake-detail-popup-backdrop" onClick={onClose} />
            <div className="stake-detail-popup" onClick={(e) => e.stopPropagation()}>
                <div className="stake-detail-header">
                    <span className="stake-detail-title">📦 Stake #{entry.id}</span>
                    <button className="stake-detail-close" onClick={onClose}>✕</button>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('package')}</span>
                    <span className="stake-detail-value info">{(lockOption?.nameKey ? t(lockOption.nameKey as any) : lockOption?.name) || `Option ${entry.lockOptionId}`}</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('amount')}</span>
                    <span className="stake-detail-value highlight">{Number(formatEther(entry.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })} BANMAO</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('shares')}</span>
                    <span className="stake-detail-value">{Number(formatEther(entry.shares)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('poolShare')}</span>
                    <span className="stake-detail-value">{parseFloat(poolSharePercent.toFixed(4))}%</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('multiplier')}</span>
                    <span className="stake-detail-value" style={{ color: lockOption?.color }}>{lockOption?.multiplier || 1}x</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('reward')}</span>
                    <span className="stake-detail-value success">+{parseFloat(estimatedReward.toFixed(4))} BANMAO</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('stakeDate')}</span>
                    <span className="stake-detail-value">{formatDate(startTime)}</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('unlock')}</span>
                    <span className="stake-detail-value">{formatDate(lockEndTime)}</span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('remaining')}</span>
                    <span className={`stake-detail-value ${timeRemaining > 0 ? '' : 'success'}`}>
                        {timeRemaining > 0 ? `${daysRemaining}${t('timeDaysShort')} ${hoursRemaining}${t('timeHoursShort')}` : t('statusUnlocked')}
                    </span>
                </div>
                <div className="stake-detail-row">
                    <span className="stake-detail-label">{t('status')}</span>
                    <span className={`stake-detail-value ${entry.isLocked ? '' : 'success'}`}>
                        {entry.inGracePeriod ? t('statusGrace') : entry.isLocked ? t('statusLocked') : t('statusFree')}
                    </span>
                </div>
            </div>
        </>
    );
}

export function ClaimPanel({
    t, isLoading, pendingReward, formatNumber, handleClaim, onClose, onCollapse, style,
    isExpanded, onExpand, address, stakeIds = [], userTotalShares = BigInt(0),
    globalTotalShares = BigInt(0), rewardRatePerSecond = BigInt(0), devFee = BigInt(200),
    lockOptionsInfo = [], lang = 'en', rewardBucket = BigInt(0)
}: ClaimPanelProps) {
    const hasRewards = pendingReward && pendingReward > BigInt(0);
    const isVi = lang === 'vi';

    const [stakeEntries, setStakeEntries] = useState<any[]>([]);
    const [selectedStake, setSelectedStake] = useState<number | null>(null);

    const handleEntriesLoaded = React.useCallback((entries: any[]) => setStakeEntries(entries), []);

    // Calculate net reward after fee
    const netReward = useMemo(() => {
        const gross = Number(formatEther(pendingReward || BigInt(0)));
        const feePercent = Number(devFee) / 10000;
        return gross * (1 - feePercent);
    }, [pendingReward, devFee]);

    const grossReward = Number(formatEther(pendingReward || BigInt(0)));
    const devFeePercent = Number(devFee) / 100;

    // Pool stats with detailed rate calculations
    const poolStats = useMemo(() => {
        const userPoolShare = globalTotalShares > BigInt(0) ? (Number(userTotalShares) / Number(globalTotalShares)) * 100 : 0;

        // Rate calculations
        const globalRatePerSec = Number(formatEther(rewardRatePerSecond));
        const userRatePerSec = globalRatePerSec * (userPoolShare / 100);
        const userRatePerSecNet = userRatePerSec * (1 - devFeePercent / 100);

        // Daily/hourly rewards
        const dailyReward = globalRatePerSec * 86400;
        const userDailyReward = dailyReward * (userPoolShare / 100);
        const netUserDailyReward = userDailyReward * (1 - devFeePercent / 100);
        const userHourlyReward = userRatePerSecNet * 3600;
        const userMonthlyReward = netUserDailyReward * 30;

        let totalAmount = BigInt(0);
        let weightedMult = 0;
        stakeEntries.filter(e => e.active).forEach(entry => {
            const opt = lockOptionsInfo.find(o => o.id === entry.lockOptionId);
            weightedMult += Number(entry.amount) * (opt?.multiplier || 1);
            totalAmount += entry.amount;
        });
        const avgMult = totalAmount > BigInt(0) ? weightedMult / Number(totalAmount) : 1;

        return {
            userPoolShare, dailyReward, netUserDailyReward, avgMult,
            globalRatePerSec, userRatePerSec, userRatePerSecNet,
            userHourlyReward, userMonthlyReward
        };
    }, [userTotalShares, globalTotalShares, rewardRatePerSecond, devFeePercent, stakeEntries, lockOptionsInfo]);

    // Reward breakdown per entry
    const rewardBreakdown = useMemo(() => {
        if (!hasRewards || !stakeEntries.length || userTotalShares === BigInt(0)) return [];
        return stakeEntries.filter(e => e.active && e.shares > BigInt(0)).map(entry => {
            const shareRatio = Number(entry.shares) / Number(userTotalShares);
            const entryReward = netReward * shareRatio;
            const poolShare = globalTotalShares > BigInt(0) ? (Number(entry.shares) / Number(globalTotalShares)) * 100 : 0;
            const lockOpt = lockOptionsInfo.find(o => o.id === entry.lockOptionId);
            return { ...entry, entryReward, poolShare, lockOpt };
        }).sort((a, b) => b.entryReward - a.entryReward);
    }, [hasRewards, stakeEntries, userTotalShares, globalTotalShares, netReward, lockOptionsInfo]);

    const selectedData = selectedStake !== null ? rewardBreakdown.find(e => e.id === selectedStake) : null;

    // Compact view
    const renderCompactContent = () => (
        hasRewards ? (
            <div className="rewards-section">
                <div className="rewards-icon">💰</div>
                <div className="rewards-label">{t('netReward')}</div>
                <div className="rewards-value">{parseFloat(netReward.toFixed(4))}</div>
                <button className="btn-primary btn-claim" onClick={(e) => { e.stopPropagation(); handleClaim(); }} disabled={isLoading}>
                    {isLoading ? '...' : t('claimRewards')}
                </button>
            </div>
        ) : (
            <div className="no-rewards">
                <div className="no-rewards-icon">📭</div>
                <p>{t('noRewards')}</p>
            </div>
        )
    );

    // Expanded premium view
    const renderExpandedContent = () => (
        <div className="claim-detailed-wrapper">
            {address && stakeIds.length > 0 && (
                <StakeEntriesLoader address={address} stakeIds={stakeIds} onEntriesLoaded={handleEntriesLoaded} />
            )}

            {/* HERO SECTION */}
            <div className="claim-hero">
                <div className="claim-hero-icon">💰</div>
                <div className="claim-hero-label">{t('youWillReceive')}</div>
                <div className="claim-hero-amount">
                    {parseFloat(netReward.toFixed(4))}
                    <span className="token">BANMAO</span>
                </div>
                <div className="claim-hero-gross">
                    <span>{t('gross')}: {parseFloat(grossReward.toFixed(4))}</span>
                    <span className="fee-badge">-{devFeePercent}%</span>
                </div>
                {poolStats.netUserDailyReward > 0 && (
                    <div className="claim-hero-daily">
                        <span className="daily-icon">📈</span>
                        ≈ {parseFloat(poolStats.netUserDailyReward.toFixed(4))}/{t('perDay')}
                    </div>
                )}
            </div>

            {/* STATS BAR */}
            {userTotalShares > BigInt(0) && (
                <div className="claim-stats-bar">
                    <div className="claim-stat-card">
                        <div className="claim-stat-icon">📊</div>
                        <div className="claim-stat-value">{parseFloat(poolStats.userPoolShare.toFixed(2))}%</div>
                        <div className="claim-stat-label">{t('poolShare')}</div>
                    </div>
                    <div className="claim-stat-card">
                        <div className="claim-stat-icon">⚡</div>
                        <div className="claim-stat-value">{poolStats.avgMult}x</div>
                        <div className="claim-stat-label">{t('avgMult')}</div>
                    </div>
                    <div className="claim-stat-card">
                        <div className="claim-stat-icon">💎</div>
                        <div className="claim-stat-value">{Number(formatEther(userTotalShares)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="claim-stat-label">Shares</div>
                    </div>
                </div>
            )}

            {/* DETAILED RATE INFO SECTION */}
            {userTotalShares > BigInt(0) && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginTop: '12px',
                    border: '1px solid rgba(34, 211, 238, 0.2)'
                }}>
                    <div style={{ fontSize: '11px', color: '#67e8f9', marginBottom: '10px', fontWeight: 600 }}>
                        📊 Rate/sec
                    </div>

                    {/* Rate per second row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>⚡ {t('allRatePerSecond')}:</span>
                        <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 500 }}>{poolStats.globalRatePerSec.toFixed(4)} BANMAO</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>🎯 {t('yourRatePerSecond')}:</span>
                        <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 600 }}>{poolStats.userRatePerSecNet.toFixed(6)} BANMAO</span>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

                    {/* Projected earnings */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>💰 {t('hourlyEarnings')}:</span>
                        <span style={{ color: '#a78bfa', fontSize: '10px' }}>+{poolStats.userHourlyReward.toFixed(4)} BANMAO</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>📈 {t('dailyEarnings')}:</span>
                        <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: 500 }}>+{poolStats.netUserDailyReward.toFixed(2)} BANMAO</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>🚀 {t('monthlyEarnings')}:</span>
                        <span style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 600 }}>+{poolStats.userMonthlyReward.toFixed(2)} BANMAO</span>
                    </div>

                    <div style={{
                        fontSize: '9px',
                        color: '#64748b',
                        marginTop: '8px',
                        textAlign: 'center',
                        fontStyle: 'italic'
                    }}>
                        ({t('poolPercentNote')})
                    </div>
                </div>
            )}

            {/* STAKES LIST */}
            {rewardBreakdown.length > 0 && (
                <div className="claim-stakes-section">
                    <div className="claim-stakes-header">
                        <span className="claim-stakes-title">📦 {t('yourStakes')}</span>
                        <span className="claim-stakes-count">{rewardBreakdown.length}</span>
                    </div>
                    <div className="claim-stakes-list">
                        {rewardBreakdown.map(entry => (
                            <div key={entry.id} className="claim-stake-card" onClick={() => setSelectedStake(entry.id)}>
                                <div className="claim-stake-info">
                                    <div className="claim-stake-name">
                                        #{entry.id}
                                        <span className="lock-badge" style={{ background: `${entry.lockOpt?.color}22`, color: entry.lockOpt?.color }}>
                                            {(entry.lockOpt?.nameKey ? t(entry.lockOpt.nameKey as any) : entry.lockOpt?.name) || `Opt ${entry.lockOptionId}`}
                                        </span>
                                    </div>
                                    <div className="claim-stake-meta">
                                        <span>💰 {Number(formatEther(entry.amount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span>📊 {parseFloat(entry.poolShare.toFixed(3))}%</span>
                                    </div>
                                </div>
                                <div className="claim-stake-reward">
                                    <div className="claim-stake-reward-value">+{parseFloat(entry.entryReward.toFixed(4))}</div>
                                    <div className="claim-stake-reward-label">BANMAO</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CONTRACT INFO */}
            <div className="claim-contract-section">
                <div className="claim-contract-chip">
                    <span>🔢 {t('rate')}</span>
                    <span className="chip-value">{parseFloat(poolStats.dailyReward.toFixed(2))}/{t('perDay')}</span>
                </div>
                <div className="claim-contract-chip">
                    <span>🏦 {t('pool')}</span>
                    <span className="chip-value">{Number(formatEther(rewardBucket)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="claim-contract-chip">
                    <span>💸 {t('fee')}</span>
                    <span className="chip-value">{devFeePercent}%</span>
                </div>
            </div>

            {/* CLAIM BUTTON */}
            <button
                className="claim-action-button"
                onClick={(e) => { e.stopPropagation(); handleClaim(); }}
                disabled={isLoading || !hasRewards}
            >
                <span className="btn-icon">💰</span>
                {isLoading ? '...' : hasRewards ? t('claimRewards') : t('noRewards')}
            </button>

            {/* Detail Popup */}
            {selectedData && (
                <StakeDetailPopup
                    entry={selectedData}
                    lockOption={selectedData.lockOpt}
                    estimatedReward={selectedData.entryReward}
                    poolSharePercent={selectedData.poolShare}
                    t={t}
                    onClose={() => setSelectedStake(null)}
                />
            )}
        </div>
    );

    if (isExpanded) {
        return (
            <div className="circular-panel-component circular-panel-expanded panel-claim" onClick={(e) => e.stopPropagation()}>
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">{t('panelClaim')}</h2>
                </div>
                <div className="circular-panel-content claim-expanded-content">
                    {renderExpandedContent()}
                </div>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onCollapse ? onCollapse() : onClose(); }}>
                    {t('closeBtn')}
                </button>
            </div>
        );
    }

    return (
        <div className="circular-panel-component panel-claim" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">{t('panelClaim')}</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                {renderCompactContent()}
            </div>
        </div>
    );
}
