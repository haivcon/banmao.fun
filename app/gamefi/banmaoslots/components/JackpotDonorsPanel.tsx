// ===== JACKPOT DONORS PANEL COMPONENT =====
// Displays users who donated to the jackpot pool

import React from 'react';
import { formatTokenAmount } from '../lib/abis';
import { SlotsTranslations } from '../lib/i18n';

export interface DonorBadge {
    tier: 'whale' | 'diamond' | 'gold' | 'silver' | 'bronze' | 'supporter';
    icon: string;
    color: string;
}

export interface JackpotDonor {
    address: string;
    name?: string;
    totalDonated: bigint;
    donationCount: number;
    badge: DonorBadge;
    lastDonatedAt?: Date;
}

// Badge tier definitions
const DONOR_BADGES: Record<string, DonorBadge> = {
    whale: { tier: 'whale', icon: '🐱', color: '#fbbf24' },
    diamond: { tier: 'diamond', icon: '💎', color: '#60a5fa' },
    gold: { tier: 'gold', icon: '🥇', color: '#f59e0b' },
    silver: { tier: 'silver', icon: '🥈', color: '#94a3b8' },
    bronze: { tier: 'bronze', icon: '🥉', color: '#f97316' },
    supporter: { tier: 'supporter', icon: '💜', color: '#a855f7' }
};

export function getDonorBadge(totalDonated: bigint): DonorBadge {
    const amount = Number(totalDonated) / 1e18;
    if (amount >= 100000) return DONOR_BADGES.whale;
    if (amount >= 50000) return DONOR_BADGES.diamond;
    if (amount >= 10000) return DONOR_BADGES.gold;
    if (amount >= 5000) return DONOR_BADGES.silver;
    if (amount >= 1000) return DONOR_BADGES.bronze;
    return DONOR_BADGES.supporter;
}

interface JackpotDonorsPanelProps {
    donors: JackpotDonor[];
    t: SlotsTranslations;
    onDonorClick?: (donor: JackpotDonor) => void;
    isLoading?: boolean;
}

/**
 * Jackpot Donors Panel - displays sponsors with badges
 */
export function JackpotDonorsPanel({
    donors,
    t,
    onDonorClick,
    isLoading = false
}: JackpotDonorsPanelProps) {
    return (
        <div style={{
            padding: 12,
            background: 'linear-gradient(145deg, rgba(168,85,247,0.08), rgba(0,0,0,0.2))',
            clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
            border: '1px solid rgba(168,85,247,0.2)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 10, paddingBottom: 8,
                borderBottom: '1px solid rgba(168,85,247,0.3)'
            }}>
                <span className="heart-pulse" style={{ fontSize: 18 }}>💜</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>
                    {t.jackpotDonors || 'JACKPOT DONORS'}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>({donors.length})</span>
            </div>

            {/* Donors List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 20 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                        <div>{t.loadingDonors || 'Loading donors...'}</div>
                    </div>
                ) : donors.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 20 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>💜</div>
                        <div>{t.noDonorsYet || 'No donors yet'}</div>
                        <div style={{ fontSize: 9, color: '#a855f7', marginTop: 4 }}>
                            {t.beFirstDonor || 'Be the first to grow the jackpot!'}
                        </div>
                    </div>
                ) : (
                    donors.slice(0, 10).map((donor, idx) => {
                        const isTop3 = idx < 3;
                        const glowColor = idx === 0 ? 'rgba(168,85,247,0.4)' :
                            idx === 1 ? 'rgba(168,85,247,0.25)' :
                                idx === 2 ? 'rgba(168,85,247,0.15)' : undefined;

                        return (
                            <div
                                key={donor.address}
                                onClick={() => onDonorClick?.(donor)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                                    background: isTop3
                                        ? `linear-gradient(135deg, rgba(168,85,247,${0.15 - idx * 0.04}), ${glowColor})`
                                        : 'rgba(0,0,0,0.25)',
                                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                    border: isTop3 ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.05)',
                                    cursor: onDonorClick ? 'pointer' : 'default',
                                    boxShadow: isTop3 ? `0 0 12px ${glowColor}` : undefined,
                                    transition: 'all 0.2s ease'
                                }}
                                className={isTop3 ? 'donor-glow' : ''}
                            >
                                {/* Badge Icon + Tier */}
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    minWidth: 40, gap: 2
                                }}>
                                    <span style={{ fontSize: 20 }}>{donor.badge.icon}</span>
                                    <span style={{
                                        fontSize: 7, fontWeight: 600, color: donor.badge.color,
                                        padding: '1px 5px', background: `${donor.badge.color}15`,
                                        clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))',
                                        textTransform: 'uppercase'
                                    }}>
                                        {donor.badge.tier}
                                    </span>
                                </div>

                                {/* Donor Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 12, fontWeight: isTop3 ? 700 : 600,
                                        color: isTop3 ? '#e2e8f0' : '#cbd5e1',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                        {donor.name || `${donor.address.slice(0, 6)}...${donor.address.slice(-4)}`}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 500 }}>
                                        {formatTokenAmount(donor.totalDonated)} $BANMAO
                                    </div>
                                </div>

                                {/* Donation Count */}
                                <div style={{
                                    fontSize: 9, color: '#64748b', textAlign: 'right',
                                    padding: '4px 8px', background: 'rgba(168,85,247,0.1)',
                                    clipPath: 'polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))'
                                }}>
                                    {donor.donationCount}x
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Total donations footer */}
            {donors.length > 0 && (
                <div style={{
                    marginTop: 8, paddingTop: 8,
                    borderTop: '1px solid rgba(168,85,247,0.2)',
                    fontSize: 10, color: '#94a3b8', textAlign: 'center'
                }}>
                    {t.thankDonors || 'Thank you for supporting the jackpot pool!'} 💜
                </div>
            )}
        </div>
    );
}

export default JackpotDonorsPanel;
