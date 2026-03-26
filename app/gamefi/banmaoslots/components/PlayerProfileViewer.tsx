// ===== PLAYER PROFILE VIEWER =====
// View-only modal to display other players' profiles from leaderboard
// Shows: Avatar, Name, Address (copyable), Stats, Social Links

'use client';

import React, { useState } from 'react';
import { SlotsTranslations } from '../lib/i18n';
import { getSlotsAvatarEmoji, SlotsAvatarIndex } from '../lib/slotsProfiles';
import { SlotWinner } from './TopWinnersPanel';

interface PlayerProfileViewerProps {
    isOpen: boolean;
    onClose: () => void;
    player: SlotWinner | null;
    t: SlotsTranslations;
    rank?: number;
}

export function PlayerProfileViewer({
    isOpen,
    onClose,
    player,
    t,
    rank
}: PlayerProfileViewerProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !player) return null;

    // Safe data extraction
    const totalSpins = player.totalSpins ?? 0;
    const jackpotsWon = player.jackpotsWon ?? 0;

    // Format big number amounts (wei to readable tokens)
    const formatTokens = (value: bigint | undefined | null): string => {
        if (!value) return '0';
        try {
            const num = Number(value) / 1e18;
            if (isNaN(num)) return '0';
            if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
            if (num >= 1) return num.toFixed(0);
            return num.toFixed(2);
        } catch { return '0'; }
    };

    // Get amounts
    const highestWin = formatTokens(player.highestWin);
    const totalWon = formatTokens(player.totalWonAmount);

    // Copy address to clipboard
    const copyAddress = () => {
        if (player.address) {
            navigator.clipboard.writeText(player.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Format address for display
    const shortAddress = player.address
        ? `${player.address.slice(0, 10)}...${player.address.slice(-8)}`
        : '';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.88)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, rgba(20, 30, 48, 0.98) 0%, rgba(30, 40, 60, 0.95) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: 16,
                    padding: 20,
                    width: '90%',
                    maxWidth: 360,
                    boxShadow: '0 0 40px rgba(34, 197, 94, 0.25)',
                    animation: 'fadeIn 0.2s ease-out',
                }}
            >
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    paddingBottom: 10,
                    borderBottom: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#22c55e',
                        fontFamily: "'Space Mono', monospace",
                        textTransform: 'uppercase',
                    }}>
                        👤 {t.playerProfile || 'Hồ Sơ Người Chơi'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: 8,
                            color: '#ef4444',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            fontSize: 14,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Avatar & Name */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{
                        width: 72, height: 72,
                        borderRadius: 16,
                        background: 'linear-gradient(145deg, rgba(168,85,247,0.4), rgba(124,58,237,0.3))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 44,
                        border: '2px solid rgba(168,85,247,0.6)',
                        boxShadow: '0 0 25px rgba(168,85,247,0.4)',
                        marginBottom: 10,
                    }}>
                        {getSlotsAvatarEmoji((player.avatar || 0) as SlotsAvatarIndex)}
                    </div>

                    <div style={{
                        fontSize: 18, fontWeight: 900, color: '#fff',
                        fontFamily: "'Space Mono', monospace",
                        textTransform: 'uppercase',
                        marginBottom: 6
                    }}>
                        {player.name || `Spinner ${player.address?.slice(0, 6) || ''}`}
                    </div>

                    {/* Address with Copy Button */}
                    <div
                        onClick={copyAddress}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                    >
                        <span style={{
                            fontSize: 11,
                            color: '#94a3b8',
                            fontFamily: "'Space Mono', monospace"
                        }}>
                            {shortAddress}
                        </span>
                        <span style={{ fontSize: 12 }}>
                            {copied ? '✅' : '📋'}
                        </span>
                    </div>

                    {/* Rank Badge */}
                    {rank && rank > 0 && (
                        <div style={{
                            marginTop: 10,
                            fontSize: 12, color: '#fbbf24', fontWeight: 800,
                            display: 'flex', alignItems: 'center', gap: 4,
                            textTransform: 'uppercase',
                            padding: '5px 14px',
                            background: 'rgba(251,191,36,0.15)',
                            borderRadius: 20,
                            border: '1px solid rgba(251,191,36,0.3)',
                        }}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆'}
                            Rank #{rank}
                        </div>
                    )}
                </div>

                {/* Stats Grid - 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                    {/* Total Spins */}
                    <div style={{
                        padding: '12px 8px',
                        background: 'rgba(250,204,21,0.1)',
                        borderRadius: 12,
                        textAlign: 'center',
                        border: '1px solid rgba(250,204,21,0.3)'
                    }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#facc15' }}>
                            {totalSpins.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            🎰 {t.totalSpins || 'Tổng Quay'}
                        </div>
                    </div>

                    {/* Total Won */}
                    <div style={{
                        padding: '12px 8px',
                        background: 'rgba(34,197,94,0.1)',
                        borderRadius: 12,
                        textAlign: 'center',
                        border: '1px solid rgba(34,197,94,0.3)'
                    }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>
                            {totalWon}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            💰 {t.totalWins || 'Tổng Thắng'}
                        </div>
                    </div>

                    {/* Biggest Win */}
                    <div style={{
                        padding: '12px 8px',
                        background: 'rgba(251,191,36,0.1)',
                        borderRadius: 12,
                        textAlign: 'center',
                        border: '1px solid rgba(251,191,36,0.3)'
                    }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>
                            {highestWin}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            🏆 {t.biggestWin || 'Thắng Lớn Nhất'}
                        </div>
                    </div>

                    {/* Jackpots */}
                    <div style={{
                        padding: '12px 8px',
                        background: jackpotsWon > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
                        borderRadius: 12,
                        textAlign: 'center',
                        border: jackpotsWon > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(100,116,139,0.2)'
                    }}>
                        <div style={{
                            fontSize: 22, fontWeight: 800,
                            color: jackpotsWon > 0 ? '#ef4444' : '#64748b'
                        }}>
                            {jackpotsWon}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            🎉 {t.jackpotsWonLabel || 'Jackpots'}
                        </div>
                    </div>
                </div>

                {/* Social Links */}
                {(player.telegram || player.twitter) && (
                    <div style={{
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap'
                    }}>
                        {player.telegram && (
                            <a
                                href={`https://t.me/${player.telegram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize: 12,
                                    color: '#0088cc',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '8px 14px',
                                    background: 'rgba(0, 136, 204, 0.15)',
                                    borderRadius: 8,
                                    border: '1px solid rgba(0, 136, 204, 0.3)'
                                }}
                            >
                                📱 @{player.telegram}
                            </a>
                        )}
                        {player.twitter && (
                            <a
                                href={`https://x.com/${player.twitter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize: 12,
                                    color: '#1da1f2',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '8px 14px',
                                    background: 'rgba(29, 161, 242, 0.15)',
                                    borderRadius: 8,
                                    border: '1px solid rgba(29, 161, 242, 0.3)'
                                }}
                            >
                                𝕏 @{player.twitter}
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlayerProfileViewer;
