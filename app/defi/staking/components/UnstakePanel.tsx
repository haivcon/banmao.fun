'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { StakingTranslations } from '../i18n';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, XLAYER_CHAIN_ID } from '../contracts';
import './panels.css';

interface UnstakePanelProps {
    t: (key: keyof StakingTranslations) => string;
    isLoading: boolean;
    unstakeAmount: string;
    setUnstakeAmount: (value: string) => void;
    userInfo: { amount: bigint } | null;
    isConnected: boolean;
    formatNumber: (value: number | bigint | undefined) => string;
    formatInputNumber: (value: string) => string;
    unformatInputNumber: (value: string) => string;
    handleUnstakePreset: (percent: number) => void;
    handleMaxUnstake: () => void;
    handleUnstake: () => void;
    onClose: () => void;
    onCollapse?: () => void;
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
    // V28 props
    address?: `0x${string}`;
    stakeIds?: bigint[];
    onUnstakeById?: (stakeId: number) => void;
    onUnstakePartial?: (stakeId: number, amount: string) => void;
    earlyUnstakePenalty?: number;
    gracePeriodDuration?: number; // in seconds
    LOCK_OPTIONS_INFO?: Array<{ id: number; name: string; nameKey?: string; color: string; multiplier: number; days?: number }>;
    onRelock?: (stakeId: number, newLockOptionId: number) => void;
    pendingReward?: bigint;
    totalShares?: bigint;
    rewardRatePerSecond?: bigint;
}

// Format time with seconds for real-time display
function formatCountdown(seconds: number): string {
    if (seconds <= 0) return '00:00:00';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) {
        return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Single stake entry component
function StakeEntryItem({
    address,
    stakeId,
    t,
    formatNumber,
    formatInputNumber,
    unformatInputNumber,
    onUnstakeById,
    onUnstakePartial,
    onRelock,
    isLoading,
    earlyUnstakePenalty,
    gracePeriodDuration,
    LOCK_OPTIONS_INFO,
    pendingReward,
    totalShares,
    rewardRatePerSecond,
}: {
    address: `0x${string}`;
    stakeId: bigint;
    t: (key: keyof StakingTranslations) => string;
    formatNumber: (value: number | bigint | undefined) => string;
    formatInputNumber: (value: string) => string;
    unformatInputNumber: (value: string) => string;
    onUnstakeById?: (stakeId: number) => void;
    onUnstakePartial?: (stakeId: number, amount: string) => void;
    onRelock?: (stakeId: number, newLockOptionId: number) => void;
    isLoading: boolean;
    earlyUnstakePenalty?: number;
    gracePeriodDuration?: number;
    LOCK_OPTIONS_INFO?: Array<{ id: number; name: string; nameKey?: string; multiplier?: number; days?: number }>;
    pendingReward?: bigint;
    totalShares?: bigint;
    rewardRatePerSecond?: bigint;
}) {
    const [selected, setSelected] = useState(false);
    const [partialAmount, setPartialAmount] = useState('');
    const [showRelockUI, setShowRelockUI] = useState(false);
    const [newLockId, setNewLockId] = useState(1);
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    // Real-time countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Math.floor(Date.now() / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const { data: stakeData, isLoading: isLoadingData } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakeEntry',
        args: [address, stakeId],
        chainId: XLAYER_CHAIN_ID,
    });

    if (isLoadingData || !stakeData) {
        return (
            <div className="stake-entry-card loading">
                <div className="entry-amount">⏳ {t('loading')}</div>
            </div>
        );
    }

    // Handle both array and object response formats from wagmi
    let amount: bigint, lockEndTime: bigint, startTime: bigint, lockOptionId: number, active: boolean, isLocked: boolean, inGracePeriod: boolean;

    if (Array.isArray(stakeData)) {
        // Array format: [amount, shares, lockEndTime, startTime, lockOptionId, active, isLocked, inGracePeriod, estimatedPenalty]
        const arr = stakeData as unknown as [bigint, bigint, bigint, bigint, number, boolean, boolean, boolean, bigint];
        [amount, , lockEndTime, startTime, lockOptionId, active, isLocked, inGracePeriod] = arr;
    } else {
        // Object format with named fields
        const data = stakeData as unknown as { amount: bigint; shares?: bigint; lockEndTime: bigint; startTime: bigint; lockOptionId: number; active: boolean; isLocked: boolean; inGracePeriod: boolean; estimatedPenalty?: bigint };
        amount = data.amount;
        lockEndTime = data.lockEndTime;
        startTime = data.startTime;
        lockOptionId = data.lockOptionId;
        active = data.active;
        isLocked = data.isLocked;
        inGracePeriod = data.inGracePeriod;
    }

    if (!active) return null;

    const lockEnd = Number(lockEndTime);
    const startTimeNum = Number(startTime);
    const graceDuration = gracePeriodDuration || 7200;
    // Grace period is at the BEGINNING: from startTime to startTime + graceDuration
    const graceEnd = startTimeNum + graceDuration;
    const penaltyPercent = earlyUnstakePenalty ? earlyUnstakePenalty / 100 : 10;
    const lockOption = LOCK_OPTIONS_INFO?.find(o => o.id === lockOptionId);
    const lockName = (lockOption?.nameKey ? t(lockOption.nameKey as any) : lockOption?.name) || `Lock ${lockOptionId}`;

    // Calculate times
    const timeToLockEnd = Math.max(0, lockEnd - now);
    const timeToGraceEnd = Math.max(0, graceEnd - now);

    // Status - use contract's values directly for accuracy
    type Status = 'locked' | 'grace' | 'free';
    let status: Status;

    if (isLocked) {
        // Contract says still locked - penalty applies
        status = 'locked';
    } else if (inGracePeriod) {
        // Contract says in grace period - free to unstake now
        status = 'grace';
    } else {
        // After grace period or flexible stake - free
        status = 'free';
    }

    const handleUnstake = () => {
        const amountNum = parseFloat(partialAmount);
        const entryAmount = Number(amount) / 1e18;
        if (partialAmount && amountNum > 0 && amountNum < entryAmount) {
            onUnstakePartial?.(Number(stakeId), partialAmount);
        } else {
            onUnstakeById?.(Number(stakeId));
        }
        setSelected(false);
        setPartialAmount('');
    };

    const handleConfirmRelock = () => {
        onRelock?.(Number(stakeId), newLockId);
        setShowRelockUI(false);
        setSelected(false);
    };

    return (
        <div
            className={`stake-entry-card ${selected ? 'selected' : ''} ${status}`}
            onClick={(e) => { e.stopPropagation(); setSelected(!selected); setPartialAmount(''); setShowRelockUI(false); }}
        >
            {/* Header with Status Badge */}
            <div className="entry-header">
                <span className="entry-id">#{Number(stakeId)}</span>
                <span className={`status-badge ${status}`}>
                    {status === 'grace' ? t('statusGrace') : status === 'locked' ? t('statusLocked') : t('statusFree')}
                </span>
                <span className="entry-amount-inline">{formatNumber(amount)}</span>
            </div>

            {/* Progress Bar for Unlock Countdown */}
            {status !== 'free' && (
                <div className="unlock-progress-wrapper">
                    <div className="unlock-progress-bar">
                        <div
                            className={`unlock-progress-fill ${status}`}
                            style={{
                                width: status === 'grace'
                                    ? `${Math.max(0, Math.min(100, (timeToGraceEnd / (graceDuration || 7200)) * 100))}%`
                                    : `${Math.max(0, Math.min(100, ((lockEnd - now) / (lockEnd - startTimeNum)) * 100))}%`
                            }}
                        />
                    </div>
                </div>
            )}
            {status === 'free' && (
                <div className="unlock-progress-wrapper">
                    <div className="unlock-progress-bar">
                        <div className="unlock-progress-fill free" />
                    </div>
                </div>
            )}

            {/* Simple Status Display - NEW LOGIC: Grace at BEGINNING */}
            <div className={`simple-status ${status}`}>
                {/* GRACE = Ngay sau stake, trong thời gian ân hạn, rút MIỄN PHÍ */}
                {status === 'grace' && (
                    <>
                        <div className="grace-title">{t('inGracePeriod')}</div>
                        <div className="grace-countdown">
                            <span className="countdown success">{formatCountdown(timeToGraceEnd)}</span>
                        </div>
                        <div className="grace-duration">
                            {t('gracePeriodFree')}
                        </div>

                        <div className="lock-info">
                            {lockName} • {formatCountdown(timeToLockEnd)} {t('lockRemaining')}
                        </div>
                    </>
                )}

                {/* LOCKED = Sau ân hạn, trước khi hết lock, rút MẤT PHÍ */}
                {status === 'locked' && (
                    <>
                        <div className="penalty-warning">
                            {t('gracePeriodEnded')} <strong>{penaltyPercent}%</strong>
                        </div>
                        <div className="countdown-line">
                            {t('unlockAfter')} <span className="countdown">{formatCountdown(timeToLockEnd)}</span>
                        </div>
                        <div className="lock-info">
                            {lockName}
                        </div>
                    </>
                )}

                {/* FREE = Sau khi hết lock, rút MIỄN PHÍ */}
                {status === 'free' && (
                    <div className="status-line success">
                        {t('unlocked')}
                    </div>
                )}
            </div>

            {/* Reward Estimation - Only show when selected */}
            {selected && totalShares && rewardRatePerSecond && Number(totalShares) > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginTop: '8px',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    fontSize: '10px'
                }}>
                    {(() => {
                        // Get shares from contract data
                        const shares = stakeData ? (Array.isArray(stakeData) ? Number(stakeData[1]) / 1e18 : Number((stakeData as any).shares) / 1e18) : 0;
                        const currentTotalShares = Number(totalShares) / 1e18;
                        const ratePerSecond = Number(rewardRatePerSecond) / 1e18;

                        if (currentTotalShares <= 0 || shares <= 0) return null;

                        const userPercentage = (shares / currentTotalShares) * 100;
                        const userRewardPerSecond = (shares / currentTotalShares) * ratePerSecond;
                        const userRewardPerHour = userRewardPerSecond * 3600;
                        const userRewardPerDay = userRewardPerSecond * 86400;
                        const netRewardPerDay = userRewardPerDay * 0.98; // After 2% fee

                        const daysRemaining = timeToLockEnd > 0 ? Math.ceil(timeToLockEnd / 86400) : 0;
                        const estimatedTotalReward = netRewardPerDay * daysRemaining;

                        return (
                            <div style={{ color: '#e2e8f0' }}>
                                {/* Summary Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '9px' }}>Shares</div>
                                        <div style={{ fontWeight: 600, color: '#22d3ee', fontSize: '10px' }}>{shares.toLocaleString()}</div>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '12px', textAlign: 'center' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '9px' }}>{t('poolPercentNote')}</div>
                                        <div style={{ fontWeight: 600, color: '#a855f7', fontSize: '10px' }}>{userPercentage.toFixed(4)}%</div>
                                    </div>
                                </div>

                                {/* Rate Info */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span style={{ color: '#94a3b8' }}>{t('ratePerSecond')}</span>
                                        <span>{ratePerSecond.toFixed(4)} BANMAO</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#94a3b8' }}>{t('yourRewardPerSecond')}</span>
                                        <span style={{ color: '#22c55e' }}>{userRewardPerSecond.toFixed(6)} BANMAO</span>
                                    </div>
                                </div>

                                {/* Earnings Breakdown */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ color: '#94a3b8' }}>{t('dailyEarnings')}</span>
                                    <span style={{ color: '#22c55e', fontWeight: 600 }}>+{netRewardPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })} BANMAO</span>
                                </div>
                                {daysRemaining > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#94a3b8' }}>{t('remainingDays')} {daysRemaining}d:</span>
                                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>+{estimatedTotalReward.toLocaleString(undefined, { maximumFractionDigits: 0 })} BANMAO</span>
                                    </div>
                                )}

                                {/* Total Receive Highlight */}
                                <div style={{
                                    marginTop: '6px',
                                    paddingTop: '6px',
                                    borderTop: '1px dashed rgba(34, 197, 94, 0.3)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '9px' }}>{t('principalLabel')}</span>
                                        <span style={{ fontSize: '9px' }}>{(Number(amount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '9px' }}>{t('estimatedInterest')} ({daysRemaining}d):</span>
                                        <span style={{ color: '#fbbf24', fontSize: '9px' }}>+{estimatedTotalReward.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        padding: '4px 6px',
                                        borderRadius: '6px'
                                    }}>
                                        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '10px' }}>{t('totalReceive')}</span>
                                        <span style={{
                                            color: '#22c55e',
                                            fontWeight: 700,
                                            fontSize: '11px',
                                            textShadow: '0 0 6px rgba(34, 197, 94, 0.4)'
                                        }}>
                                            {(Number(amount) / 1e18 + estimatedTotalReward).toLocaleString(undefined, { maximumFractionDigits: 0 })} BANMAO
                                        </span>
                                    </div>
                                </div>

                                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                                    Shares: {shares.toLocaleString()} • {t('poolPercentNote')}: {userPercentage.toFixed(4)}%
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Actions */}
            {
                selected && (
                    <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
                        {/* Normal Unstake/Manage UI */}
                        {!showRelockUI ? (
                            <>
                                <div className="partial-input-group">
                                    <input
                                        type="text"
                                        placeholder={t('amountPlaceholder')}
                                        value={formatInputNumber(partialAmount)}
                                        onChange={(e) => {
                                            const raw = unformatInputNumber(e.target.value).replace(/[^0-9.]/g, '');
                                            setPartialAmount(raw);
                                        }}
                                        className="partial-input"
                                    />
                                    <button
                                        className="btn-max-entry"
                                        onClick={() => setPartialAmount((Number(amount) / 1e18).toString())}
                                    >
                                        MAX
                                    </button>
                                </div>
                                <div className="receive-estimate" style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', paddingLeft: '4px' }}>
                                    {(() => {
                                        const inputVal = parseFloat(partialAmount || '0');
                                        if (inputVal > 0) {
                                            const penalty = status === 'locked' ? inputVal * (penaltyPercent / 100) : 0;
                                            // Rewards are claimed for ALL stakes when any unstake happens
                                            const rewards = Number(formatNumber(pendingReward).replace(/,/g, ''));
                                            const total = inputVal - penalty + rewards;
                                            return (
                                                <span>
                                                    {t('youWillReceive')}: <strong style={{ color: '#22d3ee' }}>{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                                                    <span style={{ fontSize: '10px', opacity: 0.7 }}>
                                                        {" "}({inputVal.toLocaleString()} - {penalty > 0 ? penalty.toLocaleString() : '0'}{t('fee')} {rewards > 0 ? `+ ${rewards.toLocaleString()}${t('reward')}` : ''})
                                                    </span>
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                    <button
                                        className={`btn-unstake-entry ${status === 'locked' ? 'warning' : 'success'}`}
                                        onClick={handleUnstake}
                                        disabled={isLoading}
                                        style={{ flex: 1 }}
                                    >
                                        {isLoading ? '⏳' : (status === 'locked' ? `${t('unstakeWithPenalty')} ${penaltyPercent}%)` : t('unstakeFree'))}
                                    </button>
                                    {/* RELOCK Button - Only for FREE stakes */}
                                    {status === 'free' && (
                                        <button
                                            onClick={() => setShowRelockUI(true)}
                                            className="btn-relock-entry"
                                            style={{
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '0 12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                            disabled={isLoading}
                                        >
                                            🔄 RELOCK
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Relock UI Mode */
                            <div className="relock-ui" style={{ width: '100%' }}>
                                <div style={{ color: '#fff', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>
                                    {t('selectNewLock')}
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                                    {[1, 2, 3].map(id => (
                                        <button
                                            key={id}
                                            onClick={() => setNewLockId(id)}
                                            style={{
                                                flex: 1,
                                                padding: '8px 4px',
                                                background: newLockId === id ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                                border: newLockId === id ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {(() => {
                                                const opt = LOCK_OPTIONS_INFO?.find(o => o.id === id);
                                                return (opt?.nameKey ? t(opt.nameKey as any) : opt?.name) || `${id}`;
                                            })()}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setShowRelockUI(false)}
                                        style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #64748b', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        onClick={handleConfirmRelock}
                                        style={{ flex: 2, padding: '8px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {t('confirm')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}

export function UnstakePanel({
    t, isLoading, unstakeAmount, setUnstakeAmount, userInfo, isConnected,
    formatNumber, formatInputNumber, unformatInputNumber,
    handleUnstakePreset, handleMaxUnstake, handleUnstake, onClose, onCollapse, style,
    isExpanded, onExpand,
    address, stakeIds, onUnstakeById, onUnstakePartial, earlyUnstakePenalty, gracePeriodDuration, LOCK_OPTIONS_INFO, onRelock, pendingReward,
    totalShares, rewardRatePerSecond
}: UnstakePanelProps) {

    const hasStakeEntries = address && stakeIds && stakeIds.length > 0;

    const renderContent = () => (
        <div className={`unstake-panel-content ${isExpanded ? 'expanded' : 'compact'}`}>
            {/* Total Staked */}
            <div className="unstake-summary">
                <div className="info-box">
                    <span className="info-box-label">🔒 {t('stakedLabel')}</span>
                    <span className="info-box-value">
                        {isConnected && userInfo ? formatNumber(userInfo.amount) : '0'}
                    </span>
                </div>
            </div>

            {/* Stake Entries List */}
            {hasStakeEntries ? (
                <div className="stake-entries-list">
                    {stakeIds.map((id) => (
                        <StakeEntryItem
                            key={Number(id)}
                            address={address}
                            stakeId={id}
                            t={t}
                            formatNumber={formatNumber}
                            formatInputNumber={formatInputNumber}
                            unformatInputNumber={unformatInputNumber}
                            onUnstakeById={onUnstakeById}
                            onUnstakePartial={onUnstakePartial}
                            isLoading={isLoading}
                            earlyUnstakePenalty={earlyUnstakePenalty}
                            gracePeriodDuration={gracePeriodDuration}
                            LOCK_OPTIONS_INFO={LOCK_OPTIONS_INFO as any}
                            onRelock={onRelock}
                            pendingReward={pendingReward}
                            totalShares={totalShares}
                            rewardRatePerSecond={rewardRatePerSecond}
                        />
                    ))}
                </div>
            ) : (
                <div className="legacy-unstake">
                    <div className="input-group" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            placeholder={t('amountToUnstake')}
                            value={formatInputNumber(unstakeAmount)}
                            onChange={(e) => {
                                const rawValue = unformatInputNumber(e.target.value).replace(/[^0-9.]/g, '');
                                setUnstakeAmount(rawValue);
                            }}
                            className="stake-input"
                        />
                    </div>
                    <div className="preset-row" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleUnstakePreset(0.25)}>25%</button>
                        <button onClick={() => handleUnstakePreset(0.50)}>50%</button>
                        <button onClick={handleMaxUnstake}>MAX</button>
                    </div>
                    <button
                        className="btn-stake"
                        onClick={(e) => { e.stopPropagation(); handleUnstake(); }}
                        disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
                    >
                        {isLoading ? '⏳' : t('confirmUnstake')}
                    </button>
                </div>
            )}
        </div>
    );

    // EXPANDED PANEL
    if (isExpanded) {
        return (
            <div className="circular-panel-component circular-panel-expanded panel-unstake" onClick={(e) => e.stopPropagation()}>
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">🔓 {t('panelUnstake')}</h2>
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
        <div className="circular-panel-component panel-unstake" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">🔓 {t('panelUnstake')}</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                {renderContent()}
            </div>
        </div>
    );
}
