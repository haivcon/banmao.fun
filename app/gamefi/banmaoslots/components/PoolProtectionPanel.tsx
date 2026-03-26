// PoolProtectionPanel.tsx - Pool Owner Protection Features UI
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatTokenAmount } from '../lib/abis';

interface PoolProtectionPanelProps {
    poolId: bigint;
    poolBalance: bigint;
    isPending: boolean;
    onUpdateProtectionSettings: (
        poolId: bigint,
        dynamicMaxBetEnabled: boolean,
        lowBalanceThreshold: number,
        criticalBalanceThreshold: number,
        streakProtectionEnabled: boolean,
        hourlyPayoutLimit: number,
        emergencyCooldown: number
    ) => Promise<any>;
    onTriggerEmergency: (poolId: bigint) => Promise<any>;
    onExecuteEmergencyWithdraw: (poolId: bigint) => Promise<any>;
    onCancelEmergency: (poolId: bigint) => Promise<any>;
    onGetPoolHealth: (poolId: bigint) => Promise<{
        healthRatio: bigint;
        effectiveMaxBet: bigint;
        hourlyPayoutUsed: bigint;
        hourlyPayoutLimit: bigint;
        emergencyActive: boolean;
        emergencyCooldownEnds: bigint;
    } | null>;
    onGetProtectionSettings: (poolId: bigint) => Promise<{
        dynamicMaxBetEnabled: boolean;
        lowBalanceThreshold: bigint;
        criticalBalanceThreshold: bigint;
        streakProtectionEnabled: boolean;
        hourlyPayoutLimit: bigint;
        emergencyCooldown: bigint;
        initialDeposit: bigint;
    } | null>;
    t: any;
}

export function PoolProtectionPanel({
    poolId,
    poolBalance,
    isPending,
    onUpdateProtectionSettings,
    onTriggerEmergency,
    onExecuteEmergencyWithdraw,
    onCancelEmergency,
    onGetPoolHealth,
    onGetProtectionSettings,
    t
}: PoolProtectionPanelProps) {
    // State for settings form
    const [dynamicMaxBetEnabled, setDynamicMaxBetEnabled] = useState(false);
    const [lowBalance, setLowBalance] = useState(5000); // 50%
    const [criticalBalance, setCriticalBalance] = useState(3000); // 30%
    const [streakEnabled, setStreakEnabled] = useState(false);
    const [hourlyLimit, setHourlyLimit] = useState(3000); // 30%
    const [cooldown, setCooldown] = useState(1800); // 30 minutes

    // State for health display
    const [health, setHealth] = useState<{
        healthRatio: number;
        effectiveMaxBet: bigint;
        hourlyPayoutUsed: bigint;
        hourlyPayoutLimit: bigint;
        emergencyActive: boolean;
        emergencyCooldownEnds: number;
    } | null>(null);

    const [initialDeposit, setInitialDeposit] = useState<bigint>(BigInt(0));
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState<string>('');

    // Load current settings
    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const [settings, healthData] = await Promise.all([
                onGetProtectionSettings(poolId),
                onGetPoolHealth(poolId)
            ]);

            if (settings) {
                setDynamicMaxBetEnabled(settings.dynamicMaxBetEnabled);
                setLowBalance(Number(settings.lowBalanceThreshold) || 5000);
                setCriticalBalance(Number(settings.criticalBalanceThreshold) || 3000);
                setStreakEnabled(settings.streakProtectionEnabled);
                setHourlyLimit(Number(settings.hourlyPayoutLimit) || 3000);
                setCooldown(Number(settings.emergencyCooldown) || 1800);
                setInitialDeposit(settings.initialDeposit);
            }

            if (healthData) {
                setHealth({
                    healthRatio: Number(healthData.healthRatio),
                    effectiveMaxBet: healthData.effectiveMaxBet,
                    hourlyPayoutUsed: healthData.hourlyPayoutUsed,
                    hourlyPayoutLimit: healthData.hourlyPayoutLimit,
                    emergencyActive: healthData.emergencyActive,
                    emergencyCooldownEnds: Number(healthData.emergencyCooldownEnds)
                });
            }
        } catch (e) {
            console.error('Failed to load protection settings:', e);
        }
        setIsLoading(false);
    }, [poolId, onGetProtectionSettings, onGetPoolHealth]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Countdown timer for emergency
    useEffect(() => {
        if (!health?.emergencyActive || !health.emergencyCooldownEnds) {
            setCountdown('');
            return;
        }

        const updateCountdown = () => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = health.emergencyCooldownEnds - now;

            if (remaining <= 0) {
                setCountdown(t?.emergencyReady || '✅ Ready to withdraw!');
                return;
            }

            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [health?.emergencyActive, health?.emergencyCooldownEnds, t]);

    const handleSaveSettings = async () => {
        try {
            await onUpdateProtectionSettings(
                poolId,
                dynamicMaxBetEnabled,
                lowBalance,
                criticalBalance,
                streakEnabled,
                hourlyLimit,
                cooldown
            );
            await loadSettings();
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    };

    const getHealthColor = (ratio: number) => {
        if (ratio >= 7000) return '#22c55e'; // Green
        if (ratio >= 5000) return '#84cc16'; // Light green
        if (ratio >= 3000) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const getHealthLabel = (ratio: number) => {
        if (ratio >= 7000) return t?.healthExcellent || 'Excellent';
        if (ratio >= 5000) return t?.healthGood || 'Good';
        if (ratio >= 3000) return t?.healthLow || 'Low';
        return t?.healthCritical || 'Critical';
    };

    if (isLoading) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                {t?.loadingProtection || 'Loading protection settings...'}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pool Health Overview */}
            <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 12,
                padding: 16
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, color: '#22c55e', fontSize: 14 }}>
                        📊 {t?.poolHealth || 'Pool Health'}
                    </h4>
                    {health && (
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: 999,
                            background: `${getHealthColor(health.healthRatio)}20`,
                            color: getHealthColor(health.healthRatio),
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                            {getHealthLabel(health.healthRatio)} ({(health.healthRatio / 100).toFixed(0)}%)
                        </span>
                    )}
                </div>

                {/* Health Bar */}
                <div style={{
                    height: 8,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 12
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(100, (health?.healthRatio || 0) / 100)}%`,
                        background: `linear-gradient(90deg, ${getHealthColor(health?.healthRatio || 0)}, ${getHealthColor(health?.healthRatio || 0)}80)`,
                        transition: 'width 0.5s ease'
                    }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                    <div style={{ color: '#94a3b8' }}>
                        {t?.effectiveMaxBet || 'Effective Max Bet'}:
                        <span style={{ color: '#fff', marginLeft: 4 }}>
                            {formatTokenAmount(health?.effectiveMaxBet || BigInt(0))}
                        </span>
                    </div>
                    {streakEnabled && (
                        <div style={{ color: '#94a3b8' }}>
                            {t?.hourlyPayout || 'Hourly Payout'}:
                            <span style={{ color: '#f59e0b', marginLeft: 4 }}>
                                {formatTokenAmount(health?.hourlyPayoutUsed || BigInt(0))}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic Max Bet Section */}
            <CollapsibleSection
                icon="🎰"
                title={t?.dynamicMaxBetTitle || 'Dynamic Max Bet'}
                description={t?.dynamicMaxBetDesc || 'Automatically reduce max bet when pool balance is low to protect your funds.'}
            >
                {/* Note Box */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderLeft: '3px solid #3b82f6',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 16,
                    color: '#94a3b8',
                    fontSize: 11,
                    fontStyle: 'italic',
                    lineHeight: 1.4
                }}>
                    📝 {t?.dynamicMaxBetNote || 'Reduces max bet limits based on balance thresholds.'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={dynamicMaxBetEnabled}
                            onChange={(e) => setDynamicMaxBetEnabled(e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: '#22c55e' }}
                        />
                        <span style={{ color: '#fff', fontSize: 13 }}>{t?.enable || 'Enable'}</span>
                    </label>
                </div>

                {dynamicMaxBetEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <SliderInput
                            label={t?.lowBalanceThreshold || 'Low Balance Threshold'}
                            value={lowBalance}
                            onChange={setLowBalance}
                            min={3000}
                            max={7000}
                            step={500}
                            format={(v) => `${v / 100}%`}
                            color="#f59e0b"
                            hint={t?.lowBalanceHint || 'At this level, max bet reduces to 50%'}
                        />
                        <SliderInput
                            label={t?.criticalBalanceThreshold || 'Critical Balance Threshold'}
                            value={criticalBalance}
                            onChange={setCriticalBalance}
                            min={1000}
                            max={4000}
                            step={500}
                            format={(v) => `${v / 100}%`}
                            color="#ef4444"
                            hint={t?.criticalBalanceHint || 'At this level, max bet reduces to 20%'}
                        />
                    </div>
                )}
            </CollapsibleSection>

            {/* Streak Protection Section */}
            <CollapsibleSection
                icon="🛡️"
                title={t?.streakProtectionTitle || 'Streak Protection'}
                description={t?.streakProtectionDesc || 'Auto-pause pool if hourly payouts exceed limit. Prevents rapid fund depletion.'}
            >
                <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderLeft: '3px solid #3b82f6',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 16,
                    color: '#94a3b8',
                    fontSize: 11,
                    fontStyle: 'italic',
                    lineHeight: 1.4
                }}>
                    📝 {t?.streakProtectionNote || 'Auto-pauses if payouts exceed limit.'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={streakEnabled}
                            onChange={(e) => setStreakEnabled(e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: '#22c55e' }}
                        />
                        <span style={{ color: '#fff', fontSize: 13 }}>{t?.enable || 'Enable'}</span>
                    </label>
                </div>

                {streakEnabled && (
                    <SliderInput
                        label={t?.hourlyPayoutLimit || 'Hourly Payout Limit'}
                        value={hourlyLimit}
                        onChange={setHourlyLimit}
                        min={1000}
                        max={5000}
                        step={500}
                        format={(v) => `${v / 100}% of balance`}
                        color="#3b82f6"
                        hint={t?.hourlyPayoutHint || 'Pool pauses if payouts exceed this % per hour'}
                    />
                )}
            </CollapsibleSection>

            {/* Emergency Withdraw Section */}
            <CollapsibleSection
                icon="🚨"
                title={t?.emergencyWithdrawTitle || 'Emergency Withdraw'}
                description={t?.emergencyWithdrawDesc || 'Trigger emergency mode to withdraw funds after a cooldown period.'}
                danger
            >
                <div style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    borderLeft: '3px solid #ef4444',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 16,
                    color: '#f87171',
                    fontSize: 11,
                    fontStyle: 'italic',
                    lineHeight: 1.4
                }}>
                    📝 {t?.emergencyWithdrawNote || 'Immediately pauses pool. Cannot cancel easily.'}
                </div>

                {!health?.emergencyActive ? (
                    <>
                        <SliderInput
                            label={t?.cooldownDuration || 'Cooldown Duration'}
                            value={cooldown}
                            onChange={setCooldown}
                            min={600}
                            max={86400}
                            step={600}
                            format={(v) => {
                                if (v >= 3600) return `${(v / 3600).toFixed(1)}h`;
                                return `${v / 60}min`;
                            }}
                            color="#ef4444"
                            hint={t?.cooldownHint || 'Waiting time before you can withdraw'}
                        />
                        <button
                            onClick={() => onTriggerEmergency(poolId)}
                            disabled={isPending}
                            style={{
                                width: '100%',
                                marginTop: 12,
                                padding: '12px',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                border: 'none',
                                borderRadius: 8,
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                opacity: isPending ? 0.6 : 1
                            }}
                        >
                            🚨 {t?.triggerEmergency || 'Trigger Emergency Mode'}
                        </button>
                        <p style={{ margin: '8px 0 0', fontSize: 10, color: '#94a3b8' }}>
                            ⚠️ {t?.emergencyWarning || 'This will immediately pause your pool and start the cooldown timer.'}
                        </p>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color: countdown.includes('Ready') ? '#22c55e' : '#f59e0b',
                            marginBottom: 8,
                            fontFamily: 'monospace'
                        }}>
                            {countdown}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                onClick={() => onCancelEmergency(poolId)}
                                disabled={isPending}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 8,
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    cursor: isPending ? 'not-allowed' : 'pointer'
                                }}
                            >
                                ↩️ {t?.cancelEmergency || 'Cancel'}
                            </button>
                            <button
                                onClick={() => onExecuteEmergencyWithdraw(poolId)}
                                disabled={isPending || !countdown.includes('Ready')}
                                style={{
                                    flex: 2,
                                    padding: '10px',
                                    background: countdown.includes('Ready')
                                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                        : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: (isPending || !countdown.includes('Ready')) ? 'not-allowed' : 'pointer',
                                    opacity: countdown.includes('Ready') ? 1 : 0.5
                                }}
                            >
                                💰 {t?.executeWithdraw || 'Withdraw Now'}
                            </button>
                        </div>
                    </div>
                )}
            </CollapsibleSection>

            {/* Save Button */}
            <button
                onClick={handleSaveSettings}
                disabled={isPending}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: isPending ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    boxShadow: isPending ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}
            >
                {isPending ? '⏳ Processing...' : `💾 ${t?.saveSettings || 'Save Protection Settings'}`}
            </button>
        </div>
    );
}

// Collapsible Section Component
function CollapsibleSection({
    icon,
    title,
    description,
    children,
    danger = false
}: {
    icon: string;
    title: string;
    description: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(true);
    const borderColor = danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)';
    const bgColor = danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
    const titleColor = danger ? '#ef4444' : '#3b82f6';

    return (
        <div style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            overflow: 'hidden'
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'transparent',
                    border: 'none',
                    color: titleColor,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                }}
            >
                <span>{icon} {title}</span>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {isOpen && (
                <div style={{ padding: '0 14px 14px' }}>
                    <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 12px', lineHeight: 1.5 }}>
                        ℹ️ {description}
                    </p>
                    {children}
                </div>
            )}
        </div>
    );
}

// Slider Input Component
function SliderInput({
    label,
    value,
    onChange,
    min,
    max,
    step,
    format,
    color,
    hint
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
    color: string;
    hint?: string;
}) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
                <span style={{ color: color, fontSize: 12, fontWeight: 700 }}>{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: color,
                }}
            />
            {hint && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>{hint}</p>
            )}
        </div>
    );
}
