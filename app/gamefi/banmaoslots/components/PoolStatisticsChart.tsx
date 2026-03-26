// PoolStatisticsChart.tsx
// Visual chart component for House Dashboard
'use client';

import React, { useState } from 'react';
import { formatTokenAmount } from '../lib/abis';

interface PoolStatisticsChartProps {
    totalBets: bigint;
    totalPayouts: bigint;
    profit: bigint;
    rtpBps: bigint; // Basis points (e.g. 9500 = 95%)
    t: any;
}

export function PoolStatisticsChart({ totalBets, totalPayouts, profit, rtpBps, t }: PoolStatisticsChartProps) {
    const bets = Number(formatTokenAmount(totalBets).replace(/,/g, ''));
    const payouts = Number(formatTokenAmount(totalPayouts).replace(/,/g, ''));
    const profitVal = Number(formatTokenAmount(profit).replace(/,/g, ''));

    // Calculate percentages for bar width
    const maxVal = Math.max(bets, payouts);
    const betsPct = maxVal > 0 ? (bets / maxVal) * 100 : 0;
    const payoutsPct = maxVal > 0 ? (payouts / maxVal) * 100 : 0;

    // RTP Color
    const rtp = Number(rtpBps) / 100;
    let rtpColor = '#a855f7'; // Purple (Standard)
    if (rtp > 100) rtpColor = '#ef4444'; // Red (Losing money)
    if (rtp < 90) rtpColor = '#22c55e'; // Green (High margin)

    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <h4 style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                📈 {t?.chartTitle || 'Pool Performance'}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Volume Bars */}
                <div>
                    {/* Bets Bar */}
                    <ChartElementWithTooltip tooltip={t?.tooltipVolume}>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: '#06b6d4', borderBottom: '1px dotted #06b6d4', cursor: 'help' }}>{t?.statVolume || 'Volume'}</span>
                                <span style={{ color: '#fff' }}>{formatTokenAmount(totalBets)}</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.max(5, betsPct)}%`,
                                    background: '#06b6d4',
                                    transition: 'width 1s ease'
                                }} />
                            </div>
                        </div>
                    </ChartElementWithTooltip>

                    {/* Payouts Bar */}
                    <ChartElementWithTooltip tooltip={t?.tooltipProfit}>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: '#f59e0b', borderBottom: '1px dotted #f59e0b', cursor: 'help' }}>{t?.statPayouts || 'Payouts'}</span>
                                <span style={{ color: '#fff' }}>{formatTokenAmount(totalPayouts)}</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.max(5, payoutsPct)}%`,
                                    background: '#f59e0b', // Amber/Orange
                                    transition: 'width 1s ease'
                                }} />
                            </div>
                        </div>
                    </ChartElementWithTooltip>

                    {/* Profit Bar */}
                    <ChartElementWithTooltip tooltip={t?.tooltipProfit}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: profitVal >= 0 ? '#22c55e' : '#ef4444', borderBottom: `1px dotted ${profitVal >= 0 ? '#22c55e' : '#ef4444'}`, cursor: 'help' }}>
                                    {t?.statProfit || 'Net Profit'}
                                </span>
                                <span style={{ color: profitVal >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                                    {profitVal >= 0 ? '+' : ''}{formatTokenAmount(profit)}
                                </span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                                {/* Center line */}
                                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#fff', opacity: 0.3 }} />

                                {/* Bar from center */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: profitVal >= 0 ? '50%' : 'auto',
                                    right: profitVal < 0 ? '50%' : 'auto',
                                    width: `${Math.min(50, (Math.abs(profitVal) / (maxVal || 1)) * 50)}%`,
                                    background: profitVal >= 0 ? '#22c55e' : '#ef4444',
                                    transition: 'width 1s ease'
                                }} />
                            </div>
                        </div>
                    </ChartElementWithTooltip>
                </div>

                {/* RTP Gauge */}
                <ChartElementWithTooltip tooltip={t?.tooltipRTP}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                        <div style={{
                            position: 'relative',
                            width: 80,
                            height: 40, // Semi-circle
                            overflow: 'hidden',
                            marginBottom: 4
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: 80, height: 80,
                                boxSizing: 'border-box',
                                borderRadius: '50%',
                                border: '8px solid rgba(255,255,255,0.1)',
                                borderBottomColor: 'transparent',
                                borderRightColor: 'transparent'
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: 80, height: 80,
                                boxSizing: 'border-box',
                                borderRadius: '50%',
                                border: `8px solid ${rtpColor}`,
                                borderBottomColor: 'transparent',
                                borderRightColor: 'transparent',
                                transform: `rotate(${(Math.min(150, Math.max(0, rtp * 1.8)) - 45)}deg)`, // Approximate mapping
                                transition: 'transform 1s ease'
                            }} />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: rtpColor }}>
                            {rtp.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            {t?.statRTP || 'RTP'} (Theory: 95%)
                        </div>
                    </div>
                </ChartElementWithTooltip>
            </div>
        </div>
    );
}

// Helper component for tooltips (similar to StatCard)
function ChartElementWithTooltip({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
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
                    animation: 'fadeIn 0.2s ease',
                    pointerEvents: 'none'
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
