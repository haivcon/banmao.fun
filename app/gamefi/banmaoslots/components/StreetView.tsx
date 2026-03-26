'use client';

import React, { useState, useMemo } from 'react';
import { SlotMachineCabinet, getPoolTier, PoolTier } from './SlotMachineCabinet';
import { LogoHeader } from './LogoHeader';

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

import { SlotsTranslations } from '../lib/i18n';

interface StreetViewProps {
    pools: PoolData[];
    selectedPoolId: bigint | null;
    onSelectPool: (poolId: bigint) => void;
    onOpenRegisterModal: () => void;
    backgroundImage?: string;
    t: SlotsTranslations;
}

// Sort pools by tier priority and then by balance
const TIER_PRIORITY: Record<PoolTier, number> = {
    cyberpunk: -1,
    diamond: 0,
    platinum: 1,
    gold: 2,
    silver: 3,
    bronze: 4,
};

export function StreetView({
    pools,
    selectedPoolId,
    onSelectPool,
    onOpenRegisterModal,
    backgroundImage,
    t,
}: StreetViewProps) {
    const [hoveredPool, setHoveredPool] = useState<bigint | null>(null);

    // Sort pools by tier and balance
    const sortedPools = useMemo(() => {
        return [...pools]
            .map((pool) => ({
                ...pool,
                tier: pool.tier || getPoolTier(pool.balance),
            }))
            .sort((a, b) => {
                // First by tier
                const tierDiff = TIER_PRIORITY[a.tier!] - TIER_PRIORITY[b.tier!];
                if (tierDiff !== 0) return tierDiff;
                // Then by balance (descending)
                return Number(b.balance - a.balance);
            });
    }, [pools]);

    // Split pools into left and right sides
    const leftPools = sortedPools.filter((_, i) => i % 2 === 0);
    const rightPools = sortedPools.filter((_, i) => i % 2 === 1);

    return (
        <div
            className="street-view"
            style={{
                position: 'relative',
                width: '100%',
                minHeight: '100vh',
                overflow: 'hidden',
                background: backgroundImage
                    ? `url(${backgroundImage}) center/cover no-repeat`
                    : `
                        radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
                        linear-gradient(180deg, #0a0a1a 0%, #1a0a2a 50%, #0a0a1a 100%)
                    `,
            }}
        >
            {/* Street Atmosphere */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Street Title */}
            <LogoHeader />

            {/* Street Layout Container */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: 60,
                    paddingTop: 100,
                    paddingBottom: 40,
                    minHeight: '100vh',
                }}
            >
                {/* Left Side Machines */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                        alignItems: 'flex-end',
                    }}
                >
                    {leftPools.map((pool, index) => (
                        <div
                            key={pool.poolId.toString()}
                            onMouseEnter={() => setHoveredPool(pool.poolId)}
                            onMouseLeave={() => setHoveredPool(null)}
                            style={{
                                transform: hoveredPool === pool.poolId ? 'scale(1.05)' : 'none',
                                transition: 'transform 0.2s ease',
                            }}
                        >
                            <SlotMachineCabinet
                                pool={pool}
                                isSelected={selectedPoolId === pool.poolId}
                                onClick={() => onSelectPool(pool.poolId)}
                                position="left"
                                index={index}
                            />
                        </div>
                    ))}
                </div>

                {/* Center Street */}
                <div
                    style={{
                        width: 80,
                        minHeight: 400,
                        background: `
                            linear-gradient(180deg,
                                rgba(50, 50, 70, 0.9) 0%,
                                rgba(40, 40, 60, 0.95) 50%,
                                rgba(30, 30, 50, 0.9) 100%
                            )
                        `,
                        borderLeft: '3px solid rgba(255, 215, 0, 0.6)',
                        borderRight: '3px solid rgba(255, 215, 0, 0.6)',
                        position: 'relative',
                        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
                    }}
                >
                    {/* Street markings */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: 4,
                            transform: 'translateX(-50%)',
                            background: 'repeating-linear-gradient(180deg, #ffd700 0, #ffd700 30px, transparent 30px, transparent 50px)',
                            opacity: 0.8,
                        }}
                    />
                </div>

                {/* Right Side Machines */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                        alignItems: 'flex-start',
                    }}
                >
                    {rightPools.map((pool, index) => (
                        <div
                            key={pool.poolId.toString()}
                            onMouseEnter={() => setHoveredPool(pool.poolId)}
                            onMouseLeave={() => setHoveredPool(null)}
                            style={{
                                transform: hoveredPool === pool.poolId ? 'scale(1.05)' : 'none',
                                transition: 'transform 0.2s ease',
                            }}
                        >
                            <SlotMachineCabinet
                                pool={pool}
                                isSelected={selectedPoolId === pool.poolId}
                                onClick={() => onSelectPool(pool.poolId)}
                                position="right"
                                index={index}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Register as House Owner Button */}
            <button
                onClick={onOpenRegisterModal}
                style={{
                    position: 'fixed',
                    bottom: 80,
                    right: 30,
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
                    border: '2px solid rgba(34, 197, 94, 0.8)',
                    borderRadius: 16,
                    color: '#fff',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(34, 197, 94, 0.5), 0 10px 30px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    zIndex: 100,
                    transition: 'all 0.3s ease',
                }}
            >
                <span style={{ fontSize: 18 }}>🏠</span>
                <span>{t.becomeOwnerButton || 'BECOME A HOUSE OWNER'}</span>
            </button>

            {/* Empty State */}
            {pools.length === 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'rgba(200, 180, 255, 0.6)',
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎰</div>
                    <div style={{ fontSize: 16 }}>{t.noPoolsAvailable || 'No pools available'}</div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>{t.beFirstOwner || 'Be the first to become a house owner!'}</div>
                </div>
            )}
        </div>
    );
}

export default StreetView;
