// ===== DONOR LEADERBOARD LIST COMPONENT =====
// Displays list of donors with badges and rankings

import React from 'react';
import { sounds } from '../lib/sounds';
import { SnakeStrings } from '../lib/i18n';

export interface DonorBadge {
    tier: string;
    icon: string;
    color: string;
}

export interface Donor {
    address: string;
    name: string;
    totalDonated: bigint | string;
    donationCount: number;
    badge: DonorBadge;
    avatar?: number;
    telegram?: string;
    twitter?: string;
}

interface DonorLeaderboardListProps {
    donors: Donor[];
    t: SnakeStrings;
    onDonorClick: (donor: Donor) => void;
    getBadgeTierName: (tier: string) => string;
}

/**
 * Donor Leaderboard List - displays donors with rankings, badges, and amounts
 */
export function DonorLeaderboardList({
    donors,
    t,
    onDonorClick,
    getBadgeTierName
}: DonorLeaderboardListProps) {
    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 10, paddingBottom: 8,
                borderBottom: '1px solid rgba(168,85,247,0.3)'
            }}>
                <span className="heart-beat" style={{ fontSize: 20 }}>💜</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>
                    {t.donorLeaderboard || 'Nhà Tài Trợ'}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>({donors.length})</span>
            </div>

            {/* Donor List */}
            {donors.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💜</div>
                    <div>{t.donorNoDonors || 'No donors yet'}</div>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>{t.donorBeFirst || 'Be the first one!'}</div>
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        maxHeight: 15 * 52,
                        overflowY: 'auto',
                        overflowX: 'visible',
                        paddingRight: 8,
                        paddingLeft: 4,
                        paddingTop: 6,
                        paddingBottom: 6,
                        marginLeft: -4,
                        marginRight: -4
                    }}>
                        {donors.map((donor, idx) => {
                            const glowColor = idx === 0 ? 'rgba(251,191,36,0.3)' : idx === 1 ? 'rgba(203,213,225,0.3)' : idx === 2 ? 'rgba(249,115,22,0.25)' : undefined;

                            return (
                                <div
                                    key={donor.address}
                                    onClick={() => { sounds.click(); onDonorClick(donor); }}
                                    onMouseEnter={() => sounds.hover()}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                        background: idx < 3
                                            ? `linear-gradient(135deg, rgba(168,85,247,${0.2 - idx * 0.05}), ${glowColor})`
                                            : 'rgba(0,0,0,0.25)',
                                        borderRadius: 12,
                                        border: idx < 3 ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer', minHeight: 52, flexShrink: 0,
                                        boxShadow: idx < 3 ? `0 0 15px ${glowColor}` : undefined
                                    }}
                                    className={`hover-leaderboard donor-float-${idx % 5} ${idx < 3 ? 'donor-top3' : ''}`}
                                >
                                    {/* Badge Section - Icon + Tier Name (like profile) */}
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        minWidth: 50, gap: 2
                                    }}>
                                        <span style={{ fontSize: 22 }}>
                                            {donor.badge.icon}
                                        </span>
                                        <span style={{
                                            fontSize: 8, fontWeight: 600, color: donor.badge.color,
                                            padding: '2px 6px',
                                            background: `${donor.badge.color}15`,
                                            borderRadius: 8, whiteSpace: 'nowrap'
                                        }}>
                                            {getBadgeTierName(donor.badge.tier)}
                                        </span>
                                    </div>

                                    {/* Name + Amount Section */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: idx < 3 ? 700 : 600,
                                            color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#f97316' : '#e2e8f0',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            marginBottom: 2
                                        }}>
                                            {donor.name || `${donor.address.slice(0, 6)}...${donor.address.slice(-4)}`}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                            {(Number(donor.totalDonated) / 1e18).toLocaleString()} $banmao
                                        </div>
                                    </div>

                                    {/* Support Button */}
                                    <div style={{
                                        fontSize: 10, color: '#a855f7', fontWeight: 600,
                                        padding: '5px 10px',
                                        background: 'rgba(168,85,247,0.15)',
                                        border: '1px solid rgba(168,85,247,0.3)',
                                        borderRadius: 8
                                    }}>
                                        {t.donorDonor || 'Ủng Hộ'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {donors.length > 15 && (
                        <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                            ↕ {t.donorScrollMore || 'Scroll to see more'} ({donors.length})
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default DonorLeaderboardList;
