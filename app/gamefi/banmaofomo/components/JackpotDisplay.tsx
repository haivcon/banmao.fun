/**
 * JackpotDisplay Component - Premium VFX Edition
 * Features: Coin rain, tier-based glow, milestone celebration, 3D effects
 */
"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import AnimatedFrameSprite from "./AnimatedFrameSprite";
import { LocaleStrings } from "../lib/i18n/types";

interface JackpotDisplayProps {
    pool: bigint;
    seedFund?: bigint;
    t: LocaleStrings;
}

// Jackpot tier thresholds
const TIERS = {
    GREEN: 100_000,   // < 100K
    GOLD: 500_000,    // 100K - 500K
    ORANGE: 1_000_000, // 500K - 1M
    RED: Infinity,     // > 1M (MEGA)
};

const MILESTONES = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000];

interface CoinParticle {
    id: number;
    x: number;
    delay: number;
    duration: number;
}

export default function JackpotDisplay({ pool, seedFund, t }: JackpotDisplayProps) {
    const [prevValue, setPrevValue] = useState<number>(0);
    const [prevSeedValue, setPrevSeedValue] = useState<number>(0);
    const [isGlowing, setIsGlowing] = useState(false);
    const [seedIncrease, setSeedIncrease] = useState<number>(0);
    const [showCoinRain, setShowCoinRain] = useState(false);
    const [coinParticles, setCoinParticles] = useState<CoinParticle[]>([]);
    const [milestoneReached, setMilestoneReached] = useState<number | null>(null);
    const [lastPassedMilestone, setLastPassedMilestone] = useState<number>(0);

    const currentValue = Number(formatUnits(pool, 18));
    const currentSeedValue = seedFund ? Number(formatUnits(seedFund, 18)) : 0;
    const prevValueRef = useRef(0);
    const prevSeedRef = useRef(0);

    // Determine tier based on jackpot value
    const tier = useMemo(() => {
        if (currentValue < TIERS.GREEN) return 'green';
        if (currentValue < TIERS.GOLD) return 'gold';
        if (currentValue < TIERS.ORANGE) return 'orange';
        return 'red';
    }, [currentValue]);

    // Tier colors
    const tierColors = useMemo(() => {
        switch (tier) {
            case 'green': return { primary: '#22c55e', secondary: '#4ade80', glow: 'rgba(34, 197, 94, 0.6)' };
            case 'gold': return { primary: '#ffd700', secondary: '#ffc107', glow: 'rgba(255, 215, 0, 0.6)' };
            case 'orange': return { primary: '#ff6b35', secondary: '#ff8c00', glow: 'rgba(255, 107, 53, 0.6)' };
            case 'red': return { primary: '#ef4444', secondary: '#ff6b6b', glow: 'rgba(239, 68, 68, 0.6)' };
        }
    }, [tier]);

    // Generate coin particles for rain effect
    const generateCoinParticles = useCallback(() => {
        return Array.from({ length: 15 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100 - 50,
            delay: Math.random() * 0.5,
            duration: 1 + Math.random() * 0.5,
        }));
    }, []);

    // Banana rain effect state
    const [bananas, setBananas] = useState<{ id: number; left: number; duration: number; delay: number }[]>([]);

    // Initialize continuous banana rain
    useEffect(() => {
        const initialBananas = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 5,
        }));
        setBananas(initialBananas);
    }, []);

    // Detect jackpot increase and trigger effects
    useEffect(() => {
        if (currentValue > prevValueRef.current && prevValueRef.current > 0) {
            setIsGlowing(true);
            setShowCoinRain(true);
            setCoinParticles(generateCoinParticles());

            setTimeout(() => setIsGlowing(false), 2500);
            setTimeout(() => setShowCoinRain(false), 2000);

            // Check for milestone crossing
            const newMilestone = MILESTONES.find(
                m => currentValue >= m && prevValueRef.current < m && m > lastPassedMilestone
            );
            if (newMilestone) {
                setMilestoneReached(newMilestone);
                setLastPassedMilestone(newMilestone);
                setTimeout(() => setMilestoneReached(null), 4000);
            }
        }
        setPrevValue(prevValueRef.current);
        prevValueRef.current = currentValue;
    }, [currentValue, generateCoinParticles, lastPassedMilestone]);

    // Detect seed fund increase
    useEffect(() => {
        if (currentSeedValue > prevSeedRef.current && prevSeedRef.current > 0) {
            setSeedIncrease(currentSeedValue - prevSeedRef.current);
            setTimeout(() => setSeedIncrease(0), 2000);
        }
        setPrevSeedValue(prevSeedRef.current);
        prevSeedRef.current = currentSeedValue;
    }, [currentSeedValue]);

    // Format milestone for display
    const formatMilestone = (value: number) => {
        if (value >= 1_000_000) return `${value / 1_000_000}M`;
        return `${value / 1_000}K`;
    };

    return (
        <motion.div
            className={`jackpot-display ${isGlowing ? "jackpot-glowing" : ""}`}
            data-tour="fomo-jackpot"
            style={{
                position: 'relative',
                overflow: 'hidden',
            }}
            animate={isGlowing ? {
                boxShadow: [
                    `0 0 20px ${tierColors.glow}`,
                    `0 0 80px ${tierColors.glow}`,
                    `0 0 20px ${tierColors.glow}`
                ]
            } : {}}
            transition={{ duration: 1.5, repeat: isGlowing ? 1 : 0 }}
        >
            {/* Continuous Banana Rain Background */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 1,
            }}>
                {bananas.map((b) => (
                    <motion.div
                        key={b.id}
                        initial={{ y: -50, opacity: 0, rotate: 0 }}
                        animate={{
                            y: ['0%', '110%'],
                            opacity: [0, 1, 0],
                            rotate: [0, 360]
                        }}
                        transition={{
                            duration: b.duration,
                            repeat: Infinity,
                            delay: b.delay,
                            ease: "linear",
                        }}
                        style={{
                            position: 'absolute',
                            left: `${b.left}%`,
                            fontSize: '28px',
                            filter: 'blur(0.5px)',
                        }}
                    >
                        🍌
                    </motion.div>
                ))}
            </div>

            {/* Coin Rain Effect */}
            <AnimatePresence>
                {showCoinRain && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        width: '200px',
                        height: '100%',
                        transform: 'translateX(-50%)',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}>
                        {coinParticles.map((coin) => (
                            <motion.div
                                key={coin.id}
                                initial={{ y: -30, x: coin.x, opacity: 1, rotate: 0 }}
                                animate={{ y: 180, opacity: 0, rotate: 360 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: coin.duration,
                                    delay: coin.delay,
                                    ease: "easeIn",
                                }}
                                style={{
                                    position: 'absolute',
                                    fontSize: '20px',
                                    textShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
                                }}
                            >
                                🪙
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Sparkle Particles on Increase */}
            <AnimatePresence>
                {isGlowing && (
                    <div className="jackpot-sparkle-container">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div
                                key={`sparkle-${Date.now()}-${i}`}
                                className={`jackpot-sparkle ${i % 3 === 0 ? 'silver' : i % 3 === 1 ? 'diamond' : ''}`}
                                style={{
                                    left: `${15 + Math.random() * 70}%`,
                                    top: `${30 + Math.random() * 40}%`,
                                    animationDelay: `${i * 0.15}s`,
                                    width: `${3 + Math.random() * 4}px`,
                                    height: `${3 + Math.random() * 4}px`,
                                }}
                            />
                        ))}
                        <div className="jackpot-increase-flash" />
                    </div>
                )}
            </AnimatePresence>

            {/* Milestone Celebration */}
            <AnimatePresence>
                {milestoneReached && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -30 }}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 20,
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 107, 53, 0.9))',
                            padding: '8px 20px',
                            borderRadius: '20px',
                            boxShadow: '0 4px 20px rgba(255, 165, 0, 0.5)',
                        }}
                    >
                        <motion.span
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5, repeat: 3 }}
                            style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            🎉 {formatMilestone(milestoneReached)} MILESTONE! 🎉
                        </motion.span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confetti burst for milestone */}
            <AnimatePresence>
                {milestoneReached && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 15,
                    }}>
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{
                                    x: (Math.random() - 0.5) * 200,
                                    y: (Math.random() - 0.5) * 200,
                                    opacity: 0,
                                    scale: 0,
                                    rotate: Math.random() * 360,
                                }}
                                transition={{ duration: 1.5, delay: i * 0.05 }}
                                style={{
                                    position: 'absolute',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: i % 2 ? '50%' : '2px',
                                    background: ['#ffd700', '#ff6b35', '#22c55e', '#a855f7', '#22d3ee'][i % 5],
                                }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Fire particles effect */}
            <div className="jackpot-fire-effect">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="fire-particle"
                        style={{
                            background: tierColors.primary,
                            boxShadow: `0 0 10px ${tierColors.glow}`,
                        }}
                        animate={{
                            y: [-20, -60],
                            opacity: [0.8, 0],
                            scale: [1, 0.3],
                        }}
                        transition={{
                            duration: 1.5 + Math.random(),
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeOut"
                        }}
                    />
                ))}
            </div>

            {/* 3D Lucky Bowl with parallax effect */}
            <motion.div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '-20px',
                    position: 'relative',
                    zIndex: 2,
                    perspective: '500px',
                }}
                whileHover={{ rotateY: 5, rotateX: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {/* Pot glow reflection */}
                <motion.div
                    style={{
                        position: 'absolute',
                        bottom: '-30px',
                        width: '100px',
                        height: '20px',
                        background: `radial-gradient(ellipse, ${tierColors.glow}, transparent)`,
                        filter: 'blur(10px)',
                    }}
                    animate={isGlowing ? { opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] } : { opacity: 0.5 }}
                    transition={{ duration: 1, repeat: isGlowing ? 2 : 0 }}
                />
                <AnimatedFrameSprite
                    type="lucky_bowl"
                    width={120}
                    height={120}
                    glowColor={isGlowing ? tierColors.primary : undefined}
                    priority
                />
            </motion.div>

            {/* Title with tier-based gradient */}
            <motion.div
                className="jackpot-label"
                style={{
                    background: `linear-gradient(90deg, ${tierColors.primary}, ${tierColors.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                {t.jackpotPool}
            </motion.div>

            {/* Prize distribution info */}
            <div
                className="jackpot-prize-info"
                style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <span title="Winner (last attacker)">{t.jackpotWinnerShare}</span>
                <span>|</span>
                <span title="Top 10 attackers">{t.jackpotTop10Share}</span>
            </div>

            {/* Tier indicator badge */}
            {tier !== 'green' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: `linear-gradient(135deg, ${tierColors.primary}20, ${tierColors.secondary}40)`,
                        border: `1px solid ${tierColors.primary}50`,
                        color: tierColors.primary,
                        zIndex: 20,
                    }}
                >
                    {tier === 'red' ? '🔥 MEGA' : tier === 'orange' ? '⚡ HOT' : '✨ BIG'}
                </motion.div>
            )}

            {/* Jackpot value with enhanced animation */}
            <motion.div
                className="jackpot-value-container"
                animate={isGlowing ? {
                    scale: [1, 1.08, 1],
                } : {}}
                transition={{ duration: 0.5 }}
                style={{ position: 'relative', zIndex: 2 }}
            >
                <span
                    className="jackpot-value"
                    style={{
                        color: tierColors.primary,
                        display: 'inline-block',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                    }}
                >
                    <CountUp
                        start={prevValue}
                        end={currentValue}
                        duration={1.5}
                        separator=","
                        decimals={2}
                        preserveValue
                        formattingFn={(n) => {
                            const formatted = parseFloat(n.toFixed(2));
                            return formatted.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                            });
                        }}
                    />
                </span>
                <span className="jackpot-currency">$BANMAO</span>
            </motion.div>

            {/* Animated increase indicator */}
            <AnimatePresence>
                {isGlowing && (
                    <motion.div
                        className="jackpot-increase"
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        style={{
                            color: tierColors.primary,
                            textShadow: `0 0 15px ${tierColors.glow}`,
                            zIndex: 2,
                            position: 'relative'
                        }}
                    >
                        <span className="increase-arrow">▲</span>
                        <span className="increase-text">+{(currentValue - prevValue).toFixed(0)}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Seed Fund for Next Round - Enhanced */}
            {currentSeedValue > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        marginTop: "14px",
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))",
                        border: "1px solid rgba(34, 197, 94, 0.2)",
                        borderRadius: "12px",
                        fontSize: "13px",
                        position: "relative",
                        cursor: "help",
                        zIndex: 2,
                    }}
                    title="5% mỗi lượt tấn công + 30% jackpot khi HARD_WIN"
                >
                    <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                        🌱
                    </motion.span>
                    <span style={{ color: "#94a3b8" }}>{t.nextRoundSeed}:</span>
                    <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "14px" }}>
                        <CountUp
                            start={prevSeedValue}
                            end={currentSeedValue}
                            duration={1.2}
                            separator=","
                            decimals={0}
                            preserveValue
                        />
                    </span>
                    <span style={{ color: "#22c55e", fontSize: "11px" }}>$BANMAO</span>

                    {/* Flying +amount effect */}
                    <AnimatePresence>
                        {seedIncrease > 0 && (
                            <motion.span
                                initial={{ opacity: 1, y: 0, x: 30 }}
                                animate={{ opacity: 0, y: -30, scale: 1.2 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: "absolute",
                                    right: "-50px",
                                    color: "#22c55e",
                                    fontWeight: "bold",
                                    fontSize: "15px",
                                    textShadow: "0 0 12px rgba(34, 197, 94, 0.8)",
                                }}
                            >
                                +{seedIncrease.toFixed(0)}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Seed progress indicator */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            height: '2px',
                            background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                            borderRadius: '0 0 12px 12px',
                        }}
                        animate={{ width: `${Math.min((currentSeedValue / 50000) * 100, 100)}%` }}
                        transition={{ duration: 1 }}
                    />
                </motion.div>
            )}

            {/* Pulsing glow background */}
            <motion.div
                className="jackpot-glow"
                style={{
                    background: `radial-gradient(ellipse at center, ${tierColors.glow}, transparent 70%)`,
                }}
                animate={isGlowing ? {
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.1, 1],
                } : { opacity: 0.3 }}
                transition={{
                    duration: 1,
                    repeat: isGlowing ? 2 : 0
                }}
            />
        </motion.div>
    );
}
