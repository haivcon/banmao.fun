// CreatePoolModal.tsx - Form content for creating a new betting pool
// NOTE: This component is designed to be embedded inside a DraggablePanel
"use client";

import React, { useState, useEffect } from 'react';
import { formatTokenAmount, parseTokenAmount } from '../lib/abis';

interface CreatePoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, deposit: string, minBet: string, maxBet: string, jackpotPct: number) => Promise<any>;
    minPoolDeposit: bigint | undefined;
    tokenBalance: bigint | undefined;
    allowance: bigint | undefined;
    onApprove: (amount: bigint) => Promise<any>;
    isPending: boolean;
    t?: any; // Translations
}

export function CreatePoolModal({
    isOpen,
    onClose,
    onSubmit,
    minPoolDeposit,
    tokenBalance,
    allowance,
    onApprove,
    isPending,
    t
}: CreatePoolModalProps) {
    const [poolName, setPoolName] = useState('');
    const [initialDeposit, setInitialDeposit] = useState('');
    const [minBet, setMinBet] = useState('100');
    const [maxBet, setMaxBet] = useState('10000');
    const [jackpotPercent, setJackpotPercent] = useState(2);
    const [step, setStep] = useState<'form' | 'approve' | 'create'>('form');

    // Reset on open and initialize with defaults
    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setPoolName('');

            // Auto-fill minimum deposit
            const minDep = minPoolDeposit ? formatTokenAmount(minPoolDeposit).replace(/,/g, '') : '1000000';
            setInitialDeposit(minDep);

            // Reset others (will be auto-calc'd by next useEffect)
            setJackpotPercent(2);
        }
    }, [isOpen, minPoolDeposit]);

    // Auto-adjust min/max bet when initialDeposit changes
    // User Requirement: "tự động điều chỉnh cược tối thiếu, cược tối đa sao cho phù hợp với logic trả thưởng"
    useEffect(() => {
        const depositNum = Number(initialDeposit) || 0;
        if (depositNum > 0) {
            // Logic: Pool must cover max jackpot payout (450x multiplier)
            // So Max Bet <= Deposit / 500
            const maxAllowed = Math.floor(depositNum / 500);

            // Set Max Bet to the safe limit
            setMaxBet(maxAllowed.toString());

            // Set Min Bet to a reasonable default (e.g. 1/100 of Max Bet), ensure at least 1
            const calcMin = Math.max(1, Math.floor(maxAllowed / 100));
            setMinBet(calcMin.toString());
        }
    }, [initialDeposit]);

    // Helper to adjust deposit
    const adjustDeposit = (delta: number) => {
        const current = Number(initialDeposit) || 0;
        const min = minPoolDeposit ? Number(formatTokenAmount(minPoolDeposit).replace(/,/g, '')) : 0;
        const newValue = current + delta;

        // Allow increasing freely, but decreasing only down to minimum
        if (newValue >= min) {
            setInitialDeposit(newValue.toFixed(0)); // Integer only usually
        }
    };

    // Don't render if not open
    if (!isOpen) return null;

    const minDepositFormatted = minPoolDeposit ? formatTokenAmount(minPoolDeposit) : '1,000,000';
    const balanceFormatted = tokenBalance ? formatTokenAmount(tokenBalance) : '0';
    const depositAmount = initialDeposit ? parseTokenAmount(initialDeposit) : BigInt(0);
    const needsApproval = allowance !== undefined && depositAmount > allowance;
    const hasEnoughBalance = tokenBalance !== undefined && depositAmount <= tokenBalance;
    const meetsMinDeposit = minPoolDeposit !== undefined && depositAmount >= minPoolDeposit;

    // Validate maxBet <= deposit / 500
    const depositNum = Number(initialDeposit) || 0;
    const maxBetNum = Number(maxBet) || 0;
    const maxBetLimit = Math.floor(depositNum / 500);
    const maxBetValid = maxBetNum <= maxBetLimit && maxBetNum > 0;

    const canProceed = poolName.length > 0 && poolName.length <= 14 &&
        depositNum > 0 && hasEnoughBalance && meetsMinDeposit &&
        Number(minBet) > 0 && maxBetValid &&
        jackpotPercent >= 0 && jackpotPercent <= 10;

    const handleProceed = async () => {
        if (needsApproval) {
            setStep('approve');
            try {
                await onApprove(depositAmount);
                setStep('create');
                await onSubmit(poolName, initialDeposit, minBet, maxBet, jackpotPercent);
                onClose();
            } catch (err) {
                setStep('form');
            }
        } else {
            setStep('create');
            try {
                await onSubmit(poolName, initialDeposit, minBet, maxBet, jackpotPercent);
                onClose();
            } catch (err) {
                setStep('form');
            }
        }
    };

    const handleCreate = async () => {
        setStep('create');
        try {
            await onSubmit(poolName, initialDeposit, minBet, maxBet, jackpotPercent);
            onClose();
        } catch (err) {
            setStep('form');
        }
    };

    return (
        <div style={{ padding: 4 }}>
            {/* Info Banner */}
            <div style={{
                background: 'rgba(250, 204, 21, 0.1)',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                borderRadius: '9999px',
                padding: '12px 20px',
                marginBottom: 20,
                fontSize: 12,
                color: '#facc15'
            }}>
                {t.minDepositInfo} <strong>{minDepositFormatted} $BANMAO</strong>
                <br />
                {t.yourBalance} <strong>{balanceFormatted} $BANMAO</strong>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Pool Name */}
                <div>
                    <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {t.poolName} *
                    </label>
                    <input
                        type="text"
                        value={poolName}
                        onChange={e => setPoolName(e.target.value.slice(0, 14))} // Manual 14 char limit
                        placeholder={t.poolNamePlaceholder}
                        style={inputStyle}
                        maxLength={14} // Native limit
                    />
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                        {poolName.length}/14 {t.charLimit}
                    </div>
                </div>

                {/* Initial Deposit - With +/- Controls */}
                <div>
                    <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {t.initialDeposit} *
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => adjustDeposit(-100000)}
                            style={miniButtonStyle}
                            disabled={!initialDeposit || Number(initialDeposit) <= (minPoolDeposit ? Number(formatTokenAmount(minPoolDeposit).replace(/,/g, '')) : 0)}
                        >
                            -
                        </button>
                        <input
                            type="number"
                            value={initialDeposit}
                            onChange={e => setInitialDeposit(e.target.value)}
                            placeholder="1000000"
                            style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                            onClick={() => adjustDeposit(100000)}
                            style={miniButtonStyle}
                        >
                            +
                        </button>
                    </div>
                    {/* Error Msg */}
                    {!meetsMinDeposit && initialDeposit && (
                        <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>
                            ⚠️ {t.minimum}: {minDepositFormatted}
                        </div>
                    )}
                </div>

                {/* Min/Max Bet Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>
                            {t?.minBet || 'Min Bet'}
                        </label>
                        <input
                            type="number"
                            value={minBet}
                            onChange={e => setMinBet(e.target.value)}
                            style={inputStyle}
                            min={1}
                        />
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                            💡 {t?.minBetHint || 'Minimum tokens per spin. Auto-suggested = MaxBet/100'}
                        </div>
                    </div>
                    <div>
                        <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>
                            {t?.maxBet || 'Max Bet'}
                        </label>
                        <input
                            type="number"
                            value={maxBet}
                            onChange={e => setMaxBet(e.target.value)}
                            style={inputStyle}
                            min={1}
                        />
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                            💡 {t?.maxBetHint || `Max Bet ≤ Deposit ÷ 500. Ensures pool can cover 500x payout.`}
                        </div>
                    </div>
                </div>
                {/* Error if max bet exceeds limit */}
                {!maxBetValid && maxBet && (
                    <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>
                        ⚠️ {t?.maxBetLimitError || 'Max Bet cannot exceed'} {maxBetLimit.toLocaleString()}
                    </div>
                )}

                {/* Jackpot Percent Slider */}
                <div>
                    <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>
                        {t.jackpotPercent}: <strong style={{ color: '#facc15' }}>{jackpotPercent}%</strong>
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={10}
                        value={jackpotPercent}
                        onChange={e => setJackpotPercent(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#facc15' }}
                    />
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                        {t.jackpotInfo}
                    </div>
                </div>
            </div>

            {/* Platform Fee Notice */}
            <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '9999px',
                padding: '12px 20px',
                marginTop: 20,
                fontSize: 11,
                color: '#a855f7'
            }}>
                📊 {t.platformFee}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1,
                        padding: '14px 20px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '9999px',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    {t.cancel}
                </button>
                <button
                    onClick={step === 'form' ? handleProceed : handleCreate}
                    disabled={!canProceed || isPending}
                    style={{
                        flex: 2,
                        padding: '14px 20px',
                        background: canProceed && !isPending
                            ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                            : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '9999px',
                        color: 'white',
                        cursor: canProceed && !isPending ? 'pointer' : 'not-allowed',
                        fontWeight: 700,
                        fontSize: 14,
                        boxShadow: canProceed && !isPending ? '0 4px 20px rgba(168, 85, 247, 0.4)' : 'none'
                    }}
                >
                    {isPending ? `⏳ ${t.processing}` :
                        step === 'form' && needsApproval ? `📝 ${t.approveAndCreate}` :
                            `🏗️ ${t.create}`}
                </button>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '9999px',
    color: 'white',
    fontSize: 14,
    boxSizing: 'border-box'
};

const miniButtonStyle: React.CSSProperties = {
    width: 44,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    color: 'white',
    fontSize: 20,
    cursor: 'pointer'
};
