// ===== INFO PANEL MODAL COMPONENT =====
// Displays community info, security features, and developer links

import React from 'react';
import { SnakeStrings } from '../lib/i18n';

interface InfoPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: SnakeStrings;
}

/**
 * Info Panel Modal - displays security info, features, and developer links
 */
export function InfoPanelModal({
    isOpen,
    onClose,
    t
}: InfoPanelModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16
        }} onClick={onClose}>
            <div style={{
                maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto',
                padding: 24, borderRadius: 20, position: 'relative',
                background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                border: '2px solid rgba(34,211,238,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,211,238,0.15)'
            }} onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 12, right: 12,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)', border: 'none',
                        color: '#fff', fontSize: 18, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    className="hover-btn"
                >✕</button>

                {/* Title */}
                <div style={{ fontSize: 18, fontWeight: 800, color: '#22d3ee', textAlign: 'center', marginBottom: 6 }}>{t.communityTitle}</div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px 0', textAlign: 'center', lineHeight: 1.5 }}>{t.communitySubtitle}</p>

                {/* Security Features */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span>🔐</span> {t.communitySecurityTitle}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    <div className="info-item" style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', fontSize: 11, color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                        <span style={{ color: '#10b981', fontSize: 14 }}>✓</span> {t.communityFeature1}
                    </div>
                    <div className="info-item" style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', fontSize: 11, color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                        <span style={{ color: '#3b82f6', fontSize: 14 }}>✓</span> {t.communityFeature2}
                    </div>
                    <div className="info-item" style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(168,85,247,0.1)', fontSize: 11, color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                        <span style={{ color: '#a855f7', fontSize: 14 }}>✓</span> {t.communityFeature3}
                    </div>
                </div>

                {/* Active Security Technologies */}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', marginBottom: 8, textAlign: 'center' }}>
                    {t.secTechTitle || '🛡️ Active Security Technologies'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                    {[
                        { key: t.secTech1, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
                        { key: t.secTech2, bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)' },
                        { key: t.secTech3, bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
                        { key: t.secTech4, bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                        { key: t.secTech5, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                        { key: t.secTech6, bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)' },
                        { key: t.secTech7, bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
                        { key: t.secTech8, bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            padding: '8px 8px', borderRadius: 8,
                            background: item.bg, border: `1px solid ${item.border}`,
                            fontSize: 10, color: '#cbd5e1', lineHeight: 1.4,
                            transition: 'all 0.2s ease'
                        }} className="info-item">
                            {item.key}
                        </div>
                    ))}
                </div>

                {/* Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                    <a
                        href="https://www.okx.com/web3/explorer/xlayer/address/0x986dE458302005890d708B3930ce57cD1E1E3BaF"
                        target="_blank" rel="noopener noreferrer" className="info-item"
                        style={{ fontSize: 11, color: '#22d3ee', textDecoration: 'none', padding: '8px 14px', borderRadius: 8, background: 'rgba(34,211,238,0.1)', transition: 'all 0.2s' }}
                    >🔍 {t.communityOpenSource}</a>
                    <a
                        href="https://x.com/haivcon" target="_blank" rel="noopener noreferrer" className="info-item"
                        style={{ fontSize: 12, color: '#fff', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                    >👨‍💻 {t.communityDeveloper}</a>
                    <a
                        href="https://x.com/haivcon" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #1da1f2, #0d8ddb)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                        className="hover-btn"
                    >
                        <span style={{ fontSize: 18 }}>𝕏</span> {t.communityFeedback}
                    </a>
                </div>
            </div>
        </div>
    );
}

export default InfoPanelModal;
