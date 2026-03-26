'use client';
import React, { useState } from 'react';
import { ClaimRecord } from '../lib/useGameEnhancements';
import { formatCompact } from '../lib/utils';
import { SnakeStrings } from '../lib/i18n/types';

const SNAKE_CONTRACT = '0x986dE458302005890d708B3930ce57cD1E1E3BaF';
const EXPLORER_URL = 'https://web3.okx.com/explorer/x-layer';

// ====== Offline Banner ======
export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
    if (isOnline) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'linear-gradient(90deg, #ef4444, #dc2626)',
            color: '#fff', textAlign: 'center', padding: '8px 16px',
            fontSize: 13, fontWeight: 600, animation: 'fadeSlideDown 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
            <span>📡</span> Connection lost — Game paused
        </div>
    );
}

// ====== Difficulty Badge ======
export function DifficultyBadge({ level }: { level: { name: string; emoji: string; color: string } }) {
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 20,
            background: `${level.color}22`, border: `1px solid ${level.color}55`,
            fontSize: 11, fontWeight: 700, color: level.color,
            transition: 'all 0.3s ease'
        }}>
            {level.emoji} {level.name}
        </div>
    );
}

// ====== Cooldown Display (for Claim Button) ======
export function ClaimCooldownOverlay({ cooldownLeft, formatCooldown }: { cooldownLeft: number; formatCooldown: () => string }) {
    if (cooldownLeft <= 0) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171', fontSize: 12, fontWeight: 600,
            animation: 'fadeSlideDown 0.3s ease'
        }}>
            ⏱ {formatCooldown()}
        </div>
    );
}

// ====== Claim History Panel (Enhanced with Explorer Guide) ======
function shortenHash(hash: string): string {
    if (!hash || hash.length < 10) return hash || '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatTimestamp(ts: number): string {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '< 1m';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('en', { day: '2-digit', month: '2-digit' });
}

export function ClaimHistoryPanel({
    claims, loading, showHistory, toggleHistory, t, address
}: {
    claims: ClaimRecord[];
    loading: boolean;
    showHistory: boolean;
    toggleHistory: () => void;
    t: SnakeStrings;
    address?: string;
}) {
    const [copied, setCopied] = useState(false);

    const copyFunctionName = () => {
        navigator.clipboard.writeText('claimReward').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const openExplorer = () => {
        const url = address
            ? `${EXPLORER_URL}/address/${SNAKE_CONTRACT}?tab=Txs&method=claimReward&from=${address}`
            : `${EXPLORER_URL}/address/${SNAKE_CONTRACT}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div style={{ marginTop: 8 }}>
            <button
                onClick={toggleHistory}
                className="hover-btn"
                style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#93c5fd', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', transition: 'all 0.2s ease'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.claimHistoryTitle || '📋 Claim History'}
                </span>
                <span style={{
                    fontSize: 12, color: '#94a3b8',
                    transition: 'transform 0.3s ease',
                    transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>▼</span>
            </button>

            {showHistory && (
                <div style={{
                    marginTop: 6, padding: 12, borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    animation: 'fadeSlideDown 0.3s ease'
                }}>
                    {/* Claim records list */}
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: 8 }}>
                            ⏳...
                        </div>
                    ) : claims.length > 0 ? (
                        <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 10 }}>
                            {claims.map((c, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '5px 6px', borderRadius: 6,
                                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    fontSize: 11
                                }}>
                                    <a
                                        href={`${EXPLORER_URL}/tx/${c.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                                    >
                                        {shortenHash(c.txHash)}
                                    </a>
                                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                        {formatCompact(Number(c.amount) / 1e18)}
                                    </span>
                                    <span style={{ color: '#64748b' }}>
                                        {formatTimestamp(c.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {/* Explorer search guide (always shown like screenshot) */}
                    <div style={{
                        padding: 10, borderRadius: 8,
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                            {t.claimHistorySearchGuide || '🔍 To find claim history, search on Explorer'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <span>💡</span>
                            <span>{t.claimHistorySearchTip || 'Tip: Type "claimReward" to find all claim transactions'}</span>
                        </div>

                        {/* Function name with copy button (attached) */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'stretch', marginBottom: 10,
                            borderRadius: 8, overflow: 'hidden',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                            <div style={{
                                padding: '7px 14px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#4ade80', fontSize: 13, fontWeight: 700,
                                fontFamily: 'monospace', letterSpacing: 0.5,
                                display: 'flex', alignItems: 'center'
                            }}>
                                claimReward
                            </div>
                            <button
                                onClick={copyFunctionName}
                                className="hover-btn"
                                style={{
                                    padding: '7px 14px',
                                    background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.12)',
                                    borderLeft: '1px solid rgba(34, 197, 94, 0.3)',
                                    border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 1, borderLeftColor: 'rgba(34, 197, 94, 0.3)',
                                    color: copied ? '#4ade80' : '#94a3b8',
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {copied ? (t.claimHistoryCopied || 'Copied!') : (t.claimHistoryCopy || 'Copy')}
                            </button>
                        </div>

                        {/* Explorer link button */}
                        <button
                            onClick={openExplorer}
                            className="hover-btn"
                            style={{
                                width: '100%', padding: '9px 14px', borderRadius: 8,
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.12))',
                                border: '1px solid rgba(139, 92, 246, 0.35)',
                                color: '#a78bfa', fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 6,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {t.claimHistorySearchExplorer || '🌐 Search on Explorer'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ====== Leaderboard Load More Button ======
export function LoadMoreButton({
    loading, onClick
}: { loading: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="hover-btn"
            style={{
                width: '100%', padding: '8px', marginTop: 8,
                borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.3)',
                background: 'rgba(139, 92, 246, 0.08)',
                color: '#a78bfa', fontSize: 12, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            {loading ? '⏳...' : '📥 Load more'}
        </button>
    );
}
