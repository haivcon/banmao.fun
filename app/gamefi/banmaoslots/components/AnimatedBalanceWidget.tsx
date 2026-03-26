'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { BANMAO_TOKEN_ADDRESS, ERC20_ABI, formatTokenAmount } from '../lib/abis';

interface AnimatedBalanceWidgetProps {
    primaryColor?: string;
}

export const AnimatedBalanceWidget: React.FC<AnimatedBalanceWidgetProps> = ({
    primaryColor = '#00BFFF'
}) => {
    const { address, isConnected } = useAccount();

    // OKB native balance
    const { data: okbBalance, refetch: refetchOkb } = useBalance({
        address: address,
    });

    // BANMAO token balance
    const { data: banmaoBalance, refetch: refetchBanmao } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Previous balances for animation
    const prevBanmaoRef = useRef<bigint>(BigInt(0));
    const prevOkbRef = useRef<bigint>(BigInt(0));

    // Animation states
    const [banmaoFlash, setBanmaoFlash] = useState<'up' | 'down' | null>(null);
    const [okbFlash, setOkbFlash] = useState<'up' | 'down' | null>(null);

    // Detect balance changes and trigger animations
    useEffect(() => {
        if (banmaoBalance !== undefined) {
            const current = banmaoBalance as bigint;
            const prev = prevBanmaoRef.current;

            if (prev > BigInt(0) && current !== prev) {
                setBanmaoFlash(current > prev ? 'up' : 'down');
                setTimeout(() => setBanmaoFlash(null), 1500);
            }
            prevBanmaoRef.current = current;
        }
    }, [banmaoBalance]);

    useEffect(() => {
        if (okbBalance?.value !== undefined) {
            const current = okbBalance.value;
            const prev = prevOkbRef.current;

            if (prev > BigInt(0) && current !== prev) {
                setOkbFlash(current > prev ? 'up' : 'down');
                setTimeout(() => setOkbFlash(null), 1500);
            }
            prevOkbRef.current = current;
        }
    }, [okbBalance?.value]);

    // Auto-refresh balances
    useEffect(() => {
        const interval = setInterval(() => {
            refetchBanmao();
            refetchOkb();
        }, 10000); // Every 10s
        return () => clearInterval(interval);
    }, [refetchBanmao, refetchOkb]);

    if (!isConnected) return null;

    const formatOkb = (value: bigint | undefined) => {
        if (!value) return '0.00';
        const num = Number(formatEther(value));
        return num < 0.01 ? num.toFixed(4) : num.toFixed(2);
    };

    const formatBanmao = (value: bigint | undefined) => {
        if (!value) return '0';
        return formatTokenAmount(value);
    };

    const getFlashStyle = (flash: 'up' | 'down' | null) => {
        if (!flash) return {};
        return {
            animation: `balance-${flash} 1.5s ease-out`,
        };
    };

    const getFlashColor = (flash: 'up' | 'down' | null) => {
        if (flash === 'up') return '#22c55e';
        if (flash === 'down') return '#ef4444';
        return 'rgba(255,255,255,0.9)';
    };

    return (
        <>
            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes balance-up {
                    0% { transform: scale(1); }
                    20% { transform: scale(1.15); color: #22c55e; text-shadow: 0 0 20px #22c55e; }
                    100% { transform: scale(1); }
                }
                @keyframes balance-down {
                    0% { transform: scale(1); }
                    20% { transform: scale(0.95); color: #ef4444; text-shadow: 0 0 20px #ef4444; }
                    40% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                @keyframes glow-pulse {
                    0%, 100% { 
                        filter: drop-shadow(0 0 3px ${primaryColor}); 
                        transform: translateY(0);
                    }
                    50% { 
                        filter: drop-shadow(0 0 10px ${primaryColor}); 
                        transform: translateY(-1px);
                    }
                }
                @keyframes pill-breathe {
                    0%, 100% { 
                        box-shadow: 0 0 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1);
                        transform: scale(1);
                    }
                    50% { 
                        box-shadow: 0 0 25px rgba(0, 191, 255, 0.5), inset 0 1px 0 rgba(255,255,255,0.15);
                        transform: scale(1.01);
                    }
                }
                @keyframes icon-bounce {
                    0%, 100% { transform: scale(1) rotate(0deg); }
                    25% { transform: scale(1.1) rotate(-5deg); }
                    75% { transform: scale(1.1) rotate(5deg); }
                }
                @keyframes border-shimmer {
                    0%, 100% { border-color: rgba(0, 191, 255, 0.4); }
                    50% { border-color: rgba(0, 191, 255, 0.7); }
                }
            `}</style>

            <div style={{
                display: 'flex',
                gap: 10,
            }}>
                {/* BANMAO Balance */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 42,
                        padding: '0 16px',
                        background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.4) 0%, rgba(0, 50, 80, 0.5) 100%)',
                        borderRadius: 9999,
                        border: '1px solid rgba(0, 191, 255, 0.4)',
                        color: '#00BFFF',
                        cursor: 'default',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                        animation: 'pill-breathe 3s ease-in-out infinite, border-shimmer 4s ease-in-out infinite',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 50, 100, 0.6) 0%, rgba(0, 80, 120, 0.7) 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 191, 255, 0.6), 0 0 60px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 220, 255, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 30, 60, 0.4) 0%, rgba(0, 50, 80, 0.5) 100%)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.4)';
                    }}
                >
                    <span style={{
                        fontSize: 14,
                        animation: 'icon-bounce 2s ease-in-out infinite',
                        filter: 'drop-shadow(0 0 5px #00BFFF)'
                    }}>🐱🍌</span>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}>
                        <span style={{
                            fontSize: 9,
                            color: '#00BFFF',
                            fontWeight: 700,
                            letterSpacing: 1,
                            opacity: 0.9,
                            textShadow: '0 0 8px rgba(0, 191, 255, 0.5)'
                        }}>
                            $banmao
                        </span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            color: getFlashColor(banmaoFlash),
                            transition: 'color 0.3s',
                            ...getFlashStyle(banmaoFlash),
                        }}>
                            {formatBanmao(banmaoBalance as bigint | undefined)}
                        </span>
                    </div>
                </div>

                {/* OKB Balance */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 42,
                        padding: '0 16px',
                        background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.4) 0%, rgba(0, 50, 80, 0.5) 100%)',
                        borderRadius: 9999,
                        border: '1px solid rgba(0, 191, 255, 0.4)',
                        color: '#00BFFF',
                        cursor: 'default',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                        animation: 'pill-breathe 3s ease-in-out infinite 0.5s, border-shimmer 4s ease-in-out infinite 1s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 50, 100, 0.6) 0%, rgba(0, 80, 120, 0.7) 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 191, 255, 0.6), 0 0 60px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 220, 255, 0.9)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 30, 60, 0.4) 0%, rgba(0, 50, 80, 0.5) 100%)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.4)';
                    }}
                >
                    <span style={{
                        fontSize: 14,
                        filter: 'drop-shadow(0 0 5px #00BFFF)',
                        animation: 'icon-bounce 2s ease-in-out infinite 0.3s',
                    }}>💎</span>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}>
                        <span style={{
                            fontSize: 9,
                            color: '#00BFFF',
                            fontWeight: 700,
                            letterSpacing: 1,
                            opacity: 0.9,
                            textShadow: '0 0 8px rgba(0, 191, 255, 0.5)'
                        }}>
                            OKB
                        </span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            color: getFlashColor(okbFlash),
                            transition: 'color 0.3s',
                            ...getFlashStyle(okbFlash),
                        }}>
                            {formatOkb(okbBalance?.value)}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};
