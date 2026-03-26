/**
 * GameArena Component - Slot Machine Style PRO
 * Unified game panel combining: Jackpot, Character, Dual Timers, Gift Controls
 * Now with REAL contract interaction!
 */
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";

import CountUp from "react-countup";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import AnimatedFrameSprite from "./AnimatedFrameSprite";

import AnimatedBanMao from "./AnimatedBanMao";
import ComboIndicator from "./ComboIndicator";
import CountdownClock from "./AnalogClock";
import TimerPrizeDetail from "./TimerPrizeDetail";
import { LocaleStrings } from "../lib/i18n/types";
import type { TopAttacker } from "../lib/types";
import { BANMAOFOMO_ADDRESS, SOFT_DURATION, TIME_DECREASE_STEP, CHAIN_ID } from "../lib/constants";
import { BANMAOFOMO_V11_ABI as BANMAOFOMO_ABI, ERC20_ABI } from "../lib/abis-v11";
import { CHARACTER_DIALOGUES } from "../lib/characterDialogues";
import { playBGM, stopBGM, toggleBGM, speakBanMao, fomoSounds } from "../lib/sounds";


// Helper to access i18n with fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getText = (t: LocaleStrings, key: string, fallback: string): string => {
    return (t as any)[key] ?? fallback;
};

interface GameArenaProps {
    // Jackpot
    pool: bigint;
    seedFund?: bigint;
    // Timers
    softTimeLeft: bigint;
    hardTimeLeft: bigint;
    isEnded: boolean;
    // Attack info
    attackCost?: bigint;
    userBalance?: bigint;
    userAttacksThisRound?: bigint;
    maxAttacksPerRound?: bigint;
    minAttacksForReward?: bigint;
    isPaused: boolean;
    // Contract interaction props
    allowance?: bigint;
    tokenAddress?: `0x${string}`;
    cooldownLeft?: number;
    // Animation state
    latestAttack: { luckyNumber: number; isOwnAttack: boolean } | null;
    winnerInfo: { winner: string; amount: string; winType: string } | null;
    idleAnimationIndex: number;
    // Callbacks
    onAttackSuccess?: () => void;
    onApproveSuccess?: () => void;
    onClaimAll?: () => void;
    onDistributionShow?: (amount: number, count: number) => void;
    // i18n
    t: LocaleStrings;
    lang: string;
    // Status
    canAttack?: boolean;
    // Display mode
    showAttackControls?: boolean;
    // Timer Config (Realtime from Contract)
    softDuration?: number;
    timeDecreaseStep?: number;
    initialHardDuration?: number;
    // Win distribution percentages (from contract config)
    winnerPercent?: number;
    topAttackersPercent?: number;
    // Phase 1: Visual Effects
    comboCount?: number;
    comboVisible?: boolean;
    killZoneActive?: boolean;
    /** Seconds remaining until claim timeout */
    timeoutCountdown?: number;
    /** Last attacker address from contract (= winner) */
    lastAttacker?: string;
    /** Callback fired when either timer reaches zero locally */
    onTimerExpired?: () => void;
    /** Callback fired when the claim timeout countdown reaches zero */
    onClaimTimeoutExpired?: () => void;
    /** Current round total attacks (for timer detail panel) */
    totalAttacks?: bigint;
    /** Top attackers list (for timer detail panel) */
    topAttackers?: TopAttacker[];
    /** Jackpot pool amount (for timer detail panel) */
    jackpotPool?: bigint;
}

// Time formatting helper
function formatTime(seconds: number): { h: number; m: number; s: number } {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
}

// Jackpot tier thresholds
const TIERS = {
    GREEN: 100_000,
    GOLD: 500_000,
    ORANGE: 1_000_000,
    RED: Infinity,
};

const SHOWCASE_ANIMATIONS = ["idle", "sleeping", "love_eyes", "excited", "dance", "feed", "winner"] as const;
const CAT_HOVER_SPRITE = "/gamefi/banmaofomo/sprites/banmao_love_eyes.png";

export default function GameArena({
    pool,
    seedFund,
    softTimeLeft,
    hardTimeLeft,
    isEnded,
    attackCost = BigInt(0),
    userBalance = BigInt(0),
    userAttacksThisRound = BigInt(0),
    maxAttacksPerRound = BigInt(100),
    minAttacksForReward = BigInt(3),
    isPaused,
    allowance = BigInt(0),
    tokenAddress,
    cooldownLeft = 0,
    latestAttack,
    winnerInfo,
    idleAnimationIndex,
    onAttackSuccess,
    onApproveSuccess,
    onClaimAll,
    onDistributionShow,
    t,
    lang, // Receive lang prop
    canAttack = true,
    showAttackControls = true,
    softDuration = 21600, // Default 6h
    timeDecreaseStep = 30, // Default 30s
    initialHardDuration = 432000, // Default 120h
    // Win distribution percentages (from contract config)
    winnerPercent = 75,
    topAttackersPercent = 25,
    // Phase 1: Visual Effects
    comboCount = 0,
    comboVisible = false,
    killZoneActive = false,
    timeoutCountdown = 0,
    lastAttacker = '',
    onTimerExpired,
    onClaimTimeoutExpired,
    totalAttacks = 0n,
    topAttackers = [],
    jackpotPool = 0n,
}: GameArenaProps) {
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [selectedCount, setSelectedCount] = useState(1);
    const [timerDetailType, setTimerDetailType] = useState<'soft' | 'hard' | null>(null);
    const [hoveredMultiplier, setHoveredMultiplier] = useState<number | null>(null);

    const { data: nativeBalance } = useBalance({
        address: address,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address,
            refetchInterval: 15000, // Reduced from 5s to 15s
        }
    });
    const [isKillZoneDismissed, setIsKillZoneDismissed] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('fomo_killzone_dismissed') === 'true';
        }
        return false;
    });

    const dismissKillZone = useCallback(() => {
        setIsKillZoneDismissed(true);
        sessionStorage.setItem('fomo_killzone_dismissed', 'true');
    }, []);

    const [prevJackpotValue, setPrevJackpotValue] = useState(0);
    const [isGlowing, setIsGlowing] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const lastProcessedHash = useRef<string | null>(null);
    // Floating "+X" delta animation
    const [jackpotDelta, setJackpotDelta] = useState(0);
    const [deltaKey, setDeltaKey] = useState(0);

    // Character Interaction State
    const [speechText, setSpeechText] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // State refs for idle timer to avoid stale closures
    const isSpeakingRef = useRef(isSpeaking);
    const langRef = useRef(lang);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Update refs on render
    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
        langRef.current = lang;
    }, [isSpeaking, lang]);

    // Renamed to avoid stale reference issues
    const onCharacterInteract = useCallback(() => {
        if (isSpeakingRef.current) return;

        setIsSpeaking(true);

        // Get dialogues for current language, fallback to 'en'
        const currentLang = langRef.current || 'en';
        const langCode = currentLang.split('-')[0].toLowerCase();
        const dialogues = CHARACTER_DIALOGUES[langCode] || CHARACTER_DIALOGUES['en'];
        const randomText = dialogues[Math.floor(Math.random() * dialogues.length)];

        setSpeechText(randomText);

        // Use central sound manager for consistent voice
        // console.log('[GameArena] Speaking:', randomText, 'Lang:', currentLang);
        speakBanMao(randomText, currentLang);

        // Hide bubble after a few seconds
        setTimeout(() => {
            setSpeechText(null);
            setIsSpeaking(false);
        }, 4000);
    }, []);

    // BGM & Idle Speech Logic
    useEffect(() => {
        // Start BGM on mount
        toggleBGM(false);
        playBGM();

        const resetIdle = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

            idleTimerRef.current = setTimeout(() => {
                // Check refs for fresh state
                if (!isSpeakingRef.current && !document.hidden) {
                    console.log('[GameArena] Idle trigger (10s)');
                    onCharacterInteract();
                }
            }, 10000);
        };

        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('click', resetIdle);
        window.addEventListener('keydown', resetIdle);

        resetIdle(); // Start timer immediately

        return () => {
            stopBGM();
            window.removeEventListener('mousemove', resetIdle);
            window.removeEventListener('click', resetIdle);
            window.removeEventListener('keydown', resetIdle);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [onCharacterInteract]);

    // Contract hooks for Approve
    const {
        writeContract: approve,
        data: approveHash,
        isPending: isApproving,
    } = useWriteContract();

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
        useWaitForTransactionReceipt({ hash: approveHash });

    // Contract hooks for Attack
    const {
        writeContract: attack,
        data: attackHash,
        isPending: isAttacking,
    } = useWriteContract();

    const { isLoading: isAttackConfirming, isSuccess: isAttackSuccess } =
        useWaitForTransactionReceipt({ hash: attackHash });

    // Handle approve success
    useEffect(() => {
        if (isApproveSuccess) {
            onApproveSuccess?.();
        }
    }, [isApproveSuccess, onApproveSuccess]);

    // Handle attack success
    // Guard: only process each unique attackHash once to prevent distribution panel from reopening
    useEffect(() => {
        if (isAttackSuccess && attackHash && attackHash !== lastProcessedHash.current) {
            lastProcessedHash.current = attackHash;

            onAttackSuccess?.();
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            // Notify parent to show distribution animation
            const attackAmountNum = Number(formatUnits(attackCost, 18)) * selectedCount;
            console.log('[GameArena] Attack success! Triggering distribution, amount:', attackAmountNum);
            onDistributionShow?.(attackAmountNum, selectedCount);

            // Dispatch custom event for VaultHistory to capture immediately
            window.dispatchEvent(new CustomEvent('banmao-attack-success', {
                detail: {
                    count: selectedCount,
                    amount: attackAmountNum,
                    txHash: attackHash,
                    roundId: 0,
                }
            }));
        }
    }, [isAttackSuccess, attackHash, onAttackSuccess, attackCost, selectedCount]);

    const currentJackpot = Number(formatUnits(pool, 18));
    const currentSeed = seedFund ? Number(formatUnits(seedFund, 18)) : 0;
    // Mobile responsive
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const softSeconds = Number(softTimeLeft);
    const hardSeconds = Number(hardTimeLeft);
    const softTime = formatTime(softSeconds);
    const hardTime = formatTime(hardSeconds);
    const attacksRemaining = Number(maxAttacksPerRound - userAttacksThisRound);
    const totalCost = attackCost * BigInt(selectedCount);
    const totalCostDisplay = Number(formatUnits(totalCost, 18));
    const hasEnoughBalance = userBalance >= totalCost;
    const hasEnoughAllowance = allowance >= totalCost;
    const isLoading = isApproving || isApproveConfirming || isAttacking || isAttackConfirming;
    const needsApproval = !hasEnoughAllowance && !isApproveSuccess;

    // Determine tier
    const tier = useMemo(() => {
        if (currentJackpot < TIERS.GREEN) return 'green';
        if (currentJackpot < TIERS.GOLD) return 'gold';
        if (currentJackpot < TIERS.ORANGE) return 'orange';
        return 'red';
    }, [currentJackpot]);

    const tierColors = useMemo(() => {
        switch (tier) {
            case 'green': return { primary: '#22c55e', secondary: '#4ade80', glow: 'rgba(34, 197, 94, 0.6)' };
            case 'gold': return { primary: '#ffd700', secondary: '#ffc107', glow: 'rgba(255, 215, 0, 0.6)' };
            case 'orange': return { primary: '#ff6b35', secondary: '#ff8c00', glow: 'rgba(255, 107, 53, 0.6)' };
            case 'red': return { primary: '#ef4444', secondary: '#ff6b6b', glow: 'rgba(239, 68, 68, 0.6)' };
        }
    }, [tier]);

    // Detect jackpot increase
    useEffect(() => {
        if (currentJackpot > prevJackpotValue && prevJackpotValue > 0) {
            setIsGlowing(true);
            setTimeout(() => setIsGlowing(false), 2500);
            // Floating delta animation
            const delta = Math.round(currentJackpot - prevJackpotValue);
            if (delta > 0) {
                setJackpotDelta(delta);
                setDeltaKey(prev => prev + 1);
            }
        }
        setPrevJackpotValue(currentJackpot);
    }, [currentJackpot, prevJackpotValue]);

    // Urgency levels for timers
    const softUrgency = softSeconds <= 60 ? 'critical' : softSeconds <= 300 ? 'warning' : 'normal';
    const hardUrgency = hardSeconds <= 300 ? 'critical' : hardSeconds <= 900 ? 'warning' : 'normal';

    // Round-end: winner info
    // Issue #5: Include "timeout" in winType determination
    const winType = useMemo(() => {
        // Priority 1: winnerInfo from event/poll (most accurate)
        if (winnerInfo?.winType) {
            const wt = winnerInfo.winType;
            if (wt === 'TIMEOUT') return 'timeout';
            if (wt === 'SOFT_WIN') return 'soft';
            if (wt === 'HARD_WIN') return 'hard';
            return wt.toLowerCase();
        }
        // Priority 2: Derive from timer state
        if (isEnded && timeoutCountdown <= 0) return 'timeout';
        if (softSeconds <= 0) return 'soft';
        return 'hard';
    }, [winnerInfo, isEnded, timeoutCountdown, softSeconds]);
    const winnerAddr = winnerInfo?.winner || lastAttacker || '';
    const shortWinner = winnerAddr ? `${winnerAddr.slice(0, 6)}...${winnerAddr.slice(-4)}` : '???';
    const isCurrentUserWinner = address
        ? winnerAddr.toLowerCase() === address.toLowerCase()
        : false;

    // Character animation — reacts to selectedCount multiplier
    const currentAnimation = useMemo(() => {
        if (winnerInfo) return "winner";
        if (isPaused) return "sleeping";
        if (latestAttack) {
            // Use comboCount and isOwnAttack for varied animations
            if (latestAttack.isOwnAttack && comboCount >= 5) return "excited";
            if (latestAttack.isOwnAttack && comboCount >= 3) return "love_eyes";
            if (latestAttack.isOwnAttack) return "feed";
            // Other player's attack — random between dance/feed
            return Math.random() > 0.5 ? "dance" : "feed";
        }
        if (killZoneActive) return "excited";
        // React to selected multiplier when idle
        if (selectedCount >= 10) return "dance";
        if (selectedCount >= 5) return "excited";
        if (selectedCount >= 2) return "love_eyes";
        return SHOWCASE_ANIMATIONS[idleAnimationIndex];
    }, [winnerInfo, isPaused, latestAttack, idleAnimationIndex, comboCount, killZoneActive, selectedCount]);

    const handleQuickSelect = (count: number) => {
        setSelectedCount(count);
    };

    // Handle Approve - Unlimited approval
    const handleApprove = useCallback(() => {
        if (!address || !tokenAddress) return;

        const approveAmount = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (approve as any)({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BANMAOFOMO_ADDRESS, approveAmount],
        });
    }, [address, approve, tokenAddress]);

    // Handle Attack - Call contract attack function
    const handleAttack = useCallback(() => {
        if (!address || cooldownLeft > 0 || !hasEnoughBalance || isPaused || attacksRemaining <= 0 || isEnded) return;

        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        // attack(uint256 _count)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (attack as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "attack",
            args: [BigInt(selectedCount)],
        });
    }, [address, selectedCount, cooldownLeft, hasEnoughBalance, isPaused, attacksRemaining, isEnded, attack]);

    return (
        <>
            <motion.div
                className="game-arena"
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(180deg, rgba(20, 20, 30, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
                    border: `2px solid ${tierColors.primary}40`,
                    borderRadius: isMobile ? '12px' : '24px',
                    padding: isMobile ? '8px' : '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isGlowing
                        ? `0 0 60px ${tierColors.glow}, inset 0 0 30px ${tierColors.glow}`
                        : `0 8px 32px rgba(0,0,0,0.4)`,
                    transition: 'box-shadow 0.5s ease',
                }}
            >

                {/* Combo Indicator */}
                <ComboIndicator comboCount={comboCount} isVisible={comboVisible} />

                {/* Jackpot + Character - Horizontal Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? '12px' : '24px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: isMobile ? '12px' : '16px',
                    padding: isMobile ? '10px 14px' : '16px 24px',
                    marginBottom: isMobile ? '10px' : '16px',
                    position: 'relative', // for absolute sound button
                }}>
                    {/* Sound Toggle */}
                    <button
                        onClick={() => {
                            const newMuteState = !fomoSounds.isMusicMuted();
                            toggleBGM(newMuteState);
                            // Force re-render to update icon (handled by parent usually, but here we might need local state if we want instant feedback icon)
                            // For now just toggle logic. 
                            // To show icon state, we need a local state.
                        }}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 20,
                        }}
                    >
                        <span style={{ fontSize: '12px' }}>🎵</span>
                    </button>
                    {/* Character - Left Side */}
                    <div style={{ flexShrink: 0, position: 'relative' }}>
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0], transition: { duration: 0.3 } }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onCharacterInteract}
                            style={{ cursor: 'pointer', position: 'relative' }}
                        >
                            <AnimatedBanMao
                                animation={currentAnimation as typeof SHOWCASE_ANIMATIONS[number]}
                                size={isMobile ? 90 : 140}
                                loop={true}
                            />
                        </motion.div>

                        {/* Speech Bubble */}
                        <AnimatePresence>
                            {speechText && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5, y: 10, x: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: -20, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '80%',
                                        background: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '12px',
                                        borderBottomLeftRadius: '0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                        color: '#000',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        zIndex: 50,
                                        pointerEvents: 'none',
                                        minWidth: '100px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {speechText}
                                    {/* Bubble tail */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-6px',
                                        left: '0',
                                        width: '0',
                                        height: '0',
                                        borderLeft: '0px solid transparent',
                                        borderRight: '10px solid transparent',
                                        borderTop: '10px solid #fff',
                                    }} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Jackpot Info - Right Side - 3D Hover Effect */}
                    <div style={{ textAlign: 'center', flex: 1 }} className="hover-3d" data-tour="fomo-jackpot">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                            <AnimatedFrameSprite
                                type="lucky_bowl"
                                width={isMobile ? 40 : 60}
                                height={isMobile ? 40 : 60}
                                glowColor={isGlowing ? tierColors.primary : undefined}
                                priority
                            />
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                            {t.jackpotPool}
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            gap: '6px',
                            position: 'relative',
                        }}>
                            {/* Glow effect — rendered BEHIND the text, no filter on parent */}
                            {isGlowing && (
                                <div style={{
                                    position: 'absolute',
                                    inset: '-8px -12px',
                                    borderRadius: '12px',
                                    background: `radial-gradient(ellipse, ${tierColors.glow}, transparent 70%)`,
                                    opacity: 0.5,
                                    pointerEvents: 'none',
                                    transition: 'opacity 0.5s ease',
                                }} />
                            )}
                            <span style={{
                                fontSize: isMobile ? '22px' : '28px',
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${tierColors.primary}, ${tierColors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                position: 'relative',
                            }}>
                                <CountUp
                                    start={prevJackpotValue}
                                    end={currentJackpot}
                                    duration={1.5}
                                    separator=","
                                    decimals={0}
                                    preserveValue
                                />
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', position: 'relative' }}>$BANMAO</span>
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                            👑 {winnerPercent}% {t.winnerLabel} | 🏆 {topAttackersPercent}% Top 10
                        </div>

                        {/* Floating +delta animation */}
                        <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
                            <AnimatePresence>
                                {jackpotDelta > 0 && (
                                    <motion.div
                                        key={deltaKey}
                                        initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                        animate={{ opacity: 0, y: isMobile ? -40 : -55, scale: 1.1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 2.5, ease: 'easeOut' }}
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            bottom: 0,
                                            fontSize: isMobile ? '14px' : '18px',
                                            fontWeight: 800,
                                            color: '#22c55e',
                                            textShadow: '0 0 12px rgba(34, 197, 94, 0.7), 0 2px 4px rgba(0,0,0,0.5)',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none',
                                            zIndex: 10,
                                        }}
                                    >
                                        +{jackpotDelta.toLocaleString()} 💰
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Dual Timers or Timeout Countdown */}
                {isEnded ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            textAlign: 'center',
                            marginBottom: '12px',
                        }}
                    >
                        {/* Timeout Countdown Clock */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: '12px',
                                ...(timeoutCountdown <= 0 ? {
                                    filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))',
                                    animation: 'pulse 2s ease-in-out infinite',
                                } : {}),
                            }}
                        >
                            <CountdownClock
                                contractSeconds={timeoutCountdown}
                                maxSeconds={7200}
                                label={getText(t, "settleClaimTimeout", "⏰ Claim Timeout")}
                                subLabel=""
                                color={timeoutCountdown < 600 ? '#ef4444' : '#fbbf24'}
                                colorEnd={timeoutCountdown < 600 ? '#b91c1c' : '#ea580c'}
                                urgency={timeoutCountdown < 600 ? 'critical' : timeoutCountdown < 1800 ? 'warning' : 'normal'}
                                id="timeout-timer"
                                onTimeUp={onClaimTimeoutExpired}
                            />
                        </motion.div>

                        {/* Winner Info Card — with integrated expired state */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            style={{
                                background: isCurrentUserWinner && timeoutCountdown <= 0
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(0,0,0,0.25)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                marginBottom: '10px',
                                border: isCurrentUserWinner && timeoutCountdown <= 0
                                    ? '2px solid rgba(239, 68, 68, 0.5)'
                                    : '1px solid rgba(255, 215, 0, 0.2)',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#fbbf24',
                                marginBottom: '4px',
                            }}>
                                {getText(t, "settleWinnerLabel", "🏆 Winner")}:{' '}
                                <a
                                    href={`https://web3.okx.com/explorer/x-layer/address/${winnerAddr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#fff', fontFamily: 'monospace', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.3)' }}
                                >
                                    {shortWinner} ↗
                                </a>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: winType === "soft" ? '#facc15' : winType === "timeout" ? '#ef4444' : '#38bdf8',
                                fontWeight: 600,
                            }}>
                                {t.settleWinType
                                    ? t.settleWinType(winType)
                                    : winType === "soft"
                                        ? "⏳ Soft Win"
                                        : winType === "timeout"
                                            ? "⏰ Timeout — Rolled Over"
                                            : "⚡ Hard Win"
                                }
                            </div>
                            {/* Expired message integrated into winner card */}
                            {isCurrentUserWinner && timeoutCountdown <= 0 && (
                                <div style={{
                                    marginTop: '8px',
                                    paddingTop: '8px',
                                    borderTop: '1px solid rgba(239, 68, 68, 0.3)',
                                    fontSize: '11px',
                                    lineHeight: '1.5',
                                    color: '#fca5a5',
                                    fontWeight: 600,
                                }}>
                                    ❌ {getText(t, "settleTimeoutExpiredWinner", "You have missed the claim deadline! As per the rules, your rewards will now be transferred to the next round's jackpot.")}
                                </div>
                            )}
                        </motion.div>

                        {/* Non-winner warning + thank you */}
                        {!isCurrentUserWinner && address && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                    style={{
                                        background: 'rgba(234, 179, 8, 0.08)',
                                        border: '1px solid rgba(234, 179, 8, 0.25)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        marginBottom: '8px',
                                        fontSize: '11px',
                                        lineHeight: '1.5',
                                        color: '#fbbf24',
                                        textAlign: 'center',
                                    }}
                                >
                                    {getText(t, "settleWarningNonWinner", "⚠️ You are not the winner. Settling will finalize the round for the winner, but you will pay gas fees and receive no reward.")}
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                    style={{
                                        background: 'rgba(34, 197, 94, 0.08)',
                                        border: '1px solid rgba(34, 197, 94, 0.25)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        marginBottom: '10px',
                                        fontSize: '11px',
                                        lineHeight: '1.5',
                                        color: '#4ade80',
                                        textAlign: 'center',
                                    }}
                                >
                                    {getText(t, "settleThankYouHelper", "🙏 Thank you for helping settle the round! The community appreciates your contribution.")}
                                </motion.div>
                            </>
                        )}

                        {/* Danger warning — only when timeout NOT yet expired (still useful info) */}
                        {!(isCurrentUserWinner && timeoutCountdown <= 0) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.35 }}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    marginBottom: '10px',
                                    fontSize: '11px',
                                    lineHeight: '1.5',
                                    color: '#f87171',
                                    textAlign: 'center',
                                }}
                            >
                                {getText(t, "settleTimeoutDanger", "🚨 If the claim timeout expires, ALL $BANMAO rewards will be rolled into the next round's jackpot!")}
                            </motion.div>
                        )}

                        {/* Claim / Settle / Expired Button */}
                        {showAttackControls && onClaimAll && (
                            isCurrentUserWinner && timeoutCountdown <= 0 ? (
                                /* Expired — winner can still settle (rewards roll over) */
                                <motion.button
                                    className="btn-3d-danger"
                                    onClick={onClaimAll}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.4 }}
                                    style={{
                                        width: '100%',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '9999px',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {getText(t, "settleRolloverButton", "🔄 SETTLE — CHUYỂN VÀO JACKPOT VÒNG MỚI")}
                                </motion.button>
                            ) : (
                                /* Normal claim/settle button */
                                <motion.button
                                    className={isCurrentUserWinner ? 'btn-3d-gold' : 'btn-3d'}
                                    onClick={onClaimAll}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.4 }}
                                    style={{
                                        width: '100%',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '9999px',
                                        background: isCurrentUserWinner
                                            ? 'linear-gradient(135deg, #ffd700, #ff6b35)'
                                            : 'linear-gradient(135deg, #475569, #334155)',
                                        color: isCurrentUserWinner ? '#000' : '#94a3b8',
                                        fontSize: '16px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {isCurrentUserWinner
                                        ? getText(t, "claimAllButton", "💰 NHẬN JACKPOT & THƯỞNG")
                                        : `⚙️ ${getText(t, "settleButtonLabel", "SETTLE ROUND")}`
                                    }
                                </motion.button>
                            )
                        )}
                    </motion.div>
                ) : (
                    /* Normal: show dual timers */
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '8px',
                        alignItems: 'center',
                        marginBottom: '20px',
                    }} className="hover-3d" data-tour="fomo-timers">
                        {/* Soft Timer Clock */}
                        <motion.div
                            onClick={() => setTimerDetailType('soft')}
                            title={t.timerDetailTitle}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '16px',
                                padding: '4px',
                                transition: 'box-shadow 0.3s ease',
                            }}
                            whileHover={{
                                scale: 1.06,
                                boxShadow: '0 0 20px rgba(250, 204, 21, 0.35), 0 0 40px rgba(250, 204, 21, 0.15)',
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <CountdownClock
                                contractSeconds={softSeconds}
                                maxSeconds={21600}
                                label={`🐱 ${t.softTimerLabel}`}
                                subLabel=""
                                color="#facc15"
                                colorEnd="#ea580c"
                                urgency={softUrgency}
                                id="soft-timer"
                                ghostSeconds={showAttackControls ? softDuration : undefined}
                                ghostColor="#22c55e"
                                onTimeUp={onTimerExpired}
                            />
                        </motion.div>

                        {/* VS Divider */}
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#475569',
                        }}>
                            VS
                        </div>

                        {/* Hard Timer Clock */}
                        <motion.div
                            onClick={() => setTimerDetailType('hard')}
                            title={t.timerDetailTitle}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '16px',
                                padding: '4px',
                                transition: 'box-shadow 0.3s ease',
                            }}
                            whileHover={{
                                scale: 1.06,
                                boxShadow: '0 0 20px rgba(34, 211, 238, 0.35), 0 0 40px rgba(34, 211, 238, 0.15)',
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <CountdownClock
                                contractSeconds={hardSeconds}
                                maxSeconds={initialHardDuration}
                                label={`⚡ ${t.hardTimerLabel}`}
                                subLabel=""
                                color="#22d3ee"
                                colorEnd="#2563eb"
                                urgency={hardUrgency}
                                id="hard-timer"
                                ghostSeconds={showAttackControls ? Math.max(0, hardSeconds - selectedCount * timeDecreaseStep) : undefined}
                                ghostColor={selectedCount * timeDecreaseStep >= hardSeconds ? '#ef4444' : '#f59e0b'}
                                onTimeUp={onTimerExpired}
                            />
                        </motion.div>

                        {/* Last Attacker (Mobile only) — below timers */}
                        {isMobile && lastAttacker && lastAttacker !== '0x0000000000000000000000000000000000000000' && (
                            <div style={{
                                gridColumn: '1 / -1',
                                textAlign: 'center',
                                marginTop: '4px',
                            }}>
                                <a
                                    href={`https://web3.okx.com/explorer/x-layer/address/${lastAttacker}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 12px',
                                        borderRadius: '9999px',
                                        background: 'rgba(255, 215, 0, 0.08)',
                                        border: '1px solid rgba(255, 215, 0, 0.2)',
                                        textDecoration: 'none',
                                        fontSize: '11px',
                                        color: '#fbbf24',
                                        fontWeight: 600,
                                    }}
                                >
                                    <span>👑</span>
                                    <span style={{ fontFamily: 'monospace', color: '#fff', letterSpacing: '0.5px' }}>
                                        {lastAttacker.slice(0, 6)}...{lastAttacker.slice(-4)}
                                    </span>
                                    <span style={{ fontSize: '9px', opacity: 0.7 }}>↗</span>
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Gift Controls - Inline (only if showAttackControls is true and round not ended) */}
                {showAttackControls && !isEnded && (
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: isMobile ? '16px' : '24px',
                        padding: isMobile ? '10px' : '16px',
                    }} className="hover-3d" data-tour="fomo-attack">
                        {/* Quick Select Buttons with Timer Annotations */}
                        <div style={{
                            display: 'flex',
                            gap: isMobile ? '4px' : '6px',
                            marginBottom: isMobile ? '8px' : '12px',
                        }}>
                            {[1, 2, 5, 10].map((count) => {
                                const hardReduction = count * timeDecreaseStep;
                                const currentHard = Number(hardTimeLeft);
                                const newHard = Math.max(0, currentHard - hardReduction);
                                const newSoft = softDuration; // Soft always resets to full duration
                                const fmtHMS = (s: number) => {
                                    const hh = Math.floor(s / 3600);
                                    const mm = Math.floor((s % 3600) / 60);
                                    const ss = s % 60;
                                    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
                                };
                                const wouldEnd = hardReduction >= currentHard && currentHard > 0;
                                const isHovered = hoveredMultiplier === count || selectedCount === count;
                                return (
                                    <motion.button
                                        key={count}
                                        onClick={() => handleQuickSelect(count)}
                                        onMouseEnter={() => setHoveredMultiplier(count)}
                                        onMouseLeave={() => setHoveredMultiplier(null)}
                                        className={`btn-multiplier ${selectedCount === count ? 'active' : ''}`}
                                        style={{
                                            flex: 1,
                                            padding: isMobile ? '4px 1px' : '6px 2px',
                                            borderRadius: isMobile ? '10px' : '14px',
                                            color: selectedCount === count ? tierColors.primary : '#94a3b8',
                                            fontWeight: 700,
                                            fontSize: isMobile ? '12px' : '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '1px',
                                            position: 'relative',
                                            overflow: 'visible',
                                        }}
                                    >
                                        {/* Cat + label peek — pops out above the button together */}
                                        <motion.div
                                            animate={{
                                                opacity: isHovered ? 1 : 0,
                                                y: isHovered ? 0 : 10,
                                                scale: isHovered ? 1 : 0.3,
                                            }}
                                            transition={{ duration: 0.25 }}
                                            style={{
                                                position: 'absolute',
                                                top: '-40px',
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                pointerEvents: 'none',
                                                zIndex: 10,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: 800,
                                                color: '#ffd700',
                                                textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 1px 3px rgba(0,0,0,0.8)',
                                            }}>
                                                {count}x
                                            </span>
                                            <motion.img
                                                src={CAT_HOVER_SPRITE}
                                                alt=""
                                                animate={{
                                                    rotate: isHovered ? [0, -15, 15, 0] : 0,
                                                }}
                                                transition={{
                                                    rotate: { duration: 0.6, repeat: Infinity },
                                                }}
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    filter: 'drop-shadow(0 0 6px rgba(255, 107, 53, 0.6))',
                                                }}
                                            />
                                        </motion.div>
                                        <span>{count}x</span>
                                        {/* Soft Timer: resets to softDuration */}
                                        <span style={{
                                            fontSize: '8px',
                                            fontWeight: 600,
                                            color: '#22c55e',
                                            opacity: 0.9,
                                            lineHeight: 1.1,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            ⏱ → {fmtHMS(newSoft)}
                                        </span>
                                        {/* Hard Timer: reduced by count * step */}
                                        <span style={{
                                            fontSize: '8px',
                                            fontWeight: 600,
                                            color: wouldEnd ? '#ef4444' : '#f59e0b',
                                            opacity: 0.9,
                                            lineHeight: 1.1,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            ⚡ → {wouldEnd ? '00:00:00' : fmtHMS(newHard)}
                                        </span>
                                        {/* Show the delta clearly */}
                                        <span style={{
                                            fontSize: '7.5px',
                                            fontWeight: 500,
                                            color: 'rgba(255,255,255,0.4)',
                                            lineHeight: 1,
                                        }}>
                                            (-{hardReduction}s)
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Info Row */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: isMobile ? '10px' : '12px',
                            color: '#94a3b8',
                            marginBottom: isMobile ? '8px' : '12px',
                        }}>
                            <span>{getText(t, "totalCostLabel", "Cost")}: <strong style={{ color: tierColors.primary }}>{totalCostDisplay.toLocaleString()}</strong></span>
                            <span>{getText(t, "attacksRemaining", "Remaining")}: <strong>{attacksRemaining}/{Number(maxAttacksPerRound)}</strong></span>
                        </div>

                        {/* Minimum Attacks Hint */}
                        <motion.div
                            animate={
                                Number(userAttacksThisRound) < Number(minAttacksForReward) ? {
                                    boxShadow: ['0px 0px 0px rgba(251, 191, 36, 0)', '0px 0px 10px rgba(251, 191, 36, 0.4)', '0px 0px 0px rgba(251, 191, 36, 0)']
                                } : {}
                            }
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: isMobile ? '10px' : '12px',
                                fontWeight: Number(userAttacksThisRound) < Number(minAttacksForReward) ? 600 : 500,
                                color: Number(userAttacksThisRound) >= Number(minAttacksForReward) ? '#22c55e' : '#fbbf24',
                                marginBottom: isMobile ? '8px' : '12px',
                                padding: isMobile ? '6px 10px' : '8px 14px',
                                background: Number(userAttacksThisRound) >= Number(minAttacksForReward)
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : 'rgba(251, 191, 36, 0.1)',
                                borderRadius: '9999px',
                                border: Number(userAttacksThisRound) >= Number(minAttacksForReward)
                                    ? '1px solid rgba(34, 197, 94, 0.3)'
                                    : '1px dashed rgba(251, 191, 36, 0.4)',
                            }}>
                            {Number(userAttacksThisRound) >= Number(minAttacksForReward) ? (
                                <>✅ {getText(t, "eligibleForReward", "Eligible for rewards!")} ({Number(userAttacksThisRound)}/{Number(minAttacksForReward)})</>
                            ) : (
                                <>
                                    ⚠️ <span style={{ color: '#fff' }}>{getText(t, "minAttacksHint", "Min")} {Number(minAttacksForReward)} {getText(t, "giftsForReward", "gifts to earn rewards")}</span>
                                    <span style={{ color: '#fbbf24', marginLeft: '4px' }}>({Number(userAttacksThisRound)}/{Number(minAttacksForReward)})</span>
                                </>
                            )}
                        </motion.div>

                        {/* Kill Zone Warning Banner — centered modal-style */}
                        {(() => {
                            const hardLeft = Number(hardTimeLeft);
                            const KILL_ZONE_THRESHOLD = 1800; // 30 minutes
                            if (hardLeft > 0 && hardLeft <= KILL_ZONE_THRESHOLD && !isEnded && !isKillZoneDismissed) {
                                const currentReduction = selectedCount * timeDecreaseStep;
                                const wouldEnd = currentReduction >= hardLeft;
                                const mins = Math.floor(hardLeft / 60);
                                const secs = hardLeft % 60;
                                const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                                return (
                                    <motion.div
                                        className="kill-zone-banner"
                                        initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                                        style={{
                                            position: 'fixed',
                                            top: '80px',
                                            left: '50%',
                                            zIndex: 9999,
                                            maxWidth: '440px',
                                            width: 'calc(100vw - 32px)',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            background: wouldEnd
                                                ? 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))'
                                                : 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.92))',
                                            border: wouldEnd
                                                ? '1px solid rgba(252,165,165,0.4)'
                                                : '1px solid rgba(253,224,71,0.3)',
                                            backdropFilter: 'blur(16px)',
                                            boxShadow: wouldEnd
                                                ? '0 12px 40px rgba(239,68,68,0.5), 0 0 0 1px rgba(0,0,0,0.1)'
                                                : '0 12px 40px rgba(245,158,11,0.4), 0 0 0 1px rgba(0,0,0,0.1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '12px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {/* Close Button - Larger hit area and absolute positioning */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                dismissKillZone();
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                background: 'rgba(255,255,255,0.15)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                fontSize: '20px',
                                                transition: 'all 0.2s ease',
                                                zIndex: 99,
                                                pointerEvents: 'auto',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                            aria-label="Close"
                                        >
                                            ×
                                        </button>

                                        {/* Row 1: Icon + Warning Title + Timer */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            flexWrap: 'wrap',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontWeight: 900,
                                                    fontSize: '14px',
                                                    color: '#fff',
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                }}>
                                                    {/* Use translation which already contains an emoji, avoid duplication */}
                                                    {t.killZoneWarning}
                                                </span>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(0,0,0,0.4)',
                                                    fontSize: '14px',
                                                    fontWeight: 800,
                                                    color: wouldEnd ? '#fca5a5' : '#fef08a',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                }}>
                                                    {timeStr}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 2: Description text - Multi-line and centered */}
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'rgba(255,255,255,0.95)',
                                            fontWeight: 600,
                                            lineHeight: 1.5,
                                            maxWidth: '380px',
                                        }}>
                                            {t.killZoneDesc}
                                        </div>

                                        {/* Row 3: Would-end warning (conditional) */}
                                        {wouldEnd && (
                                            <motion.div
                                                animate={{ opacity: [1, 0.7, 1], scale: [1, 1.02, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.25)',
                                                    borderRadius: '10px',
                                                    fontSize: '13px',
                                                    fontWeight: 800,
                                                    color: '#fff',
                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                }}
                                            >
                                                💥 {t.killZoneGiftsCanEnd(selectedCount, currentReduction)}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            }
                            return null;
                        })()}

                        {/* Cooldown Display */}
                        {cooldownLeft > 0 && (
                            <div style={{
                                textAlign: 'center',
                                color: '#ffa500',
                                fontSize: '12px',
                                marginBottom: '8px',
                            }}>
                                ⏳ {getText(t, "cooldownActive", "Cooldown")}: {cooldownLeft}s
                            </div>
                        )}

                        {/* Approve/Attack/Connect Button */}
                        <motion.button
                            onClick={
                                !isConnected && openConnectModal
                                    ? openConnectModal
                                    : (isEnded && onClaimAll
                                        ? onClaimAll
                                        : (needsApproval ? handleApprove : handleAttack))
                            }
                            disabled={isLoading || (isConnected && !isEnded && !needsApproval && (!canAttack || !hasEnoughBalance || cooldownLeft > 0 || attacksRemaining <= 0 || isPaused))}
                            // Removed inline motion props, CSS handles it
                            animate={isShaking ? {
                                x: [0, -8, 8, -8, 8, -4, 4, 0],
                                rotate: [0, -1, 1, -1, 1, 0],
                            } : {}}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                border: 'none',
                                borderRadius: '9999px',
                                background: isLoading
                                    ? 'rgba(100,100,100,0.3)'
                                    : isEnded && onClaimAll
                                        ? 'linear-gradient(135deg, #ffd700, #ff6b35)'
                                        : (!needsApproval && (!canAttack || !hasEnoughBalance || isPaused))
                                            ? 'rgba(100,100,100,0.3)'
                                            : needsApproval
                                                ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)'
                                                : `linear-gradient(135deg, ${tierColors.primary}, ${tierColors.secondary})`,
                                color: isLoading || (!needsApproval && (!canAttack || !hasEnoughBalance)) ? '#666' : '#000',
                                fontSize: '16px',
                                fontWeight: 800,
                                // Cursor handled by CSS disabled state
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                            className={`btn-attack-pro`}
                        >
                            {!isConnected ? (
                                <>{getText(t, "connectWallet", "Connect Wallet")}</>
                            ) : isLoading ? (
                                <>

                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        ⏳
                                    </motion.span>
                                    {isApproving || isApproveConfirming
                                        ? getText(t, "approving", "Approving...")
                                        : getText(t, "attacking", "Sending...")}
                                </>
                            ) : needsApproval ? (
                                <>✅ {getText(t, "approve", "Approve $BANMAO")}</>
                            ) : isPaused ? (
                                <>⏸️ {getText(t, "gamePaused", "Paused")}</>
                            ) : isEnded ? (
                                <>{getText(t, "claimAllButton", "💰 NHẬN THƯỞNG")}</>
                            ) : !hasEnoughBalance ? (
                                <>💰 {getText(t, "insufficientBalance", "Insufficient Balance")}</>
                            ) : cooldownLeft > 0 ? (
                                <>⏳ {getText(t, "cooldownActive", "Cooldown")} {cooldownLeft}s</>
                            ) : attacksRemaining <= 0 ? (
                                <>🚫 {getText(t, "maxAttacksReached", "Limit Reached")}</>
                            ) : (selectedCount * timeDecreaseStep >= Number(hardTimeLeft) && Number(hardTimeLeft) > 0 && Number(hardTimeLeft) <= 1800) ? (
                                <>{t.killZoneFinalBlow}</>) : (
                                <>{getText(t, "attackButton", "🎁 SEND GIFT")}</>
                            )}
                        </motion.button>
                    </div>
                )}


                {/* Wallet Balances - Professional Display below button */}
                {
                    isConnected && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            marginTop: '12px',
                            padding: '8px 16px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '9999px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>💰</span>
                                <span style={{
                                    color: userBalance && userBalance >= (attackCost || 0n) ? '#ffd700' : '#ef4444',
                                    fontWeight: 700,
                                    fontFamily: "'Fira Code', monospace"
                                }}>
                                    {Number(formatUnits(userBalance || 0n, 18)).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '0.7em', opacity: 0.8 }}>$BANMAO</span>
                            </div>
                            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⛽</span>
                                <span style={{
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontFamily: "'Fira Code', monospace"
                                }}>
                                    {nativeBalance ? Number(nativeBalance.formatted).toFixed(4) : '0.0000'}
                                </span>
                                <span style={{ fontSize: '0.7em', opacity: 0.8 }}>OKB</span>
                            </div>
                        </div>
                    )
                }

            </motion.div >

            {/* Timer Prize Detail Modal */}
            <TimerPrizeDetail
                type={timerDetailType || 'soft'}
                isOpen={timerDetailType !== null}
                onClose={() => setTimerDetailType(null)}
                jackpotPool={jackpotPool}
                currentLeader={lastAttacker as `0x${string}`}
                totalAttacks={totalAttacks}
                topAttackers={topAttackers}
                attackCost={attackCost}
                winnerPercent={winnerPercent}
                topAttackersPercent={topAttackersPercent}
                minAttacksForReward={Number(minAttacksForReward)}
                t={t}
            />

        </>
    );
}
