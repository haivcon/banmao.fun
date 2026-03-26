'use client';

import { formatEther } from 'viem';
import { LOCK_OPTIONS_INFO } from './contracts';

interface StakeEntryCardProps {
    stakeId: number;
    amount: bigint;
    shares: bigint;
    lockEndTime: bigint;
    startTime: bigint;
    lockOptionId: number;
    isLocked: boolean;
    inGracePeriod: boolean;
    estimatedPenalty: bigint;
    penalty: bigint; // Global penalty rate
    onUnstake: (stakeId: number) => void;
    onUnstakePartial: (stakeId: number, amount: string) => void;
    isLoading: boolean;
}

export function StakeEntryCard({
    stakeId,
    amount,
    shares,
    lockEndTime,
    startTime,
    lockOptionId,
    isLocked,
    inGracePeriod,
    estimatedPenalty,
    penalty,
    onUnstake,
    onUnstakePartial,
    isLoading,
}: StakeEntryCardProps) {
    const lockOption = LOCK_OPTIONS_INFO[lockOptionId] || LOCK_OPTIONS_INFO[0];
    const now = Math.floor(Date.now() / 1000);
    const lockEnd = Number(lockEndTime);

    // Calculate time remaining
    const timeRemaining = lockEnd > now ? lockEnd - now : 0;
    const days = Math.floor(timeRemaining / 86400);
    const hours = Math.floor((timeRemaining % 86400) / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);

    // Format amount
    const formatNumber = (n: bigint) => {
        const formatted = formatEther(n);
        const num = parseFloat(formatted);
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    // Calculate effective multiplier
    const effectiveMultiplier = amount > BigInt(0)
        ? (Number(shares) / Number(amount)).toFixed(2)
        : '1.00';

    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: isLocked
                ? '1px solid rgba(251, 146, 60, 0.4)'
                : inGracePeriod
                    ? '1px solid rgba(74, 222, 128, 0.4)'
                    : '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '0.75rem',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                    }}>
                        #{stakeId}
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: lockOption.days === 0 ? '#22d3ee' : '#a855f7',
                        fontWeight: 600,
                    }}>
                        {lockOption.name}
                    </span>
                </div>
                <span style={{
                    fontSize: '0.85rem',
                    color: '#a855f7',
                    fontWeight: 600,
                }}>
                    {effectiveMultiplier}x
                </span>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '2px' }}>
                    STAKED AMOUNT
                </div>
                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                    {formatNumber(amount)} $BANMAO
                </div>
            </div>

            {/* Lock Status */}
            {isLocked && (
                <div style={{
                    background: 'rgba(251, 146, 60, 0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    marginBottom: '0.75rem',
                }}>
                    <div style={{
                        color: '#fb923c',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}>
                        <span>🔒 Locked</span>
                        <span>{days}d {hours}h {minutes}m</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '2px' }}>
                        Penalty: {Number(penalty) / 100}% (~{formatNumber(estimatedPenalty)} $BANMAO)
                    </div>
                </div>
            )}

            {inGracePeriod && (
                <div style={{
                    background: 'rgba(74, 222, 128, 0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    marginBottom: '0.75rem',
                }}>
                    <div style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>
                        ✅ Grace Period - No Penalty!
                    </div>
                </div>
            )}

            {!isLocked && !inGracePeriod && lockOption.days > 0 && (
                <div style={{
                    background: 'rgba(74, 222, 128, 0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    marginBottom: '0.75rem',
                }}>
                    <div style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>
                        ✅ Unlocked
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={() => onUnstake(stakeId)}
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: isLocked
                            ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                            : 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.5 : 1,
                    }}
                >
                    {isLocked ? '⚠️ Unstake (Penalty)' : '🔓 Unstake All'}
                </button>
            </div>

            {/* Timestamps */}
            <div style={{
                marginTop: '0.5rem',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
            }}>
                <span>Started: {new Date(Number(startTime) * 1000).toLocaleDateString()}</span>
                {lockOption.days > 0 && (
                    <span>Unlocks: {new Date(lockEnd * 1000).toLocaleDateString()}</span>
                )}
            </div>
        </div>
    );
}

// Loading skeleton
export function StakeEntrySkeleton() {
    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '0.75rem',
        }}>
            <div style={{
                height: '20px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                marginBottom: '0.75rem',
                animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
                height: '28px',
                width: '60%',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                marginBottom: '0.75rem',
                animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
                height: '36px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
            }} />
        </div>
    );
}
