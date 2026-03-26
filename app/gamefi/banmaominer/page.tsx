'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameCanvas, ClaimModal, DonateModal, SettingsPanel } from './components';
import GameDisabled from '../components/GameDisabled';
import { translations, LangKey, languageNames } from './lib/i18n';
import { MIN_CLAIM_POINTS } from './lib/gameConfig';
import { recordGameVisit } from '../../../lib/gameVisitTracker';
import { soundManager } from './lib/sounds';
import './globals.css';

export default function BanmaoMinerPage() {
    const router = useRouter();
    const [lang, setLang] = useState<LangKey>('en');
    const [totalScore, setTotalScore] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [gamePhase, setGamePhase] = useState('menu');
    const [showLangMenu, setShowLangMenu] = useState(false);

    // Modal states
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isGameEnabled, setIsGameEnabled] = useState(true);

    const t = translations[lang];

    // Check disable state
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const enabled = localStorage.getItem('GAME_MINER_ENABLED') !== 'false';
            setIsGameEnabled(enabled);
        }
    }, []);

    // Record visit on mount
    React.useEffect(() => {
        if (isGameEnabled) {
            recordGameVisit('banmaominer');
        }
    }, [isGameEnabled]);

    // Import GameDisabled component dynamically or at top if possible, 
    // but here we might need to rely on dynamic import or assume it's available.
    // Let's add the import at the top first using a separate edit.
    if (!isGameEnabled) {
        return <GameDisabled gameName="Gold Miner" />;
    }

    const handleScoreChange = useCallback((score: number, total: number) => {
        setTotalScore(total);
    }, []);

    const handleLevelComplete = useCallback((level: number) => {
        setCurrentLevel(level + 1);
        soundManager.levelComplete();
    }, []);

    const handleGameOver = useCallback((finalScore: number) => {
        setTotalScore(finalScore);
        soundManager.gameOver();
    }, []);

    const handleStateChange = useCallback((phase: string) => {
        setGamePhase(phase);
    }, []);

    const handleChangeLang = useCallback((newLang: string) => {
        setLang(newLang as LangKey);
    }, []);

    const canClaim = totalScore >= MIN_CLAIM_POINTS;

    return (
        <div className="miner-container">
            {/* Back Button */}
            <button
                className="miner-back-btn"
                onClick={() => {
                    soundManager.click();
                    router.push('/gamefi');
                }}
            >
                ← {t.back}
            </button>

            {/* Settings Button */}
            <button
                onClick={() => {
                    soundManager.click();
                    setShowSettings(true);
                }}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 100,
                    padding: '10px 16px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(0, 245, 255, 0.5)',
                    borderRadius: 8,
                    color: '#00f5ff',
                    cursor: 'pointer',
                    fontFamily: "'Space Mono', monospace",
                    zIndex: 100,
                }}
            >
                ⚙️
            </button>

            {/* Language Selector */}
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100 }}>
                <button
                    onClick={() => {
                        soundManager.click();
                        setShowLangMenu(!showLangMenu);
                    }}
                    style={{
                        padding: '10px 16px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(0, 245, 255, 0.5)',
                        borderRadius: 8,
                        color: '#00f5ff',
                        cursor: 'pointer',
                        fontFamily: "'Space Mono', monospace",
                    }}
                >
                    🌐 {languageNames[lang]}
                </button>
                {showLangMenu && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        background: 'rgba(10, 10, 30, 0.95)',
                        border: '1px solid rgba(0, 245, 255, 0.3)',
                        borderRadius: 8,
                        overflow: 'hidden',
                    }}>
                        {(Object.keys(languageNames) as LangKey[]).map(key => (
                            <button
                                key={key}
                                onClick={() => {
                                    soundManager.click();
                                    setLang(key);
                                    setShowLangMenu(false);
                                }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '10px 20px',
                                    background: lang === key ? 'rgba(0, 245, 255, 0.2)' : 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontFamily: "'Space Mono', monospace",
                                }}
                            >
                                {languageNames[key]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Title */}
            <h1 className="miner-title">🐱⛏️ {t.gameTitle}</h1>
            <p className="miner-subtitle">{t.gameSubtitle}</p>

            {/* Stats Bar */}
            <div className="miner-stats-bar">
                <div className="miner-stat">
                    <span className="miner-stat-label">{t.level}</span>
                    <span className="miner-stat-value">{currentLevel}</span>
                </div>
                <div className="miner-stat">
                    <span className="miner-stat-label">{t.totalEarned}</span>
                    <span className="miner-stat-value">{totalScore.toLocaleString()}</span>
                </div>
                <div className="miner-stat">
                    <span className="miner-stat-label">{t.claimTitle}</span>
                    <span className="miner-stat-value" style={{
                        color: canClaim ? '#4ade80' : '#888'
                    }}>
                        {canClaim ? '✓' : `${MIN_CLAIM_POINTS - totalScore} more`}
                    </span>
                </div>
            </div>

            {/* Game Canvas */}
            <div className="miner-game-wrapper">
                <GameCanvas
                    onScoreChange={handleScoreChange}
                    onLevelComplete={handleLevelComplete}
                    onGameOver={handleGameOver}
                    onStateChange={handleStateChange}
                />
            </div>

            {/* Action Buttons (show after game over) */}
            {gamePhase === 'gameOver' && (
                <div style={{
                    display: 'flex',
                    gap: 16,
                    marginTop: 20,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                }}>
                    {canClaim && (
                        <button
                            className="miner-claim-btn"
                            onClick={() => {
                                soundManager.click();
                                setShowClaimModal(true);
                            }}
                        >
                            💰 {t.claimRewards} ({totalScore} pts)
                        </button>
                    )}
                    <button
                        onClick={() => {
                            soundManager.click();
                            setShowDonateModal(true);
                        }}
                        style={{
                            padding: '16px 40px',
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#fff',
                            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                            border: 'none',
                            borderRadius: 12,
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
                        }}
                    >
                        💜 {t.donate}
                    </button>
                </div>
            )}

            {/* Instructions */}
            <div style={{
                marginTop: 24,
                padding: '16px 24px',
                background: 'rgba(20, 20, 40, 0.8)',
                borderRadius: 12,
                border: '1px solid rgba(255, 215, 0, 0.2)',
                maxWidth: 600,
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: 12 }}>{t.helpTitle}</h3>
                <ul style={{ color: '#aaa', lineHeight: 1.8, paddingLeft: 20 }}>
                    <li>{t.helpDesc1}</li>
                    <li>{t.helpDesc2}</li>
                    <li>{t.helpDesc3}</li>
                    <li>{t.helpDesc4}</li>
                    <li>{t.helpDesc5}</li>
                </ul>
            </div>

            {/* Item Legend */}
            <div style={{
                marginTop: 16,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                justifyContent: 'center',
            }}>
                {[
                    { emoji: '🪙', name: t.token, color: '#ffd700' },
                    { emoji: '💎', name: t.gem, color: '#00f5ff' },
                    { emoji: '💰', name: t.jackpot, color: '#4ade80' },
                    { emoji: '🪨', name: t.rock, color: '#888' },
                    { emoji: '💣', name: t.rugpull, color: '#ef4444' },
                    { emoji: '🎁', name: t.airdrop, color: '#a78bfa' },
                ].map(item => (
                    <span key={item.name} style={{
                        padding: '6px 12px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: 8,
                        color: item.color,
                        fontSize: 14,
                    }}>
                        {item.emoji} {item.name}
                    </span>
                ))}
            </div>

            {/* Modals */}
            <ClaimModal
                isOpen={showClaimModal}
                onClose={() => setShowClaimModal(false)}
                totalScore={totalScore}
                translations={{
                    claimTitle: t.claimTitle,
                    totalEarned: t.totalEarned,
                    claimNow: t.claimNow,
                    claiming: t.claiming,
                    claimSuccess: t.claimSuccess,
                    claimFailed: t.claimFailed,
                    minClaimRequired: t.minClaimRequired,
                    connectWallet: t.connectWallet,
                    back: t.back,
                }}
            />

            <DonateModal
                isOpen={showDonateModal}
                onClose={() => setShowDonateModal(false)}
                translations={{
                    donate: t.donate,
                    donateTitle: t.donateTitle,
                    donateDesc: t.donateDesc,
                    topDonors: t.topDonors,
                    loading: t.loading,
                    back: t.back,
                    connectWallet: t.connectWallet,
                }}
            />

            <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                currentLang={lang}
                onChangeLang={handleChangeLang}
                translations={{
                    settings: t.settings,
                    language: t.language,
                    sound: t.sound,
                    back: t.back,
                }}
                languageNames={languageNames}
            />
        </div>
    );
}
