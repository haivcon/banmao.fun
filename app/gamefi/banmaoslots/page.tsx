'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWatchContractEvent, useBalance } from 'wagmi';
import { decodeEventLog, formatEther } from 'viem';
import { useConnectModal, ConnectButton } from '@rainbow-me/rainbowkit';
import { Toaster } from 'react-hot-toast';
import { slotsToast } from './lib/toastUtils';
import './globals.css';

import {
    SLOTS_ABI,
    ERC20_ABI,
    SLOTS_CONTRACT_ADDRESS,
    BANMAO_TOKEN_ADDRESS,
    SLOT_SYMBOLS,
    GAME_CONFIG,
    formatTokenAmount,
    parseTokenAmount,
} from './lib/abis';
import { slotsTranslations, SlotsLanguage, getSlotsBrowserLanguage, SlotsTranslations } from './lib/i18n';
import { houseTranslations } from './lib/houseI18n';
import { useSlotsGame } from './hooks/useSlotsGame';
import { slotsSounds } from './lib/sounds';
import { playWinConfetti, playJackpotCelebration, playCoinShower, playScreenShake, playBigWinBurst } from './lib/confetti';
import { LeaderboardSortBy } from './lib/tiers';

import { DraggablePanel, PanelTaskbar } from './components/DraggablePanel';
import { MacOSDock } from './components/MacOSDock';
import { getPoolTier, PoolTier } from './components/SlotMachineCabinet';
import { LogoHeader } from './components/LogoHeader';
import { TopWinnersPanel, SlotWinner, PoolStats } from './components/TopWinnersPanel';
import { JackpotDonorsPanel, JackpotDonor, getDonorBadge } from './components/JackpotDonorsPanel';
import { SlotsProfileCard } from './components/SlotsProfileCard';
import OnboardingTour, { shouldShowOnboarding } from './components/OnboardingTour';
import VerifyModal from './components/VerifyModal';
import { SlotMachineWindow } from './components/SlotMachineWindow';
import { SlotsPlayerProfile, getSlotsProfile, createDefaultSlotsProfile, updateSlotsStats } from './lib/slotsProfiles';
import { CreatePoolModal } from './components/CreatePoolModal';
import { HouseDashboardPanel } from './components/HouseDashboardPanel';
// NOTE: useHouseDashboard is used only in HouseDashboardPanel, NOT here (to prevent dual hook instances)
import { ProfileEditModal } from './components/ProfileEditModal';
import { ViewPlayerPanel } from './components/ViewPlayerPanel';
import { useSlotsProfile } from './hooks/useSlotsProfile';
import { AnimatedBalanceWidget } from './components/AnimatedBalanceWidget';
import RainEffect from './components/RainEffect';
import { PayoutCalculator } from './components/PayoutCalculator';
import { groupHistoryByTx, GroupedSpinHistory } from './lib/historyUtils';
import MultiSpinResultsModal from './components/MultiSpinResultsModal';
import GameDisabled from '../components/GameDisabled';
import { useSlotsWebSocket, WebSocketSpinEvent } from './hooks/useSlotsWebSocket';
import { VerifyResult, SpinHistoryItem, Pool as PoolType, LeaderboardApiEntry, JackpotDonorApiEntry } from './lib/types';
import SplashScreen from './components/SplashScreen';
import PWAInstallBanner from './components/PWAInstallBanner';
import { recordGameVisit } from '../../../lib/gameVisitTracker';

type SymbolIndex = 0 | 1 | 2 | 3 | 4 | 5;
type PanelId = 'profile' | 'leaderboard' | 'history' | 'myHistory' | 'donors' | 'payout' | 'verify' | 'house' | 'viewPlayer' | 'multiSpin' | 'createPool';

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
    // Stats for leaderboard
    totalSpins: number;
    totalBetsVolume: bigint;
    totalPayoutsVolume: bigint;
}

// Tier colors
const TIER_COLORS: Record<PoolTier, { primary: string; glow: string }> = {
    cyberpunk: { primary: '#ff0080', glow: 'rgba(255, 0, 128, 0.5)' },
    diamond: { primary: '#00f5ff', glow: 'rgba(0, 245, 255, 0.5)' },
    platinum: { primary: '#e5e4e2', glow: 'rgba(229, 228, 226, 0.4)' },
    gold: { primary: '#ffd700', glow: 'rgba(255, 215, 0, 0.5)' },
    silver: { primary: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.4)' },
    bronze: { primary: '#cd7f32', glow: 'rgba(205, 127, 50, 0.4)' },
};

// 🎰 Realistic CSS Slot Machine with 5 Reels
function SlotMachine({ pool, onClick, isSelected }: {
    pool: PoolData;
    onClick: () => void;
    isSelected: boolean;
}) {
    const tier = pool.tier || getPoolTier(pool.balance);
    const balanceFormatted = (Number(pool.balance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const balanceNum = Number(pool.balance) / 1e18;

    // Calculate glow intensity based on balance (0.3 to 1.0)
    const glowIntensity = Math.min(1, Math.max(0.3, balanceNum / 500000));
    const breathSpeed = Math.max(2, 5 - (balanceNum / 200000)); // Richer = faster breathing

    // Random symbol state for spinning effect
    const [displaySymbols, setDisplaySymbols] = React.useState([0, 1, 2, 3, 4]);
    const [isSpinning, setIsSpinning] = React.useState(false);
    const [reelStates, setReelStates] = React.useState([false, false, false, false, false]); // Which reels are still spinning
    const [winData, setWinData] = React.useState<{ matchIndices: number[]; multiplier: number; showMultiplier: boolean; isJackpot?: boolean; winningSymbol?: number } | null>(null);

    // Calculate matches and multiplier based on actual payout table
    // Symbol indices: 0=🐱Banmao, 1=🍌Banana, 2=💎Diamond, 3=⭐Star, 4=☘️Clover, 5=7️⃣Seven
    const calculateWin = (symbols: number[]) => {
        const counts: Record<number, number[]> = {};
        symbols.forEach((sym, idx) => {
            if (!counts[sym]) counts[sym] = [];
            counts[sym].push(idx);
        });

        // Payout table based on symbol and match count (V2 values for ~95% RTP)
        // [3-match, 4-match, 5-match, isJackpotSymbol]
        const payoutTable: Record<number, [number, number, number, boolean]> = {
            0: [9, 45, 175, true],     // 🐱 Banmao (Jackpot) - V2
            1: [7, 35, 125, false],    // 🍌 Banana - V2
            2: [4.5, 17, 70, false],   // 💎 Diamond - V2
            3: [2.5, 13, 45, false],   // ⭐ Star - V2
            4: [1.8, 7, 22, false],    // ☘️ Clover - V2
            5: [1.3, 4.5, 13, false],  // 7️⃣ Seven - V2
        };

        let bestMatch: number[] = [];
        let multiplier = 0;
        let winningSymbol = -1;
        let isJackpot = false;

        for (const [symStr, indices] of Object.entries(counts)) {
            const sym = parseInt(symStr);
            if (indices.length >= 3) {
                const payouts = payoutTable[sym] || [1, 2, 5, false];
                let currentMultiplier = 0;

                if (indices.length === 3) currentMultiplier = payouts[0];
                else if (indices.length === 4) currentMultiplier = payouts[1];
                else if (indices.length === 5) {
                    currentMultiplier = payouts[2];
                    isJackpot = payouts[3]; // Jackpot bonus for 5x Banmao
                }

                // Choose best win (highest multiplier)
                if (currentMultiplier > multiplier) {
                    bestMatch = indices;
                    multiplier = currentMultiplier;
                    winningSymbol = sym;
                }
            }
        }

        return bestMatch.length >= 3
            ? { matchIndices: bestMatch, multiplier, showMultiplier: true, isJackpot, winningSymbol }
            : null;
    };

    // Cascading spin animation
    React.useEffect(() => {
        const SYMBOLS_COUNT = 6;

        // Record game visit for ranking
        recordGameVisit('banmaoslots');

        // Initial random symbols
        const initSymbols = Array(5).fill(0).map(() => Math.floor(Math.random() * SYMBOLS_COUNT));
        setDisplaySymbols(initSymbols);

        // Random spin every 5-10 seconds
        const interval = setInterval(() => {
            setWinData(null);
            setIsSpinning(true);
            setReelStates([true, true, true, true, true]);

            // Pre-generate all final symbols upfront to avoid closure issues
            const finalSymbols: number[] = Array(5).fill(0).map(() => Math.floor(Math.random() * SYMBOLS_COUNT));

            // Cascading spin - each reel spins longer than the previous
            const spinDurations = [600, 800, 1000, 1200, 1400]; // ms per reel
            const spinIntervals: NodeJS.Timeout[] = [];

            spinDurations.forEach((duration, reelIndex) => {
                // Rapid symbol changes for this reel during spinning
                const reelSpinInterval = setInterval(() => {
                    setDisplaySymbols(prev => {
                        const newSyms = [...prev];
                        newSyms[reelIndex] = Math.floor(Math.random() * SYMBOLS_COUNT);
                        return newSyms;
                    });
                }, 50);

                spinIntervals.push(reelSpinInterval);

                // Stop this reel after its duration - use pre-generated final symbol
                setTimeout(() => {
                    clearInterval(reelSpinInterval);
                    const finalSym = finalSymbols[reelIndex]; // Use pre-generated value

                    setDisplaySymbols(prev => {
                        const newSyms = [...prev];
                        newSyms[reelIndex] = finalSym;
                        return newSyms;
                    });

                    setReelStates(prev => {
                        const newStates = [...prev];
                        newStates[reelIndex] = false;
                        return newStates;
                    });

                    // After last reel stops, check for wins
                    if (reelIndex === 4) {
                        setIsSpinning(false);
                        setTimeout(() => {
                            // Calculate win using the pre-generated finalSymbols
                            const win = calculateWin(finalSymbols);
                            if (win) {
                                setWinData(win);
                                // Hide multiplier after 2.5 seconds
                                setTimeout(() => {
                                    setWinData(prev => prev ? { ...prev, showMultiplier: false } : null);
                                }, 2500);
                            }
                        }, 100);
                    }
                }, duration);
            });

            return () => spinIntervals.forEach(clearInterval);
        }, 6000 + Math.random() * 4000);

        return () => clearInterval(interval);
    }, []);

    const SYMBOLS = ['🐱', '🍌', '💎', '⭐', '☘️', '7️⃣'];

    // Enhanced Tier-specific styling with better distinction
    const TierStyles: Record<PoolTier, {
        primary: string;
        glow: string;
        accent: string;
        gradient: string;
        frameGradient: string;
        breathColor: string;
    }> = {
        diamond: {
            primary: '#00f5ff',
            glow: 'rgba(0, 245, 255, 0.7)',
            accent: '#67e8f9',
            gradient: 'linear-gradient(180deg, #0c4a6e 0%, #083344 100%)',
            frameGradient: 'linear-gradient(135deg, #164e63 0%, #22d3ee 20%, #0e7490 50%, #06b6d4 80%, #083344 100%)',
            breathColor: 'rgba(0, 245, 255, 0.8)'
        },
        platinum: {
            primary: '#c0c6d0', // Slightly bluish platinum
            glow: 'rgba(192, 198, 208, 0.6)',
            accent: '#e8ecf4',
            gradient: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)',
            frameGradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 25%, #cbd5e1 50%, #94a3b8 75%, #475569 100%)',
            breathColor: 'rgba(192, 198, 208, 0.7)'
        },
        gold: {
            primary: '#fbbf24',
            glow: 'rgba(251, 191, 36, 0.7)',
            accent: '#fcd34d',
            gradient: 'linear-gradient(180deg, #92400e 0%, #451a03 100%)',
            frameGradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 25%, #f59e0b 50%, #d97706 75%, #92400e 100%)',
            breathColor: 'rgba(251, 191, 36, 0.8)'
        },
        silver: {
            primary: '#78716c', // Warmer silver to distinguish from platinum
            glow: 'rgba(120, 113, 108, 0.5)',
            accent: '#a8a29e',
            gradient: 'linear-gradient(180deg, #57534e 0%, #292524 100%)',
            frameGradient: 'linear-gradient(135deg, #78716c 0%, #a8a29e 30%, #78716c 70%, #44403c 100%)',
            breathColor: 'rgba(168, 162, 158, 0.5)'
        },
        bronze: {
            primary: '#d97706',
            glow: 'rgba(217, 119, 6, 0.6)',
            accent: '#fbbf24',
            gradient: 'linear-gradient(180deg, #78350f 0%, #292524 100%)',
            frameGradient: 'linear-gradient(135deg, #92400e 0%, #d97706 25%, #b45309 50%, #92400e 75%, #78350f 100%)',
            breathColor: 'rgba(217, 119, 6, 0.6)'
        },
        cyberpunk: {
            primary: '#ff0080',
            glow: 'rgba(255, 0, 128, 0.7)',
            accent: '#00ffff',
            gradient: 'linear-gradient(180deg, #1a0a2e 0%, #0a0a1a 100%)',
            frameGradient: 'linear-gradient(135deg, #ff0080 0%, #00ffff 25%, #ff0080 50%, #00ffff 75%, #ff0080 100%)',
            breathColor: 'rgba(255, 0, 128, 0.8)'
        },
    };

    const style = TierStyles[tier];

    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            onClick={() => {
                slotsSounds.click();
                onClick();
            }}
            style={{
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                width: '100%',
                maxWidth: 220,
                margin: '0 auto',
                position: 'relative',
                animation: isHovered ? 'none' : `machineBreathe${tier} ${breathSpeed}s ease-in-out infinite`,
                transform: isHovered ? 'scale(1.15) translateY(-20px)' : 'scale(1) translateY(0)',
                filter: isHovered ? `drop-shadow(0 0 60px ${style.glow})` : 'none',
                zIndex: isHovered ? 100 : 1,
            }}
            onMouseEnter={() => {
                slotsSounds.hover();
                setIsHovered(true);
            }}
            onMouseLeave={() => setIsHovered(false)}
            data-rain-target="true"
        >
            {/* Machine Frame */}
            <div style={{
                background: style.frameGradient,
                borderRadius: 16,
                padding: 4,
                boxShadow: isSelected
                    ? `0 0 50px ${style.glow}, 0 0 100px ${style.glow}, inset 0 0 20px ${style.breathColor}`
                    : `0 15px 50px rgba(0,0,0,0.7), 0 0 ${20 * glowIntensity}px ${style.breathColor}`,
                border: `3px solid ${isSelected ? style.primary : 'rgba(255,255,255,0.25)'}`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Animated shine effect */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '50%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`,
                    animation: 'shineEffect 4s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />

                {/* Top Header with Tier */}
                <div style={{
                    background: `linear-gradient(180deg, ${style.primary}60 0%, ${style.primary}20 100%)`,
                    borderRadius: '12px 12px 0 0',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderBottom: `2px solid ${style.primary}60`,
                }}>
                    <span style={{ fontSize: 16, animation: 'iconBounce 2s ease-in-out infinite' }}>
                        {tier === 'diamond' ? '💎' : tier === 'platinum' ? '🔘' : tier === 'gold' ? '🏆' : tier === 'silver' ? '🪙' : '🥉'}
                    </span>
                    <span style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        fontWeight: 800,
                        color: style.primary,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        textShadow: `0 0 15px ${style.glow}, 0 0 30px ${style.glow}`,
                        animation: 'textGlow 2s ease-in-out infinite',
                    }}>
                        {tier}
                    </span>
                    {/* Status Light with pulse */}
                    <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: pool.isActive ? '#22c55e' : '#ef4444',
                        boxShadow: `0 0 15px ${pool.isActive ? '#22c55e' : '#ef4444'}, 0 0 30px ${pool.isActive ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
                        animation: pool.isActive ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
                    }} />
                </div>

                {/* Screen Area */}
                <div style={{
                    background: 'linear-gradient(180deg, #0a0a15 0%, #12122a 50%, #0a0a15 100%)',
                    margin: 6,
                    borderRadius: 10,
                    padding: 10,
                    border: `1px solid ${style.primary}40`,
                    boxShadow: `inset 0 0 30px rgba(0,0,0,0.9), inset 0 0 10px ${style.breathColor}`,
                }}>
                    {/* Pool Name with glow */}
                    <div style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        color: style.accent,
                        textAlign: 'center',
                        marginBottom: 8,
                        textShadow: `0 0 10px ${style.glow}, 0 0 20px ${style.glow}`,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {pool.name}
                    </div>

                    {/* 5 Reels Display with spinning animation */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 3,
                        marginBottom: 8,
                        padding: 6,
                        background: 'rgba(0,0,0,0.8)',
                        borderRadius: 8,
                        border: `1px solid ${style.primary}30`,
                        boxShadow: `inset 0 0 15px rgba(0,0,0,0.8), 0 0 5px ${style.breathColor}`,
                        position: 'relative',
                    }}>
                        {displaySymbols.map((symIndex, i) => {
                            const isMatch = winData?.matchIndices.includes(i);
                            const isReelSpinning = reelStates[i];

                            return (
                                <div key={i} style={{
                                    width: 28,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isMatch
                                        ? `linear-gradient(180deg, #22c55e40 0%, #15803d40 100%)`
                                        : `linear-gradient(180deg, #1a1a35 0%, #0c0c1a 100%)`,
                                    borderRadius: 4,
                                    fontSize: 14,
                                    border: isMatch
                                        ? `2px solid #22c55e`
                                        : `1px solid ${style.primary}20`,
                                    boxShadow: isMatch
                                        ? `0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.5), inset 0 0 5px rgba(34, 197, 94, 0.3)`
                                        : `inset 0 2px 4px rgba(0,0,0,0.5), 0 0 3px ${style.breathColor}`,
                                    // Use shorthand animation with delay to avoid console warning
                                    animation: isReelSpinning
                                        ? `reelSpinBlur 0.05s linear infinite`
                                        : isMatch
                                            ? `winPulse 0.5s ease-in-out ${i * 0.1}s infinite`
                                            : `reelFloat ${2 + i * 0.3}s ease-in-out ${i * 0.1}s infinite`,
                                    transition: 'all 0.2s ease-out',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}>
                                    {/* Symbol with blur effect when spinning */}
                                    <span style={{
                                        filter: isReelSpinning ? 'blur(2px)' : 'none',
                                        transition: 'filter 0.1s',
                                    }}>
                                        {SYMBOLS[symIndex]}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Floating Multiplier */}
                        {winData?.showMultiplier && (
                            <div style={{
                                position: 'absolute',
                                top: -5,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: winData.isJackpot ? 14 : 16,
                                fontWeight: 900,
                                color: winData.isJackpot ? '#fbbf24' : '#22c55e',
                                textShadow: winData.isJackpot
                                    ? '0 0 10px #fbbf24, 0 0 20px #fbbf24, 0 0 30px rgba(251, 191, 36, 0.8)'
                                    : '0 0 10px #22c55e, 0 0 20px #22c55e, 0 0 30px rgba(34, 197, 94, 0.8)',
                                animation: 'multiplierFloat 2s ease-out forwards',
                                zIndex: 10,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                            }}>
                                x{winData.multiplier}{winData.isJackpot ? '+🏆' : ''}
                            </div>
                        )}
                    </div>

                    {/* Balance Display with pulsing glow */}
                    <div style={{
                        background: `linear-gradient(90deg, transparent, ${style.primary}30, transparent)`,
                        borderRadius: 6,
                        padding: '6px 8px',
                        textAlign: 'center',
                        animation: `balanceGlow ${breathSpeed}s ease-in-out infinite`,
                    }}>
                        <div style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 18,
                            fontWeight: 900,
                            color: style.primary,
                            textShadow: `0 0 20px ${style.glow}, 0 0 40px ${style.glow}`,
                        }}>
                            {balanceFormatted}
                        </div>
                        <div style={{
                            fontSize: 9,
                            color: 'rgba(200, 180, 255, 0.8)',
                            letterSpacing: 1,
                            textShadow: '0 0 5px rgba(0, 220, 255, 0.5)',
                        }}>
                            $BANMAO
                        </div>
                    </div>
                </div>

                {/* Control Buttons with animated glow */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '0 0 12px 12px',
                }}>
                    {[style.primary, '#ff0080', '#00ff88'].map((color, i) => (
                        <div key={i} style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 30% 30%, ${color}, ${color}70)`,
                            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}50`,
                            border: '1px solid rgba(255,255,255,0.4)',
                            animation: `buttonPulse ${1.5 + i * 0.3}s ease-in-out infinite`,
                        }} />
                    ))}
                </div>
            </div>

            {/* Floor Glow enhanced */}
            <div style={{
                position: 'absolute',
                bottom: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 160,
                height: 40,
                background: `radial-gradient(ellipse, ${style.glow} 0%, ${style.breathColor} 30%, transparent 70%)`,
                opacity: isSelected ? 1 : 0.5 + (glowIntensity * 0.3),
                pointerEvents: 'none',
                animation: `floorGlow ${breathSpeed}s ease-in-out infinite`,
            }} />

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes machineBreathe${tier} {
                    0%, 100% { 
                        transform: scale(1) translateY(0);
                        filter: drop-shadow(0 0 ${15 * glowIntensity}px ${style.breathColor});
                    }
                    50% { 
                        transform: scale(1.02) translateY(-3px);
                        filter: drop-shadow(0 0 ${30 * glowIntensity}px ${style.breathColor});
                    }
                }
                @keyframes statusPulse {
                    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 15px #22c55e; }
                    50% { opacity: 0.7; transform: scale(1.3); box-shadow: 0 0 25px #22c55e, 0 0 50px rgba(34,197,94,0.5); }
                }
                @keyframes shineEffect {
                    0% { left: -100%; }
                    50%, 100% { left: 200%; }
                }
                @keyframes iconBounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-2px) scale(1.1); }
                }
                @keyframes textGlow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                @keyframes reelFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }
                @keyframes reelSpin {
                    0% { transform: translateY(-5px); opacity: 0.5; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes balanceGlow {
                    0%, 100% { background: linear-gradient(90deg, transparent, ${style.primary}20, transparent); }
                    50% { background: linear-gradient(90deg, transparent, ${style.primary}40, transparent); }
                }
                @keyframes buttonPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes floorGlow {
                    0%, 100% { opacity: ${isSelected ? 1 : 0.4}; transform: translateX(-50%) scaleX(1); }
                    50% { opacity: ${isSelected ? 1 : 0.7}; transform: translateX(-50%) scaleX(1.1); }
                }
                @keyframes reelSpinBlur {
                    0% { transform: translateY(-8px); }
                    50% { transform: translateY(4px); }
                    100% { transform: translateY(-8px); }
                }
                @keyframes winPulse {
                    0%, 100% { 
                        transform: scale(1);
                        box-shadow: 0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.5);
                    }
                    50% { 
                        transform: scale(1.08);
                        box-shadow: 0 0 15px #22c55e, 0 0 30px rgba(34, 197, 94, 0.7), 0 0 40px rgba(34, 197, 94, 0.4);
                    }
                }
                @keyframes multiplierFloat {
                    0% { 
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-30px) scale(1.3);
                    }
                    100% { 
                        opacity: 0;
                        transform: translateX(-50%) translateY(-50px) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}

export default function BanmaoSlotsStreetPage() {
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const publicClient = usePublicClient();

    // User wallet balances for profile
    const { data: userOkbBalance } = useBalance({ address });
    const { data: userBanmaoBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Language state - must be before useSlotsGame for translations
    const [lang, setLang] = useState<SlotsLanguage>('en');
    const t: SlotsTranslations = useMemo(() => slotsTranslations[lang], [lang]);
    const [langMenuOpen, setLangMenuOpen] = useState(false);

    const {
        gameState, setGameState, allowance, pendingCommit, blockNumber,
        error: hookError, handleApprove, handleCommit, handleReveal, handleRefund,
        isPending, lastResult, lastBetAmount, setLastBetAmount, lastSeed,
        playerStats, houseStats, minBet, maxBet, maxSafeBet, poolIsActive,
        poolId, setPoolId, commitExpiryBlocks,
        spinCount, setSpinCount, multiResults, isMultiSpinning, clearMultiResults,
        prepareForNextSpin,
        maxSpinsPerMinute,
    } = useSlotsGame(t);

    // CreatePool data passed from HouseDashboardPanel via callback (to prevent dual hook instances)
    const [createPoolData, setCreatePoolData] = useState<{
        handleCreatePool: (name: string, deposit: string, minBet: string, maxBet: string, jackpotPct: number) => Promise<any>;
        minPoolDeposit: bigint | undefined;
        tokenBalance: bigint | undefined;
        allowance: bigint | undefined;
        handleApprove: (amount: bigint) => Promise<any>;
        isPending: boolean;
    } | null>(null);

    // Onboarding Tour State
    const [showOnboardingTour, setShowOnboardingTour] = useState(false);

    // Auto-show onboarding tour on first visit
    useEffect(() => {
        if (shouldShowOnboarding()) {
            // Small delay to let the page fully render
            const timer = setTimeout(() => {
                setShowOnboardingTour(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Initialize sound based on user preference
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        const storedLang = localStorage.getItem('banmao_language') as SlotsLanguage | null;
        if (storedLang && slotsTranslations[storedLang]) setLang(storedLang);
        else setLang(getSlotsBrowserLanguage());
    }, []);

    // Local state
    const [betAmount, setBetAmount] = useState('100');
    const [reels, setReels] = useState<SymbolIndex[]>([0, 1, 2, 3, 4]);
    const [result, setResult] = useState<{ symbols: SymbolIndex[]; payout: bigint; isJackpot: boolean; poolId?: bigint } | null>(null);
    const [customSeed, setCustomSeed] = useState('');
    const [seedHistory, setSeedHistory] = useState<string[]>([]);

    const [showVerifyModal, setShowVerifyModal] = useState(false);

    // Pools
    const [pools, setPools] = useState<PoolData[]>([]);
    const [selectedPoolId, setSelectedPoolId] = useState<bigint | null>(null);

    // Panels (info panels like profile, leaderboard, etc.)
    const [openPanels, setOpenPanels] = useState<Set<PanelId>>(new Set());
    const [minimizedPanels, setMinimizedPanels] = useState<PanelId[]>([]);
    const [panelZIndex, setPanelZIndex] = useState<Record<PanelId, number>>({
        profile: 10000, leaderboard: 10000, history: 10000, myHistory: 10000, donors: 10000, payout: 10000, verify: 10000, house: 10000, viewPlayer: 10000, multiSpin: 10000, createPool: 10010
    });
    const [topZIndex, setTopZIndex] = useState(10000);
    const [multiSpinZIndex, setMultiSpinZIndex] = useState(100000); // Very high to always be above machineZIndex
    // NOTE: useEffect for multiSpinZIndex is defined after machineZIndex declaration

    // Manual Verification State
    const [manualVerifySeed, setManualVerifySeed] = useState('');
    const [manualVerifyTxHash, setManualVerifyTxHash] = useState('');
    const [manualVerifySpinIndex, setManualVerifySpinIndex] = useState(''); // For multi-spin: which spin to verify
    const [manualVerifyResult, setManualVerifyResult] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false); // Educational section collapse

    // Selected Spin Detail View
    const [selectedSpin, setSelectedSpin] = useState<any[] | null>(null);
    const [historyPanels, setHistoryPanels] = useState<any[]>([]);

    const handleSelectSpin = useCallback((spin: any) => {
        if (!spin) return;
        if (Array.isArray(spin)) {
            setSelectedSpin(spin);
            setTopZIndex(prev => prev + 1);
        } else {
            // Use functional updates to get current z-index values and increment properly
            // Ensure new panel is above BOTH topZIndex and multiSpinZIndex
            // On mobile, MultiSpinResultsModal uses z-index 999999, so we need to exceed that
            setTopZIndex(currentZ => {
                setMultiSpinZIndex(currentMultiZ => {
                    // Ensure we're always above the mobile modal's hardcoded z-index (999999)
                    const baseZ = Math.max(currentZ, currentMultiZ, 999999);
                    const newZ = baseZ + 1;
                    setHistoryPanels(prev => {
                        const tx = spin.txHash || spin.timestamp;
                        const filtered = prev.filter(p => (p.txHash || p.timestamp) !== tx);
                        return [...filtered, { ...spin, zIndex: newZ }];
                    });
                    return newZ; // Update multiSpinZIndex too so next time it's correct
                });
                return currentZ + 1;
            });
        }
    }, []);

    // View Other Player Profile (draggable panel)
    const [viewingPlayer, setViewingPlayer] = useState<{ player: SlotWinner; rank: number } | null>(null);

    // Create Pool Modal (Removed - Using House Panel instead)
    // const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);

    // Hover Tooltip State
    const [hoveredPanelId, setHoveredPanelId] = useState<string | null>(null);

    // Pool Details View
    const [viewingPoolId, setViewingPoolId] = useState<bigint | null>(null);
    const [poolSearchId, setPoolSearchId] = useState('');

    // Verify Logic
    const handleManualVerify = async () => {
        if (!manualVerifyTxHash || !publicClient) {
            slotsToast.error(t.toastEnterTxHash || 'Please enter a TxHash');
            return;
        }
        setIsVerifying(true);
        setManualVerifyResult(null);
        try {
            const receipt = await publicClient.getTransactionReceipt({ hash: manualVerifyTxHash as `0x${string}` });
            if (!receipt) throw new Error('Receipt not found');

            // Collect ALL SpinRevealed events from the transaction
            const spinEvents: any[] = [];
            for (const log of receipt.logs) {
                try {
                    const logAny = log as any;
                    const decoded = decodeEventLog({
                        abi: SLOTS_ABI,
                        data: logAny.data,
                        topics: logAny.topics,
                    }) as { eventName: string; args: any };

                    if (decoded.eventName === 'SpinRevealed') {
                        spinEvents.push(decoded.args);
                    }
                } catch (e) { continue; }
            }

            if (spinEvents.length === 0) {
                slotsToast.error(t.toastNoSpinEvent || 'No SpinRevealed event found in this transaction.');
            } else {
                // Determine which spin to show (user enters 1-based: 1, 2, 3... but arrays are 0-based)
                const userInput = manualVerifySpinIndex ? parseInt(manualVerifySpinIndex) : 1; // Default to 1 (first spin)
                const targetIndex = userInput - 1; // Convert to 0-based array index
                const validIndex = Math.max(0, Math.min(targetIndex, spinEvents.length - 1));
                const args = spinEvents[validIndex];

                console.log(`Verified Spin ${validIndex + 1}/${spinEvents.length}:`, args);
                setManualVerifyResult({
                    player: args.player,
                    result: args.result,
                    payout: args.payout,
                    isJackpot: args.isJackpot,
                    seed: args.seed,
                    timestamp: Date.now(),
                    spinIndex: validIndex,
                    totalSpins: spinEvents.length
                });

                if (spinEvents.length > 1) {
                    slotsToast.success(`Spin ${validIndex + 1}/${spinEvents.length} verified!`, { duration: 3000 });
                } else {
                    slotsToast.success(t.toastResultVerified || 'Result Verified!', { duration: 3000 });
                }

                // Seed validation
                if (manualVerifySeed && args.seed && args.seed !== manualVerifySeed) {
                    slotsToast.error(t.toastSeedMismatch || 'Seed mismatch!');
                } else if (manualVerifySeed && args.seed && args.seed === manualVerifySeed) {
                    slotsToast.success(t.toastSeedVerified || 'Seed matches!', { duration: 3000 });
                }
            }
        } catch (error) {
            console.error('Verify failed:', error);
            slotsToast.error(t.toastVerificationFailed || 'Verification failed. Invalid TxHash or network error.');
        } finally {
            setIsVerifying(false);
        }
    };

    // Slot Machine Windows (Samsung DeX style - multiple windows)
    const [openMachineWindows, setOpenMachineWindows] = useState<Set<string>>(new Set()); // poolId as string
    const [minimizedMachines, setMinimizedMachines] = useState<string[]>([]);
    const [machineZIndex, setMachineZIndex] = useState<Record<string, number>>({});
    const [machinePositions, setMachinePositions] = useState<Record<string, { x: number; y: number }>>({});
    // Cache pool data when window opens - prevents machine disappearing during pools refresh
    const [cachedPoolsData, setCachedPoolsData] = useState<Record<string, PoolData>>({});

    // Automatically bring MultiSpinResultsModal to front when it opens
    useEffect(() => {
        if (spinCount > 1 && multiResults && multiResults.length === spinCount) {
            // Modal is about to open - get MAX of all z-indices and set higher
            const allMachineZIndexes = Object.values(machineZIndex);
            const maxMachineZ = allMachineZIndexes.length > 0 ? Math.max(...allMachineZIndexes) : 0;

            setTopZIndex(prevTopZ => {
                setMultiSpinZIndex(prevMultiZ => {
                    const maxZ = Math.max(prevTopZ, prevMultiZ, maxMachineZ);
                    const newZ = maxZ + 1000;
                    return newZ;
                });
                return Math.max(prevTopZ, maxMachineZ) + 1;
            });
        }
    }, [multiResults, spinCount, machineZIndex]);

    // Track last opened result to prevent duplicate panels
    const lastOpenedResultRef = React.useRef<string | null>(null);

    // Auto-open spin detail panel when single spin (1x) result appears
    useEffect(() => {
        if (spinCount === 1 && gameState === 'result' && result && selectedPoolId) {
            // Create unique key for this result to prevent duplicates
            const resultKey = `${result.symbols.join('-')}-${result.payout}-${selectedPoolId}`;

            // Only open if we haven't opened this result yet
            if (lastOpenedResultRef.current !== resultKey) {
                lastOpenedResultRef.current = resultKey;

                // Create spin object matching the format used in history
                const spinDetail = {
                    symbols: result.symbols,
                    payout: result.payout,
                    isJackpot: result.isJackpot,
                    betAmount: Number(lastBetAmount) || 0,
                    poolId: Number(selectedPoolId),
                    player: address || '',
                    timestamp: Date.now(),
                    seed: lastSeed || '',
                };
                handleSelectSpin(spinDetail);
            }
        } else if (gameState === 'idle') {
            // Reset ref when going back to idle so next spin can open panel
            lastOpenedResultRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, result, spinCount]);

    // Data
    const [leaderboard, setLeaderboard] = useState<SlotWinner[]>([]);
    const [leaderboardSortBy, setLeaderboardSortBy] = useState<LeaderboardSortBy>('biggestWin');
    const [jackpotDonors, setJackpotDonors] = useState<JackpotDonor[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [historyTimeFilter, setHistoryTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
    const [personalHistory, setPersonalHistory] = useState<any[]>([]);
    const [myProfile, setMyProfile] = useState<SlotsPlayerProfile | null>(null);

    // Profile editing hook
    const slotsProfile = useSlotsProfile({ address });

    // Sync myProfile with slotsProfile.profile when it updates
    useEffect(() => {
        if (slotsProfile.profile) {
            setMyProfile(slotsProfile.profile);
        }
    }, [slotsProfile.profile]);

    const processedEventsRef = useRef<Set<string>>(new Set());

    // WebSocket for real-time SpinRevealed events
    const handleNewWebSocketSpin = useCallback((spin: WebSocketSpinEvent) => {
        console.log('[WS] 🎰 Real-time spin received:', spin);

        // Create history entry format
        const historyEntry = {
            id: `ws-${spin.txHash}-${spin.logIndex}`,
            player: spin.player,
            playerAddress: spin.player,
            betAmount: '0', // Not available in event
            payout: spin.payout.toString(),
            payoutFormatted: spin.payoutFormatted,
            multiplier: 0,
            symbols: spin.result.join(','),
            result: spin.result,
            isJackpot: spin.isJackpot,
            txHash: spin.txHash,
            poolId: spin.poolId,
            poolName: `Pool #${spin.poolId}`,
            timestamp: spin.timestamp,
            blockNumber: spin.blockNumber,
            logIndex: spin.logIndex,
            playerName: `Spinner ${spin.player.slice(0, 8)}`,
            playerAvatar: 0,
            source: 'websocket',
        };

        // Prepend to global history (avoid duplicates)
        setHistory(prev => {
            const exists = prev.some(h => h.txHash === spin.txHash && h.logIndex === spin.logIndex);
            if (exists) return prev;
            return [historyEntry, ...prev].slice(0, 500); // Keep max 500
        });

        // Prepend to personal history if it's current user's spin
        if (address && spin.player.toLowerCase() === address.toLowerCase()) {
            setPersonalHistory(prev => {
                const exists = prev.some(h => h.txHash === spin.txHash && h.logIndex === spin.logIndex);
                if (exists) return prev;
                return [historyEntry, ...prev].slice(0, 50);
            });
        }
    }, [address]);

    const { isConnected: wsConnected, connectionStatus: wsStatus } = useSlotsWebSocket({
        enabled: true,
        onNewSpin: handleNewWebSocketSpin,
    });




    // Fetch pools
    const { data: poolCountData, refetch: refetchPoolCount } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'nextPoolId' as any,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    useEffect(() => {
        const fetchPools = async () => {
            if (!publicClient) {
                console.log('[Slots] No publicClient yet');
                return;
            }

            try {
                // Use getActivePoolsPaginated to fetch all active pools directly
                const result = await publicClient.readContract({
                    address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                    abi: SLOTS_ABI,
                    functionName: 'getActivePoolsPaginated',
                    args: [BigInt(0), BigInt(100)], // offset 0, limit 100
                } as any);

                console.log('[Slots] getActivePoolsPaginated result:', result);

                // Result is [pools[], total]
                const [poolsData, total] = result as [any[], bigint];
                console.log('[Slots] Total active pools:', Number(total));

                if (!poolsData || poolsData.length === 0) {
                    console.log('[Slots] No active pools found - keeping previous data');
                    // Don't clear pools - keep previous data to prevent flickering
                    // Only clear on initial load if there are truly no pools
                    setPools(prev => prev.length === 0 ? [] : prev);
                    return;
                }

                // Map pool struct to PoolData
                // Pool struct fields: id, owner, name, balance, minBet, maxBet, jackpotPercent, jackpotPool, totalSpins, totalBetsVolume, totalPayoutsVolume, totalPendingBets, isActive, createdAt
                const formattedPools: PoolData[] = poolsData.map((pool: any) => ({
                    poolId: pool.id || pool[0],
                    owner: pool.owner || pool[1],
                    name: pool.name || pool[2] || `Pool #${pool.id || pool[0]}`,
                    balance: pool.balance || pool[3],
                    minBet: pool.minBet || pool[4],
                    maxBet: pool.maxBet || pool[5],
                    jackpot: pool.jackpotPool || pool[7],
                    isActive: pool.isActive !== undefined ? pool.isActive : pool[12],
                    tier: getPoolTier(pool.balance || pool[3]),
                    // Stats
                    totalSpins: Number(pool.totalSpins || pool[8] || 0),
                    totalBetsVolume: pool.totalBetsVolume || pool[9] || BigInt(0),
                    totalPayoutsVolume: pool.totalPayoutsVolume || pool[10] || BigInt(0),
                }));

                console.log('[Slots] Formatted pools:', formattedPools);

                // Sort by tier and balance
                const tierOrder: Record<PoolTier, number> = { cyberpunk: 0, diamond: 1, platinum: 2, gold: 3, silver: 4, bronze: 5 };
                formattedPools.sort((a, b) => {
                    const tierDiff = tierOrder[a.tier!] - tierOrder[b.tier!];
                    if (tierDiff !== 0) return tierDiff;
                    return Number(b.balance - a.balance);
                });

                // Smooth update - only replace if we have valid data
                setPools(formattedPools);
            } catch (err) {
                console.error('[Slots] Error fetching pools:', err);
                // On error, keep previous pool data to prevent flickering
                // Don't call setPools([]) - this causes the UI to flash empty
            }
        };
        fetchPools();

        // Re-fetch every 10 seconds
        const interval = setInterval(fetchPools, 30000); // Reduced from 10s to 30s
        return () => clearInterval(interval);
    }, [publicClient]);

    // Selected pool data
    const selectedPool = pools.find(p => p.poolId === selectedPoolId);
    const displayJackpot = selectedPool ? formatTokenAmount(selectedPool.jackpot) : '0';

    // Sync state from hook to local state
    // Unified recording logic for single and multi-spins
    useEffect(() => {
        if (!address || !lastBetAmount) return;
        const betVal = parseTokenAmount(lastBetAmount);

        const recordOne = async (spin: any) => {
            const currentPool = pools.find(p => p.poolId === (spin.poolId !== undefined ? BigInt(spin.poolId) : selectedPoolId));
            const recordPayload = {
                address,
                betAmount: betVal.toString(),
                payout: spin.payout.toString(),
                symbols: spin.symbols.join(','),
                isJackpot: spin.isJackpot,
                txHash: spin.txHash,
                seed: lastSeed || undefined,
                poolId: spin.poolId !== undefined ? Number(spin.poolId) : (selectedPoolId !== null ? Number(selectedPoolId) : null),
                poolName: currentPool?.name || `Pool #${spin.poolId !== undefined ? Number(spin.poolId) : (selectedPoolId !== null ? Number(selectedPoolId) : 0)}`,
                logIndex: spin.logIndex || 0,
            };

            try {
                console.log('[Slots DB] Recording spin to database:', recordPayload);
                const response = await fetch('/api/slots/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recordPayload),
                });
                const data = await response.json();
                console.log('[Slots DB] Record API response:', data);
                if (data.success) {
                    console.log(`[Slots] Spin ${spin.logIndex || 0} recorded successfully`);
                }
            } catch (err) {
                console.error(`[Slots] Failed to record spin ${spin.logIndex || 0}:`, err);
            }
        };

        // Handle Single Spin
        if (lastResult) {
            const syncedResult = {
                symbols: lastResult.symbols.map(n => n as SymbolIndex),
                payout: lastResult.payout,
                isJackpot: lastResult.isJackpot,
                poolId: lastResult.poolId
            };
            setResult(syncedResult);

            // Audio & Visual Effects
            const payoutNum = Number(lastResult.payout) / 1e18;
            const symbolCounts: Record<number, number> = {};
            lastResult.symbols.forEach(s => { symbolCounts[s] = (symbolCounts[s] || 0) + 1; });
            const maxMatchCount = Math.max(...Object.values(symbolCounts));

            if (lastResult.isJackpot) {
                slotsSounds.jackpot();
                playJackpotCelebration();
                playScreenShake();
            } else if (maxMatchCount >= 4) {
                slotsSounds.win(payoutNum / 100);
                playBigWinBurst();
            } else if (payoutNum > 0) {
                slotsSounds.win(payoutNum / 100);
                playWinConfetti(payoutNum / 100);
            } else {
                slotsSounds.lose();
            }

            // Update local stats & record to DB
            console.log('[Slots DB] Single spin result received, recording:', lastResult);
            const updatedProfile = updateSlotsStats(address, betVal, lastResult.payout, lastResult.isJackpot);
            setMyProfile(updatedProfile);
            recordOne(lastResult).then(() => {
                // Refresh history after recording
                fetch(`/api/slots/history?address=${address}&limit=100`)
                    .then(r => r.json())
                    .then(d => { if (d.success) setPersonalHistory(d.history || []); });
            });
        }

        // Handle Multi Spin Complete
        if (multiResults && multiResults.length > 0 && !isMultiSpinning && gameState === 'result') {
            console.log(`[Slots DB] Multi-spin results received, recording ${multiResults.length} spins via batch API:`, multiResults);

            // Update local stats for all spins
            for (const spin of multiResults) {
                updateSlotsStats(address, betVal, spin.payout, spin.isJackpot);
            }
            const profile = getSlotsProfile(address);
            if (profile) setMyProfile(profile);

            // Batch record all spins in a single API call (atomic, no data loss on refresh)
            const batchPayload = {
                spins: multiResults.map(spin => {
                    const currentPool = pools.find(p => p.poolId === (spin.poolId !== undefined ? BigInt(spin.poolId) : selectedPoolId));
                    return {
                        address,
                        betAmount: betVal.toString(),
                        payout: spin.payout.toString(),
                        symbols: spin.symbols.join(','),
                        isJackpot: spin.isJackpot,
                        txHash: spin.txHash,
                        seed: lastSeed || undefined,
                        poolId: spin.poolId !== undefined ? Number(spin.poolId) : (selectedPoolId !== null ? Number(selectedPoolId) : null),
                        poolName: currentPool?.name || `Pool #${spin.poolId !== undefined ? Number(spin.poolId) : (selectedPoolId !== null ? Number(selectedPoolId) : 0)}`,
                        logIndex: spin.logIndex || 0,
                    };
                })
            };

            // Use async IIFE to ensure batch recording completes (prevents data loss on page close)
            (async () => {
                try {
                    const res = await fetch('/api/slots/record-batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(batchPayload),
                    });
                    const data = await res.json();
                    if (data.success) {
                        console.log(`[Slots] Batch recorded: ${data.recorded}/${data.total} spins`);
                        if (data.failed > 0) {
                            console.warn(`[Slots] ${data.failed} spins failed to record`, data.results);
                        }
                    } else {
                        console.error('[Slots] Batch record failed:', data.error);
                    }

                    // Refresh history after successful batch recording (use blockchain API)
                    const [personalRes, globalRes] = await Promise.all([
                        fetch(`/api/slots/history-chain?address=${address}&limit=100`),
                        fetch(`/api/slots/history-chain?limit=500`)
                    ]);

                    if (personalRes.ok) {
                        const d = await personalRes.json();
                        if (d.success) setPersonalHistory(d.history || []);
                    }
                    if (globalRes.ok) {
                        const d = await globalRes.json();
                        if (d.success) setHistory(d.history || []);
                    }
                } catch (err) {
                    console.error('[Slots] Batch record error:', err);
                }
            })();

            // Sync the last result for individual windows
            if (multiResults.length > 0) {
                const last = multiResults[multiResults.length - 1];
                setResult({
                    symbols: last.symbols.map(n => n as SymbolIndex),
                    payout: last.payout,
                    isJackpot: last.isJackpot,
                    poolId: last.poolId ? BigInt(last.poolId) : undefined
                });
            }
        }
    }, [lastResult, multiResults, isMultiSpinning, gameState, address, lastBetAmount, lastSeed, selectedPoolId]);

    // Spinning animation
    useEffect(() => {
        let spinInterval: NodeJS.Timeout;
        const spinning = ['committing', 'waiting', 'revealing', 'ready_to_reveal'].includes(gameState);
        if (spinning) {
            slotsSounds.startSpinning();
            spinInterval = setInterval(() => {
                setReels([0, 1, 2, 3, 4].map(() => Math.floor(Math.random() * 6) as SymbolIndex));
            }, 100);
        } else slotsSounds.stopSpinning();
        return () => { clearInterval(spinInterval); slotsSounds.stopSpinning(); };
    }, [gameState]);

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            console.log('[Slots UI] Fetching leaderboard and history...');
            const [lb, hist, don] = await Promise.all([
                fetch(`/api/slots/leaderboard?limit=100&sortBy=${leaderboardSortBy}`),
                fetch('/api/slots/history-chain?limit=500'),
                fetch('/api/slots/donors'),
            ]);
            if (lb.ok) {
                const d = await lb.json();
                console.log('[Slots UI] Leaderboard API response:', d);
                if (d.success) {
                    // Helper to safely parse BigInt from strings that might be scientific notation
                    const safeBigInt = (val: any): bigint => {
                        if (!val) return BigInt(0);
                        try {
                            // If it's already a number or a clean string, try direct conversion
                            const str = String(val);
                            if (str.includes('e') || str.includes('E')) {
                                // Scientific notation - convert through Number first (may lose precision for very large numbers)
                                return BigInt(Math.floor(Number(val)));
                            }
                            return BigInt(str);
                        } catch {
                            // Fallback: try Number conversion
                            try {
                                return BigInt(Math.floor(Number(val)));
                            } catch {
                                return BigInt(0);
                            }
                        }
                    };

                    // Map API data to SlotWinner interface
                    const mappedLeaderboard: SlotWinner[] = (d.leaderboard || []).map((p: LeaderboardApiEntry) => ({
                        address: p.address || '',
                        name: p.name,
                        avatar: p.avatar || 0,
                        highestWin: safeBigInt(p.biggestWin || p.biggest_win),
                        totalWonAmount: safeBigInt(p.totalWon || p.total_won), // Amount in wei
                        totalSpins: Number(p.totalSpins || p.total_spins || 0),
                        totalWins: Number(p.totalWins || p.total_wins || 0),
                        totalWagered: safeBigInt(p.totalWagered || p.total_wagered),
                        jackpotsWon: Number(p.jackpotWins || p.jackpot_wins || 0),
                        telegram: p.telegram || undefined,
                        twitter: p.twitter || undefined,
                        todayWon: safeBigInt(p.todayWon || p.today_won),
                        todaySpins: Number(p.todaySpins || p.today_spins || 0),
                        lastSpinTime: Number(p.lastSpinTime || p.last_spin_time || 0),
                    }));
                    console.log('[Slots UI] Mapped leaderboard:', mappedLeaderboard.length, 'players');
                    setLeaderboard(mappedLeaderboard);
                }
            }
            if (hist.ok) {
                const d = await hist.json();
                console.log('[Slots UI] History API response:', d.history?.length || 0, 'items');
                if (d.success) setHistory(d.history || []);
            }
            if (don.ok) {
                const d = await don.json();
                if (d.success && d.leaderboard) setJackpotDonors(d.leaderboard.map((x: JackpotDonorApiEntry) => ({
                    address: x.address, name: x.name || '', totalDonated: BigInt(x.totalDonated || '0'),
                    donationCount: x.donationCount || 0, badge: getDonorBadge(BigInt(x.totalDonated || '0'))
                })));
            }
            if (address) {
                const p = await fetch(`/api/slots/history-chain?address=${address}&limit=100`);
                if (p.ok) { const d = await p.json(); if (d.success) setPersonalHistory(d.history || []); }
            }
        } catch (e) { console.error(e); }
    }, [address]);
    useEffect(() => { fetchData(); }, [fetchData, gameState]);

    // Auto-refresh leaderboard & personal history every 15 seconds for real-time sync
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                // Refresh leaderboard
                const lbRes = await fetch(`/api/slots/leaderboard?limit=100&sortBy=${leaderboardSortBy}`);
                if (lbRes.ok) {
                    const d = await lbRes.json();
                    if (d.success) {
                        // Helper to safely parse BigInt from strings that might be scientific notation
                        const safeBigInt = (val: any): bigint => {
                            if (!val) return BigInt(0);
                            try {
                                const str = String(val);
                                if (str.includes('e') || str.includes('E')) {
                                    return BigInt(Math.floor(Number(val)));
                                }
                                return BigInt(str);
                            } catch {
                                try { return BigInt(Math.floor(Number(val))); } catch { return BigInt(0); }
                            }
                        };

                        const mappedLeaderboard: SlotWinner[] = (d.leaderboard || []).map((p: LeaderboardApiEntry) => ({
                            address: p.address || '',
                            name: p.name,
                            avatar: p.avatar || 0,
                            highestWin: safeBigInt(p.biggestWin || p.biggest_win),
                            totalWonAmount: safeBigInt(p.totalWon || p.total_won),
                            totalSpins: Number(p.totalSpins || p.total_spins || 0),
                            totalWins: Number(p.totalWins || p.total_wins || 0),
                            totalWagered: safeBigInt(p.totalWagered || p.total_wagered),
                            jackpotsWon: Number(p.jackpotWins || p.jackpot_wins || 0),
                            telegram: p.telegram || undefined,
                            twitter: p.twitter || undefined,
                            todayWon: safeBigInt(p.todayWon || p.today_won),
                            todaySpins: Number(p.todaySpins || p.today_spins || 0),
                            lastSpinTime: Number(p.lastSpinTime || p.last_spin_time || 0),
                        }));
                        setLeaderboard(mappedLeaderboard);
                    }
                }

                // Refresh personal history if connected
                if (address) {
                    const histRes = await fetch(`/api/slots/history?address=${address}&limit=100`);
                    if (histRes.ok) {
                        const data = await histRes.json();
                        if (data.success) setPersonalHistory(data.history || []);
                    }
                }

                // Refresh global history
                const globalHistRes = await fetch('/api/slots/history?limit=500');
                if (globalHistRes.ok) {
                    const data = await globalHistRes.json();
                    if (data.success) setHistory(data.history || []);
                }
            } catch (e) { console.error('Auto-refresh failed:', e); }
        }, 15000); // Every 15 seconds

        return () => clearInterval(intervalId);
    }, [address]);

    // Find current user in leaderboard to get database stats for SlotsProfileCard
    const myDbStats = useMemo(() => {
        if (!address || leaderboard.length === 0) return undefined;
        const me = leaderboard.find(p => p.address.toLowerCase() === address.toLowerCase());
        if (!me) return undefined;
        // Create PlayerPoolStats compatible object from leaderboard data
        return {
            totalBets: BigInt(me.totalSpins || 0),
            wins: BigInt(me.totalWins || 0),
            losses: BigInt(Math.max(0, (me.totalSpins || 0) - (me.totalWins || 0))),
            biggestWin: me.highestWin || BigInt(0),
            totalWagered: BigInt(0), // Not tracked in SlotWinner
            totalPayout: me.totalWonAmount || BigInt(0),
        };
    }, [address, leaderboard]);

    useEffect(() => { if (address) setMyProfile(getSlotsProfile(address) || createDefaultSlotsProfile(address)); }, [address]);

    // Panel management
    const openPanel = (id: PanelId) => { setOpenPanels(p => new Set([...p, id])); setMinimizedPanels(p => p.filter(x => x !== id)); bringToFront(id); };
    const closePanel = (id: PanelId) => { setOpenPanels(p => { const n = new Set(p); n.delete(id); return n; }); };
    const minimizePanel = (id: PanelId) => { closePanel(id); setMinimizedPanels(p => [...p, id]); };
    const restorePanel = (id: PanelId) => { setMinimizedPanels(p => p.filter(x => x !== id)); openPanel(id); };
    const bringToFront = (id: PanelId) => { const z = topZIndex + 1; setTopZIndex(z); setPanelZIndex(p => ({ ...p, [id]: z })); };

    // Pool selection - auto-close other pools to enforce one active at a time
    const handleSelectMachine = (pool: PoolData) => {
        // Check if there's a pending commit on a DIFFERENT pool
        // Logic removed as requested


        setSelectedPoolId(pool.poolId);
        setPoolId(pool.poolId);

        // Close ALL other machine windows - only allow one open at a time
        const poolIdStr = pool.poolId.toString();
        setOpenMachineWindows(new Set([poolIdStr])); // Only this pool
        setMinimizedMachines([]); // Clear minimized

        // Cache pool data to prevent disappearance during pools refresh
        setCachedPoolsData(prev => ({ ...prev, [poolIdStr]: pool }));

        // Set initial position
        const offsetX = 150;
        const offsetY = 100;
        setMachinePositions(prev => ({
            ...prev,
            [poolIdStr]: prev[poolIdStr] || { x: offsetX, y: offsetY }
        }));
        // Bring to front
        const newZ = topZIndex + 1;
        setTopZIndex(newZ);
        setMachineZIndex(prev => ({ ...prev, [poolIdStr]: newZ }));
    };

    // Machine window management
    const closeMachineWindow = (poolIdStr: string) => {
        setOpenMachineWindows(prev => {
            const next = new Set(prev);
            next.delete(poolIdStr);
            return next;
        });
        setMinimizedMachines(prev => prev.filter(id => id !== poolIdStr));
    };

    const minimizeMachineWindow = (poolIdStr: string) => {
        setOpenMachineWindows(prev => {
            const next = new Set(prev);
            next.delete(poolIdStr);
            return next;
        });
        setMinimizedMachines(prev => [...prev, poolIdStr]);
    };

    const restoreMachineWindow = (poolIdStr: string) => {
        setMinimizedMachines(prev => prev.filter(id => id !== poolIdStr));
        setOpenMachineWindows(prev => new Set([...prev, poolIdStr]));
        const newZ = topZIndex + 1;
        setTopZIndex(newZ);
        setMachineZIndex(prev => ({ ...prev, [poolIdStr]: newZ }));
    };

    const focusMachineWindow = (poolIdStr: string) => {
        const newZ = topZIndex + 1;
        setTopZIndex(newZ);
        setMachineZIndex(prev => ({ ...prev, [poolIdStr]: newZ }));
        setSelectedPoolId(BigInt(poolIdStr));
        setPoolId(BigInt(poolIdStr));
    };

    // Spin
    const onSpinClick = useCallback(() => {
        if (!isConnected) { openConnectModal?.(); return; }
        if (gameState === 'result') { setResult(null); setGameState('idle'); return; }
        if (gameState === 'ready_to_reveal' || (gameState === 'waiting' && pendingCommit)) { handleReveal(); return; }
        const bet = parseTokenAmount(betAmount);
        if (allowance === undefined || allowance < bet) handleApprove(betAmount);
        else handleCommit(betAmount, customSeed);
    }, [isConnected, openConnectModal, gameState, betAmount, allowance, handleApprove, handleCommit, customSeed, handleReveal, pendingCommit]);

    const effectiveMax = Math.min(maxBet ? Number(maxBet) / 1e18 : 10000, maxSafeBet ? Number(maxSafeBet) / 1e18 : 10000);
    const isSpinning = ['committing', 'waiting', 'revealing', 'ready_to_reveal'].includes(gameState);
    const isSpinDisabled = isPending || isSpinning || (maxSafeBet !== undefined && parseTokenAmount(betAmount) > maxSafeBet);

    const getButtonText = () => {
        if (!isConnected) return t.connectWallet || 'Connect Wallet';
        if (isPending) return t.processing || 'Processing...';
        if (gameState === 'result') return t.playAgain || 'Play Again';
        if (gameState === 'ready_to_reveal') return t.revealNow || 'Reveal Now!';
        if (isSpinning) return t.spinning || 'Spinning...';
        if (allowance !== undefined && allowance < parseTokenAmount(betAmount)) return t.approve || 'Approve';
        return t.spin || 'SPIN';
    };

    const panelDefs: { id: PanelId; icon: string; title: string; description: string }[] = [
        { id: 'profile', icon: '👤', title: t.myProfile || 'My Profile', description: t.myProfileDesc || 'View your stats and history' },
        { id: 'leaderboard', icon: '🏆', title: t.leaderboardTitle || 'Leaderboard', description: t.leaderboardDesc || 'Top winners and rankings' },
        { id: 'history', icon: '📜', title: t.globalHistory || 'Global History', description: t.historyDesc || 'Recent bets and payouts globally' },
        { id: 'payout', icon: '📊', title: t.payTable || 'Payout Table', description: t.payoutDesc || 'Winning combinations and multipliers' },
        { id: 'verify', icon: '✅', title: t.verify || 'Verify Fair', description: t.verifyDesc || 'Verify spin randomness on-chain' },
        { id: 'house', icon: '🏠', title: t.houseTitle || 'House Dashboard', description: t.houseDesc || 'Manage your casino pools' },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            // Gradient fallback - street_bg.png no longer exists
            background: "url('/games/slots/assets/street_bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <Toaster position="top-center" />

            {/* PWA Splash Screen with Video Intro */}
            <SplashScreen />

            {/* PWA Install Banner */}
            <PWAInstallBanner lang={lang} />

            {/* Black overlay for better readability */}
            <div style={{
                position: 'fixed', inset: 0,
                background: 'rgba(5, 2, 10, 0.65)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Atmospheric Rain Effect */}
            <RainEffect />

            {/* Atmospheric Fog at bottom */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '40%',
                background: 'linear-gradient(0deg, rgba(0, 191, 255, 0.2) 0%, transparent 100%)',
                pointerEvents: 'none', zIndex: 1,
            }} />

            {/* Header Bar - Static at Top */}
            <div style={{
                position: 'relative',
                zIndex: 100,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                paddingTop: 15,
                paddingBottom: 10,
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '6px 10px',
                    background: 'linear-gradient(135deg, rgba(0, 15, 35, 0.85) 0%, rgba(0, 30, 50, 0.8) 100%)',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(0, 191, 255, 0.25)',
                    borderRadius: 35,
                    gap: 12,
                    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 191, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}>
                    {/* Back to GameFi Button - Compact */}
                    <Link href="/gamefi" style={{ textDecoration: 'none' }} onClick={() => slotsSounds.click()}>
                        <div
                            className="back-to-gamefi-btn"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                height: 42,
                                background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 128, 255, 0.15) 100%)',
                                border: '1px solid rgba(0, 191, 255, 0.4)',
                                borderRadius: 20,
                                padding: '0 16px',
                                color: '#00BFFF',
                                fontSize: 11, fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 0 12px rgba(0, 191, 255, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                                position: 'relative',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 191, 255, 0.4) 0%, rgba(0, 128, 255, 0.3) 100%)';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 191, 255, 0.5), 0 0 50px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                                e.currentTarget.style.borderColor = 'rgba(0, 220, 255, 0.8)';
                                e.currentTarget.style.color = '#66D9FF';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 128, 255, 0.15) 100%)';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                                e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.5)';
                                e.currentTarget.style.color = '#00BFFF';
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 191, 255, 0.4), inset 0 2px 4px rgba(0,0,0,0.3)';
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 191, 255, 0.5), 0 0 50px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                            }}
                        >
                            <span style={{
                                fontSize: 14,
                                animation: 'arrowPulse 1.5s ease-in-out infinite',
                                filter: 'drop-shadow(0 0 4px rgba(0, 191, 255, 0.7))',
                            }}>←</span>
                            <span style={{
                                letterSpacing: 0.5,
                                textShadow: '0 0 8px rgba(0, 191, 255, 0.4)',
                            }}>GameFi</span>
                        </div>
                    </Link>

                    {/* Separator */}
                    <div style={{
                        width: 1,
                        height: 24,
                        background: 'linear-gradient(180deg, transparent, rgba(0, 191, 255, 0.3), transparent)',
                    }} />

                    {/* Center: Balance Widget - Enforced Height wrapper */}
                    <div data-tour="balance-display" style={{ height: 42, display: 'flex', alignItems: 'center' }}>
                        <AnimatedBalanceWidget primaryColor="#00f5ff" />
                    </div>

                    {/* Separator */}
                    <div style={{
                        width: 1,
                        height: 24,
                        background: 'linear-gradient(180deg, transparent, rgba(0, 191, 255, 0.3), transparent)',
                    }} />

                    {/* Right Side: Language + Wallet */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
                        {/* Tutorial Help Button */}
                        <div
                            data-tour="help-button"
                            onClick={() => {
                                setShowOnboardingTour(true);
                                slotsSounds.click();
                            }}
                            className="nav-button"
                            style={{
                                height: 42,
                                width: 42,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 15, 30, 0.9) 100%)',
                                border: '1px solid rgba(0, 191, 255, 0.25)',
                                borderRadius: '50%',
                                color: '#00BFFF',
                                cursor: 'pointer',
                                fontSize: 18,
                                fontWeight: 700,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxSizing: 'border-box',
                                userSelect: 'none',
                                boxShadow: '0 0 12px rgba(0, 191, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 191, 255, 0.4) 0%, rgba(0, 128, 255, 0.3) 100%)';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 191, 255, 0.5), 0 0 40px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                                e.currentTarget.style.borderColor = 'rgba(0, 220, 255, 0.8)';
                                e.currentTarget.style.color = '#66D9FF';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 15, 30, 0.9) 100%)';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 191, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.25)';
                                e.currentTarget.style.color = '#00BFFF';
                            }}
                        >
                            ?
                        </div>

                        {/* Custom Language Selector */}
                        <div data-tour="language-selector" style={{ position: 'relative', height: '100%' }}>
                            <div
                                onClick={() => {
                                    setLangMenuOpen(!langMenuOpen);
                                    slotsSounds.click();
                                }}
                                className="nav-button"
                                style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '0 16px',
                                    background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 15, 30, 0.9) 100%)',
                                    border: '1px solid rgba(0, 191, 255, 0.25)',
                                    borderRadius: 9999, // Fully rounded
                                    color: '#00BFFF',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxSizing: 'border-box',
                                    userSelect: 'none',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 191, 255, 0.4) 0%, rgba(0, 128, 255, 0.3) 100%)';
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 191, 255, 0.5), 0 0 50px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 220, 255, 0.8)';
                                    e.currentTarget.style.color = '#66D9FF';
                                }}
                                onMouseLeave={(e) => {
                                    if (!langMenuOpen) {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 20, 40, 0.8) 0%, rgba(0, 15, 30, 0.9) 100%)';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.25)';
                                        e.currentTarget.style.color = '#00BFFF';
                                    }
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                    e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 191, 255, 0.4), inset 0 2px 4px rgba(0,0,0,0.3)';
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 191, 255, 0.5), 0 0 50px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{
                                    { 'en': '🇺🇸', 'vi': '🇻🇳', 'zh': '🇨🇳', 'ko': '🇰🇷', 'ru': '🇷🇺', 'id': '🇮🇩' }[lang]
                                }</span>
                                <span>{lang.toUpperCase()}</span>
                                <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
                            </div>

                            {/* Dropdown Menu */}
                            {langMenuOpen && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                                        onClick={() => setLangMenuOpen(false)}
                                    />
                                    <div
                                        className="custom-scrollbar"
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 8px)',
                                            right: 0,
                                            width: 150,
                                            maxHeight: 200, // Limit height for scroll
                                            overflowY: 'auto', // Enable scroll
                                            background: 'rgba(0, 20, 40, 0.95)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(0, 191, 255, 0.3)',
                                            borderRadius: 16,
                                            padding: 6,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                            zIndex: 1000,
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0, 191, 255, 0.2)',
                                            animation: 'slideDown 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                                        }}
                                    >
                                        {[
                                            { code: 'en', flag: '🇺🇸', label: 'English' },
                                            { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
                                            { code: 'zh', flag: '🇨🇳', label: '中文' },
                                            { code: 'ko', flag: '🇰🇷', label: '한국어' },
                                            { code: 'ru', flag: '🇷🇺', label: 'Русский' },
                                            { code: 'id', flag: '🇮🇩', label: 'Indonesia' }
                                        ].map((item) => (
                                            <div
                                                key={item.code}
                                                onClick={() => {
                                                    setLang(item.code as SlotsLanguage);
                                                    localStorage.setItem('banmao_language', item.code);
                                                    slotsSounds.click();
                                                    setLangMenuOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 12px',
                                                    borderRadius: 10,
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                    background: lang === item.code ? 'rgba(0, 191, 255, 0.2)' : 'transparent',
                                                    color: lang === item.code ? '#ffffff' : '#00BFFF',
                                                    fontWeight: lang === item.code ? 700 : 500,
                                                    transition: 'all 0.2s',
                                                    fontSize: 12,
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (lang !== item.code) {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.color = '#66D9FF';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (lang !== item.code) {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.color = '#00BFFF';
                                                    }
                                                }}
                                            >
                                                <span style={{ fontSize: 16 }}>{item.flag}</span>
                                                <span>{item.label}</span>
                                                {lang === item.code && <span style={{ marginLeft: 'auto', color: '#00f5ff' }}>✓</span>}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Wallet Connect */}
                        <div
                            data-tour="wallet-connect"
                            className="nav-button"
                            style={{
                                borderRadius: 9999, // Fully rounded
                                overflow: 'hidden',
                                border: '1px solid rgba(0, 191, 255, 0.25)',
                                height: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                paddingLeft: 4,
                                paddingRight: 4,
                                width: 'auto',
                                minWidth: 42,
                                justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 191, 255, 0.4) 0%, rgba(0, 128, 255, 0.3) 100%)';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 191, 255, 0.5), 0 0 50px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                                e.currentTarget.style.borderColor = 'rgba(0, 220, 255, 0.8)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'rgba(0, 191, 255, 0.25)';
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 191, 255, 0.4), inset 0 2px 4px rgba(0,0,0,0.3)';
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 191, 255, 0.5), 0 0 50px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                            }}
                        >
                            {/* Wrapper to control ConnectButton internal sizing or just scale it fit */}
                            <div style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}>
                                <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* CSS for arrow pulse animation */}
            <style jsx global>{`
                @keyframes arrowPulse {
                    0%, 100% { transform: translateX(0); opacity: 1; }
                    50% { transform: translateX(-3px); opacity: 0.7; }
                }
            `}</style>

            {/* macOS-style Bottom Dock */}
            <MacOSDock
                triggerImage="/ui/dock/dock-apps.png"
                items={[
                    { id: 'profile', icon: '👤', image: '/ui/dock/dock-profile.png', label: t.myProfile || 'Profile', isActive: openPanels.has('profile') && !minimizedPanels.includes('profile'), isMinimized: minimizedPanels.includes('profile'), onClick: () => minimizedPanels.includes('profile') ? restorePanel('profile') : (openPanels.has('profile') ? closePanel('profile') : openPanel('profile')) },
                    { id: 'leaderboard', icon: '🏆', image: '/ui/dock/dock-trophy.png', label: t.leaderboardTitle || 'Leaderboard', isActive: openPanels.has('leaderboard') && !minimizedPanels.includes('leaderboard'), isMinimized: minimizedPanels.includes('leaderboard'), onClick: () => minimizedPanels.includes('leaderboard') ? restorePanel('leaderboard') : (openPanels.has('leaderboard') ? closePanel('leaderboard') : openPanel('leaderboard')) },
                    { id: 'history', icon: '📜', image: '/ui/dock/dock-history.png', label: t.globalHistory || 'History', isActive: openPanels.has('history') && !minimizedPanels.includes('history'), isMinimized: minimizedPanels.includes('history'), onClick: () => minimizedPanels.includes('history') ? restorePanel('history') : (openPanels.has('history') ? closePanel('history') : openPanel('history')) },
                    { id: 'payout', icon: '📊', image: '/ui/dock/dock-payout.png', label: t.payTable || 'Payouts', isActive: openPanels.has('payout') && !minimizedPanels.includes('payout'), isMinimized: minimizedPanels.includes('payout'), onClick: () => minimizedPanels.includes('payout') ? restorePanel('payout') : (openPanels.has('payout') ? closePanel('payout') : openPanel('payout')) },
                    { id: 'verify', icon: '✅', image: '/ui/dock/dock-verify.png', label: t.verify || 'Verify', isActive: openPanels.has('verify') && !minimizedPanels.includes('verify'), isMinimized: minimizedPanels.includes('verify'), onClick: () => minimizedPanels.includes('verify') ? restorePanel('verify') : (openPanels.has('verify') ? closePanel('verify') : openPanel('verify')) },
                    { id: 'house', icon: '🏠', image: '/ui/dock/dock-house.png', label: t.houseTitle || 'House Dashboard', isActive: openPanels.has('house') && !minimizedPanels.includes('house'), isMinimized: minimizedPanels.includes('house'), onClick: () => minimizedPanels.includes('house') ? restorePanel('house') : (openPanels.has('house') ? closePanel('house') : openPanel('house')), highlight: 'gold' },
                ]}
            />

            {/* Main Street Content */}
            <div style={{ paddingTop: 10, position: 'relative', zIndex: 2 }}>
                {/* Street Title - Using LogoHeader Component */}
                <LogoHeader />

                {/* Pool Search Bar - Synchronized with Logo */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 15,
                    marginTop: 15,
                    marginBottom: 15,
                    padding: '0 20px'
                }}>
                    <div
                        data-tour="pool-search"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.4) 0%, rgba(0, 50, 80, 0.5) 50%, rgba(0, 30, 60, 0.4) 100%)',
                            border: '1px solid rgba(0, 191, 255, 0.4)',
                            borderRadius: 50,
                            padding: '10px 20px',
                            backdropFilter: 'blur(15px)',
                            boxShadow: '0 0 15px rgba(0, 191, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}>
                        <span style={{ fontSize: 16, filter: 'drop-shadow(0 0 5px #00BFFF)' }}>🔍</span>
                        <input
                            type="text"
                            value={poolSearchId}
                            onChange={(e) => setPoolSearchId(e.target.value.replace(/\D/g, ''))}
                            placeholder={t.searchPoolById || 'Search Pool by ID...'}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#00BFFF',
                                fontSize: 13,
                                width: 160,
                                fontFamily: "'Space Mono', monospace",
                                letterSpacing: 1
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && poolSearchId) {
                                    setViewingPoolId(BigInt(poolSearchId));
                                    setPoolSearchId('');
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                if (poolSearchId) {
                                    setViewingPoolId(BigInt(poolSearchId));
                                    setPoolSearchId('');
                                }
                            }}
                            disabled={!poolSearchId}
                            style={{
                                background: poolSearchId
                                    ? 'linear-gradient(90deg, #00BFFF, #0080FF)'
                                    : 'rgba(0, 191, 255, 0.2)',
                                border: poolSearchId ? '1px solid #00BFFF' : '1px solid rgba(0, 191, 255, 0.3)',
                                borderRadius: 20,
                                padding: '6px 16px',
                                color: poolSearchId ? '#fff' : 'rgba(0, 191, 255, 0.5)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: poolSearchId ? 'pointer' : 'default',
                                transition: 'all 0.3s',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                boxShadow: poolSearchId ? '0 0 15px rgba(0, 191, 255, 0.4)' : 'none'
                            }}
                        >
                            {t.search || 'Search'}
                        </button>
                    </div>
                </div>

                {/* Responsive Grid Layout for Slot Machines */}
                <div
                    data-tour="slot-machines-area"
                    className="slot-machines-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 30,
                        padding: '20px 30px',
                        maxWidth: 1200,
                        margin: '0 auto',
                        justifyItems: 'center',
                    }}>
                    {pools.map((pool) => (
                        <SlotMachine
                            key={pool.poolId.toString()}
                            pool={pool}
                            onClick={() => handleSelectMachine(pool)}
                            isSelected={selectedPoolId === pool.poolId}
                        />
                    ))}
                </div>

                {/* Empty State */}
                {pools.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 60, color: 'rgba(200, 180, 255, 0.6)' }}>
                        <div style={{ fontSize: 64, marginBottom: 20 }}>🎰</div>
                        <div style={{ fontSize: 20, marginBottom: 10 }}>{t.noMachinesAvailable || 'No machines available'}</div>
                        <div style={{ fontSize: 14 }}>{t.beFirstOwner || 'Be the first to become a house owner!'}</div>
                    </div>
                )}
            </div>

            {/* Floating button removed - now integrated in right menu */}

            {/* Slot Machine Windows (Samsung DeX Style) */}
            {
                Array.from(openMachineWindows).map((poolIdStr) => {
                    // Use live pools data, fallback to cached data if not found (prevents disappearance)
                    const pool = pools.find(p => p.poolId.toString() === poolIdStr) || cachedPoolsData[poolIdStr];
                    if (!pool) return null;
                    return (
                        <SlotMachineWindow
                            key={poolIdStr}
                            pool={pool}
                            isOpen={true}
                            onClose={() => closeMachineWindow(poolIdStr)}
                            onMinimize={() => minimizeMachineWindow(poolIdStr)}
                            zIndex={machineZIndex[poolIdStr] || 100}
                            onFocus={() => focusMachineWindow(poolIdStr)}
                            defaultPosition={machinePositions[poolIdStr] || { x: 150, y: 100 }}
                            dataTour={poolIdStr === '1' ? 'slot-machine-window' : undefined}
                            // Shared blockchain state
                            activePoolId={selectedPoolId}
                            sharedGameState={gameState}
                            sharedResult={result}
                            isPending={isPending}
                            hasPendingCommit={pendingCommit && Array.isArray(pendingCommit) && pendingCommit[2] > BigInt(0)}
                            lastTxHash={null} // TODO: Track last reveal txHash when needed
                            lastSeed={lastSeed}
                            // Expiry handling
                            currentBlock={blockNumber}
                            commitExpiryBlocks={commitExpiryBlocks}
                            commitBlock={pendingCommit && Array.isArray(pendingCommit) ? pendingCommit[3] : undefined}
                            pendingCommitPoolId={pendingCommit && Array.isArray(pendingCommit) ? pendingCommit[0] : undefined}
                            // Action callbacks
                            onSpinClick={(targetPoolId, bet, seed) => {
                                setSelectedPoolId(targetPoolId);
                                setPoolId(targetPoolId);
                                setBetAmount(bet);
                                setLastBetAmount(bet); // Save bet amount for recording to database
                                setCustomSeed(seed);
                                // Trigger spin after state update
                                setTimeout(() => {
                                    if (!isConnected) { openConnectModal?.(); return; }
                                    const betParsed = parseTokenAmount(bet);
                                    if (allowance === undefined || allowance < betParsed) handleApprove(bet);
                                    else handleCommit(bet, seed, targetPoolId);
                                }, 50);
                            }}
                            onRevealClick={handleReveal}
                            onRefundClick={handleRefund}
                            setActivePool={(targetPoolId) => {
                                setSelectedPoolId(targetPoolId);
                                setPoolId(targetPoolId);
                            }}
                            SLOT_SYMBOLS={SLOT_SYMBOLS}
                            formatTokenAmount={formatTokenAmount}
                            getButtonText={(gs, isActive) => {
                                if (!isConnected) return t.connectWallet || 'Connect Wallet';
                                if (!isActive) return t.spin || '🎰 SPIN';
                                if (isPending) return t.processing || '⏳ Processing...';
                                if (gs === 'approving') return t.approving || '⏳ Approving...';
                                if (gs === 'committing') return t.spinning || '🎲 Spinning...';
                                if (gs === 'waiting') return t.waiting || '⏳ Waiting...';
                                if (gs === 'ready_to_reveal') return t.claimResult || '🎲 CLAIM';
                                if (gs === 'revealing') return t.revealing || '✨ Revealing...';
                                if (gs === 'result') return t.playAgain || '🔄 Play Again';
                                return t.spin || '🎰 SPIN';
                            }}
                            t={t}
                            language={lang}
                            onSelectSpin={handleSelectSpin}
                            onOpenVerify={() => openPanel('verify')}
                            spinCount={spinCount}
                            setSpinCount={setSpinCount}
                            multiResults={multiResults}
                            isMultiSpinning={isMultiSpinning}
                            lastBetAmount={lastBetAmount}
                            clearMultiResults={clearMultiResults}
                            allowance={allowance}
                            onApproveClick={(amount) => handleApprove(amount)}
                            onPrepareNextSpin={prepareForNextSpin}
                            maxSpinsPerMinute={maxSpinsPerMinute}
                        />
                    );
                })
            }

            {/* Multi-Spin Results Modal - Rendered at page level for proper z-index */}
            {
                spinCount > 1 && multiResults.length === spinCount && (
                    <MultiSpinResultsModal
                        isOpen={true}
                        onClose={() => {
                            clearMultiResults?.();
                        }}
                        results={multiResults}
                        spinCount={spinCount}
                        betPerSpin={Number(lastBetAmount) || 0}
                        totalBet={(Number(lastBetAmount) || 0) * spinCount}
                        mainSeed={lastSeed || ''}
                        t={t}
                        onSelectResult={(result) => {
                            handleSelectSpin(result);
                        }}
                        zIndex={multiSpinZIndex}
                        onFocus={() => {
                            // Update z-index when modal is clicked so it stays on top
                            setTopZIndex(prev => {
                                const newZ = prev + 1;
                                setMultiSpinZIndex(newZ + 1000);
                                return newZ;
                            });
                        }}
                    />
                )
            }

            {/* Machine Windows Taskbar (for minimized machines) */}
            {
                minimizedMachines.length > 0 && (
                    <div style={{
                        position: 'fixed',
                        bottom: 70,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 8,
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, rgba(15, 5, 30, 0.95) 0%, rgba(25, 10, 45, 0.9) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0, 245, 255, 0.4)',
                        borderRadius: 16,
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 245, 255, 0.2)',
                        zIndex: 9998,
                    }}>
                        {minimizedMachines.map((poolIdStr) => {
                            const pool = pools.find(p => p.poolId.toString() === poolIdStr);
                            if (!pool) return null;
                            const tier = pool.tier || 'bronze';
                            const tierIcon = tier === 'diamond' ? '💎' : tier === 'platinum' ? '⚪' : tier === 'gold' ? '🏆' : tier === 'silver' ? '🥈' : '🥉';
                            return (
                                <button
                                    key={poolIdStr}
                                    onClick={() => restoreMachineWindow(poolIdStr)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(0, 191, 255, 0.2) 100%)',
                                        border: '1px solid rgba(0, 245, 255, 0.4)',
                                        borderRadius: 10,
                                        color: '#00f5ff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontFamily: "'Space Mono', monospace",
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}
                                    title={`Restore ${pool.name}`}
                                >
                                    <span>{tierIcon}</span>
                                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pool.name}</span>
                                </button>
                            );
                        })}
                    </div>
                )
            }

            {/* Panels - Positioned near right menu */}
            <DraggablePanel id="profile" title={t.myProfile || 'My Profile'} icon="👤" image="/ui/dock/dock-profile.png" isOpen={openPanels.has('profile')} onClose={() => closePanel('profile')} onMinimize={() => minimizePanel('profile')} zIndex={panelZIndex.profile} onFocus={() => bringToFront('profile')} defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 500), y: 100 }} defaultSize={{ width: 420, height: 500 }}>
                {myProfile ? (
                    <div>
                        <SlotsProfileCard profile={myProfile} t={t} onEditProfile={slotsProfile.startEditing} banmaoBalance={userBanmaoBalance as bigint | undefined} okbBalance={userOkbBalance?.value} playerStats={myDbStats} />
                        {/* My Personal Spin History Section */}
                        <div style={{ marginTop: 16, borderTop: '1px solid rgba(0, 191, 255, 0.3)', paddingTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#00f5ff', marginBottom: 8 }}>📝 {t.stats || 'My Spin History'}</div>

                            {/* History Table Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '0.8fr 1fr 1.5fr 1fr 1fr',
                                padding: '0 10px 8px',
                                fontSize: 9,
                                color: '#94a3b8',
                                borderBottom: '1px solid rgba(0, 191, 255, 0.2)',
                                marginBottom: 4,
                                textTransform: 'uppercase',
                                fontWeight: 700
                            }}>
                                <div>{t.timeLabel || "Time"}</div>
                                <div>{t.poolLabel || "Pool"}</div>
                                <div style={{ textAlign: 'center' }}>{t.resultLabel || "Result"}</div>
                                <div style={{ textAlign: 'right' }}>{t.betLabelShort || "Bet"}</div>
                                <div style={{ textAlign: 'right' }}>{t.payoutLabel || "Payout"}</div>
                            </div>

                            <div style={{ maxHeight: 220, overflow: 'auto' }} className="hide-scrollbar">
                                {personalHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'rgba(200, 180, 255, 0.5)', fontSize: 10, padding: 10 }}>{t.noWinnersYet || 'No history yet'}</div>
                                ) : (
                                    groupHistoryByTx(personalHistory).slice(0, 30).map((group, i) => {
                                        const isMulti = group.isMulti;
                                        const count = group.count;

                                        const betAmount = isMulti ? group.totalBet : group.items[0].betAmount;
                                        const payoutAmount = isMulti ? group.totalPayout : group.items[0].payout;

                                        const betFormatted = Number(betAmount) > 1e15 ? Number(betAmount) / 1e18 : Number(betAmount);
                                        const payoutFormatted = Number(payoutAmount) > 1e15 ? Number(payoutAmount) / 1e18 : Number(payoutAmount);
                                        const isWin = payoutFormatted > 0;

                                        return (
                                            <div
                                                key={group.id || i}
                                                onClick={() => handleSelectSpin(isMulti ? group.items : group.items[0])}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '0.8fr 1fr 1.5fr 1fr 1fr',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    borderBottom: '1px solid rgba(0, 191, 255, 0.1)',
                                                    fontSize: 10,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    position: 'relative'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 191, 255, 0.1)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                {isMulti && (
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, width: '2px', height: '100%',
                                                        background: 'linear-gradient(180deg, #a855f7, #3b82f6)'
                                                    }} />
                                                )}

                                                {/* Time */}
                                                <div style={{ color: '#64748b', fontSize: 9 }}>
                                                    {group.timestamp ? new Date(group.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </div>

                                                {/* Pool */}
                                                <div style={{ color: '#a78bfa', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 4 }}>
                                                    {group.poolName || '--'}
                                                </div>

                                                {/* Result */}
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    {isMulti ? (
                                                        <div style={{
                                                            color: '#a855f7', fontWeight: 800, fontSize: 9, padding: '1px 4px',
                                                            background: 'rgba(168, 85, 247, 0.1)', borderRadius: 4, border: '1px solid rgba(168, 85, 247, 0.2)'
                                                        }}>
                                                            ⚡ x{count}
                                                        </div>
                                                    ) : (
                                                        (() => {
                                                            const spin = group.items[0];
                                                            let symbolArr: number[] = [];
                                                            if (spin.result && Array.isArray(spin.result)) symbolArr = spin.result.slice(0, 5);
                                                            else if (spin.symbols && typeof spin.symbols === 'string') symbolArr = spin.symbols.split(',').map(Number).filter((n: number) => !isNaN(n)).slice(0, 5);

                                                            return symbolArr.length > 0 && (
                                                                <div style={{ display: 'flex', gap: 1 }}>
                                                                    {symbolArr.map((symIdx: number, j: number) => (
                                                                        <span key={j} style={{ fontSize: 11, opacity: isWin ? 1 : 0.6 }}>{SLOT_SYMBOLS[symIdx] || '❓'}</span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                </div>

                                                {/* Bet */}
                                                <div style={{ textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 }}>
                                                    {betFormatted.toLocaleString(undefined, { maximumFractionDigits: (betFormatted < 1 ? 2 : 0) })}
                                                </div>

                                                {/* Payout */}
                                                <div style={{
                                                    textAlign: 'right', fontWeight: 700, fontSize: 10, fontFamily: 'monospace',
                                                    color: isWin ? '#22c55e' : '#ef4444'
                                                }}>
                                                    {isWin ? `+${payoutFormatted.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : (t.lostLabel || 'Lost')}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(200, 180, 255, 0.6)', padding: 20 }}>{t.connectWallet || 'Connect wallet'}</div>
                )}
            </DraggablePanel>

            <DraggablePanel id="verify" title={t.verify || 'Verify Fair'} icon="✅" image="/ui/dock/dock-verify.png" isOpen={openPanels.has('verify')} onClose={() => closePanel('verify')} onMinimize={() => minimizePanel('verify')} zIndex={panelZIndex.verify || 10000} onFocus={() => bringToFront('verify')} defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 420), y: 200 }}>
                <div style={{ padding: 12 }}>
                    {/* Info Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(0, 245, 255, 0.1) 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 15,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <span style={{ fontSize: 20 }}>🔒</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 2 }}>
                                {t.provablyFair || 'Provably Fair'}
                            </div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
                                {t.allResultsVerifiable || 'All results can be verified on-chain!'}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowHowItWorks(!showHowItWorks)}
                            style={{
                                padding: '4px 8px',
                                background: 'rgba(0, 245, 255, 0.1)',
                                border: '1px solid rgba(0, 245, 255, 0.3)',
                                borderRadius: 6,
                                color: '#00f5ff',
                                fontSize: 9,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            {t.howItWorks || 'How it works'} {showHowItWorks ? '▲' : '▼'}
                        </button>
                    </div>

                    {/* Educational Section - Collapsible */}
                    {showHowItWorks && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(0, 245, 255, 0.2)',
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 15,
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.8)'
                        }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                <div style={{ flex: 1, textAlign: 'center', padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 18, marginBottom: 4 }}>1️⃣</div>
                                    <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>COMMIT</div>
                                    <div style={{ fontSize: 9 }}>{t.commitStep || 'You create a seed, hash is sent to blockchain'}</div>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', padding: 8, background: 'rgba(168, 85, 247, 0.1)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 18, marginBottom: 4 }}>2️⃣</div>
                                    <div style={{ fontWeight: 700, color: '#a855f7', marginBottom: 2 }}>REVEAL</div>
                                    <div style={{ fontSize: 9 }}>{t.revealStep || 'You reveal seed, result = hash(seed + block + player)'}</div>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', padding: 8, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 18, marginBottom: 4 }}>3️⃣</div>
                                    <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: 2 }}>VERIFY</div>
                                    <div style={{ fontSize: 9 }}>{t.verifyStep || 'Seed is emitted in event, anyone can verify'}</div>
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: 6,
                                padding: 8,
                                fontSize: 9,
                                color: '#22c55e',
                                textAlign: 'center'
                            }}>
                                ✅ {t.fairnessGuarantee || 'Nobody (including House) can cheat because result depends on blockHash + your seed!'}
                            </div>
                        </div>
                    )}

                    {/* Input Form */}
                    <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#00f5ff', marginBottom: 10 }}>
                            🔍 {t.verifySpinResult || 'Verify Spin Result'}
                        </div>

                        {/* TxHash Input with Paste + Explorer buttons */}
                        <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>
                                Transaction Hash *
                            </label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    placeholder={t.enterTxHash || 'Enter TxHash...'}
                                    value={manualVerifyTxHash}
                                    onChange={(e) => setManualVerifyTxHash(e.target.value)}
                                    style={{
                                        flex: 1, padding: '8px',
                                        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 245, 255, 0.3)', borderRadius: 6,
                                        color: '#fff', fontSize: 10, fontFamily: 'monospace'
                                    }}
                                />
                                <button
                                    onClick={async () => {
                                        try {
                                            const text = await navigator.clipboard.readText();
                                            setManualVerifyTxHash(text);
                                        } catch (e) { console.log('Clipboard access denied'); }
                                    }}
                                    title={t.paste || 'Paste'}
                                    style={{
                                        padding: '8px 10px',
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: 6,
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: 12
                                    }}
                                >📋</button>
                                {manualVerifyTxHash && (
                                    <a
                                        href={`https://web3.okx.com/explorer/x-layer/tx/${manualVerifyTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={t.openExplorer || 'Open in Explorer'}
                                        style={{
                                            padding: '8px 10px',
                                            background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: 6,
                                            color: '#60a5fa',
                                            textDecoration: 'none',
                                            fontSize: 12,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >🔗</a>
                                )}
                            </div>
                        </div>

                        {/* Spin Index for multi-spin */}
                        <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>
                                {t.spinNumber || 'Spin #'} ({t.forMultiSpin || 'for multi-spin only'})
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="1"
                                value={manualVerifySpinIndex}
                                onChange={(e) => setManualVerifySpinIndex(e.target.value)}
                                style={{
                                    width: 80, padding: '8px',
                                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 6,
                                    color: '#fbbf24', fontSize: 10, fontFamily: 'monospace', textAlign: 'center'
                                }}
                            />
                        </div>

                        {/* Verify Button */}
                        <button
                            onClick={handleManualVerify}
                            disabled={isVerifying || !manualVerifyTxHash}
                            style={{
                                width: '100%', padding: '10px',
                                background: isVerifying ? 'rgba(59, 130, 246, 0.5)' :
                                    !manualVerifyTxHash ? 'rgba(100,100,100,0.3)' :
                                        'linear-gradient(90deg, #00f5ff 0%, #3b82f6 100%)',
                                border: 'none', borderRadius: 8,
                                color: !manualVerifyTxHash ? '#666' : '#000',
                                fontWeight: 700, fontSize: 12,
                                cursor: isVerifying || !manualVerifyTxHash ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}>
                            {isVerifying ? (
                                <>{t.verifying || '⏳ Verifying...'}</>
                            ) : (
                                <>🔍 {t.verifyResultBtn || 'VERIFY RESULT'}</>
                            )}
                        </button>
                    </div>

                    {/* Result Display - Enhanced */}
                    {manualVerifyResult && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>✅ {t.verifiedResult || 'Verified Result'}</span>
                                {manualVerifyResult.totalSpins > 1 && (
                                    <span style={{ fontSize: 10, background: 'rgba(251, 191, 36, 0.2)', padding: '3px 8px', borderRadius: 6, color: '#fbbf24' }}>
                                        Spin {(manualVerifyResult.spinIndex || 0) + 1}/{manualVerifyResult.totalSpins}
                                    </span>
                                )}
                            </div>

                            {/* Symbol Row */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                                {manualVerifyResult.result.map((symIdx: number, i: number) => (
                                    <div key={i} style={{
                                        width: 36, height: 40,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: '#0f172a',
                                        border: '2px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: 6,
                                        fontSize: 20
                                    }}>
                                        {SLOT_SYMBOLS[symIdx]}
                                    </div>
                                ))}
                            </div>

                            {/* Payout */}
                            <div style={{
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: 700,
                                color: manualVerifyResult.payout > 0 ? '#4ade80' : '#94a3b8',
                                marginBottom: 8,
                                padding: '8px',
                                background: manualVerifyResult.payout > 0 ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                borderRadius: 8
                            }}>
                                {manualVerifyResult.payout > 0 ? `🎉 WIN: ${formatEther(manualVerifyResult.payout)} BANMAO` : (t.noWin || 'NO WIN')}
                            </div>

                            {manualVerifyResult.isJackpot && (
                                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#fbbf24', textShadow: '0 0 10px #fbbf24', marginBottom: 8 }}>
                                    🏆 JACKPOT WINNER!
                                </div>
                            )}

                            {/* Seed Section - Full with Copy */}
                            {manualVerifyResult.seed && (
                                <div style={{
                                    marginTop: 10,
                                    padding: 10,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 8,
                                    border: '1px solid rgba(0, 245, 255, 0.2)'
                                }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#00f5ff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        🔑 {t.seedTransparency || 'Seed (V2 Transparency)'}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: 6,
                                        alignItems: 'center',
                                        background: 'rgba(0,0,0,0.4)',
                                        padding: 8,
                                        borderRadius: 6
                                    }}>
                                        <code style={{
                                            flex: 1,
                                            fontSize: 8,
                                            color: '#94a3b8',
                                            wordBreak: 'break-all',
                                            fontFamily: 'monospace'
                                        }}>
                                            {manualVerifyResult.seed.toString()}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(manualVerifyResult.seed.toString());
                                            }}
                                            title={t.copySeed || 'Copy Seed'}
                                            style={{
                                                padding: '4px 8px',
                                                background: 'rgba(0, 245, 255, 0.1)',
                                                border: '1px solid rgba(0, 245, 255, 0.3)',
                                                borderRadius: 4,
                                                color: '#00f5ff',
                                                cursor: 'pointer',
                                                fontSize: 10
                                            }}
                                        >📋</button>
                                    </div>
                                </div>
                            )}

                            {/* Player & Pool Info */}
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span>👤 Player:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{manualVerifyResult.player.slice(0, 8)}...{manualVerifyResult.player.slice(-6)}</span>
                                </div>
                                {manualVerifyResult.poolId && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span>🏠 Pool:</span>
                                        <span>#{manualVerifyResult.poolId.toString()}</span>
                                    </div>
                                )}
                                <a
                                    href={`https://web3.okx.com/explorer/x-layer/tx/${manualVerifyTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        marginTop: 8,
                                        padding: '6px',
                                        background: 'rgba(96, 165, 250, 0.1)',
                                        border: '1px solid rgba(96, 165, 250, 0.3)',
                                        borderRadius: 6,
                                        color: '#60a5fa',
                                        fontSize: 10,
                                        textDecoration: 'none'
                                    }}
                                >
                                    🔗 {t.viewOnExplorer || 'View on Explorer'}
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </DraggablePanel>

            <DraggablePanel id="leaderboard" title={t.leaderboardTitle || 'Bảng Xếp Hạng'} icon="🏆" image="/ui/dock/dock-trophy.png" isOpen={openPanels.has('leaderboard')} onClose={() => closePanel('leaderboard')} onMinimize={() => minimizePanel('leaderboard')} zIndex={panelZIndex.leaderboard} onFocus={() => bringToFront('leaderboard')} defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 620), y: 150 }} defaultSize={{ width: 600, height: 600 }}>
                <TopWinnersPanel
                    winners={leaderboard}
                    onSortChange={(tab) => setLeaderboardSortBy(tab as LeaderboardSortBy)}
                    pools={pools.map(p => ({
                        poolId: p.poolId,
                        name: p.name,
                        owner: p.owner,
                        balance: p.balance,
                        totalSpins: p.totalSpins,
                        playerWins: 0, // We approximate from payout ratio
                        playerLosses: 0,
                        // Win rate calculation: If payouts > bets, players win more
                        // Approximate: payouts/bets ratio as win rate proxy
                        winRateForPlayers: p.totalBetsVolume > 0
                            ? Math.min(100, (Number(p.totalPayoutsVolume) / Number(p.totalBetsVolume)) * 100)
                            : 50
                    }))}
                    t={t}
                    onWinnerClick={(winner, rank) => setViewingPlayer({ player: winner, rank })}
                    currentPlayerAddress={address}
                />
            </DraggablePanel>

            <DraggablePanel id="payout" title={t.payTable || 'Payout Table'} icon="📊" image="/ui/dock/dock-payout.png" isOpen={openPanels.has('payout')} onClose={() => closePanel('payout')} onMinimize={() => minimizePanel('payout')} zIndex={panelZIndex.payout || 10000} onFocus={() => bringToFront('payout')} defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 500), y: 180 }} defaultSize={{ width: 400, height: 520 }}>
                <PayoutCalculator t={t} />
            </DraggablePanel>

            <DraggablePanel id="history" title={t.globalHistory || 'Global History'} icon="📜" image="/ui/dock/dock-history.png" isOpen={openPanels.has('history')} onClose={() => closePanel('history')} onMinimize={() => minimizePanel('history')} zIndex={panelZIndex.history} onFocus={() => bringToFront('history')} defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 460), y: 160 }} defaultSize={{ width: 380, height: 480 }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                    {/* Time Filter Tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, padding: '0 12px', justifyContent: 'center', flexShrink: 0 }}>
                        {(['today', 'week', 'month', 'all'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setHistoryTimeFilter(filter)}
                                style={{
                                    padding: '4px 10px', fontSize: 10, borderRadius: 12,
                                    background: historyTimeFilter === filter ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.2)',
                                    color: historyTimeFilter === filter ? '#a855f7' : '#64748b',
                                    border: historyTimeFilter === filter ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                                    cursor: 'pointer', flex: 1, textAlign: 'center',
                                    transition: 'all 0.2s ease',
                                    fontWeight: historyTimeFilter === filter ? 600 : 400
                                }}
                            >
                                {filter === 'today' ? (t.timeToday || 'Today') :
                                    filter === 'week' ? (t.timeWeek || 'Week') :
                                        filter === 'month' ? (t.timeMonth || 'Month') :
                                            (t.timeAll || 'All')}
                            </button>
                        ))}
                    </div>

                    {/* Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '0.8fr 1fr 1.5fr 1fr 1fr',
                        padding: '0 12px 8px',
                        fontSize: 10,
                        color: '#94a3b8',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        flexShrink: 0
                    }}>
                        <div>{t.timeLabel || "Time"}</div>
                        <div>{t.poolLabel || "Pool"}</div>
                        <div style={{ textAlign: 'center' }}>{t.resultLabel || "Result"}</div>
                        <div style={{ textAlign: 'right' }}>{t.betLabelShort || "Bet"}</div>
                        <div style={{ textAlign: 'right' }}>{t.payoutLabel || "Payout"}</div>
                    </div>

                    {/* Scrollable List Area */}
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="hide-scrollbar">
                        {(() => {
                            // Filter history by selected time period
                            const now = Date.now();
                            const filteredHistory = history.filter(item => {
                                const timestamp = item.timestamp || 0;
                                switch (historyTimeFilter) {
                                    case 'today': return timestamp >= now - 24 * 60 * 60 * 1000;
                                    case 'week': return timestamp >= now - 7 * 24 * 60 * 60 * 1000;
                                    case 'month': return timestamp >= now - 30 * 24 * 60 * 60 * 1000;
                                    default: return true;
                                }
                            });
                            const groupedHistory = groupHistoryByTx(filteredHistory).slice(0, 100);

                            return groupedHistory.length === 0 ?
                                <div style={{ textAlign: 'center', color: 'rgba(200, 180, 255, 0.6)', padding: 20 }}>
                                    {historyTimeFilter === 'all' ? 'No history' : `Không có lịch sử trong ${historyTimeFilter === 'today' ? '24 giờ' : historyTimeFilter === 'week' ? '7 ngày' : '30 ngày'} qua`}
                                </div> :
                                groupedHistory.map((group, i) => {
                                    const isMulti = group.isMulti;
                                    const count = group.count;
                                    const payoutNum = isMulti ? Number(group.totalPayout) / 1e18 : Number(group.items[0].payout) / 1e18;
                                    const betNum = isMulti ? Number(group.totalBet) / 1e18 : Number(group.items[0].betAmount) / 1e18;
                                    const isWin = payoutNum > 0;

                                    return (
                                        <div
                                            key={group.id || i}
                                            onClick={() => handleSelectSpin(isMulti ? group.items : group.items[0])}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '0.8fr 1fr 1.5fr 1fr 1fr',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                cursor: 'pointer',
                                                transition: 'background 0.1s',
                                                fontSize: 11,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {isMulti && (
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
                                                    background: 'linear-gradient(180deg, #a855f7, #3b82f6)'
                                                }} />
                                            )}

                                            {/* Time */}
                                            <div style={{ color: '#64748b', fontSize: 10 }}>
                                                {group.timestamp ? new Date(group.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </div>

                                            {/* Pool */}
                                            <div
                                                style={{ color: '#a78bfa', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 4, cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    if (group.poolId !== undefined) {
                                                        e.stopPropagation();
                                                        setViewingPoolId(BigInt(group.poolId));
                                                        openPanel('house');
                                                        bringToFront('house');
                                                    }
                                                }}
                                            >
                                                {group.poolName || (group.poolId !== undefined ? `#${group.poolId}` : '--')}
                                            </div>

                                            {/* Result */}
                                            <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                                {isMulti ? (
                                                    <div style={{
                                                        color: '#a855f7', fontWeight: 800, fontSize: 10, padding: '2px 6px',
                                                        background: 'rgba(168, 85, 247, 0.1)', borderRadius: 4, border: '1px solid rgba(168, 85, 247, 0.2)'
                                                    }}>
                                                        ⚡ x{count}
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const spin = group.items[0];
                                                        const resultArr = spin.result || (spin.symbols ? String(spin.symbols).split(',').map(Number) : []);
                                                        return resultArr.slice(0, 5).map((s: number, j: number) => (
                                                            <span key={j} style={{ fontSize: 12, opacity: isWin ? 1 : 0.6 }}>
                                                                {SLOT_SYMBOLS[s] || '❓'}
                                                            </span>
                                                        ));
                                                    })()
                                                )}
                                            </div>

                                            {/* Bet */}
                                            <div style={{ textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                {betNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>

                                            {/* Payout */}
                                            <div style={{
                                                textAlign: 'right', color: isWin ? '#22c55e' : '#ef4444',
                                                fontWeight: 600, fontFamily: 'monospace'
                                            }}>
                                                {isWin ? `+${payoutNum.toLocaleString(undefined, { maximumFractionDigits: (payoutNum < 1 ? 2 : 0) })}` : (t.lostLabel || 'Lost')}
                                            </div>
                                        </div>
                                    );
                                })
                        })()}
                    </div>
                </div>
            </DraggablePanel>

            {/* Pool Details Panel */}
            {
                viewingPoolId !== null && (() => {
                    const poolData = pools.find(p => p.poolId === viewingPoolId);
                    const formatBanmao = (value: bigint | undefined) => {
                        if (!value) return '0';
                        const num = Number(value) / 1e18;
                        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
                        return num.toFixed(2);
                    };
                    return (
                        <DraggablePanel
                            id="pool-details"
                            title={t.poolDetails || 'Pool Details'}
                            icon="🎱"
                            isOpen={true}
                            onClose={() => setViewingPoolId(null)}
                            zIndex={99998}
                            defaultPosition={{ x: (typeof window !== 'undefined' ? window.innerWidth / 2 - 200 : 200), y: 120 }}
                            defaultSize={{ width: 420, height: 480 }}
                        >
                            {poolData ? (
                                <div style={{ padding: 16 }}>
                                    {/* Pool Header */}
                                    <div style={{
                                        textAlign: 'center',
                                        marginBottom: 16,
                                        padding: 12,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.2), rgba(168, 85, 247, 0.1))',
                                        border: '1px solid rgba(0, 191, 255, 0.3)'
                                    }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa', textShadow: '0 0 10px rgba(0, 191, 255, 0.5)' }}>
                                            {poolData.name || `Pool #${poolData.poolId}`}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                            ID: #{poolData.poolId.toString()}
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>{t.balance || 'Balance'}</div>
                                            <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>{formatBanmao(poolData.balance)} BANMAO</div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>{t.jackpot || 'Jackpot'}</div>
                                            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>{formatBanmao(poolData.jackpot)} BANMAO</div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>{t.totalSpins || 'Total Spins'}</div>
                                            <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14 }}>{poolData.totalSpins?.toLocaleString() || 0}</div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>{t.tier || 'Tier'}</div>
                                            <div style={{ color: poolData.tier === 'diamond' ? '#60a5fa' : poolData.tier === 'gold' ? '#fbbf24' : '#9ca3af', fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{poolData.tier}</div>
                                        </div>
                                    </div>

                                    {/* Bet Limits */}
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>{t.betLimits || 'Bet Limits'}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                            <span style={{ color: '#94a3b8' }}>Min: <span style={{ color: '#22c55e', fontWeight: 600 }}>{formatBanmao(poolData.minBet)}</span></span>
                                            <span style={{ color: '#94a3b8' }}>Max: <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatBanmao(poolData.maxBet)}</span></span>
                                        </div>
                                    </div>

                                    {/* Owner */}
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' }}>{t.owner || 'Owner'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#00f5ff', fontSize: 11, fontFamily: 'monospace' }}>
                                                {poolData.owner?.slice(0, 10)}...{poolData.owner?.slice(-8)}
                                            </span>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(poolData.owner); slotsToast.copied(t); }}
                                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', padding: '2px 8px', fontSize: 9 }}
                                            >{t.copy || 'Copy'}</button>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                        <span style={{
                                            padding: '6px 16px',
                                            borderRadius: 20,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background: poolData.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: poolData.isActive ? '#22c55e' : '#ef4444',
                                            border: `1px solid ${poolData.isActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                                        }}>
                                            {poolData.isActive ? (t.active || '✅ Active') : (t.inactive || '❌ Inactive')}
                                        </span>
                                    </div>

                                    {/* Play Button */}
                                    <button
                                        onClick={() => {
                                            if (viewingPoolId) {
                                                // Add to open windows
                                                setOpenMachineWindows(prev => {
                                                    const next = new Set(prev);
                                                    next.add(viewingPoolId.toString());
                                                    return next;
                                                });
                                                // Bring to front
                                                setTopZIndex(prev => {
                                                    const newZ = prev + 1;
                                                    setMachineZIndex(prevZ => ({ ...prevZ, [viewingPoolId.toString()]: newZ }));
                                                    return newZ;
                                                });
                                                setViewingPoolId(null);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)',
                                            border: 'none',
                                            borderRadius: 12,
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 191, 255, 0.4)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        🎰 {t.playOnThisPool || 'Play on this Pool'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                                    <div style={{ color: '#64748b', fontSize: 12 }}>{t.poolNotFound || 'Pool not found in active pools'}</div>
                                    <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 8 }}>Pool ID: #{viewingPoolId?.toString()}</div>
                                </div>
                            )}
                        </DraggablePanel>
                    );
                })()
            }


            {/* PanelTaskbar removed - minimized panels now shown in MacOSDock */}


            {
                showOnboardingTour && <OnboardingTour
                    isOpen={showOnboardingTour}
                    onClose={() => setShowOnboardingTour(false)}
                    t={t}
                    onOpenPool1={() => {
                        // Open Pool #1 slot machine
                        const pool1 = pools.find(p => p.poolId.toString() === '1');
                        if (pool1) {
                            setOpenMachineWindows(prev => new Set([...prev, '1']));
                            setCachedPoolsData(prev => ({ ...prev, '1': pool1 }));
                            setMachineZIndex(prev => ({ ...prev, '1': topZIndex + 1 }));
                            setTopZIndex(prev => prev + 1);
                        }
                    }}
                />
            }


            {/* Profile Edit Modal */}
            <ProfileEditModal
                isOpen={slotsProfile.isEditing}
                onClose={slotsProfile.cancelEditing}
                onSave={async () => {
                    const success = await slotsProfile.saveChanges();
                    if (success && slotsProfile.profile) {
                        // Sync local myProfile state with updated profile
                        setMyProfile({ ...slotsProfile.profile });
                    }
                    return success;
                }}
                isSaving={slotsProfile.isSaving}
                error={slotsProfile.error}
                editCount={slotsProfile.editCount}
                maxEdits={3}
                t={t} // Pass translations
                editName={slotsProfile.editName}
                setEditName={slotsProfile.setEditName}
                editAvatar={slotsProfile.editAvatar}
                setEditAvatar={slotsProfile.setEditAvatar}
                editTelegram={slotsProfile.editTelegram}
                setEditTelegram={slotsProfile.setEditTelegram}
                editTwitter={slotsProfile.editTwitter}
                setEditTwitter={slotsProfile.setEditTwitter}
            />

            {/* House Dashboard Panel - Samsung DeX Style */}
            <DraggablePanel
                id="house"
                title={(t as any).houseTitle || 'House Dashboard'}
                icon="🏠"
                image="/ui/dock/dock-house.png"
                isOpen={openPanels.has('house')}
                onClose={() => closePanel('house')}
                onMinimize={() => minimizePanel('house')}
                zIndex={panelZIndex.house || 10000}
                onFocus={() => bringToFront('house')}
                defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 750), y: 80 }}
                defaultSize={{ width: 700, height: 600 }}
            >
                <HouseDashboardPanel
                    onClose={() => closePanel('house')}
                    lang={lang as any}
                    slotsT={t}
                    onOpenCreatePool={(data) => {
                        // Store hook data and open panel
                        setCreatePoolData(data);
                        openPanel('createPool');
                    }}
                />
            </DraggablePanel>

            {/* Create Pool DraggablePanel - Opened from House Dashboard */}
            {
                createPoolData && (
                    <DraggablePanel
                        id="createPool"
                        title={houseTranslations[lang as keyof typeof houseTranslations]?.createPool || 'Create New Pool'}
                        icon="🏗️"
                        image="/ui/dock/dock-house.png"
                        isOpen={openPanels.has('createPool')}
                        onClose={() => { closePanel('createPool'); setCreatePoolData(null); }}
                        onMinimize={() => minimizePanel('createPool')}
                        zIndex={panelZIndex.createPool || 10010}
                        onFocus={() => bringToFront('createPool')}
                        defaultPosition={{ x: Math.max(50, (typeof window !== 'undefined' ? window.innerWidth / 2 - 250 : 300)), y: 80 }}
                        defaultSize={{ width: 500, height: 600 }}
                    >
                        <CreatePoolModal
                            isOpen={true}
                            onClose={() => { closePanel('createPool'); setCreatePoolData(null); }}
                            onSubmit={createPoolData.handleCreatePool}
                            minPoolDeposit={createPoolData.minPoolDeposit}
                            tokenBalance={createPoolData.tokenBalance}
                            allowance={createPoolData.allowance}
                            onApprove={createPoolData.handleApprove}
                            isPending={createPoolData.isPending}
                            t={houseTranslations[lang as keyof typeof houseTranslations] || houseTranslations.en}
                        />
                    </DraggablePanel>
                )
            }

            {/* Spin Detail Panels - Multiple instances allowed */}
            {
                historyPanels.map((spin, index) => {
                    const tx = spin.txHash || spin.timestamp || `idx-${index}`;
                    return (
                        <DraggablePanel
                            key={`spin-detail-${tx}`}
                            id={`spin-detail-${tx}`}
                            title={t.spinDetails || 'Spin Details'}
                            icon="🎰"
                            image="/ui/dock/dock-history.png"
                            isOpen={true}
                            onClose={() => setHistoryPanels(prev => prev.filter(p => (p.txHash || p.timestamp) !== (spin.txHash || spin.timestamp)))}
                            zIndex={spin.zIndex || 99999 + index}
                            onFocus={() => handleSelectSpin(spin)}
                            defaultPosition={{
                                x: (typeof window !== 'undefined' ? Math.max(20, window.innerWidth / 2 - 200 + (index * 25)) : 200),
                                y: 100 + (index * 25)
                            }}
                            defaultSize={{ width: 420, height: 500 }}
                        >
                            <div style={{ padding: 20 }}>
                                {/* Status Header */}
                                <div style={{
                                    textAlign: 'center', marginBottom: 20, padding: 12, borderRadius: 12,
                                    background: Number(spin.payout) > 0
                                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.1))'
                                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))',
                                    border: `1px solid ${Number(spin.payout) > 0 ? '#22c55e' : '#ef4444'}40`,
                                    boxShadow: `0 0 20px ${Number(spin.payout) > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}>
                                    {(() => {
                                        const rawPayout = spin.payout;
                                        const payout = typeof rawPayout === 'string' ? Number(rawPayout) : Number(rawPayout || 0);
                                        const payoutFormatted = payout > 1e15 ? payout / 1e18 : payout;

                                        const rawBet = spin.betAmount;
                                        const bet = typeof rawBet === 'string' ? Number(rawBet) : Number(rawBet || 0);
                                        const betFormatted = bet > 1e15 ? bet / 1e18 : bet;

                                        const multiplier = betFormatted > 0 ? payoutFormatted / betFormatted : 0;

                                        return payoutFormatted > 0 ? (
                                            <>
                                                <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>
                                                    🎉 +{payoutFormatted.toLocaleString(undefined, { maximumFractionDigits: 2 })} BANMAO
                                                </div>
                                                {multiplier >= 1.1 && (
                                                    <div style={{
                                                        fontSize: 14, fontWeight: 700, color: '#fbbf24',
                                                        background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: 20,
                                                        display: 'inline-block', marginTop: 8
                                                    }}>
                                                        x{multiplier >= 10 ? multiplier.toFixed(0) : multiplier.toFixed(1)} Winner!
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ fontSize: 20, fontWeight: 600, color: '#f87171' }}>
                                                {t.noWin || 'No Win'}
                                            </div>
                                        );
                                    })()}
                                    {spin.isJackpot && (
                                        <div style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24', marginTop: 10, textShadow: '0 0 20px #fbbf24', animation: 'pulse 1s infinite' }}>
                                            🏆 {t.jackpot || 'JACKPOT'}! 🏆
                                        </div>
                                    )}
                                </div>

                                {/* Symbols Display */}
                                {(() => {
                                    let symbolArr: number[] = [];
                                    if (spin.result && Array.isArray(spin.result)) {
                                        symbolArr = spin.result.slice(0, 5);
                                    } else if (spin.symbols && Array.isArray(spin.symbols)) {
                                        symbolArr = spin.symbols.slice(0, 5);
                                    } else if (spin.symbols && typeof spin.symbols === 'string') {
                                        symbolArr = spin.symbols.split(',').map(Number).slice(0, 5);
                                    }
                                    if (symbolArr.length === 0) return null;
                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                                            {symbolArr.map((symIdx: number, j: number) => (
                                                <div key={j} style={{
                                                    width: 50, height: 50,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    border: '1px solid rgba(0, 191, 255, 0.3)',
                                                    borderRadius: "50%",
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                                    fontSize: 24
                                                }}>
                                                    {SLOT_SYMBOLS[symIdx] || '❓'}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Info Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.betAmountLabel || 'Bet Amount'}</div>
                                        <div style={{ color: '#facc15', fontWeight: 700, fontSize: 15 }}>
                                            {(() => {
                                                const rawBet = spin.betAmount;
                                                const bet = typeof rawBet === 'string' ? Number(rawBet) : Number(rawBet || 0);
                                                const betFormatted = bet > 1e15 ? bet / 1e18 : bet;
                                                return betFormatted > 0 ? betFormatted.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';
                                            })()} $BANMAO
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.payoutLabel || 'Payout'}</div>
                                        <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 15 }}>
                                            {(() => {
                                                const rawPayout = spin.payout;
                                                const payout = typeof rawPayout === 'string' ? Number(rawPayout) : Number(rawPayout || 0);
                                                const payoutFormatted = payout > 1e15 ? payout / 1e18 : payout;
                                                return payoutFormatted > 0 ? payoutFormatted.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
                                            })()} $BANMAO
                                        </div>
                                    </div>
                                </div>

                                {/* Pool Info */}
                                {(spin.poolName || spin.poolId) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 11, marginBottom: 4 }}>🎱 {t.poolLabel || 'Pool'}</div>
                                            <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13 }}>
                                                {spin.poolName || `Pool #${spin.poolId}`}
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 11, marginBottom: 4 }}>#️⃣ {t.poolIdLabel || 'Pool ID'}</div>
                                            <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13 }}>
                                                {spin.poolId !== undefined ? spin.poolId : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Time */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 11 }}>⏰ {t.timeLabel || 'Time'}</div>
                                    <div style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' }}>
                                        {spin.timestamp ? new Date(spin.timestamp).toLocaleString() : 'N/A'}
                                    </div>
                                </div>

                                {/* Technical Details (Collapsed style) */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 8 }}>
                                    {/* Player Wallet Address */}
                                    {(spin.player || spin.playerAddress) && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10 }}>👤 Player</div>
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(spin.player || spin.playerAddress); slotsToast.copied(t); }}
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', fontSize: 9 }}
                                                >{t.copy || 'Copy'}</button>
                                            </div>
                                            <div style={{ color: '#a78bfa', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.8 }}>
                                                {spin.player || spin.playerAddress}
                                            </div>
                                        </div>
                                    )}

                                    {spin.txHash && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10 }}>🔗 TxHash</div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <a
                                                        href={`https://web3.okx.com/explorer/x-layer/tx/${spin.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 9, textDecoration: 'none' }}
                                                    >🔍 View</a>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(spin.txHash); slotsToast.copied(t); }}
                                                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', fontSize: 9 }}
                                                    >{t.copy || 'Copy'}</button>
                                                </div>
                                            </div>
                                            <div style={{ color: '#60a5fa', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.8 }}>
                                                {spin.txHash}
                                            </div>
                                        </div>
                                    )}

                                    {spin.seed && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <div style={{ color: 'rgba(200, 180, 255, 0.6)', fontSize: 10 }}>🧬 Seed</div>
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(spin.seed); slotsToast.copied(t); }}
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', fontSize: 9 }}
                                                >{t.copy || 'Copy'}</button>
                                            </div>
                                            <div style={{ color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.6 }}>
                                                {spin.seed}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DraggablePanel>
                    );
                })
            }

            {/* View Player Profile Panel (Draggable) */}
            <ViewPlayerPanel
                isOpen={!!viewingPlayer}
                onClose={() => setViewingPlayer(null)}
                player={viewingPlayer?.player || null}
                t={t}
                rank={viewingPlayer?.rank}
                zIndex={panelZIndex.viewPlayer || 99999}
                onFocus={() => bringToFront('viewPlayer')}
                onSpinClick={(spin) => handleSelectSpin(spin)}
            />

            {/* Multi-Spin History Modal */}
            {
                selectedSpin && Array.isArray(selectedSpin) && (
                    <MultiSpinResultsModal
                        isOpen={true}
                        onClose={() => setSelectedSpin(null)}
                        results={selectedSpin.map(s => ({
                            ...s,
                            symbols: s.result || (s.symbols ? String(s.symbols).split(',').map(Number) : []),
                            payout: BigInt(s.payout || 0),
                            isJackpot: s.isJackpot || false,
                            poolId: s.poolId ? BigInt(s.poolId) : undefined
                        }))}
                        spinCount={selectedSpin.length}
                        betPerSpin={Number(selectedSpin[0]?.betAmount || 0) > 1e15 ? Number(selectedSpin[0]?.betAmount) / 1e18 : Number(selectedSpin[0]?.betAmount)}
                        totalBet={selectedSpin.reduce((acc, curr) => {
                            const b = Number(curr.betAmount || 0);
                            return acc + (b > 1e15 ? b / 1e18 : b);
                        }, 0)}
                        mainSeed={selectedSpin[0]?.seed || ''}
                        t={t}
                        onSelectResult={(result) => handleSelectSpin(result)}
                        zIndex={panelZIndex.multiSpin || 10000}
                        onFocus={() => bringToFront('multiSpin')}
                    />
                )
            }

            {/* Global Styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 191, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 191, 255, 0.4);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 191, 255, 0.6);
                }
            `}</style>

        </div>
    );
}
