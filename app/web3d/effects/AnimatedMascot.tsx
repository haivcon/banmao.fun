"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { useWeb3DTheme, useCustomCamera, createFocusTarget } from "../contexts";

type MascotMood = "idle" | "happy" | "excited" | "waving" | "sleeping";

// ========== PARTICLE AURA COMPONENT ==========
function ParticleAura({ isHovered, mood, primaryColor }: { isHovered: boolean; mood: MascotMood; primaryColor: string }) {
    const particlesRef = useRef<THREE.Group>(null);
    const particleCount = 16;

    const particles = useMemo(() =>
        Array.from({ length: particleCount }).map((_, i) => ({
            offset: (i / particleCount) * Math.PI * 2,
            radius: 0.7 + Math.random() * 0.3,
            speed: 0.5 + Math.random() * 0.5,
            yRange: 0.3 + Math.random() * 0.2,
        })), [particleCount]);

    useFrame((state) => {
        if (!particlesRef.current) return;
        const time = state.clock.elapsedTime;
        const intensity = mood === "excited" ? 1.5 : (isHovered ? 1.2 : 1);

        particlesRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;
            const p = particles[i];
            const t = time * p.speed + p.offset;

            mesh.position.x = Math.cos(t) * p.radius * intensity;
            mesh.position.z = Math.sin(t) * p.radius * intensity;
            mesh.position.y = Math.sin(t * 2) * p.yRange;

            const scale = 0.02 + Math.sin(t * 3) * 0.01;
            mesh.scale.setScalar(scale * (mood === "excited" ? 1.5 : 1));

            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = mood === "excited" ? 0.9 : (isHovered ? 0.7 : 0.5);
        });
    });

    return (
        <group ref={particlesRef}>
            {particles.map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[1, 8, 8]} />
                    <meshBasicMaterial color={i % 2 === 0 ? "#facc15" : primaryColor} transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
}

interface AnimatedMascotProps {
    position?: [number, number, number];
    size?: number;
    imageSrc?: string;
}

export function AnimatedMascot({
    position = [0, -0.5, 0],
    size = 220,
    imageSrc = "/branding/animated-icon.gif",
}: AnimatedMascotProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [mood, setMood] = useState<MascotMood>("idle");
    const [isHovered, setIsHovered] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const { theme, primaryColor } = useWeb3DTheme();
    const { focusOn } = useCustomCamera();

    // Animation refs
    const animationData = useRef({
        bobOffset: 0,
        swayAngle: 0,
        bounceScale: 1,
        waveProgress: 0,
    });

    // Mood messages
    const moodMessages: Record<MascotMood, string> = {
        idle: "",
        happy: "Meow! 😸",
        excited: "BANMAO! 🚀",
        waving: "Hi there! 👋",
        sleeping: "Zzz... 💤",
    };

    // Handle click interaction
    const handleClick = useCallback(() => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;
        setLastClickTime(now);

        // NOTE: No camera focus here - clicking mascot only triggers expressions

        if (timeSinceLastClick < 500) {
            // Double click - get excited
            setClickCount(prev => prev + 1);
            setMood("excited");
            // Play excited sound 🚀
            import("./SharedEffects").then(m => m.SoundManager.playExcited());
            setTimeout(() => setMood("idle"), 2000);
        } else {
            // Single click - wave
            setMood("waving");
            // Play wave sound 👋
            import("./SharedEffects").then(m => m.SoundManager.playWave());
            setTimeout(() => setMood("idle"), 1500);
        }

        // After many clicks, get sleepy
        if (clickCount > 10) {
            setMood("sleeping");
            // Play sleepy sound 💤
            import("./SharedEffects").then(m => m.SoundManager.playSleepy());
            setTimeout(() => {
                setMood("idle");
                setClickCount(0);
            }, 3000);
        }
    }, [lastClickTime, clickCount]);

    // Handle hover
    const handleHover = useCallback((hovering: boolean) => {
        setIsHovered(hovering);
        if (hovering && mood === "idle") {
            setMood("happy");
            // Play meow sound 😸
            import("./SharedEffects").then(m => m.SoundManager.playMeow());
        } else if (!hovering && mood === "happy") {
            setMood("idle");
        }
    }, [mood]);

    // Animation frame
    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;
        const data = animationData.current;

        // Base floating animation
        data.bobOffset = Math.sin(time * 0.35) * 0.2;
        groupRef.current.position.y = position[1] + data.bobOffset;

        // Mood-specific animations
        switch (mood) {
            case "excited":
                // Bouncy animation
                data.bounceScale = 1 + Math.abs(Math.sin(time * 8)) * 0.1;
                groupRef.current.scale.setScalar(data.bounceScale);
                break;
            case "waving":
                // Sway side to side
                data.swayAngle = Math.sin(time * 4) * 0.15;
                groupRef.current.rotation.z = data.swayAngle;
                break;
            case "sleeping":
                // Slow breathing
                data.bounceScale = 1 + Math.sin(time * 0.8) * 0.05;
                groupRef.current.scale.setScalar(data.bounceScale);
                break;
            default:
                // Idle - gentle sway on hover
                if (isHovered) {
                    data.swayAngle = Math.sin(time * 2) * 0.05;
                    groupRef.current.rotation.z = data.swayAngle;
                } else {
                    groupRef.current.rotation.z = 0;
                }
                groupRef.current.scale.setScalar(1);
        }
    });

    // Dynamic glow - always GOLD color
    const glowIntensity = mood === "excited" ? 1 : (isHovered ? 0.8 : 0.6);
    const glowColor = "rgba(250, 204, 21, ";  // Gold color always

    return (
        <group ref={groupRef} position={position}>
            {/* ========== 3D PARTICLE AURA ========== */}
            <ParticleAura
                isHovered={isHovered}
                mood={mood}
                primaryColor={primaryColor}
            />

            {/* ========== GLOW HALO RING ========== */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[0.8, 1.0, 32]} />
                <meshBasicMaterial
                    color="#facc15"
                    transparent
                    opacity={mood === "excited" ? 0.4 : (isHovered ? 0.25 : 0.12)}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Second halo ring */}
            <mesh rotation={[Math.PI / 2.3, 0, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[0.9, 0.95, 32]} />
                <meshBasicMaterial
                    color={primaryColor}
                    transparent
                    opacity={mood === "excited" ? 0.3 : 0.08}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <Billboard>
                <Html
                    transform
                    distanceFactor={5}
                    center
                    style={{ overflow: 'visible', background: 'transparent' }}
                    occlude={false}
                >
                    <div
                        style={{
                            position: "relative",
                            cursor: "pointer",
                            transition: "transform 0.3s ease",
                            transform: isHovered ? "scale(1.05)" : "scale(1)",
                            overflow: "visible",
                            // Prevent text selection and tap highlight on mobile
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none",
                            WebkitTapHighlightColor: "transparent",
                            WebkitTouchCallout: "none",
                            outline: "none",
                        }}
                        onMouseEnter={() => handleHover(true)}
                        onMouseLeave={() => handleHover(false)}
                        onClick={handleClick}
                    >
                        {/* Main mascot image */}
                        <img
                            src={imageSrc}
                            alt="Banmao Mascot"
                            draggable={false}
                            style={{
                                width: `clamp(160px, 25vw, ${size}px)`,
                                height: "auto",
                                filter: `drop-shadow(0 0 ${80 * glowIntensity}px ${glowColor}${glowIntensity}) drop-shadow(0 0 ${40 * glowIntensity}px ${glowColor}${glowIntensity * 0.8})`,
                                pointerEvents: "none",
                                transition: "filter 0.3s ease",
                                // Prevent selection highlight
                                userSelect: "none",
                                WebkitUserSelect: "none",
                                WebkitTouchCallout: "none",
                            }}
                        />

                        {/* Mood indicator bubble */}
                        {moodMessages[mood] && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "-30px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "rgba(0, 0, 0, 0.8)",
                                    color: primaryColor,
                                    padding: "clamp(4px, 1vw, 8px) clamp(10px, 2vw, 16px)",
                                    borderRadius: "20px",
                                    border: `2px solid ${primaryColor}`,
                                    fontSize: "clamp(10px, 1.8vw, 14px)",
                                    fontFamily: "Space Mono, monospace",
                                    whiteSpace: "nowrap",
                                    animation: "popIn 0.3s ease-out",
                                    boxShadow: `0 0 20px ${glowColor}0.5)`,
                                }}
                            >
                                {moodMessages[mood]}
                            </div>
                        )}

                        {/* Sparkles when excited */}
                        {mood === "excited" && (
                            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                                {[...Array(6)].map((_, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            position: "absolute",
                                            top: `${20 + Math.random() * 60}%`,
                                            left: `${10 + Math.random() * 80}%`,
                                            fontSize: "clamp(12px, 2vw, 16px)",
                                            animation: `sparkle 0.6s ease-out ${i * 0.1}s both`,
                                        }}
                                    >
                                        ✨
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Zzz when sleeping */}
                        {mood === "sleeping" && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "-10px",
                                    right: "-20px",
                                    fontSize: "clamp(16px, 3vw, 24px)",
                                    animation: "float 2s ease-in-out infinite",
                                }}
                            >
                                💤
                            </div>
                        )}
                    </div>

                    {/* CSS animations */}
                    <style>{`
                        @keyframes popIn {
                            0% { transform: translateX(-50%) scale(0); opacity: 0; }
                            100% { transform: translateX(-50%) scale(1); opacity: 1; }
                        }
                        @keyframes sparkle {
                            0% { transform: scale(0) rotate(0deg); opacity: 1; }
                            100% { transform: scale(1.5) rotate(180deg) translateY(-20px); opacity: 0; }
                        }
                        @keyframes float {
                            0%, 100% { transform: translateY(0); }
                            50% { transform: translateY(-10px); }
                        }
                    `}</style>
                </Html>
            </Billboard>
        </group>
    );
}
