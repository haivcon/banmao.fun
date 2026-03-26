'use client';

import React from 'react';

export type PoolTier = 'cyberpunk' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';

interface PoolData {
    poolId: bigint;
    name: string;
    owner: string;
    balance: bigint;
    minBet: bigint;
    maxBet: bigint;
    jackpot: bigint;
    isActive: boolean;
    tier?: PoolTier;
}

interface SlotMachineCabinetProps {
    pool: PoolData;
    isSelected: boolean;
    onClick: () => void;
    position: 'left' | 'right';
    index: number;
}

// Helper to format large numbers
const formatBalance = (balance: bigint): string => {
    const num = Number(balance) / 1e18;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
};

// Get tier color scheme
const getTierColors = (tier: PoolTier) => {
    switch (tier) {
        case 'cyberpunk':
            return {
                primary: '#ff00ff',
                secondary: '#00ffff',
                glow: 'rgba(255, 0, 255, 0.6)',
                gradient: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ff00ff 100%)',
            };
        case 'diamond':
            return {
                primary: '#00f5ff',
                secondary: '#8b5cf6',
                glow: 'rgba(0, 245, 255, 0.5)',
                gradient: 'linear-gradient(135deg, #00f5ff 0%, #8b5cf6 100%)',
            };
        case 'platinum':
            return {
                primary: '#e5e4e2',
                secondary: '#a3a3a3',
                glow: 'rgba(229, 228, 226, 0.4)',
                gradient: 'linear-gradient(135deg, #e5e4e2 0%, #a3a3a3 100%)',
            };
        case 'gold':
            return {
                primary: '#ffd700',
                secondary: '#f59e0b',
                glow: 'rgba(255, 215, 0, 0.5)',
                gradient: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)',
            };
        case 'silver':
            return {
                primary: '#c0c0c0',
                secondary: '#71717a',
                glow: 'rgba(192, 192, 192, 0.4)',
                gradient: 'linear-gradient(135deg, #c0c0c0 0%, #71717a 100%)',
            };
        default: // bronze
            return {
                primary: '#d97706',
                secondary: '#92400e',
                glow: 'rgba(217, 119, 6, 0.4)',
                gradient: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
            };
    }
};

// Calculate tier from balance - NEW THRESHOLDS
export const getPoolTier = (balance: bigint): PoolTier => {
    const bal = Number(balance) / 1e18;
    if (bal >= 50000000) return 'cyberpunk';  // ≥ 50M
    if (bal >= 10000000) return 'diamond';     // ≥ 10M
    if (bal >= 1000000) return 'platinum';     // ≥ 1M
    if (bal >= 100000) return 'gold';          // ≥ 100K
    if (bal >= 10000) return 'silver';         // ≥ 10K
    return 'bronze';                            // < 10K
};

export function SlotMachineCabinet({
    pool,
    isSelected,
    onClick,
    position,
    index,
}: SlotMachineCabinetProps) {
    const tier = pool.tier || getPoolTier(pool.balance);
    const colors = getTierColors(tier);
    const scale = Math.max(0.7, 1 - index * 0.08); // Perspective scaling
    const opacity = Math.max(0.5, 1 - index * 0.1);

    return (
        <div
            className={`slot-cabinet ${isSelected ? 'slot-cabinet--selected' : ''}`}
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transform: `scale(${scale}) ${position === 'left' ? 'perspective(800px) rotateY(15deg)' : 'perspective(800px) rotateY(-15deg)'}`,
                opacity,
                transition: 'all 0.3s ease',
                filter: isSelected ? `drop-shadow(0 0 20px ${colors.glow})` : 'none',
            }}
        >
            {/* Machine Cabinet */}
            <div
                style={{
                    width: 140,
                    background: `linear-gradient(180deg, rgba(30, 15, 55, 0.95) 0%, rgba(15, 8, 30, 0.98) 100%)`,
                    border: `2px solid ${isSelected ? colors.primary : 'rgba(139, 92, 246, 0.4)'}`,
                    borderRadius: 12,
                    padding: 10,
                    boxShadow: isSelected
                        ? `0 0 30px ${colors.glow}, inset 0 0 20px rgba(0,0,0,0.5)`
                        : '0 10px 30px rgba(0,0,0,0.5)',
                }}
            >
                {/* Tier Badge - Premium Gradient Design */}
                <div
                    style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 14px',
                        background: colors.gradient,
                        border: `2px solid rgba(255, 255, 255, 0.3)`,
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 900,
                        color: tier === 'platinum' || tier === 'silver' ? '#1a1a1a' : '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        boxShadow: `0 4px 15px ${colors.glow}, 0 2px 4px rgba(0,0,0,0.5)`,
                        textShadow: tier === 'platinum' || tier === 'silver'
                            ? 'none'
                            : '0 1px 2px rgba(0,0,0,0.8)',
                        whiteSpace: 'nowrap',
                        fontFamily: "'Arial Black', 'Helvetica Bold', sans-serif",
                    }}
                >
                    <span style={{ fontSize: 14 }}>{tier === 'cyberpunk' ? '🌆' : tier === 'diamond' ? '💎' : tier === 'platinum' ? '⚪' : tier === 'gold' ? '🏆' : tier === 'silver' ? '🥈' : '🥉'}</span>
                    <span>{tier}</span>
                </div>

                {/* Machine Display */}
                <div
                    style={{
                        background: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: 8,
                        padding: 8,
                        marginBottom: 8,
                        textAlign: 'center',
                    }}
                >
                    {/* Pool Name */}
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: colors.primary,
                            fontFamily: "'Space Mono', monospace",
                            textTransform: 'uppercase',
                            marginBottom: 4,
                            textShadow: `0 0 10px ${colors.glow}`,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {pool.name || `Pool #${pool.poolId}`}
                    </div>

                    {/* Slot Symbols Preview */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 2,
                            fontSize: 20,
                            marginBottom: 6,
                        }}
                    >
                        <span>🐱</span>
                        <span>🍌</span>
                        <span>💎</span>
                    </div>

                    {/* Balance */}
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#facc15',
                            fontFamily: "'Space Mono', monospace",
                            textShadow: '0 0 10px rgba(250, 204, 21, 0.5)',
                        }}
                    >
                        {formatBalance(pool.balance)}
                    </div>
                    <div style={{ fontSize: 8, color: 'rgba(200, 180, 255, 0.6)' }}>
                        $BANMAO
                    </div>
                </div>

                {/* Status Indicator */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        fontSize: 9,
                        color: pool.isActive ? '#22c55e' : '#ef4444',
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: pool.isActive ? '#22c55e' : '#ef4444',
                            boxShadow: pool.isActive
                                ? '0 0 8px rgba(34, 197, 94, 0.8)'
                                : '0 0 8px rgba(239, 68, 68, 0.8)',
                        }}
                    />
                    {pool.isActive ? 'ONLINE' : 'OFFLINE'}
                </div>

                {/* Bet Range */}
                <div
                    style={{
                        marginTop: 6,
                        fontSize: 8,
                        color: 'rgba(200, 180, 255, 0.7)',
                        textAlign: 'center',
                    }}
                >
                    Min: {formatBalance(pool.minBet)} | Max: {formatBalance(pool.maxBet)}
                </div>
            </div>

            {/* Machine Stand */}
            <div
                style={{
                    width: 100,
                    height: 20,
                    background: 'linear-gradient(180deg, #2a2a4a 0%, #1a1a2e 100%)',
                    borderRadius: '0 0 10px 10px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                }}
            />
        </div>
    );
}

export default SlotMachineCabinet;
