"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import "./staking.css";
import "./responsive-layout.css";
import "./sphere-effects.css";
import "./mobile.css";
import { useStakingTranslations, Language } from "./i18n";

import { useStaking } from "./useStaking";
import { useSound } from "./hooks/useSound";
import { LOCK_OPTIONS_INFO, VIP_TIERS_INFO, BANMAO_TOKEN_ADDRESS } from "./contracts";
import { StatsPanel, StakePanel, UnstakePanel, ClaimPanel, CompoundPanel, RelockPanel, RightSidebar, LeftSidebar, LanguageSelector, StakingOnboardingTour, shouldShowStakingOnboarding, ClaimHistoryPanel } from "./components";
import { useClaimHistory } from "./hooks/useClaimHistory";

// Main staking page with real contract integration
export default function StakingPage() {
    const { t, lang, setLanguage: setLang } = useStakingTranslations();
    const { playClick, playHover } = useSound();
    const [selectedLockOption, setSelectedLockOption] = useState(1); // 30 days default
    const [stakeAmount, setStakeAmount] = useState("");
    const [unstakeAmount, setUnstakeAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
    const [txStatus, setTxStatus] = useState<string>("");
    const [showOnboardingTour, setShowOnboardingTour] = useState(false);

    // Mobile detection - skip minimized panels, go straight to expanded
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Window Manager State (DeX Style)
    type WindowId = 'stats' | 'stake' | 'unstake' | 'claim' | 'compound' | 'relock';

    interface WindowState {
        id: WindowId;
        isOpen: boolean;
        zIndex: number;
        position: { x: number; y: number };
        isMinimized: boolean;
        title: string;
    }

    const [windows, setWindows] = useState<Record<WindowId, WindowState>>({
        stats: { id: 'stats', isOpen: false, zIndex: 1, position: { x: 20, y: 80 }, isMinimized: false, title: '📊 System Stats' },
        stake: { id: 'stake', isOpen: false, zIndex: 1, position: { x: 50, y: 120 }, isMinimized: false, title: '🔒 New Stake' },
        unstake: { id: 'unstake', isOpen: false, zIndex: 1, position: { x: 80, y: 160 }, isMinimized: false, title: '🔓 Unstake' },
        claim: { id: 'claim', isOpen: false, zIndex: 1, position: { x: 110, y: 200 }, isMinimized: false, title: '💰 Claim Rewards' },
        compound: { id: 'compound', isOpen: false, zIndex: 1, position: { x: 140, y: 240 }, isMinimized: false, title: '🔄 Auto-Compound' },
        relock: { id: 'relock', isOpen: false, zIndex: 1, position: { x: 170, y: 280 }, isMinimized: false, title: '🔒 Relock Stake' },
    });

    const [nextZIndex, setNextZIndex] = useState(10);
    const [dragTarget, setDragTarget] = useState<{ id: WindowId, offsetX: number, offsetY: number } | null>(null);

    // Track which panel is expanded to center
    const [expandedPanel, setExpandedPanel] = useState<WindowId | null>(null);

    // --- 3D TILT EFFECT LOGIC (Desktop only — onMouseMove doesn't fire on touch) ---
    const sphereRef = useRef<HTMLDivElement>(null);

    const handleSphereMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isMobile || !sphereRef.current) return; // Skip tilt on mobile

        const rect = sphereRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -15;
        const rotateY = ((x - centerX) / centerX) * 15;

        sphereRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleSphereMouseLeave = () => {
        if (isMobile || !sphereRef.current) return;
        sphereRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    // Window Actions
    const openWindow = (id: WindowId) => {
        setWindows(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                isOpen: true,
                isMinimized: false,
                zIndex: nextZIndex
            }
        }));
        setNextZIndex(n => n + 1);
        // Don't close menu - keep orbs visible when panels are opened/closed
    };

    const closeWindow = (id: WindowId) => {
        setWindows(prev => ({ ...prev, [id]: { ...prev[id], isOpen: false } }));
    };

    const focusWindow = (id: WindowId) => {
        setWindows(prev => ({ ...prev, [id]: { ...prev[id], zIndex: nextZIndex } }));
        setNextZIndex(n => n + 1);
    };

    const minimizeWindow = (id: WindowId) => {
        setWindows(prev => ({ ...prev, [id]: { ...prev[id], isMinimized: !prev[id].isMinimized } }));
    };

    // Drag Logic
    const handleDragStart = (e: React.MouseEvent, id: WindowId) => {
        const win = windows[id];
        setDragTarget({
            id,
            offsetX: e.clientX - win.position.x,
            offsetY: e.clientY - win.position.y
        });
        focusWindow(id);
    };

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!dragTarget) return;
        setWindows(prev => ({
            ...prev,
            [dragTarget.id]: {
                ...prev[dragTarget.id],
                position: {
                    x: e.clientX - dragTarget.offsetX,
                    y: e.clientY - dragTarget.offsetY
                }
            }
        }));
    }, [dragTarget]);

    const handleDragEnd = useCallback(() => {
        setDragTarget(null);
    }, []);

    // Drag event listeners — skip on mobile (panels use overlay mode)
    useEffect(() => {
        if (isMobile) return; // Mobile uses expanded overlay, not draggable windows
        if (dragTarget) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [dragTarget, handleDragMove, handleDragEnd, isMobile]);

    // Radial Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Auto-show onboarding tour on first visit
    useEffect(() => {
        if (typeof window !== 'undefined' && shouldShowStakingOnboarding()) {
            const timer = setTimeout(() => setShowOnboardingTour(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Use the staking hook
    const {
        isConnected,
        address,
        userInfo,
        userSummary,
        stakeIds,
        vipTier,
        tokenBalance,
        allowance,
        pendingReward,
        globalStats,
        healthCheck,
        accRewardPerShare,
        devFee,
        approve,
        stake,
        unstake,
        unstakeById,
        unstakePartial,
        claimReward,
        autoCompound,
        emergencyWithdraw,
        donate,
        relock,
        refetchAll,
        isWritePending,
        isConfirming,
        isConfirmed,
        writeError,
        needsApproval,
        getLockOption,
        getTimeRemaining,
        formatTokenAmount,
        LOCK_OPTIONS_INFO,
    } = useStaking();


    // Claim history hook - shows ALL claims from everyone (public)
    const { claimHistory, isLoading: isClaimHistoryLoading, error: claimHistoryError } = useClaimHistory(isConfirmed);


    // --- SMOOTH REAL-TIME REWARD DISPLAY (hybrid: contract + local increment) ---
    const [displayPendingReward, setDisplayPendingReward] = useState<number>(0);
    const [showCoinAnim, setShowCoinAnim] = useState(false);
    const lastContractSync = React.useRef<number>(Date.now());

    // Calculate user's tokens per second from contract data
    const userTokensPerSecond = useMemo(() => {
        if (!userInfo?.shares || BigInt(userInfo.shares) <= BigInt(0) || !globalStats.rewardRate) return 0;

        // Use user's shares (amount × multiplier), not just amount
        const myShares = Number(formatEther(userInfo.shares));
        const totalShares = Number(formatEther(globalStats.totalShares || BigInt(1)));
        const ratePerSec = Number(formatEther(globalStats.rewardRate || BigInt(0)));

        if (totalShares === 0) return 0;

        // User's share of the reward rate (tokens/second)
        return (myShares / totalShares) * ratePerSec;
    }, [userInfo, globalStats]);

    // Sync with contract data when it updates
    useEffect(() => {
        if (pendingReward) {
            const contractValue = Number(formatEther(pendingReward));
            setDisplayPendingReward(contractValue);
            lastContractSync.current = Date.now();
        }
    }, [pendingReward]);

    // Keep ref for interval to avoid effect re-triggering
    const tokensPerSecondRef = useRef(userTokensPerSecond);
    useEffect(() => {
        tokensPerSecondRef.current = userTokensPerSecond;
    }, [userTokensPerSecond]);

    // Smooth local increment every second using tokens/second rate
    // On mobile: throttle coin particle DOM creation to every 3s to prevent jank
    const coinTickRef = useRef(0);
    useEffect(() => {
        const interval = setInterval(() => {
            const rate = tokensPerSecondRef.current;
            if (rate <= 0) return;

            // Increment display by tokens per second
            setDisplayPendingReward(prev => prev + rate);

            // Throttle coin particle on mobile (every 3rd tick)
            coinTickRef.current += 1;
            const shouldAnimate = !isMobile || (coinTickRef.current % 3 === 0);

            if (shouldAnimate) {
                // Trigger coin fly-in animation
                setShowCoinAnim(true);
                setTimeout(() => setShowCoinAnim(false), 800);

                // Reuse pooled coin particles instead of creating/removing DOM nodes
                const container = document.getElementById('coin-emit-container');
                if (container) {
                    const poolIndex = coinTickRef.current % 4; // Cycle through 4 pooled elements
                    const coin = container.children[poolIndex] as HTMLElement;
                    if (coin) {
                        // Random edge position
                        const edges = ['top', 'bottom', 'left', 'right'];
                        const edge = edges[Math.floor(Math.random() * edges.length)];
                        let startX = 0, startY = 0;
                        const offset = (Math.random() - 0.5) * 150;

                        switch (edge) {
                            case 'top': startY = -120; startX = offset; break;
                            case 'bottom': startY = 120; startX = offset; break;
                            case 'left': startX = -120; startY = offset; break;
                            case 'right': startX = 120; startY = offset; break;
                        }

                        coin.style.setProperty('--startX', `${startX}px`);
                        coin.style.setProperty('--startY', `${startY}px`);
                        // Reset animation by removing/re-adding class
                        coin.classList.remove('coin-particle-active');
                        // Force reflow to restart animation
                        void coin.offsetWidth;
                        coin.classList.add('coin-particle-active');
                    }
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isMobile]);
    const { data: okbBalance } = useBalance({ address, chainId: 196 });





    // Handle transaction status
    useEffect(() => {
        if (isWritePending) {
            setTxStatus(t("stakingWaitWallet"));
        } else if (isConfirming) {
            setTxStatus(t("stakingTxPending"));
        } else if (isConfirmed) {
            setTxStatus(t("stakingTxSuccess"));
            setStakeAmount("");
            setUnstakeAmount("");
            setTimeout(() => setTxStatus(""), 3000);
        } else if (writeError) {
            setTxStatus(`Error: ${writeError.message.slice(0, 50)}...`);
            setTimeout(() => setTxStatus(""), 5000);
        }
    }, [isWritePending, isConfirming, isConfirmed, writeError, t]);

    // Format number short (2 decimals)
    const formatNumberShort = (num: number | bigint) => {
        const n = typeof num === 'bigint' ? Number(formatEther(num)) : num;
        return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    };

    // Restore formatNumber for compatibility (same behavior)
    const formatNumber = formatNumberShort;

    // Get user balance
    const userBalance = tokenBalance ? Number(formatEther(tokenBalance)) : 0;

    // Check if token is approved (has any significant allowance)
    const isTokenApproved = allowance ? allowance > BigInt(0) : false;

    // Format OKB
    const formatOkb = (value: bigint | undefined) => {
        if (!value) return '0';
        const num = Number(formatEther(value));
        if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    // Format number with commas for input display
    const formatInputNumber = (val: string) => {
        if (!val) return '';
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    // Remove commas for calculation
    const unformatInputNumber = (val: string) => {
        return val.replace(/,/g, '');
    };

    // Is loading
    const isLoading = isWritePending || isConfirming;

    // Helper to get safe max stakeable amount (considering wallet balance and contract limits)
    const getSafeMaxStake = useCallback(() => {
        const min = Number(formatEther(globalStats.minStake));
        const currentStaked = userInfo?.amount ? Number(formatEther(userInfo.amount)) : 0;
        const maxTotalCap = globalStats.maxStake > BigInt(0) ? Number(formatEther(globalStats.maxStake)) : Infinity;

        // Calculate how much more this user can stake before hitting the wallet limit
        const remainingLimit = maxTotalCap !== Infinity ? Math.max(0, maxTotalCap - currentStaked) : Infinity;

        // Final cap is the smaller of: their balance OR their remaining contract limit
        return Math.min(remainingLimit, userBalance);
    }, [globalStats.maxStake, globalStats.minStake, userInfo?.amount, userBalance]);

    // Handle stake
    const handleStake = async () => {
        // Guard: contract paused
        if (globalStats.isPaused) return;
        let rawAmount = unformatInputNumber(stakeAmount);
        if (!rawAmount || isNaN(parseFloat(rawAmount)) || parseFloat(rawAmount) <= 0) return;
        // Guard: minStake not yet loaded from contract
        if (globalStats.minStake === BigInt(0)) return;

        const max = getSafeMaxStake();
        const min = Number(formatEther(globalStats.minStake));

        let val = parseFloat(rawAmount);
        if (val < min) val = min;
        if (val > max) val = max;

        // Update UI state so user sees the adjustment
        const correctedAmount = val.toFixed(2);
        setStakeAmount(correctedAmount);
        rawAmount = correctedAmount;

        // Check if approval needed
        if (needsApproval(rawAmount)) {
            setTxStatus(t('processing'));
            await approve();
            return;
        }

        setTxStatus(t('processing'));
        await stake(rawAmount, selectedLockOption);
    };

    // Handle unstake
    const handleUnstake = async () => {
        let rawAmount = unformatInputNumber(unstakeAmount);
        if (!rawAmount || isNaN(parseFloat(rawAmount)) || parseFloat(rawAmount) <= 0) return;

        // Final safety cap (can't unstake more than you have)
        const maxAvailable = userInfo?.amount ? Number(formatEther(userInfo.amount)) : 0;
        let val = parseFloat(rawAmount);
        if (val > maxAvailable) val = maxAvailable;

        const correctedAmount = val.toFixed(2);
        setUnstakeAmount(correctedAmount);
        rawAmount = correctedAmount;

        setTxStatus(t('processing'));
        await unstake(rawAmount);
    };

    // Handle claim
    const handleClaim = async () => {
        setTxStatus(t('processing'));
        await claimReward();
    };

    // Handle compound
    const handleCompound = async () => {
        setTxStatus(t('processing'));
        await autoCompound();
    };

    // Handle relock (V30)
    const handleRelock = async (stakeId: number, newLockOptionId: number) => {
        setTxStatus(t('processing'));
        await relock(stakeId, newLockOptionId);
    };

    // Handle donate
    const [donateAmount, setDonateAmount] = useState("");
    const handleDonate = async () => {
        let rawAmount = unformatInputNumber(donateAmount);
        if (!rawAmount || isNaN(parseFloat(rawAmount)) || parseFloat(rawAmount) <= 0) return;

        // Final safety cap (can't donate more than you have)
        let val = parseFloat(rawAmount);
        if (val > userBalance) val = userBalance;

        const correctedAmount = val.toFixed(2);
        setDonateAmount(correctedAmount);
        rawAmount = correctedAmount;

        // Check if approval needed for donate
        if (needsApproval(rawAmount)) {
            setTxStatus(t('processing'));
            await approve();
            return;
        }

        setTxStatus(t('processing'));
        await donate(rawAmount);
        setDonateAmount("");
    };

    // Handle max buttons
    const handleMaxStake = () => {
        const safeMax = getSafeMaxStake();
        setStakeAmount(safeMax.toFixed(2));
    };

    const handleMaxUnstake = () => {
        if (userInfo) setUnstakeAmount(formatEther(userInfo.amount));
    };

    // Preset button calculation helper
    const handleStakePreset = (percent: number) => {
        const safeMax = getSafeMaxStake();
        const amount = Math.min(userBalance * percent, safeMax);
        setStakeAmount(amount.toFixed(2));
    };

    const handleUnstakePreset = (percent: number) => {
        if (!userInfo) return;
        const total = Number(formatEther(userInfo.amount));
        setUnstakeAmount((total * percent).toFixed(2));
    };

    // Get time remaining info - in V28 lock is per-stake, this is just for summary display
    const timeRemaining = getTimeRemaining(BigInt(0));

    // Get VIP emoji
    const getVIPEmoji = (tier: string) => {
        // VIP_TIERS_INFO doesn't have emoji in V28
        if (tier === 'DIAMOND') return '💎';
        if (tier === 'GOLD') return '🥇';
        if (tier === 'BRONZE') return '🥉';
        return '👤';
    };

    // Feature toggle check
    const [defiEnabled, setDefiEnabled] = useState(true);
    const [checkingAccess, setCheckingAccess] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('DEFI_ENABLED');
            setDefiEnabled(saved !== 'false');
        }
        setCheckingAccess(false);
    }, []);

    // Show loading while checking access
    if (checkingAccess) {
        return (
            <div className="staking-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ color: '#fff', fontSize: '18px' }}>{t('loading')}</div>
            </div>
        );
    }

    // Show disabled screen if DeFi is turned off
    if (!defiEnabled) {
        return (
            <div className="staking-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}>
                <div style={{ fontSize: '80px' }}>🚫</div>
                <h1 style={{ color: '#fff', fontSize: '28px', margin: 0 }}>
                    {t('defiDisabled')}
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', textAlign: 'center', maxWidth: '400px' }}>
                    {t('defiDisabledDesc')}
                </p>
                <Link href="/" style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: '#fff',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: 600
                }}>
                    ← {t('defiBackHome')}
                </Link>
            </div>
        );
    }

    return (
        <div className="staking-page">
            {/* Header - now hidden, controls moved below orb */}
            <header className="staking-header hidden-header">
                <div className="staking-title">
                    <span className="logo-emoji">🔒</span>
                    <h1>{t("stakingTitle")}</h1>
                    {vipTier !== 'NONE' && (
                        <span className="vip-badge" style={{
                            background: VIP_TIERS_INFO.find(t => t.name === vipTier)?.color || '#cd7f32',
                            color: '#000',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            marginLeft: '8px',
                        }}>
                            {getVIPEmoji(vipTier)} {vipTier}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Wallet Balances */}
                    {isConnected && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="balance-pill">
                                <span className="balance-icon">🐱🍌</span>
                                <div className="balance-info-compact">
                                    <span className="balance-label">$banmao</span>
                                    <span className="balance-value">
                                        {formatTokenAmount(tokenBalance)}
                                    </span>
                                </div>
                            </div>
                            <div className="balance-pill">
                                <span className="balance-icon">💎</span>
                                <div className="balance-info-compact">
                                    <span className="balance-label">OKB</span>
                                    <span className="balance-value">
                                        {formatOkb(okbBalance?.value)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <ConnectButton
                        showBalance={false}
                        chainStatus="icon"
                        accountStatus="avatar"
                    />

                    {/* Language Selector - Portal-based */}
                    <LanguageSelector
                        currentLang={lang}
                        onChangeLang={setLang}
                    />

                    <Link href="/defi" className="back-button">
                        ← DeFi Hub
                    </Link>
                </div>
            </header>

            {/* Transaction Status Toast */}
            {txStatus && (
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    right: '20px',
                    background: 'rgba(10, 10, 30, 0.95)',
                    border: '1px solid var(--staking-primary)',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    zIndex: 1000,
                    color: '#fff',
                    boxShadow: '0 10px 40px rgba(0, 212, 255, 0.3)',
                }}>
                    {isLoading && <span className="loading-spinner" style={{ marginRight: '8px' }} />}
                    {txStatus}
                </div>
            )}

            {/* Contract Paused Warning */}
            {globalStats.isPaused && (
                <div style={{
                    position: 'fixed',
                    top: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    zIndex: 1001,
                    color: '#f87171',
                    fontSize: '14px',
                    fontWeight: 600,
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.2)',
                }}>
                    🚫 Contract Paused — Transactions are currently disabled
                </div>
            )}

            {/* RADIAL MENU LAYOUT - Dynamic classes for positioning */}
            <div className={`radial-menu-wrapper ${expandedPanel ? 'layout-panel-open' : isMenuOpen ? 'layout-menu-open' : 'layout-default'}`}>

                {/* 1. Floating Orbs Menu + Circular Panels */}
                <div className={`orbs-menu-container ${isMenuOpen || Object.values(windows).some(w => w.isOpen && !w.isMinimized) ? 'open' : ''}`} data-tour="orb-menu">
                    <ul className="orbs-list">
                        {[
                            { id: 'stats', iconUrl: '/icons/icon_stats.png', label: t('orbStats') },
                            { id: 'stake', iconUrl: '/icons/icon_stake.png', label: t('orbStake') },
                            { id: 'unstake', iconUrl: '/icons/icon_unstake.png', label: t('orbUnstake') },
                            { id: 'claim', iconUrl: '/icons/icon_claim.png', label: t('orbClaim') },
                            { id: 'compound', iconUrl: '/icons/icon_compound.png', label: t('orbCompound') }
                        ].map((item, index) => {
                            // Position orbs in a semi-circle arc above the sphere
                            const totalItems = 5;
                            const startAngle = -60;
                            const endAngle = 60;
                            const angleStep = (endAngle - startAngle) / (totalItems - 1);
                            const angle = startAngle + (index * angleStep);
                            const orbRadius = 260;
                            const panelRadius = 500; // Larger radius for panels

                            const rad = (angle - 90) * (Math.PI / 180);
                            const orbX = Math.cos(rad) * orbRadius;
                            const orbY = Math.sin(rad) * orbRadius;
                            const panelX = Math.cos(rad) * panelRadius;
                            const panelY = Math.sin(rad) * panelRadius;

                            const isOpen = windows[item.id as WindowId]?.isOpen && !windows[item.id as WindowId]?.isMinimized;

                            return (
                                <React.Fragment key={item.id}>
                                    {/* Orb Button */}
                                    <li
                                        className={`floating-orb orb-${item.id} ${isOpen ? 'active' : ''} ${expandedPanel === item.id ? 'expanded' : ''}`}
                                        data-tour={`${item.id}-panel`}
                                        onMouseEnter={playHover}
                                        onClick={() => {
                                            playClick();
                                            const windowId = item.id as WindowId;
                                            if (isMobile) {
                                                // Mobile: directly expand panel (also open window for content to render)
                                                if (expandedPanel === windowId) {
                                                    setExpandedPanel(null);
                                                    closeWindow(windowId);
                                                } else {
                                                    openWindow(windowId); // Must open window first!
                                                    setExpandedPanel(windowId);
                                                }
                                            } else {
                                                // Desktop: normal open/close behavior
                                                isOpen ? closeWindow(windowId) : openWindow(windowId);
                                            }
                                        }}
                                        style={{
                                            left: `${orbX}px`,
                                            top: `${orbY}px`
                                        }}
                                    >
                                        <img src={item.iconUrl} alt={item.label} className="orb-icon-img" />
                                        <span className="orb-label">{item.label}</span>
                                    </li>

                                    {/* Circular Panel (next to orb) - HIDE when expanded */}
                                    {isOpen && item.id === 'stats' && expandedPanel !== 'stats' && (
                                        <StatsPanel
                                            t={t}
                                            globalStats={globalStats}
                                            healthCheck={healthCheck}
                                            userInfo={userInfo}
                                            isConnected={isConnected}
                                            pendingReward={pendingReward}
                                            vipTier={vipTier}
                                            walletBalance={userBalance}
                                            formatNumber={formatNumber}
                                            onClose={() => closeWindow('stats')}
                                            style={{ left: `${panelX - 140}px`, top: `${panelY - 140}px` }}
                                            isExpanded={false}
                                            onExpand={() => setExpandedPanel('stats')}
                                        />
                                    )}
                                    {isOpen && item.id === 'stake' && expandedPanel !== 'stake' && (
                                        <StakePanel
                                            t={t}
                                            isTokenApproved={isTokenApproved}
                                            isLoading={isLoading}
                                            stakeAmount={stakeAmount}
                                            setStakeAmount={setStakeAmount}
                                            userBalance={userBalance}
                                            selectedLockOption={selectedLockOption}
                                            setSelectedLockOption={setSelectedLockOption}
                                            LOCK_OPTIONS_INFO={LOCK_OPTIONS_INFO}
                                            formatNumber={formatNumber}
                                            formatInputNumber={formatInputNumber}
                                            unformatInputNumber={unformatInputNumber}
                                            handleStakePreset={handleStakePreset}
                                            handleMaxStake={handleMaxStake}
                                            handleStake={handleStake}
                                            approve={approve}
                                            onClose={() => closeWindow('stake')}
                                            style={{ left: `${panelX - 140}px`, top: `${panelY - 140}px` }}
                                            isExpanded={false}
                                            onExpand={() => setExpandedPanel('stake')}
                                            totalShares={globalStats?.totalShares}
                                            rewardRatePerSecond={globalStats?.rewardRate}
                                        />
                                    )}
                                    {isOpen && item.id === 'unstake' && expandedPanel !== 'unstake' && (
                                        <UnstakePanel
                                            t={t}
                                            isLoading={isLoading}
                                            unstakeAmount={unstakeAmount}
                                            setUnstakeAmount={setUnstakeAmount}
                                            userInfo={userInfo}
                                            isConnected={isConnected}
                                            formatNumber={formatNumber}
                                            formatInputNumber={formatInputNumber}
                                            unformatInputNumber={unformatInputNumber}
                                            handleUnstakePreset={handleUnstakePreset}
                                            handleMaxUnstake={handleMaxUnstake}
                                            handleUnstake={handleUnstake}
                                            onClose={() => closeWindow('unstake')}
                                            style={{ left: `${panelX - 140}px`, top: `${panelY - 140}px` }}
                                            isExpanded={false}
                                            onExpand={() => setExpandedPanel('unstake')}
                                            address={address}
                                            stakeIds={stakeIds}
                                            onUnstakeById={unstakeById}
                                            onUnstakePartial={unstakePartial}
                                            earlyUnstakePenalty={globalStats?.penalty ? Number(globalStats.penalty) : undefined}
                                            gracePeriodDuration={globalStats?.gracePeriod ? Number(globalStats.gracePeriod) : undefined}
                                            LOCK_OPTIONS_INFO={LOCK_OPTIONS_INFO}
                                            onRelock={handleRelock}
                                            pendingReward={pendingReward}
                                            totalShares={globalStats?.totalShares}
                                            rewardRatePerSecond={globalStats?.rewardRate}
                                        />
                                    )}
                                    {isOpen && item.id === 'claim' && expandedPanel !== 'claim' && (
                                        <ClaimPanel
                                            t={t}
                                            isLoading={isLoading}
                                            pendingReward={pendingReward}
                                            formatNumber={formatNumber}
                                            handleClaim={handleClaim}
                                            onClose={() => closeWindow('claim')}
                                            style={{ left: `${panelX - 140}px`, top: `${panelY - 140}px` }}
                                            isExpanded={false}
                                            onExpand={() => setExpandedPanel('claim')}
                                            address={address}
                                            stakeIds={stakeIds}
                                            userTotalShares={userSummary?.totalShares}
                                            globalTotalShares={globalStats?.totalShares}
                                            rewardRatePerSecond={globalStats?.rewardRate}
                                            devFee={devFee}
                                            lockOptionsInfo={LOCK_OPTIONS_INFO}
                                            lang={lang}
                                            rewardBucket={globalStats?.rewardBucket}
                                        />
                                    )}
                                    {isOpen && item.id === 'compound' && expandedPanel !== 'compound' && (
                                        <CompoundPanel
                                            t={t}
                                            isLoading={isLoading}
                                            handleCompound={handleCompound}
                                            onClose={() => closeWindow('compound')}
                                            style={{ left: `${panelX - 140}px`, top: `${panelY - 140}px` }}
                                            isExpanded={false}
                                            onExpand={() => setExpandedPanel('compound')}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </ul>
                </div>

                {/* 2. Visual Ring when open */}
                <div className="close-ring" />

                {/* 3. Central Energy Sphere (Clickable Trigger) */}
                <div className="radial-center">
                    <div
                        ref={sphereRef}
                        className="energy-sphere-container energy-sphere-clickable"
                        onMouseEnter={playHover}
                        onMouseMove={handleSphereMouseMove}
                        onMouseLeave={handleSphereMouseLeave}
                        onClick={() => {
                            playClick();
                            if (expandedPanel || isMenuOpen || Object.values(windows).some(w => w.isOpen)) {
                                // Close everything
                                setExpandedPanel(null);
                                setIsMenuOpen(false);
                                // Close all windows
                                setWindows(prev => {
                                    const closed: typeof prev = {} as typeof prev;
                                    for (const key in prev) {
                                        closed[key as keyof typeof prev] = { ...prev[key as keyof typeof prev], isOpen: false };
                                    }
                                    return closed;
                                });
                            } else {
                                setIsMenuOpen(true);
                            }
                        }}
                        style={{ marginTop: 0, padding: 0 }}
                    >
                        <div className="energy-sphere-wrapper" style={isMobile ? undefined : { width: '520px', height: '520px' }}>
                            {/* Rotating Rings — no inline sizes on mobile so CSS can control */}
                            <div className="sphere-ring sphere-ring-1" style={isMobile ? undefined : { width: '400px', height: '400px' }}></div>
                            <div className="sphere-ring sphere-ring-2" style={isMobile ? undefined : { width: '460px', height: '460px' }}></div>
                            <div className="sphere-ring sphere-ring-3" style={isMobile ? undefined : { width: '520px', height: '520px' }}></div>

                            {/* Orbiting Particles */}
                            <div className="orbit-particle"></div>
                            <div className="orbit-particle"></div>
                            <div className="orbit-particle"></div>

                            {/* Energy Waves */}
                            <div className="energy-wave"></div>
                            <div className="energy-wave"></div>
                            <div className="energy-wave"></div>

                            {/* Rotating Text */}
                            <svg className="rotating-text-container" viewBox="0 0 380 380">
                                <defs>
                                    <path id="textPath" d="M 190,190 m -150,0 a 150,150 0 1,1 300,0 a 150,150 0 1,1 -300,0" fill="none" />
                                </defs>
                                <text className="rotating-text">
                                    <textPath href="#textPath">
                                        ★ BANMAO STAKING ★ SECURE ★ REWARDS ★ DEFI ★ STAKE ★ EARN ★
                                    </textPath>
                                </text>
                            </svg>

                            {/* Central Core with Stats */}
                            <div className="sphere-core sphere-core-stats" style={{
                                ...(isMobile ? {} : { width: '380px', height: '380px' }),
                                background: healthCheck?.isHealthy
                                    ? 'radial-gradient(circle at 35% 35%, #1a1f35 0%, #0b0f19 100%)' // Updated for depth
                                    : 'radial-gradient(circle, #331010 0%, #000 70%)', // Angry red/black if unhealthy
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '30px',
                                border: healthCheck?.isHealthy
                                    ? '2px solid rgba(100, 150, 220, 0.5)'
                                    : '2px solid rgba(220, 100, 100, 0.5)',
                                position: 'relative',
                                overflow: 'visible' // Allow coins to fly out
                            }}>
                                {/* New Effects: Plasma & Lightning (Clipped to sphere) */}
                                <div className="sphere-effect-mask" style={{
                                    position: 'absolute',
                                    top: 0, left: 0,
                                    width: '100%', height: '100%',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    zIndex: 0,
                                    pointerEvents: 'none'
                                }}>
                                    <div className="plasma-core"></div>
                                    <div className="lightning-bolt"></div>
                                    <div className="lightning-bolt"></div>
                                    <div className="lightning-bolt"></div>
                                    <div className="lightning-bolt"></div>
                                    <div className="lightning-bolt"></div>
                                </div>
                                {/* ====== REDESIGNED SPHERE CONTENT ====== */}
                                <div className="sphere-stats-grid" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    height: '100%',
                                    width: '100%',
                                    padding: '15px 0'
                                }}>

                                    {/* TOP ROW: System Stats (TVL & Pool) - Subtle Cyan */}
                                    <div className="sphere-top-stats" style={{
                                        display: 'flex',
                                        justifyContent: 'space-around',
                                        width: '100%',
                                        opacity: 0.85
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '9px', color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>TVL</div>
                                            <div style={{ fontSize: '14px', color: '#22d3ee', fontWeight: 'bold' }}>{formatNumberShort(globalStats?.totalStaked)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '9px', color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{t('sphereRewardPool')}</div>
                                            <div style={{ fontSize: '14px', color: '#22d3ee', fontWeight: 'bold' }}>{formatNumberShort(globalStats?.rewardBucket)}</div>
                                        </div>
                                    </div>

                                    {/* CENTER: Giant Pending Reward - The Star of the Show! */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        position: 'relative',
                                        padding: '20px 0'
                                    }}>
                                        <div style={{
                                            fontSize: '10px',
                                            color: '#fbbf24',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginBottom: '4px',
                                            opacity: 0.9
                                        }}>{t('statsPending')}</div>
                                        <div style={{
                                            fontSize: '36px',
                                            fontWeight: 'bold',
                                            background: 'linear-gradient(135deg, #fbbf24 0%, #facc15 30%, #4ade80 70%, #22c55e 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            textShadow: '0 0 30px rgba(250, 204, 21, 0.4), 0 0 60px rgba(74, 222, 128, 0.3)',
                                            filter: 'drop-shadow(0 2px 8px rgba(250, 204, 21, 0.5))',
                                            lineHeight: 1.1,
                                            position: 'relative'
                                        }}>
                                            {displayPendingReward ? displayPendingReward.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            {/* Coin Animation Container - Pool of 4 reusable coin particles */}
                                            <div id="coin-emit-container" style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                width: '0',
                                                height: '0',
                                                pointerEvents: 'none'
                                            }}>
                                                <div className="coin-particle-fly">🪙</div>
                                                <div className="coin-particle-fly">🪙</div>
                                                <div className="coin-particle-fly">🪙</div>
                                                <div className="coin-particle-fly">🪙</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#86efac', marginTop: '2px' }}>$BANMAO</div>

                                        {/* Animated Coin Float FX */}
                                        {showCoinAnim && (
                                            <div className="coin-float-anim" style={{
                                                position: 'absolute',
                                                top: '20%',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                pointerEvents: 'none',
                                                animation: 'floatUp 1s ease-out forwards',
                                                fontSize: '20px'
                                            }}>
                                                🪙
                                            </div>
                                        )}
                                    </div>

                                    {/* BOTTOM ROW: Personal Stats (Stake & Rate/sec) - Purple/Gold */}
                                    <div className="sphere-bottom-stats" style={{
                                        display: 'flex',
                                        justifyContent: 'space-around',
                                        width: '100%',
                                        opacity: 0.85
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '9px', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{t('statsMyStake')}</div>
                                            <div style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 'bold' }}>{userInfo?.amount ? formatNumberShort(userInfo.amount) : '0.00'}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '9px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>⚡ {t('yourRewardPerSecond').replace('🎯 ', '')}</div>
                                            <div style={{ fontSize: '14px', color: '#fcd34d', fontWeight: 'bold' }}>{userTokensPerSecond ? userTokensPerSecond.toFixed(6) : '0.000000'}</div>
                                        </div>
                                    </div>

                                </div>

                                {/* Status Indicator */}
                                <div className="sphere-status-indicator" style={{
                                    color: healthCheck?.isHealthy ? '#4ade80' : '#ef4444',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    marginTop: '4px',
                                    opacity: 0.75
                                }}>
                                    {healthCheck?.isHealthy ? t('sphereOnline') : t('sphereOffline')}
                                </div>
                                {/* Toggle Hint */}
                                <div style={{ fontSize: '8px', opacity: 0.5, marginTop: '2px', color: '#94a3b8' }}>
                                    {isMenuOpen ? t('panelClose') : t('sphereTapToToggle')}
                                </div>
                            </div>

                            {/* Phosphorescent Particles */}
                            <div className="particles-container">
                                {[...Array(12)].map((_, i) => {
                                    const tx = (Math.random() - 0.5) * 350;
                                    const ty = (Math.random() - 0.5) * 350;
                                    const duration = 2 + Math.random() * 3;
                                    const delay = Math.random() * 5;
                                    return (
                                        <div
                                            key={i}
                                            className="particle"
                                            style={{
                                                '--tx': `${tx}px`,
                                                '--ty': `${ty}px`,
                                                animationDuration: `${duration}s`,
                                                animationDelay: `${delay}s`,
                                                left: '50%',
                                                top: '50%'
                                            } as any}
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Menu Toggle Hint */}
                        {!isMenuOpen && (
                            <div className="menu-toggle-hint">
                                {t('tapSphereHint')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Header Controls Below Energy Orb */}
            <div className="header-controls-bottom">
                {/* Balance Pills */}
                {isConnected && (
                    <div className="balance-pills-container">
                        <div className="balance-pill">
                            <span className="balance-icon">🐱</span>
                            <div className="balance-info-compact">
                                <span className="balance-label">$banmao</span>
                                <span className="balance-value">
                                    {formatTokenAmount(tokenBalance)}
                                </span>
                            </div>
                        </div>
                        <div className="balance-pill">
                            <span className="balance-icon">💎</span>
                            <div className="balance-info-compact">
                                <span className="balance-label">OKB</span>
                                <span className="balance-value">
                                    {formatOkb(okbBalance?.value)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div data-tour="wallet-connect">
                    <ConnectButton
                        showBalance={false}
                        chainStatus="icon"
                        accountStatus="avatar"
                    />
                </div>

                {/* Language Selector - Portal-based to avoid stacking context issues */}
                <LanguageSelector
                    currentLang={lang}
                    onChangeLang={setLang}
                />

                {/* Help Button - Opens Tour */}
                <button
                    onClick={() => setShowOnboardingTour(true)}
                    className="help-button"
                    title={t('tourWelcomeTitle')}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(99, 102, 241, 0.3))',
                        border: '2px solid rgba(168, 85, 247, 0.5)',
                        color: '#a855f7',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                    }}
                >
                    ?
                </button>

                <Link href="/defi" className="back-button-inline">
                    ← {t('backToHub')}
                </Link>
            </div>





            {/* Panels now render inline with orbs above */}

            {/* EXPANDED PANELS - Rendered at root level to avoid pointer-events: none parent */}
            {expandedPanel && (
                <div className="expanded-panel-overlay">
                    {expandedPanel === 'stats' && windows.stats.isOpen && (
                        <StatsPanel
                            t={t}
                            globalStats={globalStats}
                            healthCheck={healthCheck}
                            userInfo={userInfo}
                            isConnected={isConnected}
                            pendingReward={pendingReward}
                            vipTier={vipTier}
                            walletBalance={userBalance}
                            formatNumber={formatNumber}
                            onClose={() => { closeWindow('stats'); setExpandedPanel(null); }}
                            onCollapse={() => setExpandedPanel(null)}
                            isExpanded={true}
                        />
                    )}
                    {expandedPanel === 'stake' && windows.stake.isOpen && (
                        <StakePanel
                            t={t}
                            isTokenApproved={isTokenApproved}
                            isLoading={isLoading}
                            stakeAmount={stakeAmount}
                            setStakeAmount={setStakeAmount}
                            userBalance={userBalance}
                            selectedLockOption={selectedLockOption}
                            setSelectedLockOption={setSelectedLockOption}
                            LOCK_OPTIONS_INFO={LOCK_OPTIONS_INFO}
                            formatNumber={formatNumber}
                            formatInputNumber={formatInputNumber}
                            unformatInputNumber={unformatInputNumber}
                            handleStakePreset={handleStakePreset}
                            handleMaxStake={handleMaxStake}
                            handleStake={handleStake}
                            approve={approve}
                            onClose={() => { closeWindow('stake'); setExpandedPanel(null); }}
                            onCollapse={() => setExpandedPanel(null)}
                            isExpanded={true}
                            minStakeAmount={globalStats?.minStake}
                            maxStakePerWallet={globalStats?.maxStake}
                            userTotalStaked={userInfo?.amount}
                            rewardRate={globalStats?.rewardRate}
                            earlyUnstakePenalty={globalStats?.penalty ? Number(globalStats.penalty) : undefined}
                            totalShares={globalStats?.totalShares}
                            rewardRatePerSecond={globalStats?.rewardRate}
                        />
                    )}
                    {expandedPanel === 'unstake' && windows.unstake.isOpen && (
                        <UnstakePanel
                            t={t}
                            isLoading={isLoading}
                            unstakeAmount={unstakeAmount}
                            setUnstakeAmount={setUnstakeAmount}
                            userInfo={userInfo}
                            isConnected={isConnected}
                            formatNumber={formatNumber}
                            formatInputNumber={formatInputNumber}
                            unformatInputNumber={unformatInputNumber}
                            handleUnstakePreset={handleUnstakePreset}
                            handleMaxUnstake={handleMaxUnstake}
                            handleUnstake={handleUnstake}
                            onClose={() => { closeWindow('unstake'); setExpandedPanel(null); }}
                            onCollapse={() => setExpandedPanel(null)}
                            isExpanded={true}
                            address={address}
                            stakeIds={stakeIds}
                            onUnstakeById={unstakeById}
                            onUnstakePartial={unstakePartial}
                            earlyUnstakePenalty={globalStats?.penalty ? Number(globalStats.penalty) : undefined}
                            gracePeriodDuration={globalStats?.gracePeriod ? Number(globalStats.gracePeriod) : undefined}
                            LOCK_OPTIONS_INFO={LOCK_OPTIONS_INFO}
                            onRelock={handleRelock}
                            pendingReward={pendingReward}
                            totalShares={globalStats?.totalShares}
                            rewardRatePerSecond={globalStats?.rewardRate}
                        />
                    )}
                    {expandedPanel === 'claim' && windows.claim.isOpen && (
                        <ClaimPanel
                            t={t}
                            isLoading={isLoading}
                            pendingReward={pendingReward}
                            formatNumber={formatNumber}
                            handleClaim={handleClaim}
                            onClose={() => { closeWindow('claim'); setExpandedPanel(null); }}
                            onCollapse={() => setExpandedPanel(null)}
                            isExpanded={true}
                            address={address}
                            stakeIds={stakeIds}
                            userTotalShares={userSummary?.totalShares}
                            globalTotalShares={globalStats?.totalShares}
                            rewardRatePerSecond={globalStats?.rewardRate}
                            devFee={devFee}
                            lockOptionsInfo={LOCK_OPTIONS_INFO}
                            lang={lang}
                            rewardBucket={globalStats?.rewardBucket}
                        />
                    )}
                    {expandedPanel === 'compound' && windows.compound.isOpen && (
                        <CompoundPanel
                            t={t}
                            isLoading={isLoading}
                            handleCompound={handleCompound}
                            onClose={() => { closeWindow('compound'); setExpandedPanel(null); }}
                            onCollapse={() => setExpandedPanel(null)}
                            isExpanded={true}
                        />
                    )}
                </div>
            )}

            {/* Right Sidebar - Supporter Panel (displayed first on mobile) */}
            <RightSidebar
                isConnected={isConnected}
                formatNumber={formatNumber}
                address={address}
                globalStats={{ rewardBucket: globalStats?.rewardBucket }}
                onRefresh={refetchAll}
            />

            {/* Left Sidebar - Leaderboard (displayed second on mobile) */}
            <LeftSidebar
                formatNumber={formatNumber}
                address={address}
                LOCK_OPTIONS_INFO={LOCK_OPTIONS_INFO}
            />

            {/* Claim Reward History Panel - Visible to all users (even without wallet) */}
            <ClaimHistoryPanel
                claimHistory={claimHistory}
                isLoading={isClaimHistoryLoading}
                hasError={!!claimHistoryError}
                t={t}
            />



            <div className="scanlines" />

            {/* Onboarding Tour */}
            <StakingOnboardingTour
                isOpen={showOnboardingTour}
                onClose={() => setShowOnboardingTour(false)}
                onOpenPanel={(panel) => {
                    const panelId = panel as WindowId;
                    if (panelId && windows[panelId]) {
                        openWindow(panelId);
                        setExpandedPanel(panelId);
                    }
                }}
            />
        </div>
    );
}
