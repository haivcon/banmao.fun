// Community Links Hub 3D - Premium glowing planet-like spheres
"use client";

import React, { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Html, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { SoundManager } from "./SharedEffects";
import { useCustomCamera, createFocusTarget } from "../contexts";
import { DEFAULT_3D_FONT } from "../fonts";

// Social link configuration with updated URLs
const SOCIAL_LINKS = [
    {
        id: 'telegram',
        icon: '✈',
        label: 'Telegram',
        url: 'https://t.me/banmao_X',
        color: '#00d4ff',
        innerColor: '#0088cc',
        glowColor: '#00d4ff',
    },
    {
        id: 'twitter',
        icon: '𝕏',
        label: 'Twitter / X',
        url: 'https://x.com/banmao_X',
        color: '#ffffff',
        innerColor: '#1a1a2e',
        glowColor: '#ffffff',
    },
    {
        id: 'okx',
        icon: '◈',
        label: 'OKX DEX',
        url: 'https://web3.okx.com/token/x-layer/0x16d91d1615fc55b76d5f92365bd60c069b46ef78',
        color: '#facc15',
        innerColor: '#b8860b',
        glowColor: '#facc15',
    },
];

interface CommunityLinksHub3DProps {
    position: [number, number, number];
    size?: number;
    translations?: {
        community: string;
        joinUs: string;
    };
}

export function CommunityLinksHub3D({
    position,
    size = 1,
    translations = { community: 'Community', joinUs: 'Join Us' },
}: CommunityLinksHub3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);
    const [floatPhase, setFloatPhase] = useState(0);
    const { focusOn } = useCustomCamera();

    // Animation loop
    useFrame((state, delta) => {
        setFloatPhase(prev => prev + delta * 0.5);

        if (groupRef.current) {
            // Slow elegant orbit
            groupRef.current.rotation.y += delta * 0.08;
        }
    });

    const handleClick = useCallback((url: string) => {
        SoundManager.playClick();
        window.open(url, '_blank');
    }, []);

    const handleHover = useCallback((id: string | null) => {
        if (id && id !== hoveredLink) {
            SoundManager.playHover();
        }
        setHoveredLink(id);
    }, [hoveredLink]);

    const handleDoubleClick = useCallback(() => {
        const focusTarget = createFocusTarget(position, 4, 0);
        focusOn(focusTarget, 0.8);
    }, [position, focusOn]);

    // Calculate orbital positions for planets
    const getPlanetPosition = (index: number, total: number): [number, number, number] => {
        const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
        const radius = size * 1.4;
        const floatOffset = Math.sin(floatPhase * 0.8 + index * 1.2) * 0.12;
        return [
            Math.cos(angle) * radius,
            floatOffset,
            Math.sin(angle) * radius
        ];
    };

    return (
        <group ref={groupRef} position={position}>
            {/* Central sun/star */}
            <mesh position={[0, 0, 0]} onDoubleClick={handleDoubleClick}>
                {/* Core */}
                <sphereGeometry args={[size * 0.28, 32, 32]} />
                <meshStandardMaterial
                    color="#a78bfa"
                    emissive="#a78bfa"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.9}
                />
            </mesh>
            {/* Inner glow layer */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[size * 0.35, 32, 32]} />
                <meshBasicMaterial
                    color="#facc15"
                    transparent
                    opacity={0.2 + Math.sin(floatPhase * 1.5) * 0.08}
                />
            </mesh>
            {/* Outer glow layer */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[size * 0.45, 32, 32]} />
                <meshBasicMaterial
                    color="#a78bfa"
                    transparent
                    opacity={0.08 + Math.sin(floatPhase * 2) * 0.04}
                />
            </mesh>

            {/* Title */}
            <Billboard position={[0, size * 0.85, 0]}>
                <Text
                    fontSize={size * 0.2}
                    font={DEFAULT_3D_FONT}
                    color="#facc15"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.01}
                    outlineColor="#000000"
                >
                    {translations.community}
                </Text>
            </Billboard>
            <Billboard position={[0, size * 0.58, 0]}>
                <Text
                    fontSize={size * 0.1}
                    font={DEFAULT_3D_FONT}
                    color="#a78bfa"
                    anchorX="center"
                    anchorY="middle"
                >
                    ◇ {translations.joinUs} ◇
                </Text>
            </Billboard>

            {/* Planet spheres for social links */}
            {SOCIAL_LINKS.map((link, index) => {
                const planetPos = getPlanetPosition(index, SOCIAL_LINKS.length);
                const isHovered = hoveredLink === link.id;
                const baseRadius = size * 0.32;
                const hoverRadius = isHovered ? baseRadius * 1.25 : baseRadius;

                return (
                    <group key={link.id} position={planetPos}>
                        {/* Main planet sphere */}
                        <mesh
                            onClick={() => handleClick(link.url)}
                            onPointerEnter={() => handleHover(link.id)}
                            onPointerLeave={() => handleHover(null)}
                        >
                            <sphereGeometry args={[hoverRadius, 32, 32]} />
                            <meshStandardMaterial
                                color={link.innerColor}
                                emissive={link.color}
                                emissiveIntensity={isHovered ? 1.2 : 0.5}
                                roughness={0.3}
                                metalness={0.7}
                            />
                        </mesh>

                        {/* Atmosphere glow */}
                        <mesh>
                            <sphereGeometry args={[hoverRadius * 1.15, 32, 32]} />
                            <meshBasicMaterial
                                color={link.color}
                                transparent
                                opacity={isHovered ? 0.35 : 0.15}
                            />
                        </mesh>

                        {/* Outer glow - always visible, brighter on hover */}
                        <mesh>
                            <sphereGeometry args={[hoverRadius * 1.35, 32, 32]} />
                            <meshBasicMaterial
                                color={link.color}
                                transparent
                                opacity={isHovered ? 0.15 : 0.06}
                            />
                        </mesh>

                        {/* Orbital ring - always visible */}
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[hoverRadius * 1.5, isHovered ? 0.02 : 0.012, 16, 32]} />
                            <meshBasicMaterial
                                color={link.color}
                                transparent
                                opacity={isHovered ? 0.9 : 0.4}
                            />
                        </mesh>

                        {/* Second tilted ring - always visible, rotates faster on hover */}
                        <mesh rotation={[Math.PI / 3, floatPhase * (isHovered ? 5 : 0.3), 0]}>
                            <torusGeometry args={[hoverRadius * 1.7, isHovered ? 0.015 : 0.008, 16, 32]} />
                            <meshBasicMaterial
                                color={link.color}
                                transparent
                                opacity={isHovered ? 0.6 : 0.25}
                            />
                        </mesh>

                        {/* Third orbit ring - perpendicular */}
                        <mesh rotation={[0, floatPhase * (isHovered ? -4 : -0.2), Math.PI / 4]}>
                            <torusGeometry args={[hoverRadius * 1.6, isHovered ? 0.012 : 0.006, 16, 32]} />
                            <meshBasicMaterial
                                color={link.color}
                                transparent
                                opacity={isHovered ? 0.5 : 0.2}
                            />
                        </mesh>

                        {/* Orbiting mini-moons/particles around each planet */}
                        {[...Array(4)].map((_, i) => {
                            const speedMultiplier = isHovered ? 8 : 1;
                            const moonAngle = floatPhase * 1.5 * speedMultiplier + (i / 4) * Math.PI * 2;
                            const moonRadius = hoverRadius * 1.6;
                            const moonY = Math.sin(floatPhase * 2 * speedMultiplier + i) * 0.05;
                            return (
                                <mesh
                                    key={`moon-${link.id}-${i}`}
                                    position={[
                                        Math.cos(moonAngle) * moonRadius,
                                        moonY,
                                        Math.sin(moonAngle) * moonRadius
                                    ]}
                                >
                                    <sphereGeometry args={[0.025 + (isHovered ? 0.015 : 0), 8, 8]} />
                                    <meshBasicMaterial
                                        color={link.color}
                                        transparent
                                        opacity={isHovered ? 1 : 0.6}
                                    />
                                </mesh>
                            );
                        })}

                        {/* Sparkle points around planet */}
                        {[...Array(6)].map((_, i) => {
                            const speedMultiplier = isHovered ? 6 : 1;
                            const sparkleAngle = (i / 6) * Math.PI * 2 + floatPhase * 0.8 * speedMultiplier;
                            const sparkleRadius = hoverRadius * (1.3 + Math.sin(floatPhase * 3 * speedMultiplier + i) * 0.2);
                            const sparkleY = Math.cos(floatPhase * 1.5 * speedMultiplier + i * 0.5) * 0.15;
                            const sparkleSize = 0.015 + Math.sin(floatPhase * 4 * speedMultiplier + i * 2) * 0.008;
                            return (
                                <mesh
                                    key={`sparkle-${link.id}-${i}`}
                                    position={[
                                        Math.cos(sparkleAngle) * sparkleRadius,
                                        sparkleY,
                                        Math.sin(sparkleAngle) * sparkleRadius
                                    ]}
                                >
                                    <sphereGeometry args={[sparkleSize + (isHovered ? 0.01 : 0), 6, 6]} />
                                    <meshBasicMaterial
                                        color="#ffffff"
                                        transparent
                                        opacity={0.4 + Math.sin(floatPhase * 5 * speedMultiplier + i) * 0.4}
                                    />
                                </mesh>
                            );
                        })}

                        {/* Energy pulse ring (always visible, stronger on hover) */}
                        <mesh rotation={[Math.PI / 2, 0, floatPhase * (isHovered ? 8 : 1)]}>
                            <torusGeometry args={[hoverRadius * 1.25, isHovered ? 0.01 : 0.006, 8, 32]} />
                            <meshBasicMaterial
                                color={link.color}
                                transparent
                                opacity={0.25 + Math.sin(floatPhase * 2 * (isHovered ? 2 : 1)) * 0.15 + (isHovered ? 0.3 : 0)}
                            />
                        </mesh>

                        {/* Icon on planet surface */}
                        <Billboard>
                            <Text
                                position={[0, 0, hoverRadius + 0.01]}
                                fontSize={size * (isHovered ? 0.28 : 0.22)}
                                font={DEFAULT_3D_FONT}
                                color="#ffffff"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.005}
                                outlineColor="#000000"
                            >
                                {link.icon}
                            </Text>
                        </Billboard>

                        {/* Label below planet when hovered */}
                        {isHovered && (
                            <Billboard position={[0, -hoverRadius - size * 0.25, 0]}>
                                <Html center style={{ pointerEvents: 'none' }}>
                                    <div style={{
                                        padding: '6px 14px',
                                        background: 'rgba(0,0,0,0.85)',
                                        border: `2px solid ${link.color}`,
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        color: link.color,
                                        whiteSpace: 'nowrap',
                                        boxShadow: `0 0 20px ${link.glowColor}60, 0 0 40px ${link.glowColor}30`,
                                        textShadow: `0 0 10px ${link.glowColor}`,
                                    }}>
                                        {link.label}
                                    </div>
                                </Html>
                            </Billboard>
                        )}
                    </group>
                );
            })}

            {/* Orbital path rings */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[size * 1.4, 0.008, 16, 64]} />
                <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} />
            </mesh>

            {/* Secondary decorative orbits */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2.5, 0, floatPhase * 0.1]}>
                <torusGeometry args={[size * 1.8, 0.005, 16, 64]} />
                <meshBasicMaterial color="#facc15" transparent opacity={0.12} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 3, floatPhase * 0.05, 0]}>
                <torusGeometry args={[size * 2.0, 0.004, 16, 64]} />
                <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} />
            </mesh>

            {/* Floating star particles */}
            {[...Array(20)].map((_, i) => {
                const angle = (i / 20) * Math.PI * 2;
                const radius = size * 2.2 + Math.sin(floatPhase * 0.3 + i * 0.4) * 0.4;
                const y = Math.sin(floatPhase * 0.6 + i * 0.3) * 0.5;
                const particleSize = 0.018 + Math.sin(floatPhase * 1.2 + i) * 0.008;
                const colors = ['#facc15', '#a78bfa', '#22d3ee', '#ffffff'];

                return (
                    <mesh
                        key={`star-${i}`}
                        position={[
                            Math.cos(angle + floatPhase * 0.1) * radius,
                            y,
                            Math.sin(angle + floatPhase * 0.1) * radius
                        ]}
                    >
                        <sphereGeometry args={[particleSize, 8, 8]} />
                        <meshBasicMaterial
                            color={colors[i % colors.length]}
                            transparent
                            opacity={0.6 + Math.sin(floatPhase * 2 + i) * 0.3}
                        />
                    </mesh>
                );
            })}

            {/* Connecting energy lines from center to planets */}
            {SOCIAL_LINKS.map((link, index) => {
                const planetPos = getPlanetPosition(index, SOCIAL_LINKS.length);
                const isHovered = hoveredLink === link.id;

                return (
                    <line key={`line-${link.id}`}>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                count={2}
                                array={new Float32Array([0, 0, 0, planetPos[0], planetPos[1], planetPos[2]])}
                                itemSize={3}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial
                            color={isHovered ? link.color : '#a78bfa'}
                            transparent
                            opacity={isHovered ? 0.6 : 0.2}
                        />
                    </line>
                );
            })}
        </group>
    );
}

export default CommunityLinksHub3D;
