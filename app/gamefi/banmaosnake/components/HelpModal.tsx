// ===== HELP MODAL COMPONENT =====
// Game guide modal with food types, obstacles, and controls info

import React from 'react';
import { SnakeStrings } from '../lib/i18n';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: SnakeStrings; // Translations
}

export function HelpModal({ isOpen, onClose, t }: HelpModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="help-modal-backdrop"
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20,
                animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .help-item { transition: all 0.2s ease; cursor: default; }
                .help-item:hover { transform: scale(1.03); box-shadow: 0 0 20px rgba(34,211,238,0.3); }
                .close-btn-help { transition: all 0.2s ease !important; }
                .close-btn-help:hover { transform: rotate(90deg) scale(1.2) !important; background: rgba(244,63,94,0.3) !important; border-color: #f43f5e !important; color: #f43f5e !important; box-shadow: 0 0 20px rgba(244,63,94,0.5) !important; }
            `}</style>
            <div style={{
                background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                border: '2px solid rgba(34,211,238,0.4)', borderRadius: 24, padding: 24, maxWidth: 400,
                width: '100%', maxHeight: '85vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,211,238,0.2)',
                animation: 'slideIn 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #22d3ee, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📖 {t.helpBtn || 'Game Guide'}
                    </h2>
                    <button
                        className="close-btn-help"
                        onClick={onClose}
                        style={{
                            width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, cursor: 'pointer'
                        }}
                    >✕</button>
                </div>

                {/* Food Types */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, color: '#22d3ee', marginBottom: 10, fontWeight: 700 }}>🎯 {t.helpFoodTypes || 'Food Types'}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="help-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(251,191,36,0.1)', borderRadius: 12, border: '1px solid rgba(251,191,36,0.3)' }}>
                            <span style={{ fontSize: 24 }}>🪙</span>
                            <div>
                                <div style={{ fontWeight: 700, color: '#fbbf24' }}>{t.helpCoinTitle || 'Coin (Token)'}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.helpCoinDesc || '+10 points | +15 gas'}</div>
                            </div>
                        </div>
                        <div className="help-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(34,211,238,0.1)', borderRadius: 12, border: '1px solid rgba(34,211,238,0.3)' }}>
                            <span style={{ fontSize: 24 }}>⚡</span>
                            <div>
                                <div style={{ fontWeight: 700, color: '#22d3ee' }}>{t.helpPowerTitle || 'Power-up (Lightning)'}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.helpPowerDesc || '+50 points | +40 gas | Super Mode'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Obstacles */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, color: '#f43f5e', marginBottom: 10, fontWeight: 700 }}>🔴 {t.helpObstacles || 'Obstacles'}</h3>
                    <div className="help-item" style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.1)', borderRadius: 12, border: '1px solid rgba(244,63,94,0.3)', fontSize: 13, color: '#fda4af' }}>
                        {t.helpObstaclesDesc || 'Red squares spawn every 15 seconds. Touch = Game Over (unless Super Mode active).'}
                    </div>
                </div>

                {/* Gas System */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, color: '#4ade80', marginBottom: 10, fontWeight: 700 }}>⛽ {t.helpGas || 'Gas System'}</h3>
                    <div className="help-item" style={{ padding: '10px 14px', background: 'rgba(74,222,128,0.1)', borderRadius: 12, border: '1px solid rgba(74,222,128,0.3)', fontSize: 13, color: '#86efac' }}>
                        {t.helpGasDesc || 'Gas decreases as you move. Gas = 0 → Game Over.'}<br />
                        {t.helpGasRefill || 'Collect food to refill:'} 🪙 +15 | ⚡ +40
                    </div>
                </div>

                {/* Combo System */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, color: '#a855f7', marginBottom: 10, fontWeight: 700 }}>🔥 {t.helpCombo || 'Combo Bonus'}</h3>
                    <div className="help-item" style={{ padding: '10px 14px', background: 'rgba(168,85,247,0.1)', borderRadius: 12, border: '1px solid rgba(168,85,247,0.3)', fontSize: 13, color: '#c4b5fd' }}>
                        {t.helpComboDesc || 'Eat food quickly for combo multiplier!'}<br />
                        <strong>{t.helpComboBonus || '+10% bonus per combo level'}</strong> {t.helpComboReset || '(resets after 2s).'}
                    </div>
                </div>

                {/* Super Mode */}
                <div style={{ marginBottom: 10 }}>
                    <h3 style={{ fontSize: 14, color: '#0ff', marginBottom: 10, fontWeight: 700 }}>⚡ {t.helpSuperMode || 'Super Mode (5 seconds)'}</h3>
                    <div className="help-item" style={{ padding: '10px 14px', background: 'rgba(0,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(0,255,255,0.3)', fontSize: 13, color: '#67e8f9' }}>
                        {t.helpSuperActivate || 'Activated by eating ⚡ Power-up:'}<br />
                        ✅ {t.helpSuperWall || 'Walk through walls (wrap around)'}<br />
                        ✅ {t.helpSuperObstacle || 'Ignore obstacles (no death)'}<br />
                        ✅ {t.helpSuperGlow || 'Cyan glow border on snake'}
                    </div>
                </div>

                {/* Controls hint */}
                <div className="help-item" style={{ textAlign: 'center', marginTop: 16, padding: '10px 14px', background: 'rgba(100,116,139,0.1)', borderRadius: 12, border: '1px solid rgba(100,116,139,0.3)', color: '#94a3b8', fontSize: 12 }}>
                    🎮 {t.helpControls || 'Use Arrow Keys / WASD / Touch D-pad to move'}
                </div>
            </div>
        </div>
    );
}

export default HelpModal;
