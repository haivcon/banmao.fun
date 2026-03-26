// PoolManagementCard.tsx - Card for managing a single pool
"use client";

import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import { SLOTS_ABI, SLOTS_CONTRACT_ADDRESS, formatTokenAmount } from '../lib/abis';
import { Pool } from '../hooks/useHouseDashboard';
import { PoolProtectionPanel } from './PoolProtectionPanel';
import { PoolStatisticsChart } from './PoolStatisticsChart';

interface PoolManagementCardProps {
    poolId: bigint;
    isPlatformPool?: boolean;
    onDeposit: (poolId: bigint, amount: string) => Promise<any>;
    onWithdraw: (poolId: bigint, amount: string) => Promise<any>;
    onUpdateSettings: (poolId: bigint, minBet: string, maxBet: string, jackpotPct: number) => Promise<any>;
    onDeactivate: (poolId: bigint) => Promise<any>;
    onReactivate: (poolId: bigint) => Promise<any>;
    onClose: (poolId: bigint) => Promise<any>;
    onTransfer: (poolId: bigint, newOwner: string) => Promise<any>;
    onSettleExpired: (poolId: bigint, player: string) => Promise<any>;
    // Protection handlers
    onUpdateProtectionSettings?: (poolId: bigint, dynamicMaxBetEnabled: boolean, lowBalanceThreshold: number, criticalBalanceThreshold: number, streakProtectionEnabled: boolean, hourlyPayoutLimit: number, emergencyCooldown: number) => Promise<any>;
    onTriggerEmergency?: (poolId: bigint) => Promise<any>;
    onExecuteEmergencyWithdraw?: (poolId: bigint) => Promise<any>;
    onCancelEmergency?: (poolId: bigint) => Promise<any>;
    onGetPoolHealth?: (poolId: bigint) => Promise<any>;
    onGetProtectionSettings?: (poolId: bigint) => Promise<any>;
    isPending: boolean;
    userBalance?: bigint;
    t?: any;
}

export function PoolManagementCard({
    poolId,
    isPlatformPool,
    onDeposit,
    onWithdraw,
    onUpdateSettings,
    onDeactivate,
    onReactivate,
    onClose,
    onTransfer,
    onSettleExpired,
    onUpdateProtectionSettings,
    onTriggerEmergency,
    onExecuteEmergencyWithdraw,
    onCancelEmergency,
    onGetPoolHealth,
    onGetProtectionSettings,
    isPending,
    userBalance,
    t
}: PoolManagementCardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'funds' | 'protection' | 'danger'>('overview');
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [newMinBet, setNewMinBet] = useState('');
    const [newMaxBet, setNewMaxBet] = useState('');
    const [newJackpotPct, setNewJackpotPct] = useState(2);
    const [newOwner, setNewOwner] = useState('');
    const [settlePlayer, setSettlePlayer] = useState('');
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Read pool data (using pools mapping, not getPool)
    const { data: poolData, refetch: refetchPool } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'pools',
        args: [poolId],
    });

    // Read pool stats
    const { data: poolStats } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'getPoolStats',
        args: [poolId],
    });

    // Parse pool data from tuple
    // Tuple: [0:id, 1:owner, 2:name, 3:balance, 4:minBet, 5:maxBet, 6:jackpotPercent, 7:jackpotPool, 8:totalSpins, 9:totalBetsVolume, 10:totalPayoutsVolume, 11:totalPendingBets, 12:isActive, 13:createdAt]
    const poolTuple = poolData as readonly [bigint, `0x${string}`, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, bigint] | undefined;
    const pool: Pool | undefined = poolTuple ? {
        id: poolTuple[0],
        owner: poolTuple[1],
        name: poolTuple[2],
        balance: poolTuple[3],
        minBet: poolTuple[4],
        maxBet: poolTuple[5],
        jackpotPercent: poolTuple[6],
        jackpotPool: poolTuple[7],
        totalSpins: poolTuple[8],
        totalBetsVolume: poolTuple[9],
        totalPayoutsVolume: poolTuple[10],
        totalPendingBets: poolTuple[11],
        isActive: poolTuple[12],
        createdAt: poolTuple[13],
    } : undefined;
    const stats = poolStats as [bigint, bigint, bigint, bigint, bigint] | undefined;

    if (!pool) {
        return (
            <div style={{
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                color: '#94a3b8'
            }}>
                {t?.loadingPool || 'Loading pool'} #{poolId.toString()}...
            </div>
        );
    }

    const withdrawable = pool.balance > (pool.totalPendingBets + pool.jackpotPool)
        ? pool.balance - pool.totalPendingBets - pool.jackpotPool
        : BigInt(0);

    const profitLoss = stats ? stats[3] : BigInt(0);
    const rtpBps = stats ? stats[4] : BigInt(0);

    const tabStyle = (active: boolean) => ({
        padding: '8px 12px',
        background: active ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
        border: active ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
        borderRadius: 6,
        color: active ? '#a855f7' : '#94a3b8',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: active ? 600 : 400
    });

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(22, 33, 62, 0.95))',
            border: `2px solid ${pool.isActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16
        }}>
            {/* Header */}
            <div style={{
                padding: 16,
                background: pool.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isPlatformPool ? '👑' : '🏠'} {pool.name}
                        {isPlatformPool && (
                            <span style={{
                                background: 'linear-gradient(135deg, #facc15, #f97316)',
                                color: '#000',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700
                            }}>
                                {t.official}
                            </span>
                        )}
                    </h3>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        {t.poolId} #{pool.id.toString()} • {t.created} {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(Number(pool.createdAt) * 1000))}
                    </div>
                </div>
                <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background: pool.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: pool.isActive ? '#22c55e' : '#ef4444',
                    border: `1px solid ${pool.isActive ? '#22c55e' : '#ef4444'}`
                }}>
                    {pool.isActive ? `✅ ${t.statusActive}` : `⏸ ${t.statusPaused}`}
                </span>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: 8,
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <button onClick={() => setActiveTab('overview')} style={tabStyle(activeTab === 'overview')}>
                    📊 {t.tabOverview}
                </button>
                <button onClick={() => setActiveTab('funds')} style={tabStyle(activeTab === 'funds')}>
                    💰 {t.tabFunds}
                </button>
                <button onClick={() => setActiveTab('settings')} style={tabStyle(activeTab === 'settings')}>
                    ⚙️ {t.tabSettings}
                </button>
                <button onClick={() => setActiveTab('protection')} style={tabStyle(activeTab === 'protection')}>
                    🛡️ {t?.tabProtection || 'Protection'}
                </button>
                <button onClick={() => setActiveTab('danger')} style={tabStyle(activeTab === 'danger')}>
                    ⚠️ {t.tabDanger}
                </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: 16 }}>
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Low Balance Alert */}
                        {pool.balance < 5000 * 10 ** 18 && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                color: '#fca5a5',
                                fontSize: 13,
                                animation: 'pulse 2s infinite'
                            }}>
                                <span>⚠️</span>
                                <span>
                                    <b>{t?.alertLowBalance || 'Low Balance Warning!'}</b>
                                    {' '}{t?.alertLowBalanceDesc || 'Pool funds are low. Deposit more to ensure payouts continue.'}
                                </span>
                                <button
                                    onClick={() => setActiveTab('funds')}
                                    style={{
                                        marginLeft: 'auto',
                                        background: '#ef4444',
                                        border: 'none',
                                        borderRadius: 4,
                                        color: 'white',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        fontWeight: 600
                                    }}
                                >
                                    {t?.deposit || 'Deposit'}
                                </button>
                            </div>
                        )}

                        {/* Visual Chart */}
                        <PoolStatisticsChart
                            totalBets={pool.totalBetsVolume}
                            totalPayouts={pool.totalPayoutsVolume}
                            profit={stats ? stats[3] : BigInt(0)}
                            rtpBps={stats ? stats[4] : BigInt(0)}
                            t={t}
                        />

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                            <StatCard label={t.statBalance} value={formatTokenAmount(pool.balance)} color="#e2e8f0" icon="💎" tooltip={t.tooltipBalance} />
                            <StatCard label={t.statJackpotPool} value={formatTokenAmount(pool.jackpotPool)} color="#facc15" icon="🎰" tooltip={t.tooltipJackpot} />
                            <StatCard label={t.statPendingBets} value={formatTokenAmount(pool.totalPendingBets)} color="#f97316" icon="⏳" tooltip={t.tooltipPending} />
                            <StatCard label={t.statWithdrawable} value={formatTokenAmount(withdrawable)} color="#22c55e" icon="💸" tooltip={t.tooltipWithdrawable} />
                            <StatCard label={t.statTotalSpins} value={pool.totalSpins.toString()} color="#a855f7" icon="🎲" tooltip={t.tooltipSpins} />
                            <StatCard label={t.statVolume} value={formatTokenAmount(pool.totalBetsVolume)} color="#06b6d4" icon="📈" tooltip={t.tooltipVolume} />
                            <StatCard label={t.statProfit} value={formatTokenAmount(profitLoss)} color="#22c55e" icon="💰" tooltip={t.tooltipProfit} />
                            <StatCard label={t.statRTP} value={`${(Number(rtpBps) / 100).toFixed(2)}%`} color="#a855f7" icon="📊" tooltip={t.tooltipRTP} />
                        </div>
                    </div>
                )}

                {activeTab === 'funds' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Deposit */}
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: 16,
                            padding: 20
                        }}>
                            <h4 style={{ color: '#22c55e', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                📥 {t.deposit}
                            </h4>

                            {/* Wallet Balance (For Alignment) */}
                            <div style={{ fontSize: 11, color: '#86efac', marginBottom: 8, fontWeight: 600, minHeight: 17 }}>
                                {userBalance !== undefined ? `${t.yourBalance || 'Wallet'}: ${formatTokenAmount(userBalance)} $BANMAO` : '...'}
                            </div>

                            {/* Detailed Note */}
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderLeft: '3px solid #22c55e',
                                padding: '8px 12px',
                                borderRadius: 4,
                                marginBottom: 16,
                                color: '#86efac',
                                fontSize: 11,
                                lineHeight: 1.4,
                                fontStyle: 'italic',
                                minHeight: 48,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <span>📝 {t.depositNote || 'Deposit funds into the smart contract pool. These funds back player bets.'}</span>
                            </div>

                            <input
                                type="number"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                placeholder={t.amount}
                                style={{
                                    ...inputStyle,
                                    borderRadius: 30, // Capsule shape
                                    padding: '12px 16px',
                                    background: 'rgba(0,0,0,0.4)'
                                }}
                            />
                            <button
                                onClick={async () => {
                                    await onDeposit(poolId, depositAmount);
                                    setDepositAmount('');
                                    refetchPool();
                                }}
                                disabled={!depositAmount || isPending}
                                style={{
                                    ...buttonStyle('#22c55e', !depositAmount || isPending),
                                    borderRadius: 30, // Capsule shape
                                    padding: '12px'
                                }}
                            >
                                {isPending ? '⏳' : '📥'} {t.deposit}
                            </button>
                        </div>

                        {/* Withdraw */}
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 16,
                            padding: 20
                        }}>
                            <h4 style={{ color: '#ef4444', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                📤 {t.withdraw}
                            </h4>
                            <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 8, fontWeight: 600, minHeight: 17 }}>
                                {t.available}: {formatTokenAmount(withdrawable)} $BANMAO
                            </div>

                            {/* Detailed Note */}
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderLeft: '3px solid #ef4444',
                                padding: '8px 12px',
                                borderRadius: 4,
                                marginBottom: 16,
                                color: '#fca5a5',
                                fontSize: 11,
                                lineHeight: 1.4,
                                fontStyle: 'italic',
                                minHeight: 48,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <span>📝 {t.withdrawNote || 'Withdraw unused liquidity. Locked funds cannot be withdrawn.'}</span>
                            </div>

                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(e.target.value)}
                                placeholder={t.amount}
                                style={{
                                    ...inputStyle,
                                    borderRadius: 30, // Capsule shape
                                    padding: '12px 16px',
                                    background: 'rgba(0,0,0,0.4)'
                                }}
                            />

                            {/* Preset Buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                                {[
                                    { label: t.half || '1/2', val: 2 },
                                    { label: t.third || '1/3', val: 3 },
                                    { label: t.quarter || '1/4', val: 4 },
                                    { label: t.all || 'All', val: 1 }
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => {
                                            const amt = Number(formatTokenAmount(withdrawable).replace(/,/g, ''));
                                            if (amt > 0) {
                                                setWithdrawAmount((amt / preset.val).toFixed(2));
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            borderRadius: 20,
                                            color: '#fca5a5',
                                            padding: '4px',
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={async () => {
                                    await onWithdraw(poolId, withdrawAmount);
                                    setWithdrawAmount('');
                                    refetchPool();
                                }}
                                disabled={!withdrawAmount || isPending}
                                style={{
                                    ...buttonStyle('#ef4444', !withdrawAmount || isPending),
                                    borderRadius: 30, // Capsule shape
                                    padding: '12px'
                                }}
                            >
                                {isPending ? '⏳' : '📤'} {t.withdraw}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div>
                                <label style={labelStyle}>{t.minBet} ({t.current}: {formatTokenAmount(pool.minBet)})</label>
                                <input
                                    type="number"
                                    value={newMinBet}
                                    onChange={e => setNewMinBet(e.target.value)}
                                    placeholder={formatTokenAmount(pool.minBet)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>{t.maxBet} ({t.current}: {formatTokenAmount(pool.maxBet)})</label>
                                <input
                                    type="number"
                                    value={newMaxBet}
                                    onChange={e => setNewMaxBet(e.target.value)}
                                    placeholder={formatTokenAmount(pool.maxBet)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>{t.jackpotPercent} ({t.current}: {pool.jackpotPercent.toString()}%)</label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={newJackpotPct}
                                onChange={e => setNewJackpotPct(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <div style={{ textAlign: 'center', color: '#facc15', fontWeight: 600 }}>{newJackpotPct}%</div>
                        </div>
                        <button
                            onClick={async () => {
                                await onUpdateSettings(
                                    poolId,
                                    newMinBet || formatTokenAmount(pool.minBet).replace(/,/g, ''),
                                    newMaxBet || formatTokenAmount(pool.maxBet).replace(/,/g, ''),
                                    newJackpotPct
                                );
                                refetchPool();
                            }}
                            disabled={isPending}
                            style={buttonStyle('#6366f1', isPending)}
                        >
                            {isPending ? '⏳' : '⚙️'} {t.updateSettings}
                        </button>
                    </div>
                )}

                {activeTab === 'protection' && onUpdateProtectionSettings && onTriggerEmergency && onExecuteEmergencyWithdraw && onCancelEmergency && onGetPoolHealth && onGetProtectionSettings && (
                    <PoolProtectionPanel
                        poolId={poolId}
                        poolBalance={pool.balance}
                        isPending={isPending}
                        onUpdateProtectionSettings={onUpdateProtectionSettings}
                        onTriggerEmergency={onTriggerEmergency}
                        onExecuteEmergencyWithdraw={onExecuteEmergencyWithdraw}
                        onCancelEmergency={onCancelEmergency}
                        onGetPoolHealth={onGetPoolHealth}
                        onGetProtectionSettings={onGetProtectionSettings}
                        t={t}
                    />
                )}

                {activeTab === 'danger' && (
                    <div>
                        {/* Toggle Active */}
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }}>
                            <h4 style={{ color: '#f59e0b', margin: '0 0 8px' }}>
                                {pool.isActive ? `⏸ ${t.pausePool}` : `▶️ ${t.activatePool}`}
                            </h4>
                            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 12px' }}>
                                {pool.isActive ? t.pauseDesc : t.activateDesc}
                            </p>
                            <button
                                onClick={() => pool.isActive ? onDeactivate(poolId) : onReactivate(poolId)}
                                disabled={isPending}
                                style={buttonStyle('#f59e0b', isPending)}
                            >
                                {isPending ? '⏳' : pool.isActive ? '⏸' : '▶️'}
                                {pool.isActive ? ` ${t.pausePool}` : ` ${t.activatePool}`}
                            </button>
                        </div>

                        {/* Transfer Ownership */}
                        <div style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }}>
                            <h4 style={{ color: '#a855f7', margin: '0 0 8px' }}>🔄 {t.transferOwnership}</h4>
                            <input
                                type="text"
                                value={newOwner}
                                onChange={e => setNewOwner(e.target.value)}
                                placeholder={t.transferAddr}
                                style={{ ...inputStyle, marginBottom: 8 }}
                            />
                            <button
                                onClick={() => onTransfer(poolId, newOwner)}
                                disabled={!newOwner || isPending}
                                style={buttonStyle('#a855f7', !newOwner || isPending)}
                            >
                                {isPending ? '⏳' : '🔄'} {t.transferBtn}
                            </button>
                        </div>

                        {/* Smart Settle Assistant Badge */}
                        {pool.totalPendingBets > BigInt(0) && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 16,
                                color: '#93c5fd',
                                fontSize: 13
                            }}>
                                <span>🛠️</span>
                                <div>
                                    <b>{t?.smartSettleTitle || 'Pending Bets Found'}</b>
                                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                                        {formatTokenAmount(pool.totalPendingBets)} $BANMAO {t?.statPendingBets || 'pending'}. {t?.settleBtn || 'Use Settle to clear.'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Settle Stuck Bet */}
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16
                        }}>
                            <h4 style={{ color: '#3b82f6', margin: '0 0 8px' }}>🛠️ {t?.settleTitle || 'Settle Stuck Bet'}</h4>
                            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 12px' }}>
                                {t?.settleDesc || 'Clear expired commit for a player to release pending funds.'}
                            </p>
                            <input
                                type="text"
                                value={settlePlayer}
                                onChange={e => setSettlePlayer(e.target.value)}
                                placeholder="0x..."
                                style={{ ...inputStyle, marginBottom: 8 }}
                            />
                            <button
                                onClick={() => onSettleExpired(poolId, settlePlayer)}
                                disabled={!settlePlayer || isPending}
                                style={buttonStyle('#3b82f6', !settlePlayer || isPending)}
                            >
                                {isPending ? '⏳' : '🛠️'} {t?.settleBtn || 'Settle'}
                            </button>
                        </div>

                        {/* Close Pool */}
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '2px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: 12,
                            padding: 16
                        }}>
                            <h4 style={{ color: '#ef4444', margin: '0 0 8px' }}>🔒 {t.closePoolTitle}</h4>
                            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 12px' }}>
                                ⚠️ {t.closePoolDesc} {t.closePoolWarn}
                            </p>
                            {showConfirmClose ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setShowConfirmClose(false)}
                                        style={buttonStyle('#64748b', false)}
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        onClick={() => onClose(poolId)}
                                        disabled={isPending || pool.totalPendingBets > BigInt(0)}
                                        style={buttonStyle('#ef4444', isPending || pool.totalPendingBets > BigInt(0))}
                                    >
                                        {isPending ? '⏳' : '🔒'} {t.confirmClose}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowConfirmClose(true)}
                                    style={buttonStyle('#ef4444', false)}
                                >
                                    🔒 {t.closePoolTitle}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper components
function StatCard({ label, value, color, icon, tooltip }: { label: string; value: string; color: string; icon: string; tooltip?: string }) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            style={{
                background: isHovered ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)',
                border: isHovered ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
                cursor: tooltip ? 'help' : 'default',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 4px 12px rgba(168, 85, 247, 0.2)' : 'none',
                position: 'relative'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ color, fontWeight: 700, fontSize: 14 }}>{value}</div>
            <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>

            {/* Tooltip */}
            {tooltip && isHovered && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: 'rgba(30, 41, 59, 0.98)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(30, 41, 59, 0.98)'
                    }} />
                    {tooltip}
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: 11,
    display: 'block',
    marginBottom: 4
};

const buttonStyle = (color: string, disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 16px',
    background: disabled ? 'rgba(255,255,255,0.1)' : color,
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 13,
    opacity: disabled ? 0.5 : 1
});
