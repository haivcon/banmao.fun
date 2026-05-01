// Premium Black Hole 3D - Hyper-realistic cosmic vortex with gravitational effects
"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { SoundManager } from "./SharedEffects";
import { DEFAULT_3D_FONT } from "../fonts";

interface BlackHole3DProps {
    position: [number, number, number];
    size?: number;
    onSuctionStart?: () => void;
    translations?: {
        title: string;
        warning: string;
        confirm: string;
        cancel: string;
        cleared: string;
    };
}

export function BlackHole3D({
    position,
    size = 1,
    onSuctionStart,
    translations = {
        title: "DATA VOID",
        warning: "⚠️ Delete ALL data?",
        confirm: "YES, RESET",
        cancel: "CANCEL",
        cleared: "✓ All data cleared!"
    },
}: BlackHole3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isCleared, setIsCleared] = useState(false);
    const [isSucking, setIsSucking] = useState(false);
    const phaseRef = useRef(0);
    const pullStrengthRef = useRef(1);
    const wasHovered = useRef(false);

    // 120 particles for dense spiral streams
    const particles = useMemo(() => {
        return [...Array(120)].map((_, i) => ({
            id: i,
            spiralArm: i % 6, // 6 spiral arms
            angle: (i / 120) * Math.PI * 2 + (i % 6) * (Math.PI / 3),
            distance: 0.5 + Math.random() * 2.0,
            speed: 0.3 + Math.random() * 0.7,
            size: 0.008 + Math.random() * 0.015,
            yOffset: (Math.random() - 0.5) * 0.15,
            phaseOffset: Math.random() * Math.PI * 2,
        }));
    }, []);

    // Animation loop
    useFrame((state, delta) => {
        const speedMultiplier = isHovered || isSucking ? (isSucking ? 10 : 5) : 1.5;
        phaseRef.current += delta * speedMultiplier;

        pullStrengthRef.current = isSucking ? 6 : (isHovered ? 3 : 1.2);

        if (groupRef.current) {
            groupRef.current.rotation.z += delta * 0.08 * speedMultiplier;
        }

        if (isHovered && !wasHovered.current) {
            SoundManager.startVortexLoop();
        } else if (!isHovered && wasHovered.current && !isSucking) {
            SoundManager.stopVortexLoop();
        }
        wasHovered.current = isHovered;
    });

    const handleHover = useCallback((hover: boolean) => {
        setIsHovered(hover);
    }, []);

    const handleClick = useCallback(() => {
        if (isCleared || isSucking) return;

        setIsSucking(true);
        SoundManager.playSuction();

        if (onSuctionStart) {
            onSuctionStart();
        }

        setTimeout(() => {
            try {
                localStorage.clear();
                sessionStorage.clear();

                const keysToRemove = [
                    'banmao_pwa_installed', 'banmao_pwa_dismissed', 'banmao_pwa_version',
                    'banmao_sound_enabled', 'banmao_language', 'banmao_theme',
                    'banmao_stats', 'banmao_game_stats', 'banmao_user_settings',
                ];
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });

                setIsCleared(true);
                setIsSucking(false);
                SoundManager.stopVortexLoop();

                setTimeout(() => {
                    window.location.reload();
                }, 300);
            } catch (e) {
                console.error('[BlackHole] Error clearing data:', e);
                setIsSucking(false);
            }
        }, 12000);
    }, [isCleared, isSucking, onSuctionStart]);

    // Calculate spiral particle positions
    const getParticlePos = (particle: typeof particles[0]): [number, number, number] => {
        const phase = phaseRef.current;
        const pullStrength = pullStrengthRef.current;
        const spiralAngle = particle.angle + phase * particle.speed * pullStrength;
        const spiralFactor = 1 + particle.spiralArm * 0.1;
        const dist = (particle.distance * size / pullStrength) * spiralFactor;
        const y = particle.yOffset + Math.sin(phase * 0.3 + particle.phaseOffset) * 0.05;
        return [
            Math.cos(spiralAngle) * dist,
            y,
            Math.sin(spiralAngle) * dist
        ];
    };

    // Color gradient based on distance from center
    const getParticleColor = (distance: number): string => {
        const normalized = Math.min(1, distance / (size * 1.5));
        if (isSucking) return '#ef4444';
        if (normalized < 0.3) return '#ffffff';
        if (normalized < 0.5) return '#fef08a';
        if (normalized < 0.7) return '#f97316';
        return '#a855f7';
    };

    // Dynamic glow intensity
    const glowPulse = 0.8 + Math.sin(phaseRef.current * 2) * 0.2;
    const baseIntensity = isSucking ? 8 : (isHovered ? 4 : 1.5);

    return (
        <group ref={groupRef} position={position}>
            {/* ========== EVENT HORIZON - Pure black center ========== */}
            <mesh
                onClick={handleClick}
                onPointerEnter={() => handleHover(true)}
                onPointerLeave={() => handleHover(false)}
            >
                <sphereGeometry args={[size * (isSucking ? 0.35 : 0.2), 64, 64]} />
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* ========== PHOTON RING - Bright thin ring at event horizon edge ========== */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[size * (isSucking ? 0.38 : 0.22), 0.008, 16, 128]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.9 + Math.sin(phaseRef.current * 5) * 0.1}
                />
            </mesh>

            {/* ========== INNER GLOW RING - Hot white/yellow ========== */}
            <mesh rotation={[Math.PI / 2, 0, phaseRef.current * 2 * (isSucking ? 3 : 1)]}>
                <torusGeometry args={[size * (isSucking ? 0.42 : 0.26), 0.015, 16, 64]} />
                <meshStandardMaterial
                    color={isSucking ? "#fef08a" : "#ffffff"}
                    emissive={isSucking ? "#fef08a" : "#ffffff"}
                    emissiveIntensity={2 * glowPulse}
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* ========== ACCRETION DISK LAYER 1 - Yellow/Orange (fastest) ========== */}
            <mesh rotation={[Math.PI / 2.2, phaseRef.current * 1.5 * (isSucking ? 3 : 1), 0]}>
                <torusGeometry args={[size * (isSucking ? 0.55 : 0.38), 0.06, 16, 64]} />
                <meshStandardMaterial
                    color={isSucking ? "#ef4444" : "#fbbf24"}
                    emissive={isSucking ? "#ef4444" : "#fbbf24"}
                    emissiveIntensity={1.5 * glowPulse}
                    transparent
                    opacity={0.75}
                />
            </mesh>

            {/* ========== ACCRETION DISK LAYER 2 - Orange ========== */}
            <mesh rotation={[Math.PI / 2.5, -phaseRef.current * 1.2 * (isSucking ? 3 : 1), Math.PI / 8]}>
                <torusGeometry args={[size * (isSucking ? 0.7 : 0.5), 0.05, 16, 64]} />
                <meshStandardMaterial
                    color={isSucking ? "#f97316" : "#f97316"}
                    emissive={isSucking ? "#f97316" : "#f97316"}
                    emissiveIntensity={1.2 * glowPulse}
                    transparent
                    opacity={0.65}
                />
            </mesh>

            {/* ========== ACCRETION DISK LAYER 3 - Orange/Red ========== */}
            <mesh rotation={[Math.PI / 3, phaseRef.current * 0.9 * (isSucking ? 3 : 1), -Math.PI / 6]}>
                <torusGeometry args={[size * (isSucking ? 0.88 : 0.65), 0.045, 16, 64]} />
                <meshStandardMaterial
                    color={isSucking ? "#dc2626" : "#ea580c"}
                    emissive={isSucking ? "#dc2626" : "#ea580c"}
                    emissiveIntensity={1.0 * glowPulse}
                    transparent
                    opacity={0.55}
                />
            </mesh>

            {/* ========== ACCRETION DISK LAYER 4 - Red/Purple ========== */}
            <mesh rotation={[Math.PI / 3.5, -phaseRef.current * 0.6 * (isSucking ? 3 : 1), Math.PI / 5]}>
                <torusGeometry args={[size * (isSucking ? 1.1 : 0.82), 0.04, 16, 64]} />
                <meshStandardMaterial
                    color={isSucking ? "#b91c1c" : "#c2410c"}
                    emissive={isSucking ? "#b91c1c" : "#c2410c"}
                    emissiveIntensity={0.8 * glowPulse}
                    transparent
                    opacity={0.45}
                />
            </mesh>

            {/* ========== ACCRETION DISK LAYER 5 - Purple (outermost, slowest) ========== */}
            <mesh rotation={[Math.PI / 4, phaseRef.current * 0.4 * (isSucking ? 3 : 1), -Math.PI / 4]}>
                <torusGeometry args={[size * (isSucking ? 1.35 : 1.0), 0.035, 16, 64]} />
                <meshStandardMaterial
                    color={isSucking ? "#991b1b" : "#a855f7"}
                    emissive={isSucking ? "#991b1b" : "#a855f7"}
                    emissiveIntensity={0.6 * glowPulse}
                    transparent
                    opacity={0.35}
                />
            </mesh>

            {/* ========== GRAVITATIONAL LENSING EFFECT - Outer glow sphere ========== */}
            <mesh>
                <sphereGeometry args={[size * (isSucking ? 1.5 : 1.2), 32, 32]} />
                <meshBasicMaterial
                    color={isSucking ? "#7f1d1d" : "#581c87"}
                    transparent
                    opacity={isSucking ? 0.2 : (isHovered ? 0.12 : 0.06)}
                />
            </mesh>

            {/* ========== SPIRAL ARMS - 6 curved streams ========== */}
            {[0, 1, 2, 3, 4, 5].map((arm) => {
                const armAngle = (arm / 6) * Math.PI * 2 + phaseRef.current * 0.3 * (isSucking ? 3 : 1);
                const spiralPoints: THREE.Vector3[] = [];
                for (let i = 0; i < 20; i++) {
                    const t = i / 20;
                    const radius = size * (0.3 + t * (isSucking ? 1.3 : 1.0));
                    const angle = armAngle + t * Math.PI * 1.5;
                    spiralPoints.push(new THREE.Vector3(
                        Math.cos(angle) * radius,
                        (Math.random() - 0.5) * 0.05,
                        Math.sin(angle) * radius
                    ));
                }
                const curve = new THREE.CatmullRomCurve3(spiralPoints);

                return (
                    <mesh key={`arm-${arm}`}>
                        <tubeGeometry args={[curve, 40, 0.015, 8, false]} />
                        <meshBasicMaterial
                            color={isSucking ? '#ef4444' : ['#fbbf24', '#f97316', '#ea580c', '#dc2626', '#a855f7', '#7c3aed'][arm]}
                            transparent
                            opacity={0.5 + Math.sin(phaseRef.current + arm) * 0.2}
                        />
                    </mesh>
                );
            })}

            {/* ========== DISTORTION RINGS - Multiple rotating at different speeds ========== */}
            {[0.3, 0.45, 0.6, 0.8, 1.0, 1.25, 1.5].slice(0, isSucking ? 7 : 5).map((radius, i) => (
                <mesh
                    key={`ring-${i}`}
                    rotation={[
                        Math.PI / 2 + Math.sin(phaseRef.current * 0.2 + i) * 0.1,
                        0,
                        phaseRef.current * (0.3 + i * 0.15) * (i % 2 === 0 ? 1 : -1) * (isSucking ? 3 : 1)
                    ]}
                >
                    <torusGeometry args={[size * radius * (isSucking ? 1.2 : 1), 0.003, 8, 128]} />
                    <meshBasicMaterial
                        color={['#fef08a', '#fbbf24', '#f97316', '#ea580c', '#dc2626', '#a855f7', '#7c3aed'][i]}
                        transparent
                        opacity={0.4 + Math.sin(phaseRef.current * 2 + i * 0.5) * 0.2}
                    />
                </mesh>
            ))}

            {/* ========== PARTICLE STREAMS - 120 particles in spiral paths ========== */}
            {particles.map((particle) => {
                const pos = getParticlePos(particle);
                const distToCenter = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
                const particleOpacity = Math.min(1, distToCenter / (size * 0.25));
                const particleScale = Math.max(0.5, 1 - (1 - particleOpacity) * 0.8);

                return (
                    <mesh key={particle.id} position={pos}>
                        <sphereGeometry args={[particle.size * particleScale * (isSucking ? 2.5 : (isHovered ? 1.8 : 1)), 6, 6]} />
                        <meshBasicMaterial
                            color={getParticleColor(distToCenter)}
                            transparent
                            opacity={particleOpacity * (isSucking ? 1 : (isHovered ? 0.85 : 0.5))}
                        />
                    </mesh>
                );
            })}

            {/* ========== TITLE LABEL ========== */}
            <Billboard position={[0, size * 1.2, 0]}>
                <Text
                    fontSize={size * 0.12}
                    font={DEFAULT_3D_FONT}
                    color={isCleared ? "#4ade80" : (isSucking ? "#ef4444" : (isHovered ? "#f97316" : "#a855f7"))}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.008}
                    outlineColor="#000000"
                >
                    {isCleared ? translations.cleared : (isSucking ? "⚠️ CLEARING..." : translations.title)}
                </Text>
            </Billboard>

            {/* ========== HOVER INSTRUCTION ========== */}
            {isHovered && !isSucking && !isCleared && (
                <Billboard position={[0, -size * 1.0, 0]}>
                    <Html center style={{ pointerEvents: 'none' }}>
                        <div style={{
                            padding: '6px 12px',
                            background: 'rgba(0,0,0,0.9)',
                            border: '1px solid #f97316',
                            borderRadius: '8px',
                            fontSize: '10px',
                            color: '#f97316',
                            fontFamily: "'Space Mono', monospace",
                            whiteSpace: 'nowrap',
                            textShadow: '0 0 8px rgba(249,115,22,0.5)',
                        }}>
                            🌀 Click to reset all data
                        </div>
                    </Html>
                </Billboard>
            )}

            {/* ========== DYNAMIC POINT LIGHTS ========== */}
            <pointLight
                position={[0, 0, 0]}
                color={isSucking ? "#ef4444" : "#f97316"}
                intensity={baseIntensity * glowPulse}
                distance={size * (isSucking ? 8 : 5)}
            />
            <pointLight
                position={[0, 0.2, 0]}
                color="#fbbf24"
                intensity={baseIntensity * 0.5 * glowPulse}
                distance={size * 3}
            />
        </group>
    );
}

export default BlackHole3D;

