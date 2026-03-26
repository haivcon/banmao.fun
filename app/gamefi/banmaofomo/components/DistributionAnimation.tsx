/**
 * DistributionAnimation Component - Fully i18n Edition
 * Shows animated token distribution when user attacks
 * Displays amounts flowing to: Jackpot, Dividend, Next Round, Staking, Burn
 * With flying coin effects and localized labels using i18n
 */
"use client";

import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { V11_FUND_DISTRIBUTION } from "../lib/constants";
import { LocaleStrings } from "../lib/i18n/types";

interface DistributionAnimationProps {
    /** Whether to show the animation */
    show: boolean;
    /** Attack amount in tokens (already formatted, no decimals) */
    attackAmount: number;
    /** Number of attacks (gifts) in this batch */
    attackCount: number;
    /** Localization strings */
    t: LocaleStrings;
    /** Whether in mobile view */
    isMobile?: boolean;
    /** Whether this is the first attack of the round */
    isFirstAttack?: boolean;
    /** Callback when animation completes */
    onComplete?: () => void;
}

interface DistributionItemConfig {
    key: string;
    icon: string;
    labelKey: keyof LocaleStrings;
    descKey: keyof LocaleStrings;
    percentage: number;
    color: string;
    bgColor: string;
    delay: number;
}

// Configuration for distribution items - uses i18n keys
const distributionItemsConfig: DistributionItemConfig[] = [
    {
        key: "jackpot",
        icon: "🏆",
        labelKey: "distJackpotLabel",
        descKey: "distJackpotDesc",
        percentage: V11_FUND_DISTRIBUTION.JACKPOT,
        color: "#ffd700",
        bgColor: "rgba(255, 215, 0, 0.15)",
        delay: 0,
    },
    {
        key: "dividend",
        icon: "💰",
        labelKey: "distDividendLabel",
        descKey: "distDividendDesc",
        percentage: V11_FUND_DISTRIBUTION.DIVIDENDS,
        color: "#22d3ee",
        bgColor: "rgba(34, 211, 238, 0.15)",
        delay: 0.12,
    },
    {
        key: "seedFund",
        icon: "🌱",
        labelKey: "distSeedLabel",
        descKey: "distSeedDesc",
        percentage: V11_FUND_DISTRIBUTION.SEED_FUND,
        color: "#4ade80",
        bgColor: "rgba(74, 222, 128, 0.15)",
        delay: 0.24,
    },
    {
        key: "staking",
        icon: "💎",
        labelKey: "distStakingLabel",
        descKey: "distStakingDesc",
        percentage: V11_FUND_DISTRIBUTION.STAKING,
        color: "#a855f7",
        bgColor: "rgba(168, 85, 247, 0.15)",
        delay: 0.36,
    },
    {
        key: "burn",
        icon: "🔥",
        labelKey: "distBurnLabel",
        descKey: "distBurnDesc",
        percentage: V11_FUND_DISTRIBUTION.BURN,
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.15)",
        delay: 0.48,
    },
];

// Flying coin component
const FlyingCoin = ({ delay, color }: { delay: number; color: string }) => (
    <motion.span
        initial={{ opacity: 0, x: -50, y: 0, scale: 0 }}
        animate={{
            opacity: [0, 1, 1, 0],
            x: [0, 20, 40, 60],
            y: [0, -10, -5, 0],
            scale: [0.5, 1.2, 1, 0.8],
        }}
        transition={{
            delay: delay + 0.3,
            duration: 0.8,
            ease: "easeOut"
        }}
        style={{
            position: 'absolute',
            right: '-20px',
            fontSize: '14px',
            filter: `drop-shadow(0 0 6px ${color})`,
        }}
    >
        💫
    </motion.span>
);

// Sparkle effect
const Sparkle = ({ delay, color }: { delay: number; color: string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            rotate: [0, 180, 360],
        }}
        transition={{ delay: delay + 0.5, duration: 0.6 }}
        style={{
            position: 'absolute',
            right: '60px',
            width: '8px',
            height: '8px',
            background: color,
            borderRadius: '50%',
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
        }}
    />
);

// Impact Clock Component - Premium Animation Edition
const ImpactClock = ({
    type,
    count,
    t,
    softResetDuration = 21600, // 6h default
    hardDeductionPerKey = 30   // 30s default
}: {
    type: 'soft' | 'hard';
    count: number;
    t: LocaleStrings;
    softResetDuration?: number;
    hardDeductionPerKey?: number;
}) => {
    const isSoft = type === 'soft';
    const color = isSoft ? '#22c55e' : '#ef4444'; // Green vs Red
    const icon = isSoft ? '🔵' : '🔴';
    const size = 60;
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const hardDeductionSeconds = hardDeductionPerKey * count;

    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0, scale: 0.5 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 200, damping: 15 }
        }
    };

    // Soft: "Rewind/Refill" - Spins smoothly
    // Hard: "Damage" - Shakes
    const ringVariants: Variants = isSoft ? {
        hidden: { pathLength: 0, rotate: -180, opacity: 0 },
        visible: {
            pathLength: 1,
            rotate: 0,
            opacity: 1,
            transition: { duration: 1.2, ease: "circOut" }
        }
    } : {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.8, ease: "backOut" }
        }
    };

    // Hard Shake Effect
    const shakeVariants: Variants = !isSoft ? {
        shake: {
            x: [0, -4, 4, -4, 4, 0],
            rotate: [0, -2, 2, -2, 2, 0],
            transition: { duration: 0.5, delay: 0.2 } // Shake when appearing
        }
    } : {};

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={["visible", !isSoft ? "shake" : ""]}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}
        >
            {/* Shockwave Effect Background */}
            <motion.div
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                style={{
                    position: 'absolute',
                    top: '15px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: isSoft ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    zIndex: 0
                }}
            />

            <div style={{ position: 'relative', width: size, height: size, zIndex: 1 }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${color}80)` }}>
                    {/* Background Ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeOpacity="0.15"
                    />
                    {/* Animated Progress Ring */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        initial="hidden"
                        animate="visible"
                        variants={ringVariants}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Icon Pulse */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px'
                    }}
                >
                    {icon}
                </motion.div>
            </div>

            <div style={{ textAlign: 'center', zIndex: 1 }}>
                <div style={{ fontSize: '10px', color: '#ccc', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isSoft ? t.softTimerLabel : t.hardTimerLabel}
                </div>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: color,
                        textShadow: `0 0 10px ${color}40`
                    }}
                >
                    {isSoft ? `${Math.round(softResetDuration / 3600)}h ↺` : `-${hardDeductionSeconds}s`}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default function DistributionAnimation({
    show,
    attackAmount,
    attackCount,
    t,
    onComplete,
    softResetDuration,
    hardDeductionPerKey,
    isMobile: props_isMobile,
    isFirstAttack = false,
}: DistributionAnimationProps & { softResetDuration?: number; hardDeductionPerKey?: number }) {
    const isMobile = props_isMobile ?? false;
    // Auto-close after animation completes
    React.useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onComplete?.();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    // Format number without trailing zeros
    const formatAmount = (amount: number): string => {
        const formatted = parseFloat(amount.toFixed(2));
        return formatted.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    // Get localized string safely (with fallback)
    const getLabel = (key: keyof LocaleStrings): string => {
        const value = t[key];
        return typeof value === 'string' ? value : String(key);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="distribution-animation-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={isMobile ? () => onComplete?.() : undefined}
                    style={isMobile ? {
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        pointerEvents: "auto",
                        background: "rgba(0, 0, 0, 0.75)",
                        padding: "16px",
                    } : {
                        position: "relative",
                        marginBottom: "12px",
                    }}
                >
                    {/* Floating particles background */}
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 100 }}
                            animate={{
                                opacity: [0, 0.5, 0],
                                y: [-50, -200],
                                x: Math.sin(i) * 100,
                            }}
                            transition={{
                                delay: i * 0.1,
                                duration: 2,
                                repeat: 1,
                            }}
                            style={{
                                position: 'absolute',
                                fontSize: '24px',
                            }}
                        >
                            {['🪙', '💰', '✨', '💫'][i % 4]}
                        </motion.div>
                    ))}

                    <motion.div
                        className="distribution-container"
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -30 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: isMobile ? "6px" : "8px",
                            padding: isMobile ? "14px 16px" : "16px 20px",
                            background: "linear-gradient(145deg, rgba(20, 20, 35, 0.98), rgba(30, 30, 50, 0.95))",
                            borderRadius: isMobile ? "16px" : "20px",
                            border: "2px solid rgba(255, 215, 0, 0.4)",
                            boxShadow: "0 0 60px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(255, 215, 0, 0.05)",
                            width: isMobile ? "92%" : "100%",
                            maxWidth: isMobile ? "100%" : "100%",
                            maxHeight: isMobile ? "85vh" : "auto",
                            overflowY: "auto",
                            position: "relative",
                        }}
                    >
                        {/* Close Button — large and always visible */}
                        <motion.button
                            onClick={() => onComplete?.()}
                            whileHover={{ scale: 1.15, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                position: "absolute",
                                top: isMobile ? "8px" : "10px",
                                right: isMobile ? "8px" : "10px",
                                width: isMobile ? "36px" : "28px",
                                height: isMobile ? "36px" : "28px",
                                borderRadius: "50%",
                                border: "1px solid rgba(255, 255, 255, 0.3)",
                                background: isMobile ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
                                color: "#fff",
                                fontSize: isMobile ? "18px" : "14px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 10,
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            ✕
                        </motion.button>
                        {/* Header with pulsing effect */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{
                                textAlign: "center",
                                marginBottom: isMobile ? "4px" : "8px",
                            }}
                        >
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{
                                    fontSize: isMobile ? "16px" : "20px",
                                    fontWeight: "bold",
                                    color: "#ffd700",
                                    textShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                                    marginBottom: "4px",
                                }}
                            >
                                🎁 {getLabel("distTitle")} 🎁
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                style={{
                                    fontSize: isMobile ? "14px" : "16px",
                                    color: "#fff",
                                    fontWeight: 600,
                                    background: "linear-gradient(90deg, #ffd700, #ff6b35)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    marginBottom: isMobile ? '8px' : '12px'
                                }}
                            >
                                {formatAmount(attackAmount)} $BANMAO
                            </motion.div>

                            {/* Impact Clocks Section */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '24px',
                                    marginBottom: '16px',
                                    padding: '8px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <ImpactClock
                                    type="soft"
                                    count={attackCount}
                                    t={t}
                                    softResetDuration={softResetDuration}
                                    hardDeductionPerKey={hardDeductionPerKey}
                                />
                                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                <ImpactClock
                                    type="hard"
                                    count={attackCount}
                                    t={t}
                                    softResetDuration={softResetDuration}
                                    hardDeductionPerKey={hardDeductionPerKey}
                                />
                            </motion.div>
                        </motion.div>

                        {/* Distribution Items with enhanced effects */}
                        {distributionItemsConfig.map((item) => {
                            const amount = (attackAmount * item.percentage) / 100;
                            return (
                                <motion.div
                                    key={item.key}
                                    initial={{ opacity: 0, x: -40, scale: 0.8 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        scale: 1,
                                    }}
                                    transition={{
                                        delay: item.delay,
                                        duration: 0.4,
                                        type: "spring",
                                        stiffness: 200,
                                    }}
                                    style={{
                                        position: "relative",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: isMobile ? "8px" : "12px",
                                        padding: isMobile ? "7px 10px" : "10px 14px",
                                        background: item.bgColor,
                                        borderRadius: isMobile ? "10px" : "12px",
                                        border: `1px solid ${item.color}40`,
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Shimmer effect */}
                                    <motion.div
                                        animate={{
                                            x: [-100, 300],
                                            opacity: [0, 0.3, 0],
                                        }}
                                        transition={{
                                            delay: item.delay + 0.3,
                                            duration: 0.8,
                                        }}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "50px",
                                            height: "100%",
                                            background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
                                        }}
                                    />

                                    {/* Icon with bounce */}
                                    <motion.span
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            rotate: [0, 10, -10, 0],
                                        }}
                                        transition={{
                                            delay: item.delay + 0.2,
                                            duration: 0.5,
                                        }}
                                        style={{
                                            fontSize: isMobile ? "18px" : "22px",
                                            filter: `drop-shadow(0 0 8px ${item.color})`,
                                        }}
                                    >
                                        {item.icon}
                                    </motion.span>

                                    {/* Label and Description */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: isMobile ? "11px" : "13px",
                                            color: "#fff",
                                            fontWeight: 600,
                                        }}>
                                            {getLabel(item.labelKey)}
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? "8px" : "9px",
                                            color: "#888",
                                        }}>
                                            {getLabel(item.descKey)}
                                        </div>
                                    </div>

                                    {/* Percentage badge */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: item.delay + 0.15 }}
                                        style={{
                                            fontSize: "10px",
                                            color: item.color,
                                            background: `${item.color}20`,
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {item.percentage}%
                                    </motion.div>

                                    {/* Amount with glow effect */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 30, scale: 0.5 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            scale: 1,
                                        }}
                                        transition={{
                                            delay: item.delay + 0.25,
                                            duration: 0.4,
                                            type: "spring",
                                            stiffness: 300,
                                        }}
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: "bold",
                                            color: item.color,
                                            textShadow: `0 0 15px ${item.color}, 0 0 25px ${item.color}50`,
                                            minWidth: "70px",
                                            textAlign: "right",
                                        }}
                                    >
                                        +{formatAmount(amount)}
                                    </motion.div>

                                    {/* Flying effects */}
                                    <FlyingCoin delay={item.delay} color={item.color} />
                                    <Sparkle delay={item.delay} color={item.color} />
                                </motion.div>
                            );
                        })}

                        {/* First attack note - dividends go to jackpot */}
                        {isFirstAttack && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                style={{
                                    marginTop: "4px",
                                    padding: "8px 12px",
                                    background: "rgba(255, 165, 0, 0.1)",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255, 165, 0, 0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <span style={{ fontSize: "16px" }}>⚠️</span>
                                <span style={{
                                    fontSize: isMobile ? "10px" : "11px",
                                    color: "#ffa500",
                                    lineHeight: 1.4,
                                }}>
                                    {getLabel("distFirstAttackNote")}
                                </span>
                            </motion.div>
                        )}

                        {/* Total summary */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            style={{
                                marginTop: "8px",
                                padding: "10px 14px",
                                background: "rgba(255, 215, 0, 0.1)",
                                borderRadius: "10px",
                                border: "1px dashed rgba(255, 215, 0, 0.3)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span style={{ color: "#888", fontSize: "12px" }}>
                                📊 {getLabel("distTotalLabel")}:
                            </span>
                            <motion.span
                                animate={{
                                    textShadow: [
                                        "0 0 10px #ffd700",
                                        "0 0 20px #ffd700",
                                        "0 0 10px #ffd700",
                                    ]
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{
                                    color: "#ffd700",
                                    fontWeight: "bold",
                                    fontSize: "14px",
                                }}
                            >
                                {formatAmount(attackAmount)} $BANMAO
                            </motion.span>
                        </motion.div>

                        {/* Footer hint with progress bar */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            style={{
                                textAlign: "center",
                                fontSize: "10px",
                                color: "#666",
                                marginTop: "4px",
                            }}
                        >
                            <motion.div
                                style={{
                                    height: "2px",
                                    background: "rgba(255, 215, 0, 0.2)",
                                    borderRadius: "1px",
                                    overflow: "hidden",
                                    marginBottom: "6px",
                                }}
                            >
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ delay: 1, duration: 3, ease: "linear" }}
                                    style={{
                                        height: "100%",
                                        background: "linear-gradient(90deg, #ffd700, #ff6b35)",
                                    }}
                                />
                            </motion.div>
                            {getLabel("distAutoClose")}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
