"use client";

import React, { useState } from "react";
import type { LandingTranslations } from "../../web3d/locals";
import type { GameInfo } from "./GameCard";

// Sound effects
function playSound(soundKey: 'hover' | 'click' | 'success' | 'whoosh') {
    if (typeof window === "undefined") return;
    const isMuted = localStorage.getItem("banmao_sound_muted") === "true";
    if (isMuted) return;
    const volume = parseFloat(localStorage.getItem("banmao_sound_volume") || "0.5");
    const SOUNDS = {
        hover: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdX19b2BfZ3N6fm5ka2tqY2Bpd4GFfHd2c3Frbm92dnN0eXt6dXBxcXRybm1sbHF5fXlzbGdlaXB5fnd0cW9rbWxobXV5fHdwbWloaGhqdH2CgXpzbmloZmlsc3l+fXhxbWlnZ2dpbXJ3e3x4c25qZ2ZlZWhscXZ6e3ZwaWdkZWVmaW9ydnl5dXBsaWdmZmdobnN3enl1cG1qZ2ZmZmdpcHR4e3lzbmtpZ2ZmZ2hrcXd7fXlzbWpnZmVlZ2lscnl/fndwbGhnZmZmZ2txd3x+eXJtaWdmZWVmam91e398d3FsaWdmZWVnam90e399d3BramhnZ2dnam91e399d3FraGdmZmZnam51fH59dnBramhnZmZoam90fH99dnFqaWdnZmdoam51fH99dnBramhnZmZnam51fH99d3FqamhnZmdoam91fH99d3BramhnZmZnam51fH99dnFraGdmZmZnam51fH99d3BramhnZmZoam91fH99d3BramhnZmZnam51fH99dnBramhnZmZoam91fH99d3FraWdnZmdoam91fH99d3BqamhnZmdoam91fH99dnFraWdnZ2hpam91fH99d3FqamhnZ2doam91fH99d3BqamhnZmZoam91fH99d3BramhnZmZnam51fH99d3BramhnZmZoam91fH99d3FqamhnZmdobm91fH99d3Bqamhnmqkk',
        click: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgH9/f4B/f39+f3+Af3+Af39/gH9/f4B/gH+Af4CAgIGBgIGBgYGBgYKBgYGBgYGBgYGBgIGAgYCAgICAgH9/f39/f39/f39/f39/f39/f39/gH9/gH+Af4B/gICAgICAgICAgYGBgYGBgoKCgoKCgoKCgoKCgoKCgYGBgYGBgIGAgICAgIB/gH+Af39/f35/fn9+fn5+fn5+fn5+f35/fn9+f39/f3+Af4B/gICAgICAgYGBgYKCgoKCg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYCAgICAf39/f35+fn59fX19fX19fX19fX19fX5+fn5/f39/gICAgIGBgYKCgoODg4SDhISEhISEhISEhISEg4ODg4KCgoGBgYCAgH9/fn5+fX19fHx8fHx8fHx8fHx8fH19fX5+fn9/gICBgYGCgoODhISEhYWFhYWFhYWFhYWFhISEg4OCgoGBgIB/f35+fX18fHt7e3t7e3t7e3t7e3x8fH19fn5/gICBgYKCg4OEhIWFhoaG',
        success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/gH+Af4CAgICAgYGBgYGBgoKCgoKDg4ODg4ODg4ODg4ODg4OCgoKCgoGBgYGAgICAgH9/f39+fn5+fX5+fn5+fn5/f39/gICAgIGBgYKCgoODg4SEhISFhYWFhYWFhYWFhYSEhIODg4KCgYGAgH9/fn59fX18fHx7e3t7e3t7e3t7fHx8fX1+fn9/gICBgYKCg4OEhIWFhoaGhoaGhoaGhoaGhYWEhIODgoKBgH9/fn59fHx7e3p6enp6enp6enp6e3t8fH1+f3+AgYGCg4OEhYWGh4eHh4iIiIiHh4eHhoaFhYSEg4KBgH9+fX18e3p6eXl5eXl5eXl5eXl6ent8fX5/gIGCg4SFhoeHiIiJiYmJiYmJiYiIh4eGhYSEgoGA',
        whoosh: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgH5+fHx6enl5eXp7fX+BgoSFhoeHiIiIh4eFg4F+fHp4d3Z2d3l7foGEhomLjI2Oj46OjYyKiIWCf3x5dnRzc3R2eX2BhYmMj5GSkpKSkZCOi4eDf3t3dHJxcXJ0d3uAhIiMj5KUlZWVlJORjoqGgn14dXJwcHF0eH2ChouPkpWXl5eXlpSRjoqFgXx4dXFvcHJ2e4CGio6RlZeYmJiXlpORjYmFgHt3dHFwcXR4fYKHi46SlZeYmJeWk5GNiYV/e3d0cXBxdHl+g4iMj5OWl5iYl5WTj4yHg353dHFwcXR5foOIjI+TlpeYmJeWk5CL',
    };
    try {
        const audio = new Audio(SOUNDS[soundKey]);
        audio.volume = volume;
        audio.play().catch(() => { });
    } catch { }
}

// Play Icon
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

interface GameInfoModalProps {
    game: GameInfo;
    t: (key: keyof LandingTranslations) => string;
    onClose: () => void;
    onPlay: () => void;
}

export function GameInfoModal({ game, t, onClose, onPlay }: GameInfoModalProps) {
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        if (!game.contractAddress) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(game.contractAddress);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = game.contractAddress;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } finally {
                    textArea.remove();
                }
            }
            setCopied(true);
            playSound('success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            if (window.prompt) {
                window.prompt('Copy contract address:', game.contractAddress);
            }
        }
    };

    return (
        <div className="game-info-modal" onClick={onClose}>
            <div className="game-info-modal__content" onClick={e => e.stopPropagation()}>
                <button className="game-info-modal__close" onClick={onClose}>✕</button>

                <div className="game-info-modal__header">
                    <span className="game-info-modal__icon">
                        {game.icon === 'snake-img'
                            ? <img src="/games/snake/snake-icon-96x96.png" alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />
                            : game.icon === 'rps-img'
                                ? <img src="/games/rps/logo.jpg" alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />
                                : game.iconImage
                                    ? <img src={game.iconImage} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
                                    : game.icon
                        }
                    </span>
                    <h2 className="game-info-modal__title">{t(game.nameKey)}</h2>
                </div>

                <div className="game-info-modal__section">
                    <h3>📖 {t('gamefiAbout')}</h3>
                    <p>{t(game.descKey)}</p>
                </div>

                <div className="game-info-modal__section">
                    <h3>🎯 {t('gamefiHowToPlay')}</h3>
                    <p>
                        {t(({
                            banmaorps: 'gamefiRpsHowToPlay',
                            banmaoslots: 'gamefiSlotsHowToPlay',
                            banmaosnake: 'gamefiSnakeHowToPlay',
                            banmaofomo: 'gamefiFomoHowToPlay',
                        } as Record<string, keyof LandingTranslations>)[game.id] || 'gamefiSnakeHowToPlay')}
                    </p>
                </div>

                {game.contractAddress && (
                    <div className="game-info-modal__section game-info-modal__contract" style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('gamefiSmartContract')}</h3>
                        <div className="game-info-modal__address" style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <code style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{game.contractAddress}</code>
                            <button onClick={copyAddress} className="game-info-modal__copy" title="Copy" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                                {copied ? '✓' : '📋'}
                            </button>
                        </div>
                        <a
                            href={`https://web3.okx.com/explorer/x-layer/address/${game.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="explorer-link-button"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '0.5rem',
                                border: '1px solid #f59e0b',
                                color: '#f59e0b',
                                padding: '0.75rem',
                                borderRadius: '9999px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f59e0b';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#f59e0b';
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                            {t('gamefiViewExplorer')}
                        </a>
                    </div>
                )}

                <button className="game-info-modal__play-btn" onClick={onPlay}>
                    <PlayIcon />
                    {t('gamefiPlayNow')}
                </button>
            </div>
        </div>
    );
}

export default GameInfoModal;
