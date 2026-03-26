// PoolSelector.tsx - Dropdown/modal for players to select which pool to play on
"use client";

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { SLOTS_ABI, SLOTS_CONTRACT_ADDRESS, formatTokenAmount } from '../lib/abis';
import { Pool } from '../hooks/useHouseDashboard';

interface PoolSelectorProps {
    selectedPoolId: bigint;
    onSelectPool: (poolId: bigint) => void;
    t?: any;
}

export function PoolSelector({ selectedPoolId, onSelectPool, t }: PoolSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Read active pools
    const { data: poolsData, refetch } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'getActivePoolsPaginated',
        args: [BigInt(0), BigInt(20)], // Get first 20 pools
    });

    // Read platform pool ID
    const { data: platformPoolId } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'platformPoolId',
    });

    // Read selected pool details (using public pools mapping)
    const { data: selectedPool } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'pools',
        args: [selectedPoolId],
    });

    const pools = (poolsData as [Pool[], bigint] | undefined)?.[0] || [];
    // pools mapping returns a tuple, convert via unknown to Pool-like object
    const currentPoolData = selectedPool as unknown as readonly [bigint, `0x${string}`, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, bigint] | undefined;
    const currentPool: Pool | undefined = currentPoolData ? {
        id: currentPoolData[0],
        owner: currentPoolData[1],
        name: currentPoolData[2],
        balance: currentPoolData[3],
        minBet: currentPoolData[4],
        maxBet: currentPoolData[5],
        jackpotPercent: currentPoolData[6],
        jackpotPool: currentPoolData[7],
        totalSpins: currentPoolData[8],
        totalBetsVolume: currentPoolData[9],
        totalPayoutsVolume: currentPoolData[10],
        totalPendingBets: currentPoolData[11],
        isActive: currentPoolData[12],
        createdAt: currentPoolData[13],
    } : undefined;

    // Refetch on open
    useEffect(() => {
        if (isOpen) refetch();
    }, [isOpen, refetch]);

    return (
        <div style={{ position: 'relative' }}>
            {/* Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: 8,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                }}
            >
                <span style={{ fontSize: 16 }}>🏠</span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentPool?.name || `Pool #${selectedPoolId.toString()}`}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {platformPoolId && selectedPoolId === platformPoolId ? `(${t.officialLabel})` : ''}
                </span>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 99
                        }}
                    />

                    {/* Dropdown Content */}
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        zIndex: 100,
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                        border: '2px solid rgba(168, 85, 247, 0.4)',
                        borderRadius: 12,
                        minWidth: 300,
                        maxHeight: 400,
                        overflowY: 'auto',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <h4 style={{ margin: 0, color: '#a855f7', fontSize: 14 }}>
                                🎰 {t.selectPool}
                            </h4>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11 }}>
                                {pools.length} {t.activePools}
                            </p>
                        </div>

                        {/* Pool List */}
                        <div style={{ padding: 8 }}>
                            {pools.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                                    {t.noPoolsAvailable}
                                </div>
                            ) : (
                                pools.map(pool => {
                                    const isSelected = pool.id === selectedPoolId;
                                    const isPlatform = platformPoolId && pool.id === platformPoolId;
                                    return (
                                        <button
                                            key={pool.id.toString()}
                                            onClick={() => {
                                                onSelectPool(pool.id);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '10px 12px',
                                                background: isSelected
                                                    ? 'rgba(168, 85, 247, 0.2)'
                                                    : 'transparent',
                                                border: isSelected
                                                    ? '1px solid rgba(168, 85, 247, 0.4)'
                                                    : '1px solid transparent',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                marginBottom: 4,
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {/* Pool Icon */}
                                            <span style={{
                                                fontSize: 24,
                                                filter: isPlatform ? 'drop-shadow(0 0 6px gold)' : undefined
                                            }}>
                                                {isPlatform ? '👑' : '🏠'}
                                            </span>

                                            {/* Pool Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}>
                                                    <span style={{
                                                        color: isSelected ? '#a855f7' : 'white',
                                                        fontWeight: 600,
                                                        fontSize: 13,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {pool.name}
                                                    </span>
                                                    {isPlatform && (
                                                        <span style={{
                                                            fontSize: 9,
                                                            padding: '2px 6px',
                                                            background: 'rgba(250, 204, 21, 0.2)',
                                                            border: '1px solid rgba(250, 204, 21, 0.4)',
                                                            borderRadius: 4,
                                                            color: '#facc15'
                                                        }}>
                                                            {t.officialLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 12,
                                                    fontSize: 10,
                                                    color: '#64748b',
                                                    marginTop: 2
                                                }}>
                                                    <span>💰 {formatTokenAmount(pool.minBet)}-{formatTokenAmount(pool.maxBet)}</span>
                                                    <span>🎲 {pool.totalSpins.toString()} {t.spins}</span>
                                                </div>
                                            </div>

                                            {/* Selection indicator */}
                                            {isSelected && (
                                                <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <a
                                href="/gamefi/banmaoslots/house"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    padding: '10px 16px',
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: 'white',
                                    textDecoration: 'none',
                                    fontSize: 13,
                                    fontWeight: 600
                                }}
                            >
                                🏗️ {t.createYourPool}
                            </a>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
