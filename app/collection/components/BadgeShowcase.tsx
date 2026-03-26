'use client';
import React, { useState, useEffect, memo } from 'react';

interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    earned: boolean;
    earned_at?: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface BadgeShowcaseProps {
    t: Record<string, string>;
    address?: string;
}

const RARITY_COLORS: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
};

const BadgeShowcase = memo(function BadgeShowcase({ t, address }: BadgeShowcaseProps) {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    useEffect(() => {
        if (!address) return;
        setLoading(true);
        fetch(`/api/hub/badges?address=${address}`)
            .then(r => r.json())
            .then(data => setBadges(data.badges || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [address]);

    const earned = badges.filter(b => b.earned);
    const locked = badges.filter(b => !b.earned);

    if (!address) return null;

    return (
        <div className="badge-showcase">
            <h3 className="badge-showcase-title">
                🏆 {t.achievements || 'Achievements'}
                <span className="badge-showcase-count">{earned.length}/{badges.length}</span>
            </h3>

            {loading ? (
                <div className="badge-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="badge-item badge-skeleton" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Earned badges */}
                    {earned.length > 0 && (
                        <div className="badge-grid">
                            {earned.map(badge => (
                                <button
                                    key={badge.id}
                                    className="badge-item badge-earned"
                                    onClick={() => setSelectedBadge(badge)}
                                    style={{ '--badge-color': RARITY_COLORS[badge.rarity] } as React.CSSProperties}
                                >
                                    <span className="badge-icon">{badge.icon}</span>
                                    <span className="badge-name">{badge.name}</span>
                                    <span className={`badge-rarity badge-rarity-${badge.rarity}`}>{badge.rarity}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Locked badges */}
                    {locked.length > 0 && (
                        <>
                            <h4 className="badge-section-title">🔒 {t.locked || 'Locked'}</h4>
                            <div className="badge-grid">
                                {locked.map(badge => (
                                    <button
                                        key={badge.id}
                                        className="badge-item badge-locked"
                                        onClick={() => setSelectedBadge(badge)}
                                    >
                                        <span className="badge-icon badge-icon-locked">❓</span>
                                        <span className="badge-name">{badge.name}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div className="hub-modal-overlay" onClick={() => setSelectedBadge(null)}>
                    <div className="hub-modal badge-detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="hub-modal-close" onClick={() => setSelectedBadge(null)}>✕</button>
                        <div className="badge-detail">
                            <div
                                className="badge-detail-icon"
                                style={{ '--badge-color': RARITY_COLORS[selectedBadge.rarity] } as React.CSSProperties}
                            >
                                {selectedBadge.earned ? selectedBadge.icon : '❓'}
                            </div>
                            <h3 className="badge-detail-name">{selectedBadge.name}</h3>
                            <span className={`badge-rarity badge-rarity-${selectedBadge.rarity}`}>
                                {selectedBadge.rarity.toUpperCase()}
                            </span>
                            <p className="badge-detail-desc">{selectedBadge.description}</p>
                            {selectedBadge.earned && selectedBadge.earned_at && (
                                <p className="badge-detail-date">
                                    ✅ {t.earnedOn || 'Earned on'} {new Date(selectedBadge.earned_at).toLocaleDateString()}
                                </p>
                            )}
                            {!selectedBadge.earned && (
                                <p className="badge-detail-hint">🔒 {t.keepGoing || 'Keep participating to unlock!'}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default BadgeShowcase;
