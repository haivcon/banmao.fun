'use client';

import React from 'react';
import { StakingTranslations } from '../i18n';
import './panels.css';

interface StakePanelProps {
    t: (key: keyof StakingTranslations) => string;
    isTokenApproved: boolean;
    isLoading: boolean;
    stakeAmount: string;
    setStakeAmount: (value: string) => void;
    userBalance: number;
    selectedLockOption: number;
    setSelectedLockOption: (id: number) => void;
    LOCK_OPTIONS_INFO: Array<{ id: number; name: string; nameKey?: string; color: string; multiplier: number; days?: number }>;
    formatNumber: (value: number | bigint | undefined) => string;
    formatInputNumber: (value: string) => string;
    unformatInputNumber: (value: string) => string;
    handleStakePreset: (percent: number) => void;
    handleMaxStake: () => void;
    handleStake: () => void;
    approve: () => void;
    onClose: () => void;
    onCollapse?: () => void;
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
    minStakeAmount?: bigint;
    maxStakePerWallet?: bigint;
    userTotalStaked?: bigint;
    rewardRate?: bigint;
    earlyUnstakePenalty?: number;
    totalShares?: bigint;
    rewardRatePerSecond?: bigint;
}

export function StakePanel({
    t, isTokenApproved, isLoading, stakeAmount, setStakeAmount,
    userBalance, selectedLockOption, setSelectedLockOption, LOCK_OPTIONS_INFO,
    formatNumber, formatInputNumber, unformatInputNumber,
    handleStakePreset, handleMaxStake, handleStake, approve, onClose, onCollapse, style,
    isExpanded, onExpand,
    minStakeAmount, maxStakePerWallet, userTotalStaked, rewardRate, earlyUnstakePenalty,
    totalShares, rewardRatePerSecond
}: StakePanelProps) {

    const selectedOption = LOCK_OPTIONS_INFO.find(o => o.id === selectedLockOption);
    const multiplier = selectedOption?.multiplier || 1;
    const stakeNum = parseFloat(stakeAmount) || 0;

    const minAmount = minStakeAmount ? Number(minStakeAmount) / 1e18 : 0;
    const maxAmount = maxStakePerWallet ? Number(maxStakePerWallet) / 1e18 : Infinity;
    const currentStaked = userTotalStaked ? Number(userTotalStaked) / 1e18 : 0;
    const remainingAllowance = maxAmount - currentStaked;

    const isAmountTooLow = stakeNum > 0 && stakeNum < minAmount;
    const isAmountTooHigh = stakeNum > 0 && stakeNum > remainingAllowance;
    const isValidAmount = stakeNum > 0 && !isAmountTooLow && !isAmountTooHigh && stakeNum <= userBalance;

    // Unified content for both compact and expanded views
    const renderContent = () => (
        <div className={`stake-panel-content ${isExpanded ? 'expanded' : 'compact'}`}>
            {!isTokenApproved ? (
                <div className="approve-section">
                    <div className="approve-icon">🔓</div>
                    <h3>{t('approveToken')}</h3>
                    <p>{t('approveDesc')}</p>
                    <button
                        className="btn-approve"
                        onClick={(e) => { e.stopPropagation(); approve(); }}
                        disabled={isLoading}
                    >
                        {isLoading ? t('processing') : '✅ ' + t('stakingApprove')}
                    </button>
                </div>
            ) : (
                <>
                    {/* Balance Info Row */}
                    <div className="stake-info-grid">
                        <div className="info-box">
                            <span className="info-box-label">{t('balance')}</span>
                            <span className="info-box-value">{formatNumber(userBalance)}</span>
                        </div>
                        <div className="info-box">
                            <span className="info-box-label">{t('staked')}</span>
                            <span className="info-box-value">{formatNumber(userTotalStaked || BigInt(0))}</span>
                        </div>
                    </div>

                    {/* Lock Options */}
                    <div className="lock-section">
                        <label className="section-title">{t('selectLockDuration')}</label>
                        <div className="lock-grid">
                            {LOCK_OPTIONS_INFO.map((option) => (
                                <div
                                    key={option.id}
                                    className={`lock-card ${selectedLockOption === option.id ? 'selected' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setSelectedLockOption(option.id); }}
                                >
                                    <div className="lock-card-name">
                                        {option.days === 0 ? 'Flexible' : `${option.days} Days`}
                                    </div>
                                    <div className="lock-card-multiplier">{option.multiplier}x</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="amount-section">
                        <label className="section-title">{t('stakeAmount')}</label>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="0.00"
                                value={formatInputNumber(stakeAmount)}
                                onChange={(e) => {
                                    const rawValue = unformatInputNumber(e.target.value).replace(/[^0-9.]/g, '');
                                    setStakeAmount(rawValue);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="stake-input"
                            />
                            <span className="input-token">$BANMAO</span>
                        </div>
                        <div className="preset-row">
                            <button onClick={(e) => { e.stopPropagation(); handleStakePreset(0.25); }}>25%</button>
                            <button onClick={(e) => { e.stopPropagation(); handleStakePreset(0.50); }}>50%</button>
                            <button onClick={(e) => { e.stopPropagation(); handleStakePreset(0.75); }}>75%</button>
                            <button onClick={(e) => { e.stopPropagation(); handleMaxStake(); }}>MAX</button>
                        </div>
                    </div>

                    {/* Reward Calculator Section */}
                    {stakeNum > 0 && rewardRatePerSecond && totalShares && (
                        <div className="reward-calculator" style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
                            borderRadius: '12px',
                            padding: '12px',
                            marginTop: '12px',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', marginBottom: '10px', textAlign: 'center' }}>
                                {t('estimatedEarnings')}
                            </div>

                            {(() => {
                                const userShares = stakeNum * multiplier;
                                const currentTotalShares = Number(totalShares) / 1e18;
                                const newTotalShares = currentTotalShares + userShares;
                                const userPercentage = (userShares / newTotalShares) * 100;

                                const ratePerSecond = Number(rewardRatePerSecond) / 1e18;
                                const userRewardPerSecond = (userShares / newTotalShares) * ratePerSecond;
                                const userRewardPerHour = userRewardPerSecond * 3600;
                                const userRewardPerDay = userRewardPerSecond * 86400;
                                const userRewardPerMonth = userRewardPerDay * 30;

                                const lockDays = selectedOption?.days || 0;
                                const totalRewardAfterLock = userRewardPerDay * lockDays;

                                const devFee = 2; // 2%
                                const netRewardPerDay = userRewardPerDay * (1 - devFee / 100);
                                const netTotalReward = totalRewardAfterLock * (1 - devFee / 100);

                                return (
                                    <div style={{ fontSize: '11px', color: '#e2e8f0' }}>
                                        {/* Summary Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '20px', textAlign: 'center' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Shares</div>
                                                <div style={{ fontWeight: 600, color: '#22d3ee' }}>{userShares.toLocaleString()}</div>
                                            </div>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '20px', textAlign: 'center' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '10px' }}>{t('poolPercentNote')}</div>
                                                <div style={{ fontWeight: 600, color: '#a855f7' }}>{userPercentage.toFixed(4)}%</div>
                                            </div>
                                        </div>

                                        {/* Rate Info */}
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '12px', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#94a3b8' }}>{t('ratePerSecond')}</span>
                                                <span>{ratePerSecond.toFixed(4)} BANMAO</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>{t('yourRewardPerSecond')}</span>
                                                <span style={{ color: '#22c55e' }}>{userRewardPerSecond.toFixed(6)} BANMAO</span>
                                            </div>
                                        </div>

                                        {/* Earnings Breakdown */}
                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#22c55e' }}>{t('estimateAfterFee')}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{t('perHour')}</span>
                                                    <span>{(userRewardPerHour * 0.98).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>• {t('perDay')}:</span>
                                                    <span style={{ color: '#fbbf24' }}>{netRewardPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#94a3b8' }}>{t('perMonth')}</span>
                                                    <span>{(userRewardPerMonth * 0.98).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                {lockDays > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#94a3b8' }}>{t('afterDays')} {lockDays}d:</span>
                                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>+{netTotalReward.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Total Receive Highlight */}
                                            {lockDays > 0 && (
                                                <div style={{
                                                    marginTop: '10px',
                                                    paddingTop: '10px',
                                                    borderTop: '1px dashed rgba(34, 197, 94, 0.3)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>{t('principalLabel')}</span>
                                                        <span style={{ fontSize: '10px' }}>{stakeNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>{t('estimatedInterest')} ({lockDays}d):</span>
                                                        <span style={{ color: '#fbbf24', fontSize: '10px' }}>+{netTotalReward.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        background: 'rgba(34, 197, 94, 0.15)',
                                                        padding: '6px 8px',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>{t('totalReceive')}</span>
                                                        <span style={{
                                                            color: '#22c55e',
                                                            fontWeight: 700,
                                                            fontSize: '14px',
                                                            textShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
                                                        }}>
                                                            {(stakeNum + netTotalReward).toLocaleString(undefined, { maximumFractionDigits: 2 })} BANMAO
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                                            {t('estimateDisclaimer')}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Validation */}
                    {isAmountTooLow && (
                        <div className="validation-msg error">⚠️ Min: {formatNumber(minStakeAmount)}</div>
                    )}
                    {stakeNum > userBalance && (
                        <div className="validation-msg error">{t('insufficientBalance')}</div>
                    )}

                    {/* Stake Button */}
                    <button
                        className="btn-stake"
                        onClick={(e) => { e.stopPropagation(); handleStake(); }}
                        disabled={!isValidAmount || isLoading}
                    >
                        {isLoading ? t('processing') : '🚀 ' + t('confirmStake')}
                    </button>
                </>
            )
            }
        </div >
    );

    // ============ EXPANDED PANEL ============
    if (isExpanded) {
        return (
            <div
                className="circular-panel-component circular-panel-expanded panel-stake"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">🔒 {t('panelStake')}</h2>
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

    // ============ COMPACT PANEL ============
    return (
        <div className="circular-panel-component panel-stake" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">🔒 {t('panelStake')}</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                {renderContent()}
            </div>
        </div>
    );
}
