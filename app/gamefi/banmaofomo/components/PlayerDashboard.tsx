/**
 * PlayerDashboard Component - Unified Player Info Panel
 * Combines: SettlePanel (Vault/Claim), VIPTierPanel (Tier Progress), WalletBalancePanel (Burn/Staking)
 * 
 * Sections:
 * 1. 👤 CÁ NHÂN (Personal) - Vault, VIP Tier, Claim
 * 2. 🌐 CỘNG ĐỒNG (Community) - Burn Wallet, Staking Wallet
 */
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { formatUnits } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useWatchContractEvent } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import CountUp from "react-countup";
import AnimatedSprite from "./AnimatedSprite";
import { LocaleStrings } from "../lib/i18n/types";
import { BANMAOFOMO_ADDRESS, BANMAO_ADDRESS, STAKING_ADDRESS, CHAIN_ID } from "../lib/constants";
import { BANMAOFOMO_V11_ABI } from "../lib/abis-v11";
import { ERC20_ABI } from "../lib/abis";
import { playClaimSound } from "../lib/sounds";
import VaultHistory from "./VaultHistory";

// Sprite paths
const JACKPOT_CHEST_SPRITE = "/gamefi/banmaofomo/sprites/banmao_jackpot_chest.png";
const CAT_RAIN_SPRITE = "/gamefi/banmaofomo/sprites/banmao_feeding_happy.png";

// Wallet addresses
const BURN_WALLET_ADDRESS = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;

// VIP Tier definitions (defaults, overridden by tierData prop from contract)
interface TierDataItem {
    threshold: number;
    cooldownReduction: number;
}

const TIER_CONFIG_DEFAULT = [
    { name: "Newcomer", icon: "🌱", threshold: 0, cooldownReduction: 0, color: "#888" },
    { name: "Bronze", icon: "🥉", threshold: 10, cooldownReduction: 0, color: "#cd7f32" },
    { name: "Silver", icon: "🥈", threshold: 100, cooldownReduction: 10, color: "#c0c0c0" },
    { name: "Gold", icon: "🥇", threshold: 500, cooldownReduction: 20, color: "#ffd700" },
    { name: "Diamond", icon: "💎", threshold: 1000, cooldownReduction: 40, color: "#b9f2ff" },
];

interface PlayerDashboardProps {
    // Vault/Settle props
    personalVault: bigint;
    currentRound: bigint;
    isRoundEnded: boolean;
    isWinner: boolean;
    isInTimeoutDanger: boolean;
    timeoutCountdown: number;
    onSettleSuccess?: () => void;
    // VIP Tier props
    currentTier: number;
    lifetimeAttacks: bigint;
    baseCooldown: bigint;
    // Seed Fund
    seedFund?: bigint;
    // Dynamic tier data from contract
    tierData?: TierDataItem[];
    // Common
    t: LocaleStrings;
}

export default function PlayerDashboard({
    personalVault,
    currentRound,
    isRoundEnded,
    isWinner,
    isInTimeoutDanger,
    timeoutCountdown,
    onSettleSuccess,
    currentTier,
    lifetimeAttacks,
    baseCooldown,
    seedFund,
    tierData,
    t,
}: PlayerDashboardProps) {
    const { address, isConnected } = useAccount();

    // ===== VAULT STATE =====
    const [prevVault, setPrevVault] = useState<number>(0);
    const [isGlowing, setIsGlowing] = useState(false);
    const prevVaultRef = useRef<number>(0);
    const [showHistory, setShowHistory] = useState(false);

    const currentVaultValue = Number(formatUnits(personalVault, 18));
    const hasRewards = personalVault > 0n;
    const canSettle = hasRewards || isRoundEnded;
    // Cat rain state for claim button click
    const [catRainParticles, setCatRainParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
    const claimBtnRef = useRef<HTMLButtonElement>(null);

    // Detect vault increase and trigger glow
    useEffect(() => {
        if (currentVaultValue > prevVaultRef.current && prevVaultRef.current > 0) {
            setIsGlowing(true);
            setTimeout(() => setIsGlowing(false), 2000);
        }
        setPrevVault(prevVaultRef.current);
        prevVaultRef.current = currentVaultValue;
    }, [currentVaultValue]);

    // ===== SETTLE CONTRACT =====
    const {
        writeContract: settle,
        data: settleHash,
        isPending: isSettling,
    } = useWriteContract();

    const { isLoading: isSettleConfirming, isSuccess: isSettleSuccess } =
        useWaitForTransactionReceipt({ hash: settleHash });

    useEffect(() => {
        if (isSettleSuccess) {
            playClaimSound();
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.7 },
                colors: ['#ffd700', '#ff6b35', '#22d3ee'],
            });
            if (isWinner) {
                setTimeout(() => {
                    confetti({ particleCount: 150, angle: 60, spread: 80, origin: { x: 0 }, colors: ['#ffd700', '#ff6b35'] });
                    confetti({ particleCount: 150, angle: 120, spread: 80, origin: { x: 1 }, colors: ['#ffd700', '#ff6b35'] });
                }, 150);
            }

            // Dispatch custom event for VaultHistory to capture claim immediately
            window.dispatchEvent(new CustomEvent('banmao-claim-success', {
                detail: {
                    amount: currentVaultValue,
                    txHash: settleHash || '',
                }
            }));

            onSettleSuccess?.();
        }
    }, [isSettleSuccess, isWinner, onSettleSuccess]);

    const handleSettle = useCallback(() => {
        if (!address || !canSettle) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settle as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_V11_ABI,
            functionName: "settleGame",
        });
    }, [address, canSettle, settle]);

    const isLoading = isSettling || isSettleConfirming;

    // ===== VIP TIER =====
    // Build effective tier config: merge contract data into defaults
    const TIER_CONFIG = TIER_CONFIG_DEFAULT.map((defaultTier, idx) => {
        if (idx === 0 || !tierData || !tierData[idx - 1]) return defaultTier;
        return {
            ...defaultTier,
            threshold: tierData[idx - 1].threshold,
            cooldownReduction: tierData[idx - 1].cooldownReduction,
        };
    });
    const tier = TIER_CONFIG[currentTier] || TIER_CONFIG[0];
    const nextTier = currentTier < 4 ? TIER_CONFIG[currentTier + 1] : null;
    const attacks = Number(lifetimeAttacks);
    const progressToNext = nextTier
        ? Math.min(100, ((attacks - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100)
        : 100;
    const attacksToNext = nextTier ? nextTier.threshold - attacks : 0;
    const base = Number(baseCooldown);
    const reduction = tier.cooldownReduction;
    const effectiveCooldown = Math.ceil(base * (1 - reduction / 100));

    // ===== BURN & STAKING BALANCES =====
    const [burnIncrease, setBurnIncrease] = useState<number>(0);
    const [stakingIncrease, setStakingIncrease] = useState<number>(0);
    const [prevBurnValue, setPrevBurnValue] = useState<number>(0);
    const [prevStakingValue, setPrevStakingValue] = useState<number>(0);
    const prevBurnRef = useRef(0);
    const prevStakingRef = useRef(0);

    const { data: burnBalance, refetch: refetchBurn } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [BURN_WALLET_ADDRESS],
        chainId: CHAIN_ID,
    });

    const { data: stakingBalance, refetch: refetchStaking } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [STAKING_ADDRESS],
        chainId: CHAIN_ID,
    });

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refetchBurn();
            refetchStaking();
        }, 10000);
        return () => clearInterval(interval);
    }, [refetchBurn, refetchStaking]);

    const currentBurnValue = burnBalance ? Number(formatUnits(burnBalance as bigint, 18)) : 0;
    const currentStakingValue = stakingBalance ? Number(formatUnits(stakingBalance as bigint, 18)) : 0;

    useEffect(() => {
        if (currentBurnValue > prevBurnRef.current && prevBurnRef.current > 0) {
            setBurnIncrease(currentBurnValue - prevBurnRef.current);
            setTimeout(() => setBurnIncrease(0), 2000);
        }
        setPrevBurnValue(prevBurnRef.current);
        prevBurnRef.current = currentBurnValue;
    }, [currentBurnValue]);

    useEffect(() => {
        if (currentStakingValue > prevStakingRef.current && prevStakingRef.current > 0) {
            setStakingIncrease(currentStakingValue - prevStakingRef.current);
            setTimeout(() => setStakingIncrease(0), 2000);
        }
        setPrevStakingValue(prevStakingRef.current);
        prevStakingRef.current = currentStakingValue;
    }, [currentStakingValue]);

    const formatBalance = (value: number): string => {
        if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
        if (value >= 1000) return (value / 1000).toFixed(1) + "K";
        return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    };

    // ===== BUTTON HELPERS =====
    const getButtonText = () => {
        if (isLoading) return <span className="loading-text"><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>⏳</motion.span> {t.claiming || "Processing..."}</span>;
        if (isWinner && isRoundEnded) return <><motion.span animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}>🏆</motion.span> {t.claimJackpotWin}</>;
        if (hasRewards) return <><motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>💰</motion.span> {t.claimAll || "Nhận Tất Cả"}</>;
        if (isRoundEnded) return <><motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>🔄</motion.span> {t.finalizeRound}</>;
        return t.noRewards || "No Rewards";
    };

    const getButtonClass = () => {
        if (isWinner && isRoundEnded) return "claim-btn winner-glow";
        if (hasRewards) return "claim-btn primary";
        if (isRoundEnded) return "claim-btn secondary";
        return "claim-btn disabled";
    };

    if (!isConnected) return null;

    return (
        <motion.div
            className="player-dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
                background: "rgba(0, 0, 0, 0.6)",
                borderRadius: "20px",
                padding: "16px",
                border: "1px solid rgba(255, 215, 0, 0.2)",
            }}
        >
            {/* Dashboard Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid rgba(255, 215, 0, 0.15)",
            }}>
                <span style={{ fontSize: "20px" }}>📊</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffd700" }}>{t.dashboardTitle || "PLAYER DASHBOARD"}</span>
            </div>

            {/* ===== 👤 PERSONAL SECTION ===== */}
            <div style={{
                background: "rgba(255, 215, 0, 0.05)",
                border: "1px solid rgba(255, 215, 0, 0.25)",
                borderRadius: "24px",
                padding: "14px",
                marginBottom: "12px",
                overflow: "visible",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px" }}>👤</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#ffd700" }}>{t.personalSection || "CÁ NHÂN"}</span>
                </div>

                {/* Vault Display */}
                <motion.div
                    className="vault-compact hover-3d"
                    animate={isGlowing ? { boxShadow: ["0 0 10px rgba(255, 215, 0, 0.3)", "0 0 30px rgba(255, 215, 0, 0.7)", "0 0 10px rgba(255, 215, 0, 0.3)"] } : {}}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "rgba(0, 0, 0, 0.3)",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        marginBottom: "10px",
                    }}
                >
                    <AnimatedSprite
                        src={JACKPOT_CHEST_SPRITE}
                        alt="Vault"
                        width={40}
                        height={40}
                        preset={["bounce", "glow"]}
                        glowColor="gold"
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: "#888" }}>{t.personalVault || "Kho Cá Nhân"}</div>
                        <motion.div
                            style={{ fontSize: "18px", fontWeight: 700, color: "#ffd700" }}
                            animate={hasRewards ? { textShadow: ["0 0 5px rgba(255, 215, 0, 0.3)", "0 0 15px rgba(255, 215, 0, 0.6)", "0 0 5px rgba(255, 215, 0, 0.3)"] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <CountUp start={prevVault} end={currentVaultValue} duration={1.5} decimals={0} separator="," preserveValue />
                            <span style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.8 }}>$BANMAO</span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* VIP Tier Compact */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    marginBottom: "10px",
                }} className="hover-3d">
                    <motion.span
                        style={{ fontSize: "24px" }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {tier.icon}
                    </motion.span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: tier.color }}>{tier.name} {t.tierSuffix || "Tier"}</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>{attacks.toLocaleString()} {t.attacksPlural || "attacks"}</div>
                        {nextTier && (
                            <div style={{
                                height: "4px",
                                background: "rgba(255, 255, 255, 0.1)",
                                borderRadius: "2px",
                                marginTop: "4px",
                                overflow: "hidden",
                            }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressToNext}%` }}
                                    style={{ height: "100%", background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})` }}
                                />
                            </div>
                        )}
                    </div>
                    {reduction > 0 && (
                        <div style={{
                            fontSize: "10px",
                            background: `${tier.color}20`,
                            color: tier.color,
                            padding: "3px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                        }}>
                            -{reduction}% CD
                        </div>
                    )}
                </div>


                {/* Claim Button with Cat Rain */}
                <motion.button
                    ref={claimBtnRef}
                    className={`${getButtonClass()} btn-3d`}
                    data-tour="fomo-claim"
                    onClick={() => {
                        // Spawn cat rain using viewport position
                        if (claimBtnRef.current) {
                            const rect = claimBtnRef.current.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const topY = rect.top;
                            const particles = Array.from({ length: 6 }, (_, i) => ({
                                id: Date.now() + i,
                                x: centerX + (i - 2.5) * 28,
                                y: topY,
                                delay: i * 0.06,
                            }));
                            setCatRainParticles(particles);
                        }
                        handleSettle();
                    }}
                    disabled={isLoading || !canSettle}
                    whileHover={{ scale: canSettle ? 1.02 : 1 }}
                    whileTap={{ scale: canSettle ? 0.98 : 1 }}
                    style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "9999px",
                        fontWeight: 700,
                        fontSize: "14px",
                        background: hasRewards ? "linear-gradient(135deg, #ffd700, #ff6b35)" : "rgba(255, 255, 255, 0.1)",
                        color: hasRewards ? "#000" : "#888",
                        border: "none",
                        cursor: canSettle ? "pointer" : "not-allowed",
                    }}
                    animate={hasRewards ? { boxShadow: ["0 0 10px rgba(255, 215, 0, 0.3)", "0 0 20px rgba(255, 215, 0, 0.5)", "0 0 10px rgba(255, 215, 0, 0.3)"] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {getButtonText()}
                </motion.button>

                {/* Cat Rain Portal — rendered at viewport level to escape overflow clipping */}
                {typeof document !== 'undefined' && ReactDOM.createPortal(
                    <AnimatePresence>
                        {catRainParticles.map((p) => (
                            <motion.img
                                key={p.id}
                                src={CAT_RAIN_SPRITE}
                                alt=""
                                initial={{ opacity: 1, scale: 0.5 }}
                                animate={{
                                    opacity: 0,
                                    y: -100,
                                    scale: 1.1,
                                    rotate: (Math.random() - 0.5) * 50,
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
                                onAnimationComplete={() => {
                                    setCatRainParticles(prev => prev.filter(pp => pp.id !== p.id));
                                }}
                                style={{
                                    position: 'fixed',
                                    left: p.x,
                                    top: p.y,
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                    zIndex: 99999,
                                    filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.5))',
                                }}
                            />
                        ))}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Gas Warning - Prominent Annotation */}
                <div style={{
                    marginTop: "12px",
                    padding: "10px 12px",
                    background: "rgba(245, 158, 11, 0.08)", // Amber background
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontWeight: 700, fontSize: "12px" }}>
                        <span style={{ fontSize: "14px" }}>⚠️</span>
                        <span>{t.claimGasWarningTitle}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", lineHeight: "1.4" }}>
                        {t.claimGasWarningBody}
                    </div>
                </div>

                {/* History Toggle */}
                <button
                    className="btn-3d-ghost"
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        width: "100%",
                        marginTop: "8px",
                        padding: "8px",
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "9999px",
                        color: "#888",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                    }}
                >
                    📜 {showHistory ? t.hideTransactionHistory : t.viewTransactionHistory}
                    <span style={{ transform: showHistory ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}>▼</span>
                </button>

                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <VaultHistory t={t} currentVault={personalVault} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ===== 🌐 COMMUNITY SECTION ===== */}
            <div style={{
                background: "rgba(168, 85, 247, 0.05)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                borderRadius: "24px",
                padding: "14px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px" }}>🌐</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#a855f7" }}>{t.communitySection || "CỘNG ĐỒNG"}</span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                    {/* Burn Wallet */}
                    <a
                        href={`https://web3.okx.com/explorer/x-layer/address/${BURN_WALLET_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, textDecoration: 'none' }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02, borderColor: "rgba(239, 68, 68, 0.5)" }}
                            className="tooltip-wallet tooltip-burn"
                            data-tooltip={t.burnTooltip || "Token đã đốt vĩnh viễn, giảm tổng cung và tăng giá trị"}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                padding: "10px",
                                background: "rgba(239, 68, 68, 0.1)",
                                borderRadius: "20px",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                position: "relative",
                                cursor: "pointer",
                                transition: "border-color 0.2s",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "16px" }}>🔥</span>
                                <span style={{ color: "#94a3b8", fontSize: "10px" }}>{t.distBurnWallet} ↗</span>
                            </div>
                            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "14px" }}>
                                <CountUp start={prevBurnValue} end={currentBurnValue} duration={1.2} separator="," decimals={0} preserveValue />
                            </div>
                            <span style={{ color: "#ef4444", fontSize: "9px", opacity: 0.7 }}>$BANMAO</span>

                            <AnimatePresence>
                                {burnIncrease > 0 && (
                                    <motion.div
                                        initial={{ opacity: 1, y: 0 }}
                                        animate={{ opacity: 0, y: -20 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            position: "absolute",
                                            top: "-10px",
                                            color: "#ef4444",
                                            fontWeight: 700,
                                            fontSize: "12px",
                                            textShadow: "0 0 10px rgba(239, 68, 68, 0.8)",
                                        }}
                                    >
                                        +{formatBalance(burnIncrease)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </a>

                    {/* Staking Wallet */}
                    <a
                        href={`https://web3.okx.com/explorer/x-layer/address/${STAKING_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, textDecoration: 'none' }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            whileHover={{ scale: 1.02, borderColor: "rgba(168, 85, 247, 0.5)" }}
                            className="tooltip-wallet tooltip-staking"
                            data-tooltip={t.stakingTooltip || "Ví cộng đồng nhận phí để nạp vào quỹ thưởng BanmaoStake, làm phần thưởng cho người stake $BANMAO."}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                padding: "10px",
                                background: "rgba(168, 85, 247, 0.1)",
                                borderRadius: "20px",
                                border: "1px solid rgba(168, 85, 247, 0.2)",
                                position: "relative",
                                cursor: "pointer",
                                transition: "border-color 0.2s",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "16px" }}>💎</span>
                                <span style={{ color: "#94a3b8", fontSize: "10px" }}>{t.distStakingWallet} ↗</span>
                            </div>
                            <div style={{ color: "#a855f7", fontWeight: 700, fontSize: "14px" }}>
                                <CountUp start={prevStakingValue} end={currentStakingValue} duration={1.2} separator="," decimals={0} preserveValue />
                            </div>
                            <span style={{ color: "#a855f7", fontSize: "9px", opacity: 0.7 }}>$BANMAO</span>

                            <AnimatePresence>
                                {stakingIncrease > 0 && (
                                    <motion.div
                                        initial={{ opacity: 1, y: 0 }}
                                        animate={{ opacity: 0, y: -20 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            position: "absolute",
                                            top: "-10px",
                                            color: "#a855f7",
                                            fontWeight: 700,
                                            fontSize: "12px",
                                            textShadow: "0 0 10px rgba(168, 85, 247, 0.8)",
                                        }}
                                    >
                                        +{formatBalance(stakingIncrease)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </a>
                </div>
            </div>

            {/* ===== 🌱 SEED FUND PANEL (Quỹ tích lũy) ===== */}
            {!!seedFund && seedFund > 0n && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="tooltip-wallet tooltip-seed"
                    data-tooltip={t.seedFundTooltip || "Quỹ khởi động cho vòng tiếp theo, tăng hấp dẫn jackpot"}
                    style={{
                        background: "rgba(34, 197, 94, 0.08)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: "9999px",
                        padding: "12px 20px",
                        marginTop: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px" }}>🌱</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>
                            {t.seedFundTitle || "Quỹ tích lũy vòng tiếp"}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "#22c55e" }}>
                            {Number(formatUnits(seedFund, 18)).toLocaleString()}
                        </span>
                        <span style={{ fontSize: "10px", color: "#22c55e", opacity: 0.8 }}>$BANMAO</span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
