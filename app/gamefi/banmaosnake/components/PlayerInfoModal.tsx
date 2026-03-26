// ===== PLAYER INFO MODAL COMPONENT =====
// Displays player information including wallet, telegram, twitter

import React from 'react';
import { SnakeStrings } from '../lib/i18n';
import { AVATARS, getAvatarColor, AvatarIndex } from '../lib/avatars';
import { ToastData } from './Toast';


export interface ViewPlayerData {
    address: string;
    name: string;
    avatar: number;
    highScore: number;
    telegram?: string;
    twitter?: string;
}

interface PlayerInfoModalProps {
    player: ViewPlayerData | null;
    t: SnakeStrings;
    getPlayerRank: (address: string) => number | null;
    onClose: () => void;
    onShowToast: (toast: ToastData) => void;
}

/**
 * Player Info Modal - displays detailed info about a selected player
 */
export function PlayerInfoModal({
    player,
    t,
    getPlayerRank,
    onClose,
    onShowToast
}: PlayerInfoModalProps) {
    if (!player) return null;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        onShowToast({ msg: 'Copied!', type: 'success' });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={onClose}>
            <div style={{
                maxWidth: 360, width: '100%', padding: 20,
                background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))',
                border: `1px solid ${getAvatarColor(player.avatar as AvatarIndex)}50`, borderRadius: 20,
                boxShadow: `0 25px 80px rgba(0,0,0,0.4), 0 0 40px ${getAvatarColor(player.avatar as AvatarIndex)}20`
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee' }}>👤 Player Info</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 48 }}>{AVATARS[player.avatar as AvatarIndex] || '🐱'}</span>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{player.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{t.rank}: #{getPlayerRank(player.address) || '-'}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>🏆 {player.highScore} pts</div>
                    </div>
                </div>

                {/* Wallet Address */}
                <div style={{ marginBottom: 12, padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Wallet Address</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#e2e8f0', wordBreak: 'break-all', flex: 1 }}>{player.address}</span>
                        <button
                            onClick={() => handleCopy(player.address)}
                            style={{ padding: '4px 8px', background: 'rgba(34,211,238,0.2)', border: '1px solid rgba(34,211,238,0.4)', borderRadius: 4, fontSize: 10, color: '#22d3ee', cursor: 'pointer' }}
                        >📋</button>
                    </div>
                </div>

                {/* Telegram */}
                {player.telegram && (
                    <div style={{ marginBottom: 12, padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Telegram</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#e2e8f0', flex: 1 }}>{player.telegram}</span>
                            <button
                                onClick={() => handleCopy(player.telegram || '')}
                                style={{ padding: '4px 8px', background: 'rgba(34,211,238,0.2)', border: '1px solid rgba(34,211,238,0.4)', borderRadius: 4, fontSize: 10, color: '#22d3ee', cursor: 'pointer' }}
                            >📋</button>
                        </div>
                    </div>
                )}

                {/* Twitter */}
                {player.twitter && (
                    <div style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>X (Twitter)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#e2e8f0', flex: 1 }}>{player.twitter}</span>
                            <button
                                onClick={() => handleCopy(player.twitter || '')}
                                style={{ padding: '4px 8px', background: 'rgba(34,211,238,0.2)', border: '1px solid rgba(34,211,238,0.4)', borderRadius: 4, fontSize: 10, color: '#22d3ee', cursor: 'pointer' }}
                            >📋</button>
                        </div>
                    </div>
                )}

                {/* No social info */}
                {!player.telegram && !player.twitter && (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 12 }}>No social info available</div>
                )}
            </div>
        </div>
    );
}

export default PlayerInfoModal;
