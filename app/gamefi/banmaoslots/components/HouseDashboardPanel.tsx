// HouseDashboardPanel.tsx
// Embeddable House Dashboard for DraggablePanel
'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '../../../components/wallet/WalletConnection';
import { useHouseDashboard } from '../hooks/useHouseDashboard';
import { PoolManagementCard } from './PoolManagementCard';
import { formatTokenAmount } from '../lib/abis';
import { houseTranslations, HouseLanguage } from '../lib/houseI18n';
import { SlotsTranslations } from '../lib/i18n/types';

interface HouseDashboardPanelProps {
    onClose?: () => void;
    lang?: HouseLanguage;
    onOpenCreatePool?: (data: {
        handleCreatePool: (name: string, deposit: string, minBet: string, maxBet: string, jackpotPct: number) => Promise<any>;
        minPoolDeposit: bigint | undefined;
        tokenBalance: bigint | undefined;
        allowance: bigint | undefined;
        handleApprove: (amount: bigint) => Promise<any>;
        isPending: boolean;
    }) => void;
    slotsT?: SlotsTranslations; // For toast i18n
}

export function HouseDashboardPanel({ onClose, lang: propLang, onOpenCreatePool, slotsT }: HouseDashboardPanelProps) {
    // Use prop lang if available, otherwise default to 'en'
    const lang = propLang || 'en';
    const { address, isConnected } = useAccount();
    const [showGuide, setShowGuide] = useState(false);

    const {
        isPending,
        userPoolIds,
        platformPoolId,
        isContractOwner,
        minPoolDeposit,
        maxPoolsPerUser,
        activePoolCount,
        allowance,
        tokenBalance,
        handleApprove,
        handleCreatePool,
        handleDeposit,
        handleWithdraw,
        handleUpdateSettings,
        handleDeactivate,
        handleReactivate,
        handleClosePool,
        handleTransferOwnership,
        handleSettleExpiredByOwner,
        handleBatchSettleExpired,
        handleGetExpiredPlayers,
        handleGetPendingCount,
        // Protection handlers
        handleUpdateProtectionSettings,
        handleTriggerEmergency,
        handleExecuteEmergencyWithdraw,
        handleCancelEmergency,
        handleGetPoolHealth,
        handleGetProtectionSettings,
        refetchUserPools,
        refetchAllowance,
        refetchBalance
    } = useHouseDashboard(slotsT);

    const texts = houseTranslations[lang];

    // Language sync handled by parent now

    // Not connected state
    if (!isConnected) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: 40,
                minHeight: 300,
            }}>
                <h2 style={{ color: '#facc15', margin: 0 }}>🏠 {texts.title}</h2>
                <p style={{ color: '#94a3b8', margin: 0 }}>{texts.connectWalletDesc}</p>
                <ConnectButton />
            </div>
        );
    }

    const poolIds = userPoolIds || [];
    const canCreateMore = maxPoolsPerUser ? poolIds.length < Number(maxPoolsPerUser) : true;

    return (
        <div style={{
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            minHeight: 400,
        }}>
            {/* Mini Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#facc15' }}>
                        🏠 {texts.title}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                        {texts.subtitle}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Guidebook Toggle */}
                    <button
                        onClick={() => setShowGuide(true)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '6px 12px',
                            borderRadius: 20,
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>📖</span> {texts.guideBtn}
                    </button>
                </div>
            </div>

            {/* Guidebook Overlay */}
            {showGuide && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: '#0f172a',
                    zIndex: 50,
                    overflowY: 'auto',
                    padding: 20,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: 12
                    }}>
                        <h2 style={{ margin: 0, color: '#facc15', fontSize: 18 }}>📖 {texts.guideTitle}</h2>
                        <button
                            onClick={() => setShowGuide(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontSize: 20,
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
                        <p style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 24
                        }}>
                            💡 {texts.guideIntro}
                        </p>

                        {/* Contract Security Section */}
                        <div style={{ marginBottom: 24, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: 16 }}>
                            <h3 style={{ color: '#ef4444', fontSize: 15, marginBottom: 12 }}>{texts.handbookContractTitle}</h3>
                            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginBottom: 10, wordBreak: 'break-all' }}>{texts.handbookContractAddr}</p>
                            <p style={{ color: '#fef08a', fontWeight: 600, marginBottom: 10 }}>{texts.handbookContractSecurity}</p>
                            <p style={{ color: '#94a3b8', marginBottom: 10 }}>{texts.handbookContractOwnerNote}</p>
                            <a
                                href="https://www.okx.com/web3/explorer/xlayer/address/0x9c64c18d792eab435d1d921efac978f6a62da2d2"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                {texts.handbookExplorerLink} ↗
                            </a>
                        </div>

                        {/* Profit Analysis Section */}
                        <div style={{ marginBottom: 24, background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 12, padding: 16 }}>
                            <h3 style={{ color: '#22c55e', fontSize: 15, marginBottom: 12 }}>{texts.handbookProfitTitle}</h3>
                            <p style={{ marginBottom: 12 }}>{texts.handbookProfitIntro}</p>
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                                <p style={{ margin: '4px 0', color: '#94a3b8' }}>{texts.handbookPlatformFee}</p>
                                <p style={{ margin: '4px 0', color: '#94a3b8' }}>{texts.handbookGlobalRTP}</p>
                                <p style={{ margin: '4px 0', color: '#4ade80', fontWeight: 700, fontSize: 14 }}>{texts.handbookNetProfit}</p>
                            </div>
                            <p style={{ color: '#facc15', fontWeight: 600, marginBottom: 8 }}>{texts.handbookProfitExample}</p>
                            <p style={{ color: '#94a3b8', fontSize: 12 }}>{texts.handbookProfitBenefits}</p>
                        </div>

                        {/* Risk Analysis Section */}
                        <div style={{ marginBottom: 24, background: 'rgba(251, 146, 60, 0.05)', border: '1px solid rgba(251, 146, 60, 0.2)', borderRadius: 12, padding: 16 }}>
                            <h3 style={{ color: '#fb923c', fontSize: 15, marginBottom: 12 }}>{texts.handbookRiskTitle}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p style={{ color: '#fef08a', fontSize: 12 }}>{texts.handbookRiskVariance}</p>
                                <p style={{ color: '#fef08a', fontSize: 12 }}>{texts.handbookRiskOpportunityCost}</p>
                                <p style={{ color: '#fef08a', fontSize: 12 }}>{texts.handbookRiskPlatformFee}</p>
                                <p style={{ color: '#fef08a', fontSize: 12 }}>{texts.handbookRiskTechnical}</p>
                            </div>
                        </div>

                        {/* Configuration Recommendations */}
                        <div style={{ marginBottom: 24, background: 'rgba(147, 51, 234, 0.05)', border: '1px solid rgba(147, 51, 234, 0.2)', borderRadius: 12, padding: 16 }}>
                            <h3 style={{ color: '#a855f7', fontSize: 15, marginBottom: 12 }}>{texts.handbookConfigTitle}</h3>
                            <div style={{ display: 'grid', gap: 8 }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 }}>
                                    <p style={{ color: '#c4b5fd', fontSize: 12, margin: 0 }}>{texts.handbookConfigMaxBet}</p>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 }}>
                                    <p style={{ color: '#c4b5fd', fontSize: 12, margin: 0 }}>{texts.handbookConfigJackpot}</p>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 }}>
                                    <p style={{ color: '#c4b5fd', fontSize: 12, margin: 0 }}>{texts.handbookConfigStreak}</p>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 }}>
                                    <p style={{ color: '#c4b5fd', fontSize: 12, margin: 0 }}>{texts.handbookConfigDynamic}</p>
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: 16 }}>
                            <h3 style={{ color: '#60a5fa', fontSize: 15, marginBottom: 12 }}>{texts.handbookSummaryTitle}</h3>
                            <p style={{ color: '#22c55e', marginBottom: 8, fontWeight: 600 }}>{texts.handbookSummaryProfit}</p>
                            <p style={{ color: '#fb923c', fontWeight: 600 }}>{texts.handbookSummaryRisk}</p>
                        </div>

                        {/* Original Quick Reference (collapsed) */}
                        <details style={{ marginBottom: 16 }}>
                            <summary style={{ color: '#64748b', cursor: 'pointer', fontSize: 12, padding: '8px 0' }}>📚 Quick Reference Guide</summary>
                            <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ color: '#22c55e', fontSize: 13, marginBottom: 6 }}>🛠 {texts.guideOpTitle}</h4>
                                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{texts.guideOpDesc}</p>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ color: '#0ea5e9', fontSize: 13, marginBottom: 6 }}>✏️ {texts.guideEditTitle}</h4>
                                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{texts.guideEditDesc}</p>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ color: '#eab308', fontSize: 13, marginBottom: 6 }}>🔧 {texts.guideTroubleTitle}</h4>
                                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{texts.guideTroubleDesc}</p>
                                </div>
                                <div>
                                    <h4 style={{ color: '#22c55e', fontSize: 13, marginBottom: 6 }}>📊 {texts.guideStatsTitle}</h4>
                                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{texts.guideStatsDesc}</p>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}

            {/* Status Bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
                marginBottom: 16
            }}>
                <StatBox label={texts.yourBalance} value={`${formatTokenAmount(tokenBalance)} $BANMAO`} icon="💰" />
                <StatBox label={texts.activePools} value={activePoolCount?.toString() || '0'} icon="🌐" />
                <StatBox label={texts.minDeposit} value={`${formatTokenAmount(minPoolDeposit)} $BANMAO`} icon="💎" />
                <StatBox label={texts.maxPools} value={maxPoolsPerUser?.toString() || '0'} icon="🏠" />
            </div>

            {/* Quick Actions: Settle Stuck Commits */}
            {poolIds.length > 0 && (
                <QuickSettleSection
                    poolIds={poolIds}
                    onSettle={handleSettleExpiredByOwner}
                    onBatchSettle={handleBatchSettleExpired}
                    onGetExpiredPlayers={handleGetExpiredPlayers}
                    onGetPendingCount={handleGetPendingCount}
                    isPending={isPending}
                    texts={texts}
                />
            )}

            {/* Pool Management Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: '#22c55e' }}>🎰 {texts.yourPools}</h3>
                <button
                    onClick={() => onOpenCreatePool?.({
                        handleCreatePool,
                        minPoolDeposit,
                        tokenBalance,
                        allowance,
                        handleApprove,
                        isPending,
                    })}
                    disabled={!canCreateMore}
                    style={{
                        padding: '8px 16px',
                        background: canCreateMore ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: 9999,
                        color: '#fff',
                        cursor: canCreateMore ? 'pointer' : 'not-allowed',
                        fontWeight: 700,
                        fontSize: 12,
                        boxShadow: canCreateMore ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
                        transition: 'all 0.2s',
                    }}
                >
                    ➕ {texts.createPool}
                </button>
            </div>

            {poolIds.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px dashed rgba(34, 197, 94, 0.2)'
                }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
                    <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: 14 }}>{texts.noPools}</h4>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>{texts.createFirst}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {poolIds.map(poolId => (
                        <PoolManagementCard
                            key={poolId.toString()}
                            poolId={poolId}
                            isPlatformPool={platformPoolId !== undefined && poolId === platformPoolId}
                            onDeposit={async (pid, amount) => {
                                await handleDeposit(pid, amount);
                                refetchBalance();
                            }}
                            onWithdraw={async (pid, amount) => {
                                await handleWithdraw(pid, amount);
                                refetchBalance();
                            }}
                            onSettleExpired={handleSettleExpiredByOwner}
                            onUpdateSettings={handleUpdateSettings}
                            onDeactivate={handleDeactivate}
                            onReactivate={handleReactivate}
                            onClose={handleClosePool}
                            onTransfer={handleTransferOwnership}
                            onUpdateProtectionSettings={handleUpdateProtectionSettings}
                            onTriggerEmergency={handleTriggerEmergency}
                            onExecuteEmergencyWithdraw={handleExecuteEmergencyWithdraw}
                            onCancelEmergency={handleCancelEmergency}
                            onGetPoolHealth={handleGetPoolHealth}
                            onGetProtectionSettings={handleGetProtectionSettings}
                            isPending={isPending}
                            userBalance={tokenBalance}
                            t={texts}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div style={{
            background: 'rgba(34, 197, 94, 0.05)',
            border: '1px solid rgba(34, 197, 94, 0.15)',
            padding: '10px 12px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10
        }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#facc15', marginTop: 1 }}>
                    {value}
                </div>
            </div>
        </div>
    );
}

// Quick Settle Section - Enhanced tool for house owners to settle stuck player commits
function QuickSettleSection({
    poolIds,
    onSettle,
    onBatchSettle,
    onGetExpiredPlayers,
    onGetPendingCount,
    isPending,
    texts
}: {
    poolIds: bigint[];
    onSettle: (poolId: bigint, player: string) => Promise<any>;
    onBatchSettle: (poolId: bigint, maxCount?: number, startIndex?: number, maxIterations?: number) => Promise<any>;
    onGetExpiredPlayers: (poolId: bigint, offset?: number, limit?: number) => Promise<{ expiredPlayers: string[]; expiredBets: bigint[]; totalPending: bigint } | null>;
    onGetPendingCount: (poolId: bigint) => Promise<bigint | null>;
    isPending: boolean;
    texts: any;
}) {
    const [selectedPoolId, setSelectedPoolId] = React.useState<bigint>(poolIds[0] || BigInt(0));
    const [isOpen, setIsOpen] = React.useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false); // For custom pool selector
    const [isSettling, setIsSettling] = React.useState(false);
    const [isScanning, setIsScanning] = React.useState(false);
    const [expiredData, setExpiredData] = React.useState<{ players: string[]; bets: bigint[]; total: bigint } | null>(null);
    const [settleResult, setSettleResult] = React.useState<{ settled: number; message: string } | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Click outside to close custom dropdown
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    // Initial pool selection safety
    React.useEffect(() => {
        if (!selectedPoolId && poolIds.length > 0) {
            setSelectedPoolId(poolIds[0]);
        }
    }, [poolIds, selectedPoolId]);

    // Calculate total recoverable value
    const totalRecoverableValue = React.useMemo(() => {
        if (!expiredData || !expiredData.bets) return BigInt(0);
        return expiredData.bets.reduce((acc, curr) => acc + curr, BigInt(0));
    }, [expiredData]);

    // Scan for expired commits
    const handleScan = React.useCallback(async () => {
        if (!selectedPoolId) return;
        setIsScanning(true);
        setExpiredData(null);
        setSettleResult(null);
        try {
            const result = await onGetExpiredPlayers(selectedPoolId, 0, 100);
            if (result) {
                setExpiredData({ players: result.expiredPlayers, bets: result.expiredBets, total: result.totalPending });
            } else {
                setExpiredData({ players: [], bets: [], total: BigInt(0) });
            }
        } catch (e) {
            console.error('Scan failed:', e);
        }
        setIsScanning(false);
    }, [selectedPoolId, onGetExpiredPlayers]);

    // Auto-scan when section opens or pool changes
    React.useEffect(() => {
        if (isOpen && selectedPoolId) {
            handleScan();
        }
    }, [isOpen, selectedPoolId, handleScan]);

    const formatBet = (bet: bigint) => {
        return (Number(bet) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    // Batch settle
    const handleOneBatchSettle = async () => {
        if (!selectedPoolId) return;
        setIsSettling(true);
        setSettleResult(null);
        try {
            // Settle up to 50 at a time
            await onBatchSettle(selectedPoolId, 50, 0, 200);
            const settledCount = expiredData?.players.length || 0;
            const settledValue = totalRecoverableValue;

            setSettleResult({
                settled: settledCount,
                message: `Recovered ${formatBet(settledValue)} BANMAO from ${settledCount} commits!`
            });

            // Short delay then rescan
            setTimeout(() => {
                handleScan();
            }, 2000);
        } catch (e: any) {
            setSettleResult({ settled: 0, message: e.shortMessage || e.message || 'Transaction Failed' });
        }
        setIsSettling(false);
    };

    // Helper to get pool name/ID display
    const getPoolDisplay = (pid: bigint) => `Pool #${pid.toString()}`;

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 16,
            marginBottom: 20,
            overflow: 'visible', // Changed to visible for dropdown
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            position: 'relative' // Context for absolute dropdown
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: 'transparent',
                    border: 'none',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 14,
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        padding: 6,
                        borderRadius: 8,
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
                    }}>🛠️</div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ color: '#fff' }}>{texts.settleTitle}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{texts.settleSubtitle}</div>
                    </div>
                </div>
                <div style={{
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#64748b'
                }}>▼</div>
            </button>

            {isOpen && (
                <div style={{ padding: '0 18px 18px', animation: 'fadeIn 0.3s ease-out' }}>

                    {/* TOTAL RECOVERABLE VALUE CARD */}
                    {expiredData && expiredData.bets.length > 0 && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            marginBottom: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 0 15px rgba(34, 197, 94, 0.1) inset'
                        }}>
                            <div>
                                <div style={{ fontSize: 11, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                    {texts.recoverableLiquidity}
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#4ade80', marginTop: 2, textShadow: '0 0 10px rgba(74, 222, 128, 0.3)' }}>
                                    {formatBet(totalRecoverableValue)} <span style={{ fontSize: 14 }}>BANMAO</span>
                                </div>
                            </div>
                            <div style={{ fontSize: 24 }}>💰</div>
                        </div>
                    )}

                    <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
                        {texts.settleDesc}
                    </p>

                    {/* Custom Styled Dropdown */}
                    <div style={{ marginBottom: 16 }} ref={dropdownRef}>
                        <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Select Target Pool</label>
                        <div style={{ position: 'relative' }}>
                            {/* Dropdown Toggle Button */}
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    background: '#0f172a',
                                    border: isDropdownOpen ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: 10,
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s',
                                    boxShadow: isDropdownOpen ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: '#3b82f6' }}>🎰</span>
                                    {getPoolDisplay(selectedPoolId)}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    color: '#64748b',
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.2s'
                                }}>▼</span>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    width: '100%',
                                    background: '#1e293b',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: 10,
                                    zIndex: 50,
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                    overflow: 'hidden',
                                    animation: 'fadeIn 0.1s ease-out'
                                }}>
                                    {poolIds.map(pid => (
                                        <button
                                            key={pid.toString()}
                                            onClick={() => {
                                                setSelectedPoolId(pid);
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '10px 14px',
                                                background: selectedPoolId === pid ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                color: selectedPoolId === pid ? '#60a5fa' : '#cbd5e1',
                                                fontSize: 13,
                                                fontWeight: selectedPoolId === pid ? 600 : 400,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                transition: 'background 0.1s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedPoolId !== pid) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedPoolId !== pid) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <span>{selectedPoolId === pid ? '🔵' : '⚪'}</span>
                                            {getPoolDisplay(pid)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dashboard Status Card */}
                    <div style={{
                        background: '#0f172a',
                        borderRadius: 12,
                        padding: 16,
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{texts.pendingCommits}</div>
                            {isScanning ? (
                                <div style={{ fontSize: 12, color: '#3b82f6' }}>🔄 Scanning...</div>
                            ) : (
                                <div style={{
                                    fontSize: 12,
                                    color: expiredData && expiredData.players.length > 0 ? '#ef4444' : '#22c55e',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    {expiredData && expiredData.players.length > 0 ? '⚠️ Action Required' : '✅ All Clear'}
                                </div>
                            )}
                        </div>

                        {/* List of stuck items */}
                        {expiredData && expiredData.players.length > 0 ? (
                            <div style={{
                                maxHeight: 120,
                                overflowY: 'auto',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 8,
                                padding: 8
                            }}>
                                {expiredData.players.map((p, i) => (
                                    <div key={`${p}-${i}`} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 8px',
                                        borderBottom: i < expiredData.players.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                        fontSize: 11
                                    }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ color: '#ef4444' }}>●</span>
                                            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{p.slice(0, 6)}...{p.slice(-4)}</span>
                                        </div>
                                        <div style={{ color: '#facc15', fontWeight: 600 }}>{formatBet(expiredData.bets[i])} BANMAO</div>
                                    </div>
                                ))}
                            </div>
                        ) : !isScanning && (
                            <div style={{
                                padding: 20,
                                textAlign: 'center',
                                color: '#64748b',
                                fontSize: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <div style={{ fontSize: 24, opacity: 0.5 }}>✨</div>
                                {texts.noExpiredCommits}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons Group */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                        <button
                            onClick={handleScan}
                            disabled={isScanning || isPending}
                            style={{
                                padding: '12px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: 10,
                                color: '#cbd5e1',
                                cursor: isScanning ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: 12,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
                        >
                            🔄 {texts.rescan}
                        </button>
                        <button
                            onClick={handleOneBatchSettle}
                            disabled={!expiredData || expiredData.players.length === 0 || isPending || isSettling}
                            style={{
                                padding: '12px',
                                background: expiredData && expiredData.players.length > 0 && !isPending && !isSettling
                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    : 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: 10,
                                color: expiredData && expiredData.players.length > 0 ? '#fff' : '#64748b',
                                cursor: expiredData && expiredData.players.length > 0 && !isPending && !isSettling ? 'pointer' : 'not-allowed',
                                fontWeight: 700,
                                fontSize: 12,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                boxShadow: expiredData && expiredData.players.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
                            }}
                        >
                            {isSettling ? `⏳ ${texts.processingStatus}` : `🚀 ${texts.fixAndRecover} (${expiredData?.players.length || 0})`}
                        </button>
                    </div>

                    {/* Feedback Message */}
                    {settleResult && (
                        <div style={{
                            marginTop: 12,
                            padding: '10px 14px',
                            background: settleResult.settled > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            border: `1px solid ${settleResult.settled > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: settleResult.settled > 0 ? '#22c55e' : '#f87171',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            animation: 'slideIn 0.3s ease-out'
                        }}>
                            <span>{settleResult.settled > 0 ? '✅' : '⚠️'}</span>
                            {settleResult.message}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
