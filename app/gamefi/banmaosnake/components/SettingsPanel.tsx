// ===== SETTINGS PANEL COMPONENT =====
// Displays settings for language and UI scale

import React from 'react';
import { sounds } from '../lib/sounds';
import { SnakeStrings, LangKey, langs, flags } from '../lib/i18n';

interface SettingsPanelProps {
    isOpen: boolean;
    isMobile: boolean;
    lang: LangKey;
    uiScale: 'xs' | 'sm' | 'md' | 'lg';
    t: SnakeStrings;
    onChangeLang: (lang: LangKey) => void;
    onChangeScale: (scale: 'xs' | 'sm' | 'md' | 'lg') => void;
}

/**
 * Settings Panel - displays language and UI scale options
 */
export function SettingsPanel({
    isOpen,
    isMobile,
    lang,
    uiScale,
    t,
    onChangeLang,
    onChangeScale
}: SettingsPanelProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '120%',
            right: 0,
            width: isMobile ? 'calc(100vw - 40px)' : 280,
            maxWidth: 300,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            padding: 0,
            background: 'linear-gradient(165deg, rgba(15,23,42,0.98), rgba(10,15,30,0.99))',
            borderRadius: 20,
            border: '1px solid rgba(34,211,238,0.25)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)'
        }}>
            {/* Premium Header */}
            <div style={{
                padding: '16px 18px',
                background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(168,85,247,0.1))',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px 20px 0 0',
                display: 'flex', alignItems: 'center', gap: 10
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, boxShadow: '0 4px 15px rgba(34,211,238,0.4)'
                }}>⚙️</div>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', letterSpacing: 0.5 }}>{t.settingsTitle || 'Settings'}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{t.settingsSubtitle || 'Customize your experience'}</div>
                </div>
            </div>

            <div style={{ padding: '16px 18px' }}>
                {/* Language Section */}
                <div style={{
                    marginBottom: 18,
                    padding: 14,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div style={{
                        fontSize: 10, color: '#94a3b8', marginBottom: 12,
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <span style={{ fontSize: 14 }}>🌐</span> {t.language || 'Language'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {(Object.keys(langs) as LangKey[]).map(l => (
                            <button
                                key={l}
                                onClick={() => { sounds.click(); onChangeLang(l); }}
                                onMouseEnter={() => sounds.hover()}
                                className="hover-btn"
                                style={{
                                    padding: '10px 6px', borderRadius: 12,
                                    background: l === lang
                                        ? 'linear-gradient(135deg, #22d3ee, #0ea5e9)'
                                        : 'rgba(255,255,255,0.05)',
                                    border: l === lang
                                        ? '1px solid rgba(34,211,238,0.5)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                    boxShadow: l === lang ? '0 4px 20px rgba(34,211,238,0.3)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span style={{ fontSize: 22, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{flags[l]}</span>
                                <span style={{
                                    fontSize: 10,
                                    color: l === lang ? '#fff' : '#94a3b8',
                                    fontWeight: 700,
                                    textShadow: l === lang ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                                }}>
                                    {l.toUpperCase()}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* UI Scale Section */}
                <div style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div style={{
                        fontSize: 10, color: '#94a3b8', marginBottom: 12,
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <span style={{ fontSize: 14 }}>📐</span> {t.uiScale || 'UI Scale'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12 }}>
                        {[
                            { key: 'lg', label: 'L', icon: '🔍', color: '#22c55e' },
                            { key: 'md', label: 'M', icon: '📱', color: '#3b82f6' },
                            { key: 'sm', label: 'S', icon: '📲', color: '#f59e0b' },
                            { key: 'xs', label: 'XS', icon: '🔬', color: '#ef4444' },
                        ].map(({ key, label, icon, color }) => (
                            <button
                                key={key}
                                onClick={() => { sounds.click(); onChangeScale(key as 'xs' | 'sm' | 'md' | 'lg'); }}
                                onMouseEnter={() => sounds.hover()}
                                className="hover-btn"
                                style={{
                                    flex: 1,
                                    padding: '10px 4px', borderRadius: 10,
                                    background: uiScale === key
                                        ? `linear-gradient(135deg, ${color}, ${color}dd)`
                                        : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                    boxShadow: uiScale === key ? `0 4px 15px ${color}50` : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span style={{ fontSize: 16 }}>{icon}</span>
                                <span style={{
                                    fontSize: 10,
                                    color: uiScale === key ? '#fff' : '#64748b',
                                    fontWeight: 700
                                }}>
                                    {label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;
