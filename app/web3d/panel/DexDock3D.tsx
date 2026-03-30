"use client";

import React, { useRef, useState, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { useDexWindow } from "../../contexts/DexWindowContext";
import { useWeb3DTheme, useCustomCamera, createFocusTarget } from "../contexts";
import { RoundedPlane } from "../components/RoundedPlane";

// ==================== PREMIUM EFFECTS ====================

// Holographic shimmer line that sweeps across
function HolographicShimmer({ width, height }: { width: number; height: number }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const t = (state.clock.elapsedTime * 0.3) % 2;
            // Sweep from bottom-left to top-right
            meshRef.current.position.x = (t - 1) * width * 0.8;
            meshRef.current.position.y = (t - 1) * height * 0.5;
            meshRef.current.rotation.z = Math.PI / 4;
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
                t > 0.3 && t < 1.7 ? 0.15 + Math.sin(t * Math.PI) * 0.1 : 0;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0.005]}>
            <planeGeometry args={[width * 1.5, 0.08]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
    );
}

// Rainbow border gradient effect
function RainbowBorder({ width, height, radius }: { width: number; height: number; radius: number }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.children.forEach((child, i) => {
                const mesh = child as THREE.Mesh;
                const mat = mesh.material as THREE.MeshBasicMaterial;
                const hue = (state.clock.elapsedTime * 0.1 + i * 0.25) % 1;
                mat.color.setHSL(hue, 0.8, 0.5);
                mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.15;
            });
        }
    });

    return (
        <group ref={groupRef}>
            {/* Top */}
            <mesh position={[0, height / 2, 0.008]}>
                <planeGeometry args={[width - radius * 2, 0.025]} />
                <meshBasicMaterial color="#00f2ff" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            {/* Bottom */}
            <mesh position={[0, -height / 2, 0.008]}>
                <planeGeometry args={[width - radius * 2, 0.025]} />
                <meshBasicMaterial color="#a855f7" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            {/* Left */}
            <mesh position={[-width / 2, 0, 0.008]}>
                <planeGeometry args={[0.025, height - radius * 2]} />
                <meshBasicMaterial color="#facc15" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            {/* Right */}
            <mesh position={[width / 2, 0, 0.008]}>
                <planeGeometry args={[0.025, height - radius * 2]} />
                <meshBasicMaterial color="#4ade80" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Enhanced holographic particle with trail
function PremiumParticle({ position, delay, color }: { position: [number, number, number]; delay: number; color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const trailRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current && trailRef.current) {
            const t = state.clock.elapsedTime + delay;
            const floatY = Math.sin(t * 2) * 0.1;
            const floatX = Math.cos(t * 1.5) * 0.05;
            meshRef.current.position.y = position[1] + floatY;
            meshRef.current.position.x = position[0] + floatX;

            // Scale pulse
            const scale = 1 + Math.sin(t * 4) * 0.3;
            meshRef.current.scale.setScalar(scale);

            // Trail follows with delay
            trailRef.current.position.y = position[1] + floatY * 0.7;
            trailRef.current.position.x = position[0] + floatX * 0.7;

            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 3) * 0.3;
            (trailRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 3) * 0.1;
        }
    });

    return (
        <group position={[0, 0, position[2]]}>
            {/* Trail */}
            <mesh ref={trailRef} position={position}>
                <circleGeometry args={[0.04, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
            {/* Main particle */}
            <mesh ref={meshRef} position={position}>
                <circleGeometry args={[0.025, 12]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Neon pulse ring effect
function NeonPulseRing({ radius, color }: { radius: number; color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const t = (state.clock.elapsedTime * 0.8) % 2;
            const scale = 0.8 + t * 0.6;
            meshRef.current.scale.setScalar(scale);
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - t * 0.2);
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0.003]}>
            <ringGeometry args={[radius - 0.02, radius, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
    );
}

// Scanning line effect - enhanced
function PremiumScanLine({ width, height }: { width: number; height: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current && glowRef.current) {
            const t = (state.clock.elapsedTime * 0.5) % 1;
            const y = (t - 0.5) * height;
            meshRef.current.position.y = y;
            glowRef.current.position.y = y;

            const opacity = Math.sin(t * Math.PI) * 0.3;
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
            (glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
        }
    });

    return (
        <group position={[0, 0, 0.006]}>
            {/* Glow */}
            <mesh ref={glowRef}>
                <planeGeometry args={[width - 0.1, 0.08]} />
                <meshBasicMaterial color="#00f2ff" transparent opacity={0.1} side={THREE.DoubleSide} />
            </mesh>
            {/* Line */}
            <mesh ref={meshRef}>
                <planeGeometry args={[width - 0.15, 0.02]} />
                <meshBasicMaterial color="#00f2ff" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Breathing glow effect for cards
function BreathingGlow({ width, height, color }: { width: number; height: number; color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.elapsedTime;
            const breathe = Math.sin(t * 1.5) * 0.5 + 0.5;
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + breathe * 0.08;
            meshRef.current.scale.setScalar(1 + breathe * 0.02);
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -0.01]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
    );
}

// ==================== MAIN DOCK COMPONENT ====================

interface DexDock3DProps {
    translations?: {
        minimizedApps: string;
        clickToRestore: string;
        appsMinimized: string;
    };
}

const DEFAULT_TRANSLATIONS = {
    minimizedApps: "MINIMIZED APPS",
    clickToRestore: "Click to restore",
    appsMinimized: "apps minimized",
};

export function DexDock3D({ translations = DEFAULT_TRANSLATIONS }: DexDock3DProps = {}) {
    const groupRef = useRef<THREE.Group>(null);
    const { minimizedWindows, restoreWindow } = useDexWindow();
    const { size } = useThree();
    const { primaryColor, accentColor } = useWeb3DTheme();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [clickedItem, setClickedItem] = useState<string | null>(null);
    const { focusOn } = useCustomCamera();

    // Animation state
    const animTimeRef = useRef(0);
    const pulseRef = useRef(0);

    const handleDockClick = useCallback(() => {
        const isMobile = size.width < 768;
        const isLaptop = size.width >= 768 && size.width < 1440;
        const dockX = isMobile ? -3 : (isLaptop ? -4.8 : -5.5);
        const dockY = isMobile ? 0 : 0.3;
        const focusTarget = createFocusTarget([dockX, dockY, 0], 4, 0.5);
        focusOn(focusTarget, 0.8);
        import("../effects/SharedEffects").then(m => m.SoundManager.playClick());
    }, [size.width, focusOn]);

    const isMobile = size.width < 768;
    const isLaptop = size.width >= 768 && size.width < 1440;

    // Dock dimensions
    const itemWidth = isMobile ? 1.2 : 1.5;
    const itemHeight = isMobile ? 0.38 : 0.45;
    const itemSpacing = 0.12;
    const dockPadding = 0.2;

    const totalItems = minimizedWindows.length;
    const dockHeight = totalItems > 0
        ? totalItems * itemHeight + (totalItems - 1) * itemSpacing + dockPadding * 2 + 0.55
        : 0;
    const dockWidth = itemWidth + dockPadding * 2 + 0.2;

    // Smooth animations
    useFrame((state, delta) => {
        animTimeRef.current += delta;
        pulseRef.current = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5;

        if (groupRef.current) {
            // Gentle floating
            const baseX = isMobile ? -3 : (isLaptop ? -4.8 : -5.5);
            groupRef.current.position.x = baseX + Math.sin(state.clock.elapsedTime * 0.3) * 0.04;
            groupRef.current.position.y = (isMobile ? 0 : 0.3) + Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
        }
    });

    // Generate premium particles
    const particles = useMemo(() => {
        const pts: { pos: [number, number, number]; color: string }[] = [];
        const colors = ["#00f2ff", "#a855f7", "#facc15", "#4ade80", "#f472b6"];
        for (let i = 0; i < 12; i++) {
            pts.push({
                pos: [
                    (Math.random() - 0.5) * dockWidth * 0.9,
                    (Math.random() - 0.5) * dockHeight * 0.9,
                    0.02
                ],
                color: colors[i % colors.length]
            });
        }
        return pts;
    }, [dockWidth, dockHeight]);

    if (minimizedWindows.length === 0) {
        return null;
    }

    const dockX = isMobile ? -3 : (isLaptop ? -4.8 : -5.5);
    const dockY = isMobile ? 0 : 0.3;

    return (
        <group ref={groupRef} position={[dockX, dockY, 5]} onClick={handleDockClick}>
            <Billboard>
                {/* ==================== OUTER GLOW LAYERS ==================== */}
                {/* Outermost soft glow */}
                <RoundedPlane width={dockWidth + 0.5} height={dockHeight + 0.5} radius={0.4} position={[0, 0, -0.12]}>
                    <meshBasicMaterial color="#00f2ff" transparent opacity={0.04} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Colored glow layers */}
                <RoundedPlane width={dockWidth + 0.35} height={dockHeight + 0.35} radius={0.35} position={[0, 0, -0.1]}>
                    <meshBasicMaterial color={primaryColor} transparent opacity={0.08} side={THREE.DoubleSide} />
                </RoundedPlane>

                <RoundedPlane width={dockWidth + 0.2} height={dockHeight + 0.2} radius={0.3} position={[0, 0, -0.08]}>
                    <meshBasicMaterial color="#a855f7" transparent opacity={0.1} side={THREE.DoubleSide} />
                </RoundedPlane>

                <RoundedPlane width={dockWidth + 0.1} height={dockHeight + 0.1} radius={0.25} position={[0, 0, -0.05]}>
                    <meshBasicMaterial color={accentColor} transparent opacity={0.12} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* ==================== MAIN GLASS PANEL ==================== */}
                <RoundedPlane width={dockWidth} height={dockHeight} radius={0.22} position={[0, 0, -0.02]}>
                    <meshBasicMaterial color="#030315" transparent opacity={0.96} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Inner glass layer with gradient effect */}
                <RoundedPlane width={dockWidth - 0.08} height={dockHeight - 0.08} radius={0.18} position={[0, 0, -0.015]}>
                    <meshBasicMaterial color="#0a0a20" transparent opacity={0.7} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* ==================== PREMIUM EFFECTS ==================== */}
                {/* Rainbow animated border */}
                <RainbowBorder width={dockWidth - 0.04} height={dockHeight - 0.04} radius={0.2} />

                {/* Holographic shimmer sweep */}
                <HolographicShimmer width={dockWidth} height={dockHeight} />

                {/* Neon pulse rings */}
                <NeonPulseRing radius={dockWidth * 0.4} color="#00f2ff" />
                <NeonPulseRing radius={dockWidth * 0.3} color={primaryColor} />

                {/* Premium scan line */}
                <PremiumScanLine width={dockWidth} height={dockHeight} />

                {/* ==================== ACCENT LINES ==================== */}
                {/* Top neon bar with glow */}
                <group position={[0, dockHeight / 2 - 0.08, 0.01]}>
                    <RoundedPlane width={dockWidth - 0.3} height={0.05} radius={0.025}>
                        <meshBasicMaterial color="#00f2ff" transparent opacity={0.15} side={THREE.DoubleSide} />
                    </RoundedPlane>
                    <RoundedPlane width={dockWidth - 0.35} height={0.03} radius={0.015} position={[0, 0, 0.002]}>
                        <meshBasicMaterial color="#00f2ff" transparent opacity={0.85} side={THREE.DoubleSide} />
                    </RoundedPlane>
                </group>

                {/* Bottom accent bar */}
                <group position={[0, -dockHeight / 2 + 0.2, 0.01]}>
                    <RoundedPlane width={dockWidth - 0.45} height={0.035} radius={0.017}>
                        <meshBasicMaterial color="#a855f7" transparent opacity={0.1} side={THREE.DoubleSide} />
                    </RoundedPlane>
                    <RoundedPlane width={dockWidth - 0.5} height={0.02} radius={0.01} position={[0, 0, 0.002]}>
                        <meshBasicMaterial color={primaryColor} transparent opacity={0.6} side={THREE.DoubleSide} />
                    </RoundedPlane>
                </group>

                {/* Side accent bars with gradient */}
                {[[-1, "#a855f7"], [1, "#22d3ee"]].map(([side, color], i) => (
                    <RoundedPlane
                        key={i}
                        width={0.035}
                        height={dockHeight - 0.55}
                        radius={0.017}
                        position={[(side as number) * (dockWidth / 2 - 0.055), 0, 0.01]}
                    >
                        <meshBasicMaterial color={color as string} transparent opacity={0.6} side={THREE.DoubleSide} />
                    </RoundedPlane>
                ))}

                {/* ==================== CORNER DECORATIONS ==================== */}
                {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([dx, dy], i) => (
                    <group key={i} position={[dx * (dockWidth / 2 - 0.12), dy * (dockHeight / 2 - 0.12), 0.015]}>
                        {/* Outer glow */}
                        <mesh>
                            <circleGeometry args={[0.07, 12]} />
                            <meshBasicMaterial color={i % 2 === 0 ? "#00f2ff" : primaryColor} transparent opacity={0.2} />
                        </mesh>
                        {/* Inner bright core */}
                        <mesh position={[0, 0, 0.002]}>
                            <circleGeometry args={[0.04, 8]} />
                            <meshBasicMaterial color={i % 2 === 0 ? "#00f2ff" : primaryColor} transparent opacity={0.9} />
                        </mesh>
                        {/* Hexagon ring */}
                        <mesh rotation={[0, 0, Math.PI / 6]} position={[0, 0, 0.001]}>
                            <ringGeometry args={[0.055, 0.07, 6]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                ))}

                {/* ==================== FLOATING PARTICLES ==================== */}
                {particles.map((p, i) => (
                    <PremiumParticle key={i} position={p.pos} delay={i * 0.5} color={p.color} />
                ))}

                {/* ==================== HEADER ==================== */}
                <group position={[0, dockHeight / 2 - 0.16, 0.02]}>
                    {/* Header glow background */}
                    <mesh position={[0, 0, -0.005]}>
                        <planeGeometry args={[dockWidth - 0.25, 0.12]} />
                        <meshBasicMaterial color="#00f2ff" transparent opacity={0.05} side={THREE.DoubleSide} />
                    </mesh>
                    <Text
                        fontSize={0.06}
                        color="#00f2ff"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.003}
                        outlineColor="#000"
                    >
                        ◈ {translations.minimizedApps} ◈
                    </Text>
                </group>

                {/* ==================== MINIMIZED APP CARDS ==================== */}
                {minimizedWindows.map((window, index) => {
                    const yPos = dockHeight / 2 - dockPadding - 0.55 - itemHeight / 2 - index * (itemHeight + itemSpacing);
                    const isHovered = hoveredItem === window.id;
                    const isClicked = clickedItem === window.id;

                    // Enhanced animations
                    const bounceX = isHovered ? Math.sin(animTimeRef.current * 6) * 0.025 : 0;
                    const bounceY = isHovered ? Math.cos(animTimeRef.current * 4) * 0.01 : 0;
                    const scaleBoost = isHovered ? 1.06 : (isClicked ? 0.95 : 1);
                    const rotateZ = isHovered ? Math.sin(animTimeRef.current * 3) * 0.01 : 0;

                    return (
                        <group
                            key={window.id}
                            position={[bounceX, yPos + bounceY, 0.02]}
                            scale={[scaleBoost, scaleBoost, 1]}
                            rotation={[0, 0, rotateZ]}
                        >
                            {/* Breathing glow (always visible) */}
                            <BreathingGlow width={itemWidth + 0.1} height={itemHeight + 0.08} color={primaryColor} />

                            {/* Multi-layer hover glow */}
                            {isHovered && (
                                <>
                                    <RoundedPlane width={itemWidth + 0.2} height={itemHeight + 0.15} radius={0.15} position={[0, 0, -0.05]}>
                                        <meshBasicMaterial color="#00f2ff" transparent opacity={0.2} side={THREE.DoubleSide} />
                                    </RoundedPlane>
                                    <RoundedPlane width={itemWidth + 0.12} height={itemHeight + 0.08} radius={0.12} position={[0, 0, -0.03]}>
                                        <meshBasicMaterial color={primaryColor} transparent opacity={0.25} side={THREE.DoubleSide} />
                                    </RoundedPlane>
                                    <RoundedPlane width={itemWidth + 0.06} height={itemHeight + 0.04} radius={0.1} position={[0, 0, -0.015]}>
                                        <meshBasicMaterial color="#a855f7" transparent opacity={0.15} side={THREE.DoubleSide} />
                                    </RoundedPlane>
                                    {/* Point light for dramatic effect */}
                                    <pointLight position={[0, 0, 0.3]} color="#00f2ff" intensity={2} distance={1.5} />
                                </>
                            )}

                            {/* Card background */}
                            <RoundedPlane width={itemWidth - 0.04} height={itemHeight - 0.05} radius={0.08}>
                                <meshBasicMaterial
                                    color={isHovered ? '#0d1e35' : '#060d1a'}
                                    transparent
                                    opacity={0.98}
                                    side={THREE.DoubleSide}
                                />
                            </RoundedPlane>

                            {/* Card inner glass */}
                            <RoundedPlane width={itemWidth - 0.08} height={itemHeight - 0.09} radius={0.06} position={[0, 0, 0.002]}>
                                <meshBasicMaterial
                                    color={isHovered ? '#10253f' : '#080f1c'}
                                    transparent
                                    opacity={0.9}
                                    side={THREE.DoubleSide}
                                />
                            </RoundedPlane>

                            {/* Card top accent line */}
                            <RoundedPlane
                                width={itemWidth - 0.2}
                                height={0.015}
                                radius={0.007}
                                position={[0, (itemHeight - 0.05) / 2 - 0.025, 0.004]}
                            >
                                <meshBasicMaterial
                                    color={isHovered ? "#00f2ff" : primaryColor}
                                    transparent
                                    opacity={isHovered ? 0.9 : 0.4}
                                    side={THREE.DoubleSide}
                                />
                            </RoundedPlane>

                            {/* Icon container with glow */}
                            <group position={[-itemWidth / 2 + 0.25, 0, 0.01]}>
                                {/* Icon background circle */}
                                <mesh position={[0, 0, -0.003]}>
                                    <circleGeometry args={[isHovered ? 0.12 : 0.09, 16]} />
                                    <meshBasicMaterial
                                        color={isHovered ? "#00f2ff" : "#1a1a3a"}
                                        transparent
                                        opacity={isHovered ? 0.25 : 0.5}
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                                {/* Icon ring */}
                                {isHovered && (
                                    <mesh position={[0, 0, -0.002]}>
                                        <ringGeometry args={[0.1, 0.13, 16]} />
                                        <meshBasicMaterial color="#00f2ff" transparent opacity={0.3} side={THREE.DoubleSide} />
                                    </mesh>
                                )}
                                {/* Icon */}
                                <Html center style={{ pointerEvents: 'none' }} distanceFactor={8}>
                                    <span style={{
                                        fontSize: isHovered ? '16px' : '13px',
                                        filter: isHovered
                                            ? 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.9)) drop-shadow(0 0 20px rgba(0, 242, 255, 0.5))'
                                            : 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))',
                                        transition: 'all 0.15s ease-out',
                                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                    }}>
                                        {window.icon}
                                    </span>
                                </Html>
                            </group>

                            {/* Title */}
                            <Text
                                position={[0.12, 0, 0.01]}
                                fontSize={isHovered ? 0.065 : 0.058}
                                color={isHovered ? '#00f2ff' : '#e2e8f0'}
                                anchorX="center"
                                anchorY="middle"
                                maxWidth={itemWidth - 0.55}
                                outlineWidth={isHovered ? 0.004 : 0.002}
                                outlineColor="#000000"
                            >
                                {window.title}
                            </Text>

                            {/* Status indicator with pulse */}
                            <group position={[itemWidth / 2 - 0.12, 0, 0.01]}>
                                {/* Pulse ring (hover) */}
                                {isHovered && (
                                    <mesh>
                                        <ringGeometry args={[0.035, 0.05, 12]} />
                                        <meshBasicMaterial color="#4ade80" transparent opacity={0.4} side={THREE.DoubleSide} />
                                    </mesh>
                                )}
                                {/* Status dot */}
                                <mesh>
                                    <circleGeometry args={[isHovered ? 0.035 : 0.025, 12]} />
                                    <meshBasicMaterial
                                        color={isHovered ? "#4ade80" : primaryColor}
                                        transparent
                                        opacity={isHovered ? 1 : 0.8}
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                            </group>

                            {/* Interactive button overlay */}
                            <Html center distanceFactor={8} style={{ pointerEvents: 'auto' }}>
                                <style>{`
                                    .dock-card-btn {
                                        width: 90px;
                                        height: 28px;
                                        cursor: pointer;
                                        background: transparent;
                                        border: none;
                                        border-radius: 10px;
                                    }
                                    .dock-card-btn:hover {
                                        background: rgba(0, 242, 255, 0.05);
                                    }
                                `}</style>
                                <button
                                    className="dock-card-btn"
                                    onMouseEnter={() => setHoveredItem(window.id)}
                                    onMouseLeave={() => { setHoveredItem(null); setClickedItem(null); }}
                                    onMouseDown={() => setClickedItem(window.id)}
                                    onMouseUp={() => setClickedItem(null)}
                                    onClick={() => {
                                        restoreWindow(window.id);
                                        import("../effects/SharedEffects").then(m => m.SoundManager.playClick());
                                    }}
                                    title={`Open ${window.title}`}
                                />
                            </Html>
                        </group>
                    );
                })}

                {/* ==================== FOOTER ==================== */}
                <group position={[0, -dockHeight / 2 + 0.08, 0.02]}>
                    {/* Footer glow */}
                    <mesh position={[0, 0, -0.003]}>
                        <planeGeometry args={[dockWidth - 0.35, 0.08]} />
                        <meshBasicMaterial color="#a855f7" transparent opacity={0.03} side={THREE.DoubleSide} />
                    </mesh>
                    <Text fontSize={0.045} color="#64748b" anchorX="center" anchorY="middle">
                        〔 {totalItems} {translations.appsMinimized} 〕
                    </Text>
                </group>
            </Billboard>
        </group>
    );
}
