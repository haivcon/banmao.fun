// ===== GAME OVERLAYS COMPONENT =====
// Menu, Pause, and Game Over screens

import React from 'react';
import { SnakeStrings } from '../lib/i18n';

export type GameStateType = 'MENU' | 'PLAY' | 'PAUSE' | 'OVER' | 'CLAIM';

interface MenuOverlayProps {
    t: SnakeStrings;
    isConnected: boolean;
    isMobile: boolean;
    hasMounted: boolean;
    onStart: () => void;
    onHelp: () => void;
    styles: {
        overlay: React.CSSProperties;
        menuCard: React.CSSProperties;
        menuTitle: React.CSSProperties;
        menuSub: React.CSSProperties;
        legend: React.CSSProperties;
        legendItem: React.CSSProperties;
        legendIcon: React.CSSProperties;
        warning: React.CSSProperties;
        primaryBtn: React.CSSProperties;
        secondaryBtn: React.CSSProperties;
        btnIcon: React.CSSProperties;
    };
}

export function MenuOverlay({
    t, isConnected, isMobile, hasMounted, onStart, onHelp, styles: S
}: MenuOverlayProps) {
    return (
        <div style={S.overlay}>
            <div style={S.menuCard}>
                <img
                    src="/games/snake/snake-icon-192x192.png"
                    alt="Snake Logo"
                    className="logo-float"
                    style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 20, marginBottom: 8, cursor: 'pointer' }}
                />
                <h1 style={S.menuTitle}>{t.title}</h1>
                <p style={S.menuSub}>{t.subtitle}</p>
                <div style={S.legend}>
                    <div style={S.legendItem} className="stat-card">
                        <span style={S.legendIcon}>🪙</span>
                        <span>{t.legendCoin}</span>
                    </div>
                    <div style={S.legendItem} className="stat-card">
                        <span style={S.legendIcon}>⚡</span>
                        <span>{t.legendXLayer}</span>
                    </div>
                    <div style={S.legendItem} className="stat-card">
                        <span style={S.legendIcon}>🔴</span>
                        <span>{t.legendObstacle}</span>
                    </div>
                </div>
                {!isConnected && <p style={S.warning}>⚠️ {t.connectToPlay}</p>}
                <button style={S.primaryBtn} className="hover-btn" onClick={onStart}>
                    <span style={S.btnIcon}>▶️</span> {t.startBtn}
                    {hasMounted && !isMobile && (
                        <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>{t.spaceHint}</span>
                    )}
                </button>
                <button
                    style={{ ...S.secondaryBtn, marginTop: 12, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}
                    className="hover-btn"
                    onClick={onHelp}
                >
                    <span style={S.btnIcon}>❓</span> {t.helpBtn || 'Game Guide'}
                </button>
            </div>
        </div>
    );
}

interface PauseOverlayProps {
    t: SnakeStrings;
    isMobile: boolean;
    hasMounted: boolean;
    onResume: () => void;
    onMenu: () => void;
    styles: {
        overlay: React.CSSProperties;
        pauseCard: React.CSSProperties;
        pauseIcon: React.CSSProperties;
        pauseTitle: React.CSSProperties;
        primaryBtn: React.CSSProperties;
        secondaryBtn: React.CSSProperties;
        btnIcon: React.CSSProperties;
    };
}

export function PauseOverlay({
    t, isMobile, hasMounted, onResume, onMenu, styles: S
}: PauseOverlayProps) {
    return (
        <div style={S.overlay}>
            <div style={S.pauseCard}>
                <div style={S.pauseIcon}>⏸️</div>
                <h2 style={S.pauseTitle}>{t.pauseTitle}</h2>
                <button style={S.primaryBtn} className="hover-btn" onClick={onResume}>
                    <span style={S.btnIcon}>▶️</span> {t.continueBtn}
                    {hasMounted && !isMobile && (
                        <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>{t.spaceHint}</span>
                    )}
                </button>
                <button style={S.secondaryBtn} className="hover-btn" onClick={onMenu}>
                    <span style={S.btnIcon}>🏠</span> {t.menuBtn}
                </button>
            </div>
        </div>
    );
}

export default { MenuOverlay, PauseOverlay };
