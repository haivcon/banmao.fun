/**
 * AttackPanel Component - DualTimer Edition
 * Premium attack controls with attack limits display
 * Removed referral system, added maxAttacksPerRound tracking
 */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import AnimatedSprite from "./AnimatedSprite";

import { LocaleStrings } from "../lib/i18n/types";
import { BANMAOFOMO_ADDRESS, MIN_ATTACKS, MAX_ATTACKS, STEP_PRESETS, SOFT_DURATION, TIME_DECREASE_STEP, CHAIN_ID } from "../lib/constants";
import { BANMAOFOMO_ABI, ERC20_ABI } from "../lib/abis";
import { playAttackSound, playCriticalSound } from "../lib/sounds";
import { saveUserRoundToStorage } from "./ClaimPanel";
import DistributionAnimation from "./DistributionAnimation";

// Sprite paths for visual enhancement
const GIFT_BOX_SPRITE = "/gamefi/banmaofomo/sprites/banmao_gift_box.png";
const THUMBS_UP_SPRITE = "/gamefi/banmaofomo/sprites/banmao_thumbs_up.png";
const COIN_STACK_SPRITE = "/gamefi/banmaofomo/sprites/banmao_coin_stack.png";
// Cat peek reaction sprites for buttons
const CAT_HOVER_SPRITE = "/gamefi/banmaofomo/sprites/banmao_love_eyes.png";
const CAT_CLICK_SPRITE = "/gamefi/banmaofomo/sprites/banmao_feeding_happy.png";

interface AttackPanelProps {
    attackCost: bigint;
    balance: bigint;
    allowance: bigint;
    tokenAddress: `0x${string}`;
    lastAttackTime: bigint;
    userAttacksThisRound: bigint;
    maxAttacksPerRound: bigint;
    cooldownTime: bigint;
    isPaused: boolean;
    isEnded: boolean; // NEW: Whether current round has ended
    currentRound: bigint;
    t: LocaleStrings;
    onAttackSuccess?: () => void;
    onApproveSuccess?: () => void;

    // New Props for v2
    userTier?: number;
    effectiveCost?: bigint;
    dynamicCostEnabled?: boolean;

    // V11: Eligibility warning
    minAttacksForReward?: bigint;

    // Timer Config (Realtime)
    softDuration?: number;
    timeDecreaseStep?: number;
}

export default function AttackPanel({
    attackCost,
    balance,
    allowance,
    tokenAddress,
    lastAttackTime,
    userAttacksThisRound,
    maxAttacksPerRound,
    cooldownTime,
    isPaused,
    isEnded,
    currentRound,
    t,
    onAttackSuccess,
    onApproveSuccess,
    userTier,
    effectiveCost,
    dynamicCostEnabled,
    minAttacksForReward = BigInt(10),
    softDuration = 21600,
    timeDecreaseStep = 30,
}: AttackPanelProps) {
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();


    // Calculate actual cost (use effectiveCost if Dynamic Cost is active)
    const activeCost = effectiveCost || attackCost;

    const [attackCount, setAttackCount] = useState(1);
    const [cooldownLeft, setCooldownLeft] = useState(0);
    const [userSeed, setUserSeed] = useState("");
    const [isShaking, setIsShaking] = useState(false);
    const [showDistribution, setShowDistribution] = useState(false);
    const [lastAttackAmount, setLastAttackAmount] = useState(0);
    // Cat peek state for button reactions
    const [hoveredBtn, setHoveredBtn] = useState(false);
    const [clickedBtn, setClickedBtn] = useState(false);
    // Cat peek state for preset buttons
    const [hoveredPreset, setHoveredPreset] = useState<number | null>(null);
    const lastProcessedHash = useRef<string | null>(null);

    const totalCost = activeCost * BigInt(attackCount);
    const hasEnoughBalance = balance >= totalCost;
    const hasEnoughAllowance = allowance >= totalCost;

    // Calculate attacks remaining using CONTRACT value (not hardcoded)
    const maxAttacks = Number(maxAttacksPerRound);
    // CRITICAL: When round ended, show max attacks for new round (reset to 0 used)
    const userAttacks = isEnded ? 0 : Number(userAttacksThisRound);
    const attacksRemaining = maxAttacks - userAttacks;
    const hasAttacksRemaining = attacksRemaining >= attackCount;

    // Fetch native balance (OKB)
    const { data: nativeBalance } = useBalance({
        address: address,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address,
            refetchInterval: 15000, // Reduced from 5s to 15s
        }
    });

    // V11: Eligibility warning
    const minForReward = Number(minAttacksForReward);
    const needsMoreForEligibility = userAttacks < minForReward;
    const attacksNeededForEligibility = minForReward - userAttacks;

    // Cooldown from CONTRACT (seconds)
    const cooldownSeconds = Number(cooldownTime);

    // Cooldown timer - use CONTRACT value
    useEffect(() => {
        const checkCooldown = () => {
            const now = Math.floor(Date.now() / 1000);
            const lastAttack = Number(lastAttackTime);
            const remaining = Math.max(0, lastAttack + cooldownSeconds - now);
            setCooldownLeft(remaining);
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);
        return () => clearInterval(interval);
    }, [lastAttackTime, cooldownSeconds]);

    // Contract hooks
    const {
        writeContract: approve,
        data: approveHash,
        isPending: isApproving,
    } = useWriteContract();

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
        useWaitForTransactionReceipt({ hash: approveHash });

    const {
        writeContract: attack,
        data: attackHash,
        isPending: isAttacking,
    } = useWriteContract();

    const { isLoading: isAttackConfirming, isSuccess: isAttackSuccess } =
        useWaitForTransactionReceipt({ hash: attackHash });

    // Debug logging for attack transaction tracking
    useEffect(() => {
        console.log('[AttackPanel Debug] attackHash:', attackHash);
        console.log('[AttackPanel Debug] isAttacking:', isAttacking);
        console.log('[AttackPanel Debug] isAttackConfirming:', isAttackConfirming);
        console.log('[AttackPanel Debug] isAttackSuccess:', isAttackSuccess);
    }, [attackHash, isAttacking, isAttackConfirming, isAttackSuccess]);

    // Handle approve success - refetch allowance
    useEffect(() => {
        if (isApproveSuccess) {
            onApproveSuccess?.();
        }
    }, [isApproveSuccess, onApproveSuccess]);

    // Handle attack success with VFX - Standard only (Pure Edition)
    // Guard: only process each unique attackHash once to prevent distribution panel from reopening
    useEffect(() => {
        if (isAttackSuccess && attackHash && attackHash !== lastProcessedHash.current) {
            lastProcessedHash.current = attackHash;

            // Calculate attack amount immediately when effect runs
            const attackAmountNum = Number(formatUnits(activeCost, 18)) * attackCount;
            console.log('[DistributionAnimation] Attack success! Amount:', attackAmountNum, 'Count:', attackCount);

            playAttackSound();
            if (address && currentRound) {
                saveUserRoundToStorage(address, Number(currentRound));
            }
            onAttackSuccess?.();

            // Dispatch custom event for VaultHistory to capture immediately
            window.dispatchEvent(new CustomEvent('banmao-attack-success', {
                detail: {
                    count: attackCount,
                    amount: attackAmountNum,
                    txHash: attackHash,
                    roundId: Number(currentRound || 0),
                }
            }));

            // Show distribution animation with correct amount
            setLastAttackAmount(attackAmountNum);
            setShowDistribution(true);

            // Trigger confetti as backup visual feedback
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#ffd700', '#ff6b35', '#22d3ee'],
            });

            // Trigger shake effect
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    }, [isAttackSuccess, attackHash, onAttackSuccess, address, currentRound, activeCost, attackCount]);

    const handleApprove = useCallback(() => {
        if (!address) return;

        // Unlimited approval (max uint256) - người dùng chỉ cần approve 1 lần
        const approveAmount = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (approve as any)({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BANMAOFOMO_ADDRESS, approveAmount],
        });
    }, [address, approve, tokenAddress]);

    const handleAttack = useCallback(() => {
        if (!address || cooldownLeft > 0 || !hasEnoughBalance || isPaused || !hasAttacksRemaining) return;

        // Trigger shake effect
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        // Pure Edition: attack(uint256 _count) - Only 1 parameter now
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (attack as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "attack",
            args: [BigInt(attackCount)],
        });
    }, [address, attackCount, cooldownLeft, hasEnoughBalance, isPaused, hasAttacksRemaining, attack]);

    const isLoading = isApproving || isApproveConfirming || isAttacking || isAttackConfirming;
    const needsApproval = !hasEnoughAllowance && !isApproveSuccess;

    return (
        <motion.div
            className="attack-panel"
            data-tour="fomo-attack"
            animate={isShaking ? {
                x: [0, -8, 8, -8, 8, -4, 4, 0],
                rotate: [0, -1, 1, -1, 1, 0],
            } : {}}
            transition={{ duration: 0.5 }}
            style={{ position: 'relative', overflow: 'visible' }}
        >
            <h3 className="attack-panel-title">
                <span className="title-icon">⚔️</span>
                {t.attack}
                {userTier && userTier > 0 && (
                    <span
                        className="tier-badge"
                        style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            background:
                                userTier === 1 ? 'rgba(205, 127, 50, 0.2)' :
                                    userTier === 2 ? 'rgba(192, 192, 192, 0.2)' :
                                        userTier === 3 ? 'rgba(255, 215, 0, 0.2)' :
                                            'rgba(185, 242, 255, 0.2)',
                            border: `1px solid ${userTier === 1 ? '#cd7f32' :
                                userTier === 2 ? '#c0c0c0' :
                                    userTier === 3 ? '#ffd700' :
                                        '#b9f2ff'
                                }`,
                            color:
                                userTier === 1 ? '#cd7f32' :
                                    userTier === 2 ? '#c0c0c0' :
                                        userTier === 3 ? '#ffd700' :
                                            '#b9f2ff',
                            borderRadius: '12px',
                            marginLeft: '8px',
                            verticalAlign: 'middle'
                        }}
                    >
                        {userTier === 1 ? t.tierBronze : userTier === 2 ? t.tierSilver : userTier === 3 ? t.tierGold : t.tierDiamond}
                    </span>
                )}
            </h3>


            {/* Attacks Remaining Indicator */}
            <motion.div
                className="attacks-remaining-section"
                animate={attacksRemaining <= 10 ? { color: ["#fbbf24", "#ef4444", "#fbbf24"] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
            >
                <span className="remaining-label">{t.attacksRemaining}:</span>
                <span className={`remaining-value ${attacksRemaining <= 10 ? "low" : ""}`}>
                    {attacksRemaining} / {maxAttacks}
                </span>
            </motion.div>

            {/* V11: Eligibility Warning */}
            {needsMoreForEligibility && userAttacks > 0 && (
                <motion.div
                    className="eligibility-warning"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                    <span style={{ color: '#fbbf24' }}>
                        {t.eligibilityWarning ? t.eligibilityWarning(attacksNeededForEligibility) :
                            `Need ${attacksNeededForEligibility} more attacks for full prize eligibility`}
                    </span>
                </motion.div>
            )}

            {/* Attack Count Selector */}
            <div className="attack-count-section">
                <label className="attack-label">{t.attackCount}</label>
                <div className="attack-count-controls">
                    <motion.button
                        className="count-btn"
                        onClick={() => setAttackCount(Math.max(MIN_ATTACKS, attackCount - 1))}
                        disabled={attackCount <= MIN_ATTACKS || isLoading}
                        whileTap={{ scale: 0.9 }}
                    >
                        −
                    </motion.button>

                    <motion.input
                        type="number"
                        className="count-input"
                        value={attackCount}
                        min={MIN_ATTACKS}
                        max={Math.min(MAX_ATTACKS, attacksRemaining)}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setAttackCount(Math.max(MIN_ATTACKS, Math.min(Math.min(MAX_ATTACKS, attacksRemaining), val)));
                        }}
                        disabled={isLoading}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.2 }}
                        key={attackCount}
                    />

                    <motion.button
                        className="count-btn"
                        onClick={() => setAttackCount(Math.min(Math.min(MAX_ATTACKS, attacksRemaining), attackCount + 1))}
                        disabled={attackCount >= Math.min(MAX_ATTACKS, attacksRemaining) || isLoading}
                        whileTap={{ scale: 0.9 }}
                    >
                        +
                    </motion.button>
                </div>

                {/* Quick select buttons */}
                <div className="attack-presets">
                    {STEP_PRESETS.map((preset) => {
                        const isHovered = hoveredPreset === preset && preset <= attacksRemaining;
                        return (
                            <motion.button
                                key={preset}
                                className={`preset-btn ${attackCount === preset ? "active" : ""} ${preset > attacksRemaining ? "disabled" : ""} btn-3d`}
                                style={{
                                    borderBottom: attackCount === preset ? '3px solid #cc4a20' : '3px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '3px',
                                    overflow: 'hidden',
                                }}
                                onClick={() => preset <= attacksRemaining && setAttackCount(preset)}
                                onMouseEnter={() => setHoveredPreset(preset)}
                                onMouseLeave={() => setHoveredPreset(null)}
                                disabled={isLoading || preset > attacksRemaining}
                                whileHover={preset <= attacksRemaining ? { scale: 1.08, y: -3 } : {}}
                                whileTap={preset <= attacksRemaining ? { scale: 0.95 } : {}}
                                animate={attackCount === preset ? {
                                    boxShadow: ["0 0 10px #ff6b35", "0 0 20px #ffd700", "0 0 10px #ff6b35"],
                                } : {}}
                                transition={{ duration: 1, repeat: attackCount === preset ? Infinity : 0 }}
                            >
                                {/* Always-rendered cat icon — toggles visibility on hover */}
                                <motion.img
                                    src={CAT_HOVER_SPRITE}
                                    alt=""
                                    animate={{
                                        width: isHovered ? 18 : 0,
                                        opacity: isHovered ? 1 : 0,
                                        rotate: isHovered ? [0, -12, 12, 0] : 0,
                                    }}
                                    transition={{
                                        width: { duration: 0.2 },
                                        opacity: { duration: 0.15 },
                                        rotate: { duration: 0.6, repeat: Infinity },
                                    }}
                                    style={{
                                        height: 18,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                    }}
                                />
                                {preset}x
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Cost Display with Coin Stack */}
            <motion.div className="attack-cost-section" animate={{ opacity: 1 }} initial={{ opacity: 0.8 }} style={{ position: 'relative' }}>
                {/* Decorative Coin Stack */}
                <div style={{ position: 'absolute', right: -20, top: -30 }}>
                    <AnimatedSprite
                        src={COIN_STACK_SPRITE}
                        alt="Coins"
                        width={60}
                        height={60}
                        preset={["sparkle", "float"]}
                        glowColor="gold"
                    />
                </div>
                <div className="cost-row">
                    <span className="cost-label">{t.attackCost}:</span>
                    <span className="cost-value">
                        {Number(formatUnits(activeCost, 18)).toLocaleString()} $BANMAO
                        {dynamicCostEnabled && activeCost > attackCost && (
                            <small style={{ color: '#ef4444', marginLeft: '4px', fontSize: '0.7em' }}> ({t.dynamicCost} x{(Number(activeCost) / Number(attackCost)).toFixed(1)})</small>
                        )}
                        {userTier && userTier > 0 && activeCost < attackCost && (
                            <small style={{ color: '#22c55e', marginLeft: '4px', fontSize: '0.7em' }}> ({t.discount})</small>
                        )}
                    </span>
                </div>
                <motion.div
                    className="cost-row total"
                    key={attackCount}
                    initial={{ scale: 1.1, color: "#ffd700" }}
                    animate={{ scale: 1, color: "#ffffff" }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="cost-label">{t.totalCost}:</span>
                    <span className="cost-value cost-total">
                        {Number(formatUnits(totalCost, 18)).toLocaleString()} $BANMAO
                    </span>
                </motion.div>
            </motion.div>



            {/* Cooldown Indicator */}
            <AnimatePresence>
                {cooldownLeft > 0 && (
                    <motion.div
                        className="cooldown-indicator"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <motion.span
                            className="cooldown-icon"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            ⏳
                        </motion.span>
                        <span className="cooldown-text">{t.cooldownRemaining(cooldownLeft)}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="attack-actions" style={{ position: 'relative', overflow: 'visible' }}>
                {/* Cat Peek Reaction — shows above buttons */}
                <AnimatePresence>
                    {(hoveredBtn || clickedBtn) && (
                        <motion.img
                            key={clickedBtn ? 'click' : 'hover'}
                            src={clickedBtn ? CAT_CLICK_SPRITE : CAT_HOVER_SPRITE}
                            alt="BanMao Peek"
                            initial={clickedBtn ? { opacity: 1, y: 0, scale: 0.8 } : { opacity: 0, y: 20, scale: 0.7 }}
                            animate={clickedBtn ? { opacity: 0, y: -60, scale: 1.2 } : {
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                rotate: [0, -5, 5, 0],
                            }}
                            exit={{ opacity: 0, y: -30, scale: 0.5 }}
                            transition={clickedBtn ? { duration: 0.6 } : {
                                duration: 0.3,
                                rotate: { duration: 1.5, repeat: Infinity },
                            }}
                            onAnimationComplete={() => { if (clickedBtn) setClickedBtn(false); }}
                            style={{
                                position: 'absolute',
                                top: '-42px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                pointerEvents: 'none',
                                zIndex: 10,
                                filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.4))',
                            }}
                        />
                    )}
                </AnimatePresence>
                {!isConnected ? (
                    <motion.button
                        className="attack-btn primary"
                        onClick={() => { setClickedBtn(true); openConnectModal?.(); }}
                        onMouseEnter={() => setHoveredBtn(true)}
                        onMouseLeave={() => setHoveredBtn(false)}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255, 107, 53, 0.5)" }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                            boxShadow: ["0 0 10px rgba(255, 107, 53, 0.3)", "0 0 20px rgba(255, 107, 53, 0.6)", "0 0 10px rgba(255, 107, 53, 0.3)"],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {t.connectWallet}
                    </motion.button>
                ) : isPaused ? (
                    <motion.button
                        className="attack-btn disabled"
                        disabled
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {t.gamePaused}
                    </motion.button>
                ) : !hasAttacksRemaining ? (
                    <motion.button className="attack-btn disabled" disabled>
                        {t.maxAttacksReached}
                    </motion.button>
                ) : needsApproval ? (
                    <motion.button
                        className="attack-btn approve"
                        onClick={() => { setClickedBtn(true); handleApprove(); }}
                        onMouseEnter={() => setHoveredBtn(true)}
                        onMouseLeave={() => setHoveredBtn(false)}
                        disabled={isLoading}
                        whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)" }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {isApproving || isApproveConfirming ? (
                            <span className="loading-text">
                                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                    ⏳
                                </motion.span>
                                {" "}{t.approving}
                            </span>
                        ) : t.approve}
                    </motion.button>
                ) : (
                    <motion.button
                        className="attack-btn primary"
                        onClick={() => { setClickedBtn(true); handleAttack(); }}
                        onMouseEnter={() => setHoveredBtn(true)}
                        onMouseLeave={() => setHoveredBtn(false)}
                        disabled={isLoading || cooldownLeft > 0 || !hasEnoughBalance || isPaused || !hasAttacksRemaining}
                        whileHover={!isLoading && cooldownLeft === 0 && hasEnoughBalance && hasAttacksRemaining ? {
                            scale: 1.05,
                            boxShadow: "0 0 30px rgba(255, 107, 53, 0.8)",
                        } : {}}
                        whileTap={!isLoading && cooldownLeft === 0 && hasEnoughBalance && hasAttacksRemaining ? {
                            scale: 0.95,
                            x: [0, -5, 5, -5, 5, 0],
                        } : {}}
                        animate={!isLoading && cooldownLeft === 0 && hasEnoughBalance && hasAttacksRemaining ? {
                            boxShadow: [
                                "0 0 10px rgba(255, 107, 53, 0.5)",
                                "0 0 25px rgba(255, 215, 0, 0.8)",
                                "0 0 10px rgba(255, 107, 53, 0.5)",
                            ],
                        } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        {isAttacking || isAttackConfirming ? (
                            <span className="loading-text">
                                <motion.span
                                    className="attack-spinner"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                                >
                                    ⚔️
                                </motion.span>
                                {" "}{t.attacking}
                            </span>
                        ) : !hasEnoughBalance ? (
                            t.insufficientBalance
                        ) : cooldownLeft > 0 ? (
                            t.cooldownActive
                        ) : (
                            <span className="attack-btn-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AnimatedSprite
                                    src={GIFT_BOX_SPRITE}
                                    alt="Gift"
                                    width={32}
                                    height={32}
                                    preset={["shake", "glow"]}
                                    glowColor="orange"
                                />
                                <span className="attack-text">{t.attackButton}</span>
                            </span>
                        )}
                    </motion.button>
                )}
            </div>

            {/* Wallet Balances - Professional Display below button */}
            {isConnected && (
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
                            color: hasEnoughBalance ? '#ffd700' : '#ef4444',
                            fontWeight: 700,
                            fontFamily: "'Fira Code', monospace"
                        }}>
                            {Number(formatUnits(balance, 18)).toLocaleString()}
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
            )}

            {/* Distribution Animation Overlay */}
            <DistributionAnimation
                show={showDistribution}
                attackAmount={lastAttackAmount}
                attackCount={attackCount}
                t={t}
                onComplete={() => setShowDistribution(false)}
                softResetDuration={softDuration}
                hardDeductionPerKey={timeDecreaseStep}
            />
        </motion.div>
    );
}
