'use client';

import React, { useState, useEffect } from 'react';
import { soundManager } from '../lib/sounds';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentLang: string;
    onChangeLang: (lang: string) => void;
    translations: {
        settings: string;
        language: string;
        sound: string;
        back: string;
    };
    languageNames: Record<string, string>;
}

export default function SettingsPanel({
    isOpen,
    onClose,
    currentLang,
    onChangeLang,
    translations: t,
    languageNames,
}: SettingsPanelProps) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [soundVolume, setSoundVolume] = useState(0.5);

    // Load settings on mount
    useEffect(() => {
        setSoundEnabled(soundManager.isEnabled());
        if (typeof localStorage !== 'undefined') {
            const vol = localStorage.getItem('miner_sound_volume');
            if (vol) setSoundVolume(parseFloat(vol));
        }
    }, [isOpen]);

    const handleSoundToggle = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        soundManager.setEnabled(newValue);
        if (newValue) soundManager.click();
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setSoundVolume(vol);
        soundManager.setVolume(vol);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('miner_sound_volume', vol.toString());
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)',
                borderRadius: 16,
                padding: 24,
                minWidth: 320,
                maxWidth: 400,
                border: '2px solid rgba(0, 245, 255, 0.5)',
                boxShadow: '0 0 40px rgba(0, 245, 255, 0.3)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}>
                    <h2 style={{ color: '#00f5ff', margin: 0, fontSize: 24 }}>
                        ⚙️ {t.settings}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: 24,
                            cursor: 'pointer',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Sound Settings */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                    }}>
                        <span style={{ color: '#fff', fontSize: 16 }}>
                            🔊 {t.sound}
                        </span>
                        <button
                            onClick={handleSoundToggle}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 20,
                                border: 'none',
                                background: soundEnabled
                                    ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                color: soundEnabled ? '#000' : '#888',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                            }}
                        >
                            {soundEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {soundEnabled && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <span style={{ color: '#888', fontSize: 12 }}>🔈</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={soundVolume}
                                onChange={handleVolumeChange}
                                style={{
                                    flex: 1,
                                    height: 6,
                                    borderRadius: 3,
                                    accentColor: '#00f5ff',
                                }}
                            />
                            <span style={{ color: '#888', fontSize: 12 }}>🔊</span>
                        </div>
                    )}
                </div>

                {/* Language Settings */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                }}>
                    <div style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>
                        🌐 {t.language}
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                    }}>
                        {Object.entries(languageNames).map(([code, name]) => (
                            <button
                                key={code}
                                onClick={() => {
                                    soundManager.click();
                                    onChangeLang(code);
                                }}
                                style={{
                                    padding: '10px 8px',
                                    borderRadius: 8,
                                    border: currentLang === code
                                        ? '2px solid #00f5ff'
                                        : '1px solid rgba(255, 255, 255, 0.2)',
                                    background: currentLang === code
                                        ? 'rgba(0, 245, 255, 0.2)'
                                        : 'transparent',
                                    color: '#fff',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={() => {
                        soundManager.click();
                        onClose();
                    }}
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        borderRadius: 12,
                        border: 'none',
                        background: 'linear-gradient(135deg, #00f5ff, #0088ff)',
                        color: '#000',
                        fontSize: 16,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                    }}
                >
                    {t.back}
                </button>
            </div>
        </div>
    );
}
