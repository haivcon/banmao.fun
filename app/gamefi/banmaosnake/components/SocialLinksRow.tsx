// ===== SOCIAL LINKS ROW COMPONENT =====
// Displays Telegram and Twitter links for player profile

import React from 'react';
import { sounds } from '../lib/sounds';

interface SocialLinksRowProps {
    telegram?: string;
    twitter?: string;
}

/**
 * Social Links Row component for displaying player social links
 */
export function SocialLinksRow({ telegram, twitter }: SocialLinksRowProps) {
    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {/* Telegram */}
            {telegram ? (
                <a
                    href={`https://t.me/${telegram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="hover-social"
                    onClick={() => sounds.click()}
                    onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(1.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    style={{
                        flex: 1, padding: '10px 12px',
                        background: 'rgba(0,136,204,0.15)', borderRadius: 10,
                        border: '1px solid rgba(0,136,204,0.3)',
                        textDecoration: 'none', textAlign: 'center',
                        transition: 'transform 0.2s ease'
                    }}
                >
                    <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Telegram</div>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>✈️</div>
                    <div style={{ fontSize: 12, color: '#0088cc', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {telegram}
                    </div>
                </a>
            ) : (
                <div style={{
                    flex: 1, padding: '10px 12px',
                    background: 'rgba(100,116,139,0.1)', borderRadius: 10,
                    border: '1px dashed rgba(100,116,139,0.3)', textAlign: 'center'
                }}>
                    <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Telegram</div>
                    <div style={{ fontSize: 20, marginBottom: 4, opacity: 0.4 }}>✈️</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Not added</div>
                </div>
            )}

            {/* X (Twitter) */}
            {twitter ? (
                <a
                    href={`https://x.com/${twitter.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="hover-social"
                    onClick={() => sounds.click()}
                    onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(1.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    style={{
                        flex: 1, padding: '10px 12px',
                        background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.15)',
                        textDecoration: 'none', textAlign: 'center',
                        transition: 'transform 0.2s ease'
                    }}
                >
                    <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>X (Twitter)</div>
                    <div style={{ fontSize: 18, marginBottom: 4, fontWeight: 900, color: '#fff' }}>𝕏</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {twitter}
                    </div>
                </a>
            ) : (
                <div style={{
                    flex: 1, padding: '10px 12px',
                    background: 'rgba(100,116,139,0.1)', borderRadius: 10,
                    border: '1px dashed rgba(100,116,139,0.3)', textAlign: 'center'
                }}>
                    <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>X (Twitter)</div>
                    <div style={{ fontSize: 18, marginBottom: 4, opacity: 0.4, fontWeight: 900 }}>𝕏</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Not added</div>
                </div>
            )}
        </div>
    );
}

export default SocialLinksRow;
