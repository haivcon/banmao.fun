'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatEther } from 'viem';

import { BANMAO_TOKEN_ADDRESS, ERC20_ABI, XLAYER_CHAIN_ID } from '../contracts';

// Cyan energy color theme
const ENERGY_CYAN = '#00f5ff';
const ENERGY_CYAN_GLOW = 'rgba(0, 245, 255, 0.5)';

interface WalletBalanceWidgetProps {
    primaryColor?: string;
}

// Format token amount for display - rounded for readability
const formatTokenAmount = (value: bigint): string => {
    const num = Number(value) / 1e18;
    if (num === 0) return '0';
    // Large numbers: 0-2 decimals, small numbers: up to 4 decimals
    if (num >= 1_000_000) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (num >= 1000) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    if (num >= 1) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    // Small amounts: show up to 4 decimals
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export const WalletBalanceWidget: React.FC<WalletBalanceWidgetProps> = ({
    primaryColor = ENERGY_CYAN
}) => {
    const { address, isConnected } = useAccount();

    // OKB native balance
    const { data: okbBalance, refetch: refetchOkb, isLoading: isOkbLoading, error: okbError } = useBalance({
        address: address,
        chainId: XLAYER_CHAIN_ID,
    });

    // BANMAO token balance
    const { data: banmaoBalance, refetch: refetchBanmao, isLoading: isBanmaoLoading, error: banmaoError } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    // Debugging logs
    useEffect(() => {
        if (banmaoError) console.error('BANMAO fetch error:', banmaoError);
        if (okbError) console.error('OKB fetch error:', okbError);
    }, [banmaoError, okbError]);

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

    // Format OKB - rounded to 4 decimals for readability
    const formatOkb = (value: bigint | undefined, loading: boolean) => {
        if (loading || value === undefined) return '--';
        const num = Number(formatEther(value));
        if (num === 0) return '0';
        if (num >= 1000) {
            return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        if (num >= 1) {
            return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
        }
        // Very small amounts: show more decimals
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    const formatBanmao = (value: bigint | undefined, loading: boolean) => {
        if (loading || value === undefined) return '--';
        return formatTokenAmount(value);
    };

    const getFlashStyle = (flash: 'up' | 'down' | null) => {
        if (!flash) return {};
        return {
            animation: `wallet-balance-${flash} 1.5s ease-out`,
        };
    };

    const getFlashColor = (flash: 'up' | 'down' | null) => {
        if (flash === 'up') return '#22c55e';
        if (flash === 'down') return '#ef4444';
        return 'rgba(255,255,255,0.95)';
    };

    return (
        <>
            {/* CSS Animations - Cyan Energy Theme */}
            <style jsx global>{`
                @keyframes wallet-balance-up {
                    0% { transform: scale(1); }
                    20% { transform: scale(1.15); color: #22c55e; text-shadow: 0 0 20px #22c55e; }
                    100% { transform: scale(1); }
                }
                @keyframes wallet-balance-down {
                    0% { transform: scale(1); }
                    20% { transform: scale(0.95); color: #ef4444; text-shadow: 0 0 20px #ef4444; }
                    40% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                @keyframes gamefi-pill-breathe {
                    0%, 100% { 
                        box-shadow: 0 0 12px rgba(0, 245, 255, 0.4), 0 0 25px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1);
                        transform: scale(1);
                    }
                    50% { 
                        box-shadow: 0 0 20px rgba(0, 245, 255, 0.6), 0 0 40px rgba(0, 245, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.15);
                        transform: scale(1.02);
                    }
                }
                @keyframes gamefi-icon-bounce {
                    0%, 100% { transform: scale(1) rotate(0deg); }
                    25% { transform: scale(1.1) rotate(-5deg); }
                    75% { transform: scale(1.1) rotate(5deg); }
                }
                @keyframes gamefi-border-shimmer {
                    0%, 100% { border-color: rgba(0, 245, 255, 0.5); }
                    50% { border-color: rgba(0, 245, 255, 0.9); }
                }
            `}</style>

            <div style={{
                display: 'flex',
                gap: 8,
            }}>
                {/* BANMAO Balance */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 38,
                        padding: '0 14px',
                        background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 40, 60, 0.9) 100%)',
                        borderRadius: 9999,
                        border: '1.5px solid rgba(0, 245, 255, 0.5)',
                        color: primaryColor,
                        cursor: 'default',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 12px rgba(0, 245, 255, 0.4), 0 0 25px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                        animation: 'gamefi-pill-breathe 3s ease-in-out infinite, gamefi-border-shimmer 2.5s ease-in-out infinite',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 40, 80, 0.9) 0%, rgba(0, 60, 100, 1) 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 245, 255, 0.7), 0 0 50px rgba(0, 245, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 40, 60, 0.9) 100%)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.4), 0 0 25px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(0, 245, 255, 0.5)';
                    }}
                >
                    <span style={{
                        fontSize: 14,
                        animation: 'gamefi-icon-bounce 2s ease-in-out infinite',
                        filter: `drop-shadow(0 0 6px ${ENERGY_CYAN})`
                    }}>🐱🍌</span>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}>
                        <span style={{
                            fontSize: 9,
                            color: ENERGY_CYAN,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            opacity: 0.95,
                            textShadow: `0 0 10px ${ENERGY_CYAN_GLOW}`
                        }}>
                            $banmao
                        </span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            color: getFlashColor(banmaoFlash),
                            transition: 'color 0.3s',
                            textShadow: '0 0 8px rgba(255,255,255,0.3)',
                            ...getFlashStyle(banmaoFlash),
                        }}>
                            {formatBanmao(banmaoBalance as bigint | undefined, isBanmaoLoading)}
                        </span>
                    </div>
                </div>

                {/* OKB Balance */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 38,
                        padding: '0 14px',
                        background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 40, 60, 0.9) 100%)',
                        borderRadius: 9999,
                        border: '1.5px solid rgba(0, 245, 255, 0.5)',
                        color: primaryColor,
                        cursor: 'default',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 12px rgba(0, 245, 255, 0.4), 0 0 25px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                        animation: 'gamefi-pill-breathe 3s ease-in-out infinite 0.5s, gamefi-border-shimmer 2.5s ease-in-out infinite 0.5s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 40, 80, 0.9) 0%, rgba(0, 60, 100, 1) 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 245, 255, 0.7), 0 0 50px rgba(0, 245, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 40, 60, 0.9) 100%)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.4), 0 0 25px rgba(0, 245, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(0, 245, 255, 0.5)';
                    }}
                >
                    <span style={{
                        fontSize: 14,
                        filter: `drop-shadow(0 0 6px ${ENERGY_CYAN})`,
                        animation: 'gamefi-icon-bounce 2s ease-in-out infinite 0.3s',
                    }}>💎</span>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}>
                        <span style={{
                            fontSize: 9,
                            color: ENERGY_CYAN,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            opacity: 0.95,
                            textShadow: `0 0 10px ${ENERGY_CYAN_GLOW}`
                        }}>
                            OKB
                        </span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            color: getFlashColor(okbFlash),
                            transition: 'color 0.3s',
                            textShadow: '0 0 8px rgba(255,255,255,0.3)',
                            ...getFlashStyle(okbFlash),
                        }}>
                            {formatOkb(okbBalance?.value, isOkbLoading)}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WalletBalanceWidget;

