/**
 * AnimatedSprite Component
 * Universal animated sprite with CSS transform animations for 60fps smooth motion
 * Works with single images using advanced motion transforms
 */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, useAnimationFrame } from "framer-motion";
import Image from "next/image";

// Animation presets for different sprite types
type AnimationPreset =
    | "float"       // Floating up/down
    | "bounce"      // Bouncing
    | "spin"        // Continuous rotation
    | "pulse"       // Scale pulse
    | "shake"       // Shake/wobble
    | "glow"        // Glow intensity change
    | "swing"       // Pendulum swing
    | "breathe"     // Breathing scale
    | "wave"        // Wave motion
    | "sparkle";    // Sparkle with opacity

interface AnimationConfig {
    y?: number[];
    x?: number[];
    rotate?: number[];
    scale?: number[];
    opacity?: number[];
    filter?: string[];
    duration: number;
    ease?: string;
}

const ANIMATION_PRESETS: Record<AnimationPreset, AnimationConfig> = {
    float: {
        y: [0, -10, 0],
        duration: 3,
        ease: "easeInOut",
    },
    bounce: {
        y: [0, -15, 0],
        scale: [1, 1.05, 0.95, 1],
        duration: 0.8,
        ease: "easeOut",
    },
    spin: {
        rotate: [0, 360],
        duration: 4,
        ease: "linear",
    },
    pulse: {
        scale: [1, 1.15, 1],
        opacity: [1, 0.9, 1],
        duration: 1.5,
        ease: "easeInOut",
    },
    shake: {
        rotate: [-3, 3, -3, 3, 0],
        x: [-2, 2, -2, 2, 0],
        duration: 0.5,
        ease: "easeInOut",
    },
    glow: {
        filter: [
            "drop-shadow(0 0 5px rgba(255,215,0,0.3))",
            "drop-shadow(0 0 20px rgba(255,215,0,0.8))",
            "drop-shadow(0 0 5px rgba(255,215,0,0.3))",
        ],
        duration: 2,
        ease: "easeInOut",
    },
    swing: {
        rotate: [-10, 10, -10],
        duration: 2.5,
        ease: "easeInOut",
    },
    breathe: {
        scale: [1, 1.05, 1],
        y: [0, -3, 0],
        duration: 4,
        ease: "easeInOut",
    },
    wave: {
        rotate: [0, -5, 5, 0],
        y: [0, -5, 0, 5, 0],
        duration: 2,
        ease: "easeInOut",
    },
    sparkle: {
        opacity: [1, 0.7, 1, 0.8, 1],
        scale: [1, 1.02, 1, 1.01, 1],
        duration: 1.5,
        ease: "easeInOut",
    },
};

// Glow color presets
const GLOW_COLORS: Record<string, string> = {
    gold: "rgba(255,215,0,0.8)",
    orange: "rgba(255,107,53,0.8)",
    cyan: "rgba(34,211,238,0.8)",
    purple: "rgba(168,85,247,0.8)",
    green: "rgba(34,197,94,0.8)",
    red: "rgba(239,68,68,0.8)",
    pink: "rgba(236,72,153,0.8)",
};

interface AnimatedSpriteProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    preset?: AnimationPreset | AnimationPreset[];
    customAnimation?: Partial<AnimationConfig>;
    glowColor?: keyof typeof GLOW_COLORS | string;
    className?: string;
    priority?: boolean;
}

export default function AnimatedSprite({
    src,
    alt,
    width = 60,
    height = 60,
    preset = "float",
    customAnimation,
    glowColor,
    className = "",
    priority = false,
}: AnimatedSpriteProps) {
    // Combine presets if array provided
    const presets = Array.isArray(preset) ? preset : [preset];

    // Build combined animation
    const combinedAnimation = useMemo(() => {
        const combined: Partial<AnimationConfig> = { duration: 2 };

        presets.forEach((p) => {
            const config = ANIMATION_PRESETS[p];
            Object.keys(config).forEach((key) => {
                if (key !== "duration" && key !== "ease") {
                    // Merge keyframes
                    (combined as unknown as Record<string, unknown>)[key] = (config as unknown as Record<string, unknown>)[key];
                }
            });
            // Use longest duration
            combined.duration = Math.max(combined.duration || 0, config.duration);
        });

        // Apply custom overrides
        if (customAnimation) {
            Object.assign(combined, customAnimation);
        }

        return combined;
    }, [presets, customAnimation]);

    // Build glow filter if specified
    const glowFilter = useMemo(() => {
        if (!glowColor) return undefined;
        const color = GLOW_COLORS[glowColor as keyof typeof GLOW_COLORS] || glowColor;
        return [
            `drop-shadow(0 0 5px ${color.replace("0.8", "0.3")})`,
            `drop-shadow(0 0 15px ${color})`,
            `drop-shadow(0 0 5px ${color.replace("0.8", "0.3")})`,
        ];
    }, [glowColor]);

    // Build animation object
    const animateProps = useMemo(() => {
        const props: Record<string, unknown> = {};

        if (combinedAnimation.y) props.y = combinedAnimation.y;
        if (combinedAnimation.x) props.x = combinedAnimation.x;
        if (combinedAnimation.rotate) props.rotate = combinedAnimation.rotate;
        if (combinedAnimation.scale) props.scale = combinedAnimation.scale;
        if (combinedAnimation.opacity) props.opacity = combinedAnimation.opacity;
        if (combinedAnimation.filter || glowFilter) {
            props.filter = combinedAnimation.filter || glowFilter;
        }

        return props;
    }, [combinedAnimation, glowFilter]);

    return (
        <motion.div
            className={`animated-sprite ${className}`}
            style={{
                width,
                height,
                position: "relative",
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                willChange: "transform",
            }}
            animate={animateProps as { [key: string]: number[] | string[] }}
            transition={{
                duration: combinedAnimation.duration,
                repeat: Infinity,
                ease: (combinedAnimation.ease || "easeInOut") as "easeInOut" | "linear" | "easeIn" | "easeOut",
            }}
        >
            <Image
                src={src}
                alt={alt}
                fill
                style={{ objectFit: "contain" }}
                priority={priority}
            />
        </motion.div>
    );
}

// Pre-configured sprite components for common use cases

export function FloatingSprite(props: Omit<AnimatedSpriteProps, "preset">) {
    return <AnimatedSprite {...props} preset={["float", "glow"]} />;
}

export function BouncingSprite(props: Omit<AnimatedSpriteProps, "preset">) {
    return <AnimatedSprite {...props} preset={["bounce", "sparkle"]} />;
}

export function PulsingSprite(props: Omit<AnimatedSpriteProps, "preset">) {
    return <AnimatedSprite {...props} preset={["pulse", "glow"]} />;
}

export function SwingingSprite(props: Omit<AnimatedSpriteProps, "preset">) {
    return <AnimatedSprite {...props} preset="swing" />;
}

export function SpinningSprite(props: Omit<AnimatedSpriteProps, "preset">) {
    return <AnimatedSprite {...props} preset="spin" />;
}
