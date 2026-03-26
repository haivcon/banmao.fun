// ===== GAME HUD COMPONENT =====
// Heads-Up Display with score, best, gas meter, timer, and pause button

import React from 'react';
import { S } from '../lib/styles';
import { SnakeStrings } from '../lib/i18n';

interface GameHUDProps {
    score: number;
    best: number;
    gasPercent: number;
    superMode: boolean;
    isPlaying: boolean;
    isMobile: boolean;
    onPause: () => void;
    t: SnakeStrings;
    playTime?: number; // Play time in seconds
}

/**
 * Format seconds to MM:SS string
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Game HUD component displaying score, best score, gas meter, timer, and pause button
 */
export function GameHUD({
    score, best, gasPercent, superMode, isPlaying, isMobile, onPause, t, playTime
}: GameHUDProps) {
    // Calculate gas bar color
    const gasColor = gasPercent < 25
        ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
        : superMode
            ? 'linear-gradient(90deg, #22d3ee, #a5f3fc)'
            : 'linear-gradient(90deg, #22c55e, #86efac)';

    return (
        <div style={S.hud} className="gap-fluid-sm">
            <div style={S.hudStats}>
                <div style={S.statItem}>
                    <span style={S.statLabel} className="text-fluid-xs">🏆 {t.score}</span>
                    <span style={S.statValue} className="text-fluid-xl">{score}</span>
                </div>
                <div style={S.divider} />
                <div style={S.statItem}>
                    <span style={S.statLabel} className="text-fluid-xs">👑 {t.best}</span>
                    <span style={{ ...S.statValue, color: '#94a3b8' }} className="text-fluid-lg">{best}</span>
                </div>
                {/* Play Timer - Only show when playing */}
                {isPlaying && playTime !== undefined && (
                    <>
                        <div style={S.divider} />
                        <div style={S.statItem}>
                            <span style={S.statLabel} className="text-fluid-xs">⏱️ {t.time || 'Time'}</span>
                            <span style={{ ...S.statValue, color: '#22d3ee', fontFamily: 'monospace' }} className="text-fluid-lg">
                                {formatTime(playTime)}
                            </span>
                        </div>
                    </>
                )}
            </div>
            <div style={S.gasWrap}>
                <span style={S.gasLabel} className="text-fluid-xs">⛽ {t.gas}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ ...S.gasTrack, flex: 1 }}>
                        <div style={{ ...S.gasFill, width: `${gasPercent}%`, background: gasColor }} />
                    </div>
                    <span style={{
                        color: gasPercent < 25 ? '#f87171' : superMode ? '#22d3ee' : '#4ade80',
                        fontWeight: 700,
                        fontSize: 14,
                        fontFamily: 'monospace',
                        minWidth: 42,
                        textAlign: 'right'
                    }} className="text-fluid-sm">
                        {Math.round(gasPercent)}%
                    </span>
                </div>
            </div>
            {isPlaying && (
                <button
                    style={S.pauseBtn}
                    className={`hover-btn ${isMobile ? 'touch-target' : ''}`}
                    onClick={onPause}
                >
                    ⏸️
                </button>
            )}
        </div>
    );
}

export default GameHUD;
