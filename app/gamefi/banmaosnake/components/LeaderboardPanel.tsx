// ===== LEADERBOARD PANEL COMPONENT =====
// Displays on-chain leaderboard rankings

import React from 'react';
import { sounds } from '../lib/sounds';
import { getAvatarEmoji } from '../lib/profiles';
import { OnchainPlayer, formatClaimedAmount } from '../lib/onchainLeaderboard';
import { SnakeStrings } from '../lib/i18n';
import { AvatarIndex } from '../lib/avatars';

interface LeaderboardPanelProps {
    leaderboard: OnchainPlayer[];
    isMobile: boolean;
    hasMounted: boolean;
    t: SnakeStrings;
    onPlayerClick: (player: OnchainPlayer) => void;
}

/**
 * Leaderboard Panel - displays on-chain rankings with player cards
 */
export function LeaderboardPanel({
    leaderboard,
    isMobile,
    hasMounted,
    t,
    onPlayerClick
}: LeaderboardPanelProps) {
    return (
        <div style={{
            padding: 12,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            maxHeight: (hasMounted && isMobile) ? 'none' : 'calc(100vh - 280px)',
            overflowY: (hasMounted && isMobile) ? 'visible' : 'auto'
        }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', textAlign: 'center', marginBottom: 10 }}>
                🏆 {t.leaderboardTitle}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {leaderboard.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 20 }}>
                        <div style={{ marginBottom: 8 }}>⏳ {t.leaderboardEmpty}</div>
                        <div style={{ fontSize: 9, color: '#475569' }}>Loading from blockchain...</div>
                    </div>
                ) : (
                    leaderboard.slice(0, 100).map((player, idx) => {
                        const avatarIndex = (player.avatar ?? 0) as AvatarIndex;
                        return (
                            <div
                                key={player.address}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                                    background: idx < 3 ? `rgba(251,191,36,${0.15 - idx * 0.04})` : 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                    border: idx < 3 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: '3px solid transparent',
                                    cursor: 'pointer'
                                }}
                                onClick={() => { sounds.click(); onPlayerClick(player); }}
                                onMouseEnter={() => sounds.hover()}
                                className="hover-leaderboard"
                            >
                                <span style={{
                                    width: 20, fontSize: 10, fontWeight: 700,
                                    color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#f97316' : '#64748b'
                                }}>
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </span>
                                <span style={{ fontSize: 18 }}>{getAvatarEmoji(avatarIndex)}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {player.name || `Player ${player.address.slice(0, 6)}`}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{player.address.slice(0, 6)}...{player.address.slice(-4)}</div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                                        🏆 {formatClaimedAmount(player.highestClaim)}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>Best Score</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default LeaderboardPanel;
