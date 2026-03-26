/**
 * BanMaoCharacter Component
 * Animated character that responds to game state (feeding/gifting theme)
 */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Sprite paths
const SPRITES = {
    idle: "/gamefi/banmaofomo/sprites/banmao_idle_wave.png",
    feeding: "/gamefi/banmaofomo/sprites/banmao_feeding_happy.png",
    critical: "/gamefi/banmaofomo/sprites/banmao_super_excited.png",
    dancing: "/gamefi/banmaofomo/sprites/banmao_dancing.png",
    love: "/gamefi/banmaofomo/sprites/banmao_love_eyes.png",
    sleeping: "/gamefi/banmaofomo/sprites/banmao_sleeping_bored.png",
    winner: "/gamefi/banmaofomo/sprites/banmao_winner.png",
} as const;

type SpriteState = keyof typeof SPRITES;

interface BanMaoCharacterProps {
    /** Current lucky number (0-999) triggers different reactions */
    luckyNumber?: number;
    /** Soft timer seconds left - cat gets sleepy when low */
    softTimeLeft?: number;
    /** Is the game paused */
    isPaused?: boolean;
    /** Did user just win the jackpot */
    isWinner?: boolean;
    /** Is feeding/attacking in progress */
    isFeeding?: boolean;
    /** Size of the character */
    size?: number;
}

export default function BanMaoCharacter({
    luckyNumber,
    softTimeLeft = 0,
    isPaused = false,
    isWinner = false,
    isFeeding = false,
    size = 300,
}: BanMaoCharacterProps) {
    const [currentSprite, setCurrentSprite] = useState<SpriteState>("idle");
    const [isAnimating, setIsAnimating] = useState(false);

    // Idle animation cycle between idle and dancing
    const [idleFrame, setIdleFrame] = useState(0);

    // Determine sprite based on game state
    useEffect(() => {
        // Priority 1: Winner state
        if (isWinner) {
            setCurrentSprite("winner");
            setIsAnimating(true);
            return;
        }

        // Priority 2: Lucky number reaction (temporary)
        if (luckyNumber !== undefined && luckyNumber >= 0) {
            setIsAnimating(true);

            if (luckyNumber > 900) {
                // Critical hit - super excited with sunglasses
                setCurrentSprite("critical");
                setTimeout(() => {
                    setIsAnimating(false);
                    setCurrentSprite("idle");
                }, 3000);
            } else if (luckyNumber >= 700) {
                // Nice hit - dancing
                setCurrentSprite("dancing");
                setTimeout(() => {
                    setIsAnimating(false);
                    setCurrentSprite("idle");
                }, 2000);
            } else if (luckyNumber >= 500) {
                // Good hit - love eyes
                setCurrentSprite("love");
                setTimeout(() => {
                    setIsAnimating(false);
                    setCurrentSprite("idle");
                }, 1500);
            } else {
                // Normal hit - feeding happy
                setCurrentSprite("feeding");
                setTimeout(() => {
                    setIsAnimating(false);
                    setCurrentSprite("idle");
                }, 1000);
            }
            return;
        }

        // Priority 3: Feeding state
        if (isFeeding) {
            setCurrentSprite("feeding");
            setIsAnimating(true);
            return;
        }

        // Priority 4: Soft timer low - cat getting sleepy
        if (softTimeLeft > 0 && softTimeLeft < 300) { // Less than 5 minutes
            setCurrentSprite("sleeping");
            return;
        }

        // Default: idle
        if (!isAnimating) {
            setCurrentSprite("idle");
        }
    }, [luckyNumber, softTimeLeft, isPaused, isWinner, isFeeding, isAnimating]);

    // Idle animation cycle
    useEffect(() => {
        if (currentSprite !== "idle" || isAnimating) return;

        const interval = setInterval(() => {
            setIdleFrame(prev => (prev + 1) % 3);
        }, 2000);

        return () => clearInterval(interval);
    }, [currentSprite, isAnimating]);

    // Get animation variants based on sprite
    const animationVariants = useMemo(() => {
        switch (currentSprite) {
            case "critical":
                return {
                    animate: {
                        opacity: 1,
                        scale: [1, 1.2, 1],
                        rotate: [0, -5, 5, -5, 0],
                        transition: { duration: 0.5, repeat: 3 }
                    }
                };
            case "dancing":
                return {
                    animate: {
                        opacity: 1,
                        y: [0, -20, 0],
                        rotate: [0, 5, -5, 0],
                        transition: { duration: 0.5, repeat: Infinity }
                    }
                };
            case "feeding":
                return {
                    animate: {
                        opacity: 1,
                        scale: [1, 1.1, 1],
                        transition: { duration: 0.3, repeat: 2 }
                    }
                };
            case "winner":
                return {
                    animate: {
                        opacity: 1,
                        scale: [1, 1.15, 1],
                        y: [0, -30, 0],
                        transition: { duration: 0.8, repeat: Infinity }
                    }
                };
            case "sleeping":
                return {
                    animate: {
                        opacity: 1,
                        rotate: [0, 2, -2, 0],
                        transition: { duration: 3, repeat: Infinity }
                    }
                };
            default:
                return {
                    animate: {
                        opacity: 1,
                        y: [0, -5, 0],
                        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
                    }
                };
        }
    }, [currentSprite]);

    return (
        <div className="banmao-character-container" style={{
            position: "relative",
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        }}>
            {/* Glow effect behind character */}
            <div style={{
                position: "absolute",
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: "50%",
                background: currentSprite === "critical"
                    ? "radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%)"
                    : currentSprite === "winner"
                        ? "radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,107,53,0.4) 50%, transparent 70%)"
                        : currentSprite === "love"
                            ? "radial-gradient(circle, rgba(255,105,180,0.4) 0%, transparent 70%)"
                            : "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)",
                filter: "blur(20px)",
                animation: isAnimating ? "pulse 1s infinite" : undefined,
            }} />

            {/* Character sprite */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSprite}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={animationVariants.animate}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: "relative",
                        width: size,
                        height: size,
                    }}
                >
                    <Image
                        src={SPRITES[currentSprite]}
                        alt="BanMao"
                        fill
                        style={{ objectFit: "contain" }}
                        priority
                    />
                </motion.div>
            </AnimatePresence>

            {/* Floating coins effect when feeding */}
            {(currentSprite === "feeding" || currentSprite === "critical") && (
                <div className="floating-coins">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="coin"
                            initial={{ y: -50, x: (i - 2) * 30, opacity: 1 }}
                            animate={{ y: size, opacity: 0 }}
                            transition={{
                                duration: 1.5,
                                delay: i * 0.2,
                                repeat: Infinity,
                                repeatDelay: 1
                            }}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: "50%",
                                width: 24,
                                height: 24,
                                marginLeft: -12,
                                fontSize: 24,
                            }}
                        >
                            💰
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Hearts effect for love state */}
            {currentSprite === "love" && (
                <div className="floating-hearts">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                y: size * 0.5,
                                x: (i - 3) * 20,
                                opacity: 1,
                                scale: 0.5
                            }}
                            animate={{
                                y: -50,
                                opacity: 0,
                                scale: 1.5
                            }}
                            transition={{
                                duration: 2,
                                delay: i * 0.3,
                                repeat: Infinity,
                            }}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: "50%",
                                fontSize: 20,
                            }}
                        >
                            💖
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Winner confetti effect */}
            {currentSprite === "winner" && (
                <div className="confetti-burst">
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                x: 0,
                                y: 0,
                                opacity: 1,
                                rotate: 0
                            }}
                            animate={{
                                x: Math.cos(i * 30 * Math.PI / 180) * 150,
                                y: Math.sin(i * 30 * Math.PI / 180) * 150 - 50,
                                opacity: 0,
                                rotate: 360 * (i % 2 === 0 ? 1 : -1)
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                repeatDelay: 0.5
                            }}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                fontSize: 16,
                            }}
                        >
                            {["🪙", "⭐", "✨", "🎉"][i % 4]}
                        </motion.div>
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
