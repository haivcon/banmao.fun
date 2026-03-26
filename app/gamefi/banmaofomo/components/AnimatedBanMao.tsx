/**
 * AnimatedBanMao Component - 60fps Smooth Animation
 * Uses CSS interpolation and Framer Motion tweening for ultra-smooth motion
 * Keyframe-based animation with hardware-accelerated transforms
 */
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, useAnimation, useMotionValue, useTransform, animate } from "framer-motion";
import Image from "next/image";

// Animation keyframe configurations
const ANIMATION_FRAMES = {
    idle: [
        "/gamefi/banmaofomo/sprites/animations/idle/banmao_idle_frame1_1770087961615.png",
        "/gamefi/banmaofomo/sprites/animations/idle/banmao_idle_frame2_1770087977712.png",
        "/gamefi/banmaofomo/sprites/animations/idle/banmao_idle_frame3_1770087992622.png",
        "/gamefi/banmaofomo/sprites/animations/idle/banmao_idle_frame4_1770088007856.png",
    ],
    dance: [
        "/gamefi/banmaofomo/sprites/animations/dance/banmao_dance_frame1_1770088039240.png",
        "/gamefi/banmaofomo/sprites/animations/dance/banmao_dance_frame2_1770088057493.png",
        "/gamefi/banmaofomo/sprites/animations/dance/banmao_dance_frame3_1770088075262.png",
        "/gamefi/banmaofomo/sprites/animations/dance/banmao_dance_frame4_1770088090701.png",
    ],
    feed: [
        "/gamefi/banmaofomo/sprites/animations/feed/banmao_feed_frame1_1770088133377.png",
        "/gamefi/banmaofomo/sprites/animations/feed/banmao_feed_frame2_1770088151616.png",
        "/gamefi/banmaofomo/sprites/animations/feed/banmao_feed_frame3_1770088169684.png",
        "/gamefi/banmaofomo/sprites/animations/feed/banmao_feed_frame4_1770088185614.png",
    ],
    sleeping: [
        "/gamefi/banmaofomo/sprites/animations/sleeping/sleeping_frame1_1770093105343.png",
        "/gamefi/banmaofomo/sprites/animations/sleeping/sleeping_frame2_1770093122479.png",
        "/gamefi/banmaofomo/sprites/animations/sleeping/sleeping_frame3_1770093146437.png",
        "/gamefi/banmaofomo/sprites/animations/sleeping/sleeping_frame4_1770093163430.png",
    ],
    love_eyes: [
        "/gamefi/banmaofomo/sprites/animations/love_eyes/love_eyes_frame1_1770093177547.png",
        "/gamefi/banmaofomo/sprites/animations/love_eyes/love_eyes_frame2_1770093194472.png",
        "/gamefi/banmaofomo/sprites/animations/love_eyes/love_eyes_frame3_1770093218755.png",
        "/gamefi/banmaofomo/sprites/animations/love_eyes/love_eyes_frame4_1770093233003.png",
    ],
    excited: [
        "/gamefi/banmaofomo/sprites/animations/excited/excited_frame1_1770093247148.png",
        "/gamefi/banmaofomo/sprites/animations/excited/excited_frame2_1770093262435.png",
        "/gamefi/banmaofomo/sprites/animations/excited/excited_frame3_1770093289967.png",
        "/gamefi/banmaofomo/sprites/animations/excited/excited_frame4_1770093306426.png",
    ],
    winner: [
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame1_1770091949398.png",
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame2_1770091977027.png",
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame3_1770092005221.png",
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame4_1770092034897.png",
    ],
    heart_burst: [
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame1_1770093323109.png",
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame2_1770093339089.png",
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame3_1770093658989.png",
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame4_1770093673844.png",
    ],
};

// Keyframe motion data for 60fps interpolation between frames
// Each frame has transform values that will be tweened smoothly
const KEYFRAME_TRANSFORMS = {
    idle: [
        { y: 0, rotate: 0, scale: 1, opacity: 1 },          // Standing
        { y: -2, rotate: -1, scale: 1.01, opacity: 0.95 },  // Blink
        { y: 2, rotate: 2, scale: 1.02, opacity: 1 },       // Wave
        { y: 4, rotate: -2, scale: 0.99, opacity: 0.98 },   // Yawn
    ],
    dance: [
        { y: -5, rotate: 0, scale: 1.05, opacity: 1 },      // Arms up
        { y: 3, rotate: -15, scale: 1.02, opacity: 1 },     // Lean left
        { y: 3, rotate: 15, scale: 1.02, opacity: 1 },      // Lean right  
        { y: -10, rotate: 0, scale: 1.1, opacity: 1 },      // Jump
    ],
    feed: [
        { y: -3, rotate: 0, scale: 1.03, opacity: 1 },      // Reach
        { y: 0, rotate: -5, scale: 1.05, opacity: 1 },      // Catch
        { y: 2, rotate: 3, scale: 1.02, opacity: 1 },       // Hug
        { y: 5, rotate: 0, scale: 0.98, opacity: 1 },       // Pat belly
    ],
    sleeping: [
        { y: 0, rotate: 0, scale: 1, opacity: 1 },          // Standing bored
        { y: 2, rotate: 1, scale: 1.02, opacity: 0.9 },     // Yawning
        { y: 3, rotate: -1, scale: 1.03, opacity: 0.85 },   // Deep sleep, Zzz
        { y: 0, rotate: 0, scale: 1, opacity: 0.95 },       // Waking up
    ],
    love_eyes: [
        { y: 0, rotate: -5, scale: 1, opacity: 1 },         // Heart eyes
        { y: -3, rotate: 0, scale: 1.05, opacity: 1 },      // Sway with hearts
        { y: 0, rotate: 5, scale: 1.08, opacity: 1 },       // Blowing kiss
        { y: -2, rotate: 0, scale: 1.02, opacity: 1 },      // Dreamy
    ],
    excited: [
        { y: 0, rotate: 0, scale: 1, opacity: 1 },          // Starting pose
        { y: -10, rotate: -5, scale: 1.1, opacity: 1 },     // Jumping left
        { y: 0, rotate: 0, scale: 0.9, opacity: 1 },        // Land squish
        { y: -10, rotate: 5, scale: 1.1, opacity: 1 },      // Jumping right
    ],
    winner: [
        { y: 0, rotate: -3, scale: 1, opacity: 1 },         // Trophy raised
        { y: -8, rotate: 3, scale: 1.05, opacity: 1 },      // Higher
        { y: -15, rotate: 0, scale: 1.08, opacity: 1 },     // Peak jump
        { y: -5, rotate: -2, scale: 1.02, opacity: 1 },     // Landing hug
    ],
    heart_burst: [
        { y: 0, rotate: 0, scale: 1, opacity: 1 },          // Holding heart
        { y: -5, rotate: 0, scale: 1.2, opacity: 1 },       // Heart growing
        { y: -10, rotate: 5, scale: 1.3, opacity: 1 },      // Explosion
        { y: -2, rotate: 0, scale: 1.05, opacity: 1 },      // Settle
    ],
};

// Animation durations per cycle (ms)
const ANIMATION_DURATIONS = {
    idle: 3000,        // 3 seconds per full cycle - slow breathing
    dance: 800,        // Fast dancing
    feed: 2000,        // Medium feeding
    sleeping: 4000,    // Very slow, sleepy
    love_eyes: 2000,   // Moderate sway
    excited: 1000,     // Fast vibration
    winner: 1500,      // Celebration cycle
    heart_burst: 1200, // Medium burst
};

type AnimationType = keyof typeof ANIMATION_FRAMES;

interface AnimatedBanMaoProps {
    animation?: AnimationType;
    size?: number;
    loop?: boolean;
    onAnimationEnd?: () => void;
    onClick?: () => void;
}

// Interpolation helper for smooth value transition
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

// Easing function for natural motion (ease-in-out cubic)
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function AnimatedBanMao({
    animation = "idle",
    size = 280,
    loop = true,
    onAnimationEnd,
    onClick,
}: AnimatedBanMaoProps) {
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [nextFrameIndex, setNextFrameIndex] = useState(1);
    const [blendFactor, setBlendFactor] = useState(0);
    const animationRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const frames = useMemo(() => ANIMATION_FRAMES[animation], [animation]);
    const transforms = useMemo(() => KEYFRAME_TRANSFORMS[animation], [animation]);
    const duration = useMemo(() => ANIMATION_DURATIONS[animation], [animation]);

    // Calculate time per frame
    const frameTime = duration / frames.length;

    const onAnimationEndRef = useRef(onAnimationEnd);
    useEffect(() => {
        onAnimationEndRef.current = onAnimationEnd;
    }, [onAnimationEnd]);

    // 60fps animation loop using requestAnimationFrame
    const animationLoop = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const cycleProgress = (elapsed % duration) / duration; // 0 to 1

        // Determine current and next frame indices
        const totalFrames = frames.length;
        const exactFrame = cycleProgress * totalFrames;
        const frameIdx = Math.floor(exactFrame) % totalFrames;
        const nextIdx = (frameIdx + 1) % totalFrames;
        const blend = exactFrame - Math.floor(exactFrame); // 0 to 1 within frame transition

        setCurrentFrameIndex(frameIdx);
        setNextFrameIndex(nextIdx);
        setBlendFactor(blend);

        // Check if cycle completed
        if (elapsed >= duration && !loop) {
            onAnimationEndRef.current?.();
            return;
        }

        animationRef.current = requestAnimationFrame(animationLoop);
    }, [duration, frames.length, loop]);

    // Start animation loop
    useEffect(() => {
        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animationLoop);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animationLoop, animation]);

    // Calculate interpolated transform values for 60fps smoothness
    const currentTransform = transforms[currentFrameIndex];
    const nextTransform = transforms[nextFrameIndex];
    const easedBlend = easeInOutCubic(blendFactor);

    const interpolatedStyle = {
        transform: `
            translateY(${lerp(currentTransform.y, nextTransform.y, easedBlend)}px)
            rotate(${lerp(currentTransform.rotate, nextTransform.rotate, easedBlend)}deg)
            scale(${lerp(currentTransform.scale, nextTransform.scale, easedBlend)})
        `,
        opacity: lerp(currentTransform.opacity, nextTransform.opacity, easedBlend),
    };

    // Cross-fade opacity between frames
    const currentOpacity = 1 - easedBlend * 0.3; // Primary frame
    const nextOpacity = easedBlend * 0.5; // Blending frame

    // Interaction handler
    const handleInteraction = () => {
        // Trigger a random animation (excited or love_eyes)
        if (onAnimationEnd) {
            // Basic randomized response
        }
    };


    const [isInteracting, setIsInteracting] = useState(false);

    const handleCharacterClick = () => {
        setIsInteracting(true);
        // Reset interaction flag after short delay
        setTimeout(() => setIsInteracting(false), 200);

        // Return click event to parent if needed, or handle internal animation logic?
        // Actually, looking at the usage, the parent (GameArena) likely handles the logic.
        // But for "Click to Speak", we can emit an event or handle it here if passed.
        if (onClick) onClick();
    };

    return (
        <div
            className="animated-banmao-60fps"
            onClick={handleCharacterClick}
            style={{
                width: size,
                height: size,
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                willChange: "transform", // GPU acceleration hint
                cursor: "pointer",
                transform: isInteracting ? "scale(0.95)" : "scale(1)",
                transition: "transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
        >
            {/* Preload all frames */}
            <div style={{ display: 'none' }}>
                {frames.map((frame, i) => (
                    <Image key={i} src={frame} alt="" width={1} height={1} priority />
                ))}
            </div>

            {/* Current frame with interpolated transforms */}
            <motion.div
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    ...interpolatedStyle,
                    opacity: currentOpacity,
                    willChange: "transform, opacity",
                }}
            >
                <Image
                    src={frames[currentFrameIndex]}
                    alt={`BanMao ${animation}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 350px"
                    style={{ objectFit: "contain" }}
                    priority
                />
            </motion.div>

            {/* Next frame (cross-fade blend) */}
            <motion.div
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    ...interpolatedStyle,
                    opacity: nextOpacity,
                    willChange: "transform, opacity",
                }}
            >
                <Image
                    src={frames[nextFrameIndex]}
                    alt={`BanMao ${animation} blend`}
                    fill
                    sizes="(max-width: 768px) 100vw, 350px"
                    style={{ objectFit: "contain" }}
                    priority
                />
            </motion.div>

            {/* Animated glow effect at 60fps */}
            <motion.div
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: animation === "dance"
                        ? "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)"
                        : animation === "feed"
                            ? "radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)"
                            : "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)",
                    pointerEvents: "none",
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: duration / 1000,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Dynamic shadow at 60fps */}
            <motion.div
                style={{
                    position: "absolute",
                    bottom: -10,
                    width: "60%",
                    height: 15,
                    background: "radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)",
                    borderRadius: "50%",
                    transform: `scaleX(${lerp(1, 1.15, easedBlend)})`,
                    opacity: lerp(0.4, 0.25, easedBlend),
                }}
            />

            {/* Particle effects for dance animation */}
            {animation === "dance" && (
                <div className="dance-particles">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            style={{
                                position: "absolute",
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: i % 2 === 0 ? "#ffd700" : "#ff6b35",
                            }}
                            animate={{
                                x: [0, (i - 2) * 40],
                                y: [0, -60 - i * 10],
                                opacity: [1, 0],
                                scale: [1, 0.5],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Heart particles for feed animation */}
            {animation === "feed" && (
                <div className="feed-particles">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            style={{
                                position: "absolute",
                                fontSize: 16,
                            }}
                            animate={{
                                x: [(i - 1) * 20, (i - 1) * 30],
                                y: [0, -50],
                                opacity: [1, 0],
                                scale: [0.8, 1.2, 0.5],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.4,
                                ease: "easeOut",
                            }}
                        >
                            ❤️
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Animation control hook
export function useAnimatedBanMao() {
    const [animation, setAnimation] = useState<AnimationType>("idle");

    return {
        animation,
        playIdle: () => setAnimation("idle"),
        playDance: () => setAnimation("dance"),
        playFeed: () => setAnimation("feed"),
        setAnimation,
    };
}
