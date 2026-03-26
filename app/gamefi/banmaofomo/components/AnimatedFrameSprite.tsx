/**
 * AnimatedFrameSprite Component
 * Frame-by-frame animation using multiple images
 * Similar to AnimatedBanMao but for decorative sprites
 */
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

// Frame configurations for each sprite type
const SPRITE_FRAMES: Record<string, string[]> = {
    lucky_bowl: [
        "/gamefi/banmaofomo/sprites/animations/lucky_bowl/lucky_bowl_frame1_1770089242295.png",
        "/gamefi/banmaofomo/sprites/animations/lucky_bowl/lucky_bowl_frame2_1770089261705.png",
        "/gamefi/banmaofomo/sprites/animations/lucky_bowl/lucky_bowl_frame3_1770089276858.png",
        "/gamefi/banmaofomo/sprites/animations/lucky_bowl/lucky_bowl_frame4_1770089294046.png",
    ],
    winner: [
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame1_1770091949398.png",
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame2_1770091977027.png",
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame3_1770092005221.png",
        "/gamefi/banmaofomo/sprites/animations/winner/winner_frame4_1770092034897.png",
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
    heart_burst: [
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame1_1770093323109.png",
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame2_1770093339089.png",
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame3_1770093658989.png",
        "/gamefi/banmaofomo/sprites/animations/heart_burst/heart_burst_frame4_1770093673844.png",
    ],
};

// Animation speeds (ms per cycle)
const SPRITE_DURATIONS: Record<string, number> = {
    lucky_bowl: 2500,
    winner: 1500,
    sleeping: 4000,    // Slow breathing cycle
    love_eyes: 2000,   // Moderate sway
    excited: 1000,     // Fast vibration
    heart_burst: 1200, // Medium burst speed
};

// Transform keyframes for smooth interpolation
const SPRITE_TRANSFORMS: Record<string, { y: number; scale: number; rotate: number }[]> = {
    lucky_bowl: [
        { y: 0, scale: 1, rotate: 0 },
        { y: -5, scale: 1.02, rotate: -2 },
        { y: -3, scale: 1.05, rotate: 2 },
        { y: 2, scale: 1, rotate: 0 },
    ],
    winner: [
        { y: 0, scale: 1, rotate: -3 },
        { y: -8, scale: 1.05, rotate: 3 },
        { y: -15, scale: 1.08, rotate: 0 },
        { y: -5, scale: 1.02, rotate: -2 },
    ],
    sleeping: [
        { y: 0, scale: 1, rotate: 0 },
        { y: 2, scale: 1.02, rotate: 1 },    // Inhale
        { y: 3, scale: 1.03, rotate: -1 },   // Deep sleep
        { y: 0, scale: 1, rotate: 0 },       // Exhale
    ],
    love_eyes: [
        { y: 0, scale: 1, rotate: -5 },
        { y: -3, scale: 1.05, rotate: 0 },   // Lean in
        { y: 0, scale: 1.08, rotate: 5 },    // Sway right
        { y: -2, scale: 1.02, rotate: 0 },
    ],
    excited: [
        { y: 0, scale: 1, rotate: 0 },
        { y: -10, scale: 1.1, rotate: -5 },  // Jump left
        { y: 0, scale: 0.9, rotate: 0 },     // Land squish
        { y: -10, scale: 1.1, rotate: 5 },   // Jump right
    ],
    heart_burst: [
        { y: 0, scale: 1, rotate: 0 },
        { y: -5, scale: 1.2, rotate: 0 },    // Burst up
        { y: -10, scale: 1.3, rotate: 5 },   // Peak explosion
        { y: -2, scale: 1.05, rotate: 0 },   // Settle
    ],
};

type SpriteType = keyof typeof SPRITE_FRAMES;

interface AnimatedFrameSpriteProps {
    type: SpriteType;
    width?: number;
    height?: number;
    glowColor?: string;
    className?: string;
    priority?: boolean;
}

// Interpolation helpers
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function AnimatedFrameSprite({
    type,
    width = 120,
    height = 120,
    glowColor,
    className = "",
    priority = false,
}: AnimatedFrameSpriteProps) {
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [blendFactor, setBlendFactor] = useState(0);
    const animationRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const frames = useMemo(() => SPRITE_FRAMES[type] || [], [type]);
    const transforms = useMemo(() => SPRITE_TRANSFORMS[type] || [], [type]);
    const duration = useMemo(() => SPRITE_DURATIONS[type] || 2000, [type]);

    // 60fps animation loop
    const animationLoop = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const cycleProgress = (elapsed % duration) / duration;

        const totalFrames = frames.length;
        const exactFrame = cycleProgress * totalFrames;
        const frameIdx = Math.floor(exactFrame) % totalFrames;
        const blend = exactFrame - Math.floor(exactFrame);

        setCurrentFrameIndex(frameIdx);
        setBlendFactor(blend);

        animationRef.current = requestAnimationFrame(animationLoop);
    }, [duration, frames.length]);

    useEffect(() => {
        if (frames.length === 0) return;

        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animationLoop);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animationLoop, frames.length]);

    if (frames.length === 0) {
        return null;
    }

    const nextFrameIndex = (currentFrameIndex + 1) % frames.length;
    const currentTransform = transforms[currentFrameIndex] || { y: 0, scale: 1, rotate: 0 };
    const nextTransform = transforms[nextFrameIndex] || { y: 0, scale: 1, rotate: 0 };
    const easedBlend = easeInOutCubic(blendFactor);

    const interpolatedStyle = {
        transform: `
            translateY(${lerp(currentTransform.y, nextTransform.y, easedBlend)}px)
            rotate(${lerp(currentTransform.rotate, nextTransform.rotate, easedBlend)}deg)
            scale(${lerp(currentTransform.scale, nextTransform.scale, easedBlend)})
        `,
    };

    const glowFilter = glowColor
        ? `drop-shadow(0 0 15px ${glowColor}) drop-shadow(0 0 5px ${glowColor})`
        : undefined;

    return (
        <div
            className={`animated-frame-sprite ${className}`}
            style={{
                width,
                height,
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                willChange: "transform",
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
                    filter: glowFilter,
                    willChange: "transform, filter",
                }}
            >
                <Image
                    src={frames[currentFrameIndex]}
                    alt={`${type} sprite`}
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    style={{ objectFit: "contain" }}
                    priority={priority}
                />
            </motion.div>

            {/* Next frame for cross-fade (subtle) */}
            <motion.div
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    ...interpolatedStyle,
                    opacity: easedBlend * 0.3,
                    filter: glowFilter,
                    willChange: "transform, opacity",
                }}
            >
                <Image
                    src={frames[nextFrameIndex]}
                    alt={`${type} sprite blend`}
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    style={{ objectFit: "contain" }}
                    priority={priority}
                />
            </motion.div>
        </div>
    );
}
