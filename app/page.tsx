"use client";

import React, { Suspense, useRef, useState, useEffect, createContext, useContext, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
    TrackballControls,
    Float,
    Stars,
    MeshDistortMaterial,
    Html,
    Sparkles,
    Text,
    Billboard,
    RoundedBox,
    Center
} from "@react-three/drei";
import * as THREE from "three";
import { registerServiceWorker, initInstallPrompt, canPromptInstall, promptInstall } from "../lib/registerSW";
import PWAInstallBanner from "../components/PWAInstallBanner";
import OfflineIndicator from "../components/OfflineIndicator";
import SplashScreen from "../components/SplashScreen";

// Import from new web3d structure
import {
    Language,
    LANGUAGES,
    translations,
    getBrowserLanguage,
    type LandingTranslations
} from "./web3d/locals";
import {
    DexPanel3D,
    DexSettingsPanel3D,
    DexDock3D,
    PriceFeedPanel,
    TokenStatsPanel,
    TokenInfoPanel3D,
    BurnTrackerPanel3D
} from "./web3d/panel";
import {
    GameFiMenu,
    StakingMenu,
    CollectionMenu
} from "./web3d/button";
import { Web3DThemeProvider, TokenStatsProvider, useTokenStatsContext, CustomCameraController, useCustomCamera, createFocusTarget, SuctionProvider, useSuction } from "./web3d/contexts";
import { FloatingParticles, GlowingOrbs, TokenCoin3D, AnimatedMascot, CommunityLinksHub3D, BlackHole3D, DancingLogo3D, SwimmingWhale3D } from "./web3d/effects";
// Lazy load heavy 3D chart component for better initial load
const TokenDistributionChart3D = dynamic(
    () => import("./web3d/effects").then(mod => ({ default: mod.TokenDistributionChart3D })),
    { ssr: false }
);
import { SoundManagerProvider } from "./web3d/audio";
import { DexWindowProvider } from "./contexts/DexWindowContext";
import { usePrice } from "./web3d/hooks/usePrice";
import { useResponsiveLayout } from "./web3d/layouts";

/* ===================== FONT & i18n ===================== */

// Space Mono font URL - now using centralized font config
// To add local fonts, place .woff files in public/fonts/ and update web3d/fonts/index.ts
import { DEFAULT_3D_FONT } from "./web3d/fonts";
const SPACE_MONO_FONT = DEFAULT_3D_FONT;

// Language Context
const LanguageContext = createContext<{
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: keyof LandingTranslations) => string;
}>({
    lang: "en",
    setLang: () => { },
    t: (key) => key,
});

// Custom hook for translations
function useTranslation() {
    return useContext(LanguageContext);
}

/* ===================== 3D TEXT LABEL ===================== */

function Label3D({
    position,
    text,
    color = "#ffffff",
    fontSize = 0.15,
    anchorX = "center" as const,
    anchorY = "middle" as const,
    font = SPACE_MONO_FONT,
}: {
    position: [number, number, number];
    text: string;
    color?: string;
    fontSize?: number;
    anchorX?: "left" | "center" | "right";
    anchorY?: "top" | "middle" | "bottom";
    font?: string;
}) {
    return (
        <Billboard position={position}>
            <Text
                fontSize={fontSize}
                color={color}
                anchorX={anchorX}
                anchorY={anchorY}
                outlineWidth={fontSize * 0.05}
                outlineColor="#000000"
                font={font}
            >
                {text}
            </Text>
        </Billboard>
    );
}

/* ===================== SUCTIONABLE GROUP ===================== */
// Wrapper that animates children toward black hole when suction is active
// NOTE: Does NOT set position on group - children keep their original positions

function SuctionableGroup({
    children,
    position = [0, 0, 0] as [number, number, number],
    delay = 0,
    scale = 1
}: {
    children: React.ReactNode;
    position?: [number, number, number];
    delay?: number;
    scale?: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const { isSucking, suctionProgress, suctionTarget, getAvoidanceOffset } = useSuction();
    const initialScale = useRef(scale);
    const [isHidden, setIsHidden] = useState(false);

    useFrame(() => {
        if (!groupRef.current) return;

        if (isSucking) {
            // Calculate normalized progress for this object (0-1 range after delay)
            let normalizedProgress = 0;
            if (suctionProgress > delay) {
                normalizedProgress = Math.min(1, (suctionProgress - delay) / (1 - delay));
            }

            // Mark object as hidden when it's mostly sucked in
            if (normalizedProgress >= 0.85 && !isHidden) {
                setIsHidden(true);
                return;
            }

            if (normalizedProgress > 0 && !isHidden) {
                // Direction toward suction target FROM the object's position
                const dx = suctionTarget[0] - position[0];
                const dy = suctionTarget[1] - position[1];
                const dz = suctionTarget[2] - position[2];

                // Fast accelerating movement toward black hole
                const moveFactor = Math.min(1, normalizedProgress * normalizedProgress * 2.0);

                // Set position as OFFSET (group has no initial position, children have their own)
                groupRef.current.position.set(
                    dx * moveFactor,
                    dy * moveFactor,
                    dz * moveFactor
                );

                // Shrink aggressively
                const shrinkFactor = Math.max(0.01, Math.pow(1 - normalizedProgress, 2));
                groupRef.current.scale.setScalar(initialScale.current * shrinkFactor);

                // Spin as it gets sucked
                groupRef.current.rotation.z += normalizedProgress * 0.5;
                groupRef.current.rotation.y += normalizedProgress * 0.3;
            }
        } else if (isHidden) {
            // Reset when not sucking anymore
            setIsHidden(false);
            groupRef.current.position.set(0, 0, 0);
            groupRef.current.scale.setScalar(initialScale.current);
            groupRef.current.rotation.set(0, 0, 0);
        } else {
            // When not sucking - apply avoidance offset if cubes are nearby
            const avoidOffset = getAvoidanceOffset(position);
            const currentX = groupRef.current.position.x;
            const currentY = groupRef.current.position.y;
            const currentZ = groupRef.current.position.z;

            // Smooth interpolation toward avoidance offset
            groupRef.current.position.set(
                currentX + (avoidOffset[0] - currentX) * 0.1,
                currentY + (avoidOffset[1] - currentY) * 0.1,
                currentZ + (avoidOffset[2] - currentZ) * 0.1
            );
        }
    });

    // Completely remove from render tree when hidden
    if (isHidden) {
        return null;
    }

    // NOTE: No position prop on group - children keep their original positions
    return (
        <group ref={groupRef}>
            {children}
        </group>
    );
}



/* ===================== STATUS INDICATORS ===================== */

function StatusIndicators() {
    return null; // Removed FUEL and OPTIMAL indicators
}

/* ===================== 3D ENVIRONMENT ===================== */

function SpaceBackground() {
    const meshRef = useRef<THREE.Mesh>(null);
    const { size } = useThree();

    // Optimize particle count for mobile devices
    const isMobile = size.width < 768;
    const starsCount = isMobile ? 2000 : 5000;
    const sparkleCount1 = isMobile ? 80 : 200;
    const sparkleCount2 = isMobile ? 60 : 150;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.015;
        }
    });

    return (
        <>
            <Stars radius={100} depth={60} count={starsCount} factor={4} saturation={0} fade speed={0.3} />
            <Sparkles count={sparkleCount1} scale={50} size={3} speed={0.2} color="#22d3ee" />
            <Sparkles count={sparkleCount2} scale={45} size={4} speed={0.15} color="#a855f7" />
        </>
    );
}

function HologramPlatform() {
    // Removed: cyan and purple torus rings
    // The piechart3D now has its own pulse ring effects
    return null;
}

/* ===================== OKX LOGO 3D VOXEL - LIVING CHARACTER ===================== */

// Individual animated cube component
function AnimatedCube({
    basePosition,
    cubeSize,
    isHovered,
    cubeIndex,
    letterIndex,
    isEyePosition
}: {
    basePosition: [number, number, number];
    cubeSize: number;
    isHovered: boolean;
    cubeIndex: number;
    letterIndex: number;
    isEyePosition: boolean;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [eyeOpen, setEyeOpen] = useState(true);

    // Random blink for eye cubes
    useEffect(() => {
        if (!isEyePosition) return;
        const blinkInterval = setInterval(() => {
            setEyeOpen(false);
            setTimeout(() => setEyeOpen(true), 150);
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(blinkInterval);
    }, [isEyePosition]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;
        const delay = cubeIndex * 0.1 + letterIndex * 0.3;

        // Wave animation through cubes
        const waveY = Math.sin(time * 2.5 + delay) * 0.03;

        // Breathing animation
        const breathScale = 1 + Math.sin(time * 1.5) * 0.03;

        // Hover excited bounce
        const excitedBounce = isHovered ? Math.abs(Math.sin(time * 6 + delay)) * 0.06 : 0;

        // Eye blink scale (squish Y when closed)
        const eyeScale = isEyePosition && !eyeOpen ? 0.2 : 1;

        // Apply position
        meshRef.current.position.y = basePosition[1] + waveY + excitedBounce;

        // Apply scale with breathing and eye blink
        meshRef.current.scale.set(
            breathScale,
            breathScale * eyeScale,
            breathScale
        );

        // Slight rotation when hovered (looking alive)
        if (isHovered) {
            meshRef.current.rotation.x = Math.sin(time * 4 + delay) * 0.1;
            meshRef.current.rotation.z = Math.cos(time * 3 + delay) * 0.05;
        } else {
            meshRef.current.rotation.x *= 0.9;
            meshRef.current.rotation.z *= 0.9;
        }
    });

    return (
        <mesh ref={meshRef} position={basePosition}>
            <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
            <meshStandardMaterial
                color="#ffffff"
                emissive={isHovered ? "#00f2ff" : "#ffffff"}
                emissiveIntensity={isHovered ? 0.8 : 0.4}
                metalness={0.85}
                roughness={0.15}
            />
        </mesh>
    );
}

// Particle trail component
function LogoParticles({ isHovered, position }: { isHovered: boolean; position: [number, number, number] }) {
    const particlesRef = useRef<THREE.Group>(null);
    const particleCount = 24;

    const particles = useMemo(() =>
        Array.from({ length: particleCount }).map((_, i) => ({
            offset: (i / particleCount) * Math.PI * 2,
            speed: 0.8 + Math.random() * 0.4,
            radius: 0.8 + Math.random() * 0.3,
            yRange: 0.2 + Math.random() * 0.15,
        })), []);

    useFrame((state) => {
        if (!particlesRef.current) return;
        const time = state.clock.elapsedTime;

        // Different animation styles: calm orbit when idle, energetic when hovered
        const speed = isHovered ? 1.5 : 0.6;
        const radius = isHovered ? 1.2 : 0.9;
        const yBounce = isHovered ? 0.3 : 0.15;

        particlesRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;
            const p = particles[i];
            const t = time * p.speed * speed + p.offset;

            // Orbit path
            mesh.position.x = Math.cos(t) * p.radius * radius;
            mesh.position.z = Math.sin(t) * p.radius * 0.6;
            mesh.position.y = Math.sin(t * 2) * p.yRange * yBounce / 0.2;

            // Scale: small subtle when idle, larger pulsing when hovered
            const baseScale = isHovered ? 0.03 : 0.02;
            const pulse = isHovered ? Math.sin(t * 4) * 0.015 : Math.sin(t * 2) * 0.005;
            mesh.scale.setScalar(baseScale + pulse);

            // Opacity: visible in both states
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = isHovered ? 0.95 : 0.6;
        });
    });

    return (
        <group ref={particlesRef} position={[0, 0, 0]}>
            {particles.map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[1, 8, 8]} />
                    <meshBasicMaterial
                        color={i % 2 === 0 ? "#00f2ff" : "#facc15"}
                        transparent
                        opacity={0.5}
                    />
                </mesh>
            ))}
        </group>
    );
}

function OKXLogo3D({ position = [0, 0, 0] as [number, number, number] }) {
    const groupRef = useRef<THREE.Group>(null);
    const { focusOn } = useCustomCamera();
    const [isHovered, setIsHovered] = useState(false);
    const wasHovered = useRef(false);

    const cubeSize = 0.18;
    const gap = 0.04;
    const unit = cubeSize + gap;

    // Click handler
    const handleClick = () => {
        const focusTarget = createFocusTarget(position, 5, 0.5);
        focusOn(focusTarget, 0.8);
        import("./web3d/effects/SharedEffects").then(m => m.SoundManager.playOKX());
    };

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        // Gentle swaying rotation
        groupRef.current.rotation.y = Math.sin(time * 0.4) * 0.15;
        groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.05;

        // Bouncy idle animation (no squash/stretch)
        const bouncePhase = (time * 1.2) % (Math.PI * 2);
        const bounce = Math.abs(Math.sin(bouncePhase));

        // Base position with bounce
        groupRef.current.position.y = position[1] + bounce * 0.15;

        // Excited when hovered
        if (isHovered) {
            groupRef.current.scale.setScalar(1.1);
        } else {
            groupRef.current.scale.setScalar(1);
        }

        // Hover sound - continuous metallic industrial
        if (isHovered && !wasHovered.current) {
            import("./web3d/effects/SharedEffects").then(m => m.SoundManager.startMetallicLoop());
        } else if (!isHovered && wasHovered.current) {
            import("./web3d/effects/SharedEffects").then(m => m.SoundManager.stopMetallicLoop());
        }
        wasHovered.current = isHovered;
    });

    // OKX logo pixel patterns - O has center as "eye"
    const letterO = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
    const letterK = [[1, 0, 1], [1, 1, 0], [1, 0, 1]];
    const letterX = [[1, 0, 1], [0, 1, 0], [1, 0, 1]];

    // Build cubes with animation data
    const buildLetter = (pattern: number[][], offsetX: number, letterIndex: number) => {
        const cubes: React.ReactNode[] = [];
        let cubeIdx = 0;
        pattern.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === 1) {
                    const basePos: [number, number, number] = [
                        offsetX + x * unit,
                        (pattern.length / 2 - y) * unit,
                        0
                    ];
                    // Eye position is center of O (would be at y=1, x=1 but it's empty)
                    // So use the cubes around the center as "eye frame"
                    const isEyeFrame = letterIndex === 0 && (y === 1 || x === 1);

                    cubes.push(
                        <AnimatedCube
                            key={`${offsetX}-${x}-${y}`}
                            basePosition={basePos}
                            cubeSize={cubeSize}
                            isHovered={isHovered}
                            cubeIndex={cubeIdx}
                            letterIndex={letterIndex}
                            isEyePosition={isEyeFrame}
                        />
                    );
                    cubeIdx++;
                }
            });
        });
        return cubes;
    };

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={handleClick}
            onPointerOver={() => { setIsHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setIsHovered(false); document.body.style.cursor = 'default'; }}
        >
            {/* Particle trail */}
            <LogoParticles isHovered={isHovered} position={position} />

            {/* O */}
            {buildLetter(letterO, -0.85, 0)}
            {/* K */}
            {buildLetter(letterK, 0, 1)}
            {/* X */}
            {buildLetter(letterX, 0.85, 2)}

            {/* "Powered by" text - bounces with logo */}
            <Text
                position={[0, 0.7, 0]}
                fontSize={0.18}
                color={isHovered ? "#00f2ff" : "#6b7280"}
                anchorX="center"
                anchorY="middle"
            >
                Powered by
            </Text>

            {/* "Developed by DOREMON" text */}
            <Text
                position={[0, -0.65, 0]}
                fontSize={0.1}
                color="#facc15"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.005}
                outlineColor="#000000"
            >
                Developed by ＤＯＲＥＭＯＮ
            </Text>


        </group>
    );
}

// ===================== LIGHTNING BOLT =====================
// Realistic electric beam with branching and glow
function LightningBolt({
    start,
    end,
    progress,
    color = "#22d3ee",
}: {
    start: [number, number, number];
    end: [number, number, number];
    progress: number;
    color?: string;
}) {
    // Main bolt line
    const mainLine = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
        });
        return new THREE.Line(geometry, material);
    }, []);

    // Glow line (thicker, more transparent)
    const glowLine = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: 0.4,
        });
        return new THREE.Line(geometry, material);
    }, []);

    // Branch lines
    const branchLines = useMemo(() => {
        return [0, 1, 2].map(() => {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
            });
            return new THREE.Line(geometry, material);
        });
    }, []);

    const [tipPosition, setTipPosition] = useState<[number, number, number]>(start);
    const [flickerIntensity, setFlickerIntensity] = useState(1);

    useEffect(() => {
        if (mainLine.material instanceof THREE.LineBasicMaterial) {
            mainLine.material.color.set(color);
        }
        branchLines.forEach(branch => {
            if (branch.material instanceof THREE.LineBasicMaterial) {
                branch.material.color.set(color);
            }
        });
    }, [color, mainLine, branchLines]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        // Flicker effect
        const flicker = 0.7 + Math.random() * 0.3;
        setFlickerIntensity(flicker);

        // Main bolt with more segments for smooth curves
        const segmentCount = 16;
        const mainPoints: THREE.Vector3[] = [];
        const branchStartPoints: { point: THREE.Vector3; direction: THREE.Vector3 }[] = [];

        for (let i = 0; i <= segmentCount; i++) {
            const t = i / segmentCount;
            if (t > progress) break;

            const x = start[0] + (end[0] - start[0]) * t;
            const y = start[1] + (end[1] - start[1]) * t;
            const z = start[2] + (end[2] - start[2]) * t;

            // Natural lightning jitter - stronger in middle, less at endpoints
            const midFactor = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
            let jitterX = 0, jitterY = 0, jitterZ = 0;

            if (i > 0 && i < segmentCount) {
                // Random but consistent jitter based on segment
                const seed = i * 12.345 + Math.floor(time * 8);
                const jitterStrength = 0.3 * midFactor;
                jitterX = jitterStrength * Math.sin(seed * 1.1 + time * 25);
                jitterY = jitterStrength * Math.cos(seed * 2.3 + time * 20);
                jitterZ = jitterStrength * Math.sin(seed * 0.7 + time * 22);
            }

            const point = new THREE.Vector3(x + jitterX, y + jitterY, z + jitterZ);
            mainPoints.push(point);

            // Mark branch points (at ~30%, ~50%, ~70%)
            if (i === Math.floor(segmentCount * 0.3) ||
                i === Math.floor(segmentCount * 0.5) ||
                i === Math.floor(segmentCount * 0.7)) {
                const dir = new THREE.Vector3(
                    Math.sin(time * 3 + i) * 0.5,
                    Math.cos(time * 2 + i * 2) * 0.5,
                    Math.sin(time * 4 + i * 0.5) * 0.3
                );
                branchStartPoints.push({ point: point.clone(), direction: dir });
            }
        }

        if (mainPoints.length >= 2) {
            mainLine.geometry.setFromPoints(mainPoints);
            glowLine.geometry.setFromPoints(mainPoints);

            const last = mainPoints[mainPoints.length - 1];
            setTipPosition([last.x, last.y, last.z]);
        }

        // Create branches
        branchLines.forEach((branch, idx) => {
            if (branchStartPoints[idx] && progress > 0.3) {
                const { point, direction } = branchStartPoints[idx];
                const branchPoints: THREE.Vector3[] = [point];

                const branchLength = 0.4 + Math.random() * 0.3;
                for (let j = 1; j <= 4; j++) {
                    const bt = j / 4;
                    const branchJitter = new THREE.Vector3(
                        Math.sin(time * 30 + j * 5) * 0.1,
                        Math.cos(time * 25 + j * 3) * 0.1,
                        Math.sin(time * 28 + j * 4) * 0.1
                    );
                    branchPoints.push(
                        point.clone()
                            .add(direction.clone().multiplyScalar(bt * branchLength))
                            .add(branchJitter)
                    );
                }
                branch.geometry.setFromPoints(branchPoints);
            }
        });
    });

    if (progress <= 0) return null;

    return (
        <group>
            {/* Outer glow */}
            <primitive object={glowLine} />
            {/* Main bolt */}
            <primitive object={mainLine} />
            {/* Branches */}
            {branchLines.map((branch, i) => (
                <primitive key={i} object={branch} />
            ))}
            {/* Core glow at tip */}
            <pointLight
                position={tipPosition}
                color={color}
                intensity={progress * 5 * flickerIntensity}
                distance={3}
            />
            {/* Ambient glow along bolt */}
            <pointLight
                position={[
                    (start[0] + tipPosition[0]) / 2,
                    (start[1] + tipPosition[1]) / 2,
                    (start[2] + tipPosition[2]) / 2,
                ]}
                color={color}
                intensity={progress * 2 * flickerIntensity}
                distance={5}
            />
        </group>
    );
}

// ===================== LIGHTNING SYSTEM =====================
// Manages multiple lightning bolts from cubes to random target positions
function LightningSystem({
    cubePositions,
    targetPositions,
    isActive,
    progress,
}: {
    cubePositions: [number, number, number][];
    targetPositions: [number, number, number][];
    isActive: boolean;
    progress: number; // 0-1 suction progress
}) {
    const [connections, setConnections] = useState<Array<{
        cubeIndex: number;
        targetIndex: number;
    }>>([]);

    // Create random cube-to-target connections when activated
    useEffect(() => {
        if (isActive && cubePositions.length > 0 && targetPositions.length > 0) {
            const newConnections: typeof connections = [];

            // Each cube connects to 1-2 random targets
            cubePositions.forEach((_, cubeIdx) => {
                const numTargets = Math.min(2, targetPositions.length);
                const usedTargets = new Set<number>();

                for (let i = 0; i < numTargets; i++) {
                    let targetIdx = Math.floor(Math.random() * targetPositions.length);
                    // Avoid duplicates
                    while (usedTargets.has(targetIdx) && usedTargets.size < targetPositions.length) {
                        targetIdx = (targetIdx + 1) % targetPositions.length;
                    }
                    usedTargets.add(targetIdx);

                    newConnections.push({
                        cubeIndex: cubeIdx,
                        targetIndex: targetIdx,
                    });
                }
            });

            setConnections(newConnections);
        } else if (!isActive) {
            setConnections([]);
        }
    }, [isActive, cubePositions.length, targetPositions.length]);

    if (!isActive || connections.length === 0) return null;

    // Interpolate color from cyan to yellow based on progress
    const r = Math.round(34 + (250 - 34) * progress);
    const g = Math.round(211 + (204 - 211) * progress);
    const b = Math.round(238 + (21 - 238) * progress);
    const color = `rgb(${r}, ${g}, ${b})`;

    return (
        <group>
            {connections.map((conn, i) => {
                const cubePos = cubePositions[conn.cubeIndex];
                const targetPos = targetPositions[conn.targetIndex];
                if (!cubePos || !targetPos) return null;

                // Lightning reaches target in first 30% of progress, then stays
                // Stagger each bolt slightly for dramatic effect
                const staggerDelay = (i * 0.02);
                const boltExtendTime = 0.25; // 25% of progress to fully extend
                const rawProgress = (progress - staggerDelay) / boltExtendTime;
                const boltProgress = Math.max(0, Math.min(1, rawProgress));

                return (
                    <LightningBolt
                        key={i}
                        start={cubePos}
                        end={targetPos}
                        progress={boltProgress}
                        color={color}
                    />
                );
            })}
        </group>
    );
}


// ===================== SPAWNED CUBE CHILD =====================
// Individual animated child cube for "X LAYER" text formation
function SpawnedCubeChild({
    startPosition,
    targetPosition,
    progress,
    cubeIndex,
    letterIndex,
    color,
    textPhase = 0,
}: {
    startPosition: [number, number, number];
    targetPosition: [number, number, number];
    progress: number;
    cubeIndex: number;
    letterIndex: number;
    color: string;
    textPhase?: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const delay = letterIndex * 0.1 + cubeIndex * 0.02;

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;

        // Eased progress with per-cube delay
        const delayedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
        const eased = delayedProgress < 0.5
            ? 4 * delayedProgress * delayedProgress * delayedProgress
            : 1 - Math.pow(-2 * delayedProgress + 2, 3) / 2;

        // Interpolate position from start to target
        meshRef.current.position.set(
            startPosition[0] + (targetPosition[0] - startPosition[0]) * eased,
            startPosition[1] + (targetPosition[1] - startPosition[1]) * eased,
            startPosition[2] + (targetPosition[2] - startPosition[2]) * eased
        );

        // Dancing animation when formed (progress > 0.8)
        if (progress > 0.8) {
            const danceTime = time * 3 + letterIndex * 0.5 + cubeIndex * 0.1;
            // Wave motion
            meshRef.current.position.y += Math.sin(danceTime) * 0.05;
            // Bounce
            meshRef.current.position.x += Math.sin(danceTime * 0.7) * 0.02;
            // Rotation wobble
            meshRef.current.rotation.x = Math.sin(danceTime * 2) * 0.15;
            meshRef.current.rotation.z = Math.cos(danceTime * 1.5) * 0.1;
        }

        // Scale animation: start small, grow to full, then pulse
        // Scale GROWS with each text phase: 0.12 → 0.15 → 0.18 → 0.21
        const baseScale = 0.12 + textPhase * 0.03;
        const growScale = eased * baseScale;
        const pulseScale = progress > 0.8 ? Math.sin(time * 4 + cubeIndex * 0.2) * 0.02 : 0;
        meshRef.current.scale.setScalar(growScale + pulseScale);
    });

    return (
        <mesh ref={meshRef} position={startPosition}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.5}
                metalness={0.8}
                roughness={0.2}
            />
        </mesh>
    );
}

// ===================== X LAYER TEXT SPAWNER =====================
function XLayerTextSpawner({
    parentCubePositions,
    textCenter,
    isActive,
    onComplete,
}: {
    parentCubePositions: [number, number, number][];
    textCenter: [number, number, number];
    isActive: boolean;
    onComplete: () => void;
}) {
    const [progress, setProgress] = useState(0);
    const [textPhase, setTextPhase] = useState(0); // 0=XLAYER, 1=$BANMAO, 2=X.COM/BANMAO_X
    const [isTransitioning, setIsTransitioning] = useState(false);
    const startTime = useRef(0);
    const phaseStartTime = useRef(0);
    const hasCompleted = useRef(false);

    // Define the 3 text sequences
    const textSequences = useMemo(() => [
        ['X', 'L', 'A', 'Y', 'E', 'R'],
        ['$', 'B', 'A', 'N', 'M', 'A', 'O'],
        ['I', '❤', 'Y', 'O', 'U'],
        ['W', 'E', 'G', 'O', 'M', 'O', 'O', 'N'],
    ], []);

    // "X LAYER" letter patterns - 5x5 outline style for uniform visual weight
    const letterPatterns: { [key: string]: number[][] } = useMemo(() => ({
        X: [
            [1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 1, 0],
            [1, 0, 0, 0, 1],
        ],
        L: [
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
        ],
        A: [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
        ],
        Y: [
            [1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
        ],
        E: [
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
        ],
        R: [
            [1, 1, 1, 0, 0],
            [1, 0, 0, 1, 0],
            [1, 1, 1, 0, 0],
            [1, 0, 1, 0, 0],
            [1, 0, 0, 1, 0],
        ],
        I: [
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1],
        ],
        U: [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],
        ],
        '❤': [
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0],
        ],
        W: [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 1, 0, 1, 1],
            [1, 0, 0, 0, 1],
        ],
        G: [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],
        ],
        // New characters for $BANMAO and X.COM/BANMAO_X
        '$': [
            [0, 1, 1, 1, 0],
            [1, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 1],
            [0, 1, 1, 1, 0],
        ],
        '@': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 1, 1],
            [1, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
        ],
        B: [
            [1, 1, 1, 0, 0],
            [1, 0, 0, 1, 0],
            [1, 1, 1, 0, 0],
            [1, 0, 0, 1, 0],
            [1, 1, 1, 0, 0],
        ],
        N: [
            [1, 0, 0, 0, 1],
            [1, 1, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 1, 1],
            [1, 0, 0, 0, 1],
        ],
        M: [
            [1, 0, 0, 0, 1],
            [1, 1, 0, 1, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
        ],
        O: [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],
        ],
        C: [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
        ],
        '.': [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0],
        ],
        '/': [
            [0, 0, 0, 0, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0],
            [1, 0, 0, 0, 0],
        ],
        '_': [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1],
        ],
    }), []);

    // Generate cube positions based on current text phase
    const cubeData = useMemo(() => {
        const letters = textSequences[textPhase] || [];
        // Smaller cubes for longer text (X.COM/BANMAO_X = 14 chars)
        const cubeSize = letters.length > 10 ? 0.08 : (letters.length > 7 ? 0.12 : 0.15);
        const letterWidth = 5 * cubeSize;
        const letterGap = cubeSize * 1.2;
        const totalWidth = letters.length * letterWidth + (letters.length - 1) * letterGap;
        const startX = textCenter[0] - totalWidth / 2;

        const cubes: Array<{
            startPosition: [number, number, number];
            targetPosition: [number, number, number];
            letterIndex: number;
            cubeIndex: number;
        }> = [];

        // Return empty if no parent positions yet
        if (parentCubePositions.length === 0) return cubes;

        let letterIdx = 0;
        let globalCubeIdx = 0;

        letters.forEach((letter, lIdx) => {
            const pattern = letterPatterns[letter];
            if (!pattern) return;

            const letterOffset = startX + lIdx * (letterWidth + letterGap);
            let cubeIdx = 0;

            pattern.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell === 1) {
                        // Assign to one of the 5 parent cubes (round-robin)
                        const parentIdx = globalCubeIdx % parentCubePositions.length;
                        const parentPos = parentCubePositions[parentIdx] || textCenter;

                        cubes.push({
                            startPosition: [...parentPos] as [number, number, number],
                            targetPosition: [
                                letterOffset + x * cubeSize,
                                textCenter[1] - 3 + (pattern.length / 2 - y) * cubeSize, // Y offset -3 to be well below cubes
                                textCenter[2] + 4, // Z +4 to be clearly IN FRONT of cubes
                            ],
                            letterIndex: letterIdx,
                            cubeIndex: cubeIdx++,
                        });
                        globalCubeIdx++;
                    }
                });
            });
            letterIdx++;
        });

        return cubes;
    }, [textCenter, parentCubePositions, letterPatterns, textPhase, textSequences]);

    // Multi-phase animation timing
    useFrame((state) => {
        if (!isActive) {
            startTime.current = state.clock.elapsedTime;
            phaseStartTime.current = state.clock.elapsedTime;
            hasCompleted.current = false;
            setProgress(0);
            setTextPhase(0);
            setIsTransitioning(false);
            return;
        }

        const elapsed = state.clock.elapsedTime - phaseStartTime.current;
        const formDuration = 3; // seconds to form letters (slower)
        const displayDuration = 6; // seconds to display (longer)
        const scatterDuration = 1.5; // seconds to scatter before next phase

        if (isTransitioning) {
            // Scatter phase - cubes flying outward before reforming
            const scatterProgress = elapsed / scatterDuration;
            if (scatterProgress >= 1) {
                // Move to next text phase
                const nextPhase = textPhase + 1;
                if (nextPhase >= 4) {
                    hasCompleted.current = true;
                    onComplete();
                } else {
                    setTextPhase(nextPhase);
                    setIsTransitioning(false);
                    phaseStartTime.current = state.clock.elapsedTime;
                    setProgress(0);
                    // Start forming sound for new text (special sound for WE GO MOON)
                    import("./web3d/effects/SharedEffects").then(m => {
                        if (nextPhase === 3) {
                            m.SoundManager.playMoonArrival(); // Epic sound for WE GO MOON
                        }
                        m.SoundManager.startFormingLoop();
                    });
                }
            } else {
                // Progress goes from 1 to 0 during scatter (reverse animation)
                setProgress(1 - scatterProgress);
            }
        } else {
            // Normal form and display phase
            if (elapsed < formDuration) {
                setProgress(elapsed / formDuration);
            } else if (elapsed < formDuration + displayDuration) {
                // Text fully formed - play complete sound once
                if (progress < 1) {
                    import("./web3d/effects/SharedEffects").then(m => {
                        m.SoundManager.stopFormingLoop();
                        m.SoundManager.playTextComplete();
                    });
                }
                setProgress(1);
            } else {
                // Start scatter transition
                setIsTransitioning(true);
                phaseStartTime.current = state.clock.elapsedTime;
                // Play scatter explosion sound
                import("./web3d/effects/SharedEffects").then(m => m.SoundManager.playScatter());
            }
        }
    });

    // Don't render if not active or no cube data
    if (!isActive || cubeData.length === 0) return null;

    return (
        <group key={`text-phase-${textPhase}`}>
            {cubeData.map((cube, i) => (
                <SpawnedCubeChild
                    key={`${textPhase}-${i}`}
                    startPosition={cube.startPosition}
                    targetPosition={cube.targetPosition}
                    progress={progress}
                    cubeIndex={cube.cubeIndex}
                    letterIndex={cube.letterIndex}
                    color="#facc15"
                    textPhase={textPhase}
                />
            ))}
            {/* Glow lights at each parent cube */}
            {parentCubePositions.map((pos, i) => (
                <pointLight
                    key={i}
                    position={pos}
                    color="#facc15"
                    intensity={progress * 3}
                    distance={5}
                />
            ))}
            {/* Central glow at text */}
            <pointLight
                position={textCenter}
                color="#facc15"
                intensity={progress * 8}
                distance={15}
            />
        </group>
    );
}

function FloatingCubes() {
    const groupRef = useRef<THREE.Group>(null);
    const cubeRefs = useRef<(THREE.Mesh | null)[]>([]);
    const glowRef = useRef<THREE.PointLight>(null);
    const { focusOn } = useCustomCamera();
    const { isSucking, suctionProgress, setSuctionTarget, startSuction, resetSuction, setCubePositions } = useSuction();

    // Animation phases: 0=normal floating, 1=suction (all objects fly in), 2=form X, 3=split to XLAYER, 4=dancing, 5=reverse
    const [phase, setPhase] = useState(0);
    const phaseTimer = useRef(0);
    const formXProgress = useRef(0);
    const spinRotation = useRef(0);
    const glowIntensity = useRef(0);
    const flashProgress = useRef(0);

    // Spawn animation state
    const [spawnActive, setSpawnActive] = useState(false);
    const [parentCubePositions, setParentCubePositions] = useState<[number, number, number][]>([]);
    const [textCenter, setTextCenter] = useState<[number, number, number]>([0, 2, 5]);
    const [cubeCenter, setCubeCenter] = useState<[number, number, number]>([0, 2, 2]);

    // 5 cubes with their original floating positions
    const originalPositions: [number, number, number][] = [
        [-7, 2, -5],   // Top-left
        [8, 3, -6],    // Top-right
        [-6, -1, -4],  // Bottom-left
        [7, 1, -5],    // Bottom-right
        [0, 5, -5],    // Center top (5th cube)
    ];

    // X formation positions (will be centered at cubeCenter)
    // Spacing increased to 2.0 for clearer X shape visibility
    const getXFormationPositions = (center: [number, number, number]): [number, number, number][] => [
        [center[0] - 2.0, center[1] + 2.0, center[2]],   // Top-left of X
        [center[0] + 2.0, center[1] + 2.0, center[2]],   // Top-right of X
        [center[0], center[1], center[2]],               // Center of X
        [center[0] - 2.0, center[1] - 2.0, center[2]],   // Bottom-left of X
        [center[0] + 2.0, center[1] - 2.0, center[2]],   // Bottom-right of X
    ];

    // Color based on suction progress: cyan → yellow
    const getColor = () => {
        if (phase === 0 && !isSucking) return "#22d3ee"; // Cyan
        // Interpolate from cyan to yellow based on suction progress
        const t = Math.min(1, suctionProgress * 2);
        const r = Math.round(34 + (250 - 34) * t);
        const g = Math.round(211 + (204 - 211) * t);
        const b = Math.round(238 + (21 - 238) * t);
        return `rgb(${r}, ${g}, ${b})`;
    };

    // Track suction completion to trigger next phase
    useEffect(() => {
        if (isSucking && suctionProgress >= 0.99 && phase === 0) {
            setPhase(1); // Move to form X phase
            formXProgress.current = 0;
            phaseTimer.current = 0;
        }
    }, [isSucking, suctionProgress, phase]);

    useFrame((state, delta) => {
        // Phase 0: Normal floating (wait for click)
        if (phase === 0) {
            if (groupRef.current && !isSucking) {
                groupRef.current.rotation.y = state.clock.elapsedTime * 0.03;
            }
            return;
        }

        // Phase 1: Cubes TOUR around panels (5s) then SPIN to center (5s) - Total 10 seconds
        if (phase === 1) {
            phaseTimer.current += delta;

            // Waypoints - positions of panels, buttons, logos in the scene
            const waypoints: [number, number, number][] = [
                [-4, 2, 2],   // Left panel
                [4, 2, 2],    // Right panel
                [0, 4, 1],    // Top logo
                [-3, -2, 2],  // Bottom left button
                [3, -2, 2],   // Bottom right button
                [-5, 0, 0],   // Left mascot
                [5, 0, 0],    // Right globe
                [0, -3, 2],   // Bottom center
            ];

            const touringDuration = 8; // First 8 seconds: tour around (slower)
            const spinningDuration = 6; // Next 6 seconds: spin to center

            if (phaseTimer.current < touringDuration) {
                // TOURING PHASE: Each cube visits different waypoints
                const tourProgress = phaseTimer.current / touringDuration;

                cubeRefs.current.forEach((cube, i) => {
                    if (cube) {
                        // Each cube has offset waypoints
                        const waypointIndex = Math.floor(tourProgress * 3) % waypoints.length;
                        const nextWaypointIndex = (waypointIndex + 1) % waypoints.length;
                        const localProgress = (tourProgress * 3) % 1;

                        // Offset each cube to different starting waypoint
                        const offsetIndex = (waypointIndex + i * 2) % waypoints.length;
                        const nextOffsetIndex = (nextWaypointIndex + i * 2) % waypoints.length;

                        const wp1 = waypoints[offsetIndex];
                        const wp2 = waypoints[nextOffsetIndex];

                        // Smooth interpolation between waypoints
                        const eased = localProgress < 0.5
                            ? 2 * localProgress * localProgress
                            : 1 - Math.pow(-2 * localProgress + 2, 2) / 2;

                        const targetX = wp1[0] + (wp2[0] - wp1[0]) * eased;
                        const targetY = wp1[1] + (wp2[1] - wp1[1]) * eased;
                        const targetZ = wp1[2] + (wp2[2] - wp1[2]) * eased;

                        // Smooth movement toward target
                        cube.position.x += (targetX - cube.position.x) * 0.05;
                        cube.position.y += (targetY - cube.position.y) * 0.05;
                        cube.position.z += (targetZ - cube.position.z) * 0.05;

                        // Gentle rotation while touring
                        cube.rotation.x += delta * 1;
                        cube.rotation.y += delta * 1.5;
                    }
                });

                // Push cube positions to context for object avoidance
                const positions: [number, number, number][] = cubeRefs.current
                    .filter((cube): cube is THREE.Mesh => cube !== null)
                    .map(cube => {
                        const worldPos = new THREE.Vector3();
                        cube.getWorldPosition(worldPos);
                        return [worldPos.x, worldPos.y, worldPos.z] as [number, number, number];
                    });
                setCubePositions(positions);
            } else {
                // SPINNING PHASE: Cubes converge to center and spin
                const spinProgress = Math.min(1, (phaseTimer.current - touringDuration) / spinningDuration);

                // Start spinning sound on first frame of spinning phase
                if (phaseTimer.current <= touringDuration + delta * 2) {
                    import("./web3d/effects/SharedEffects").then(m => {
                        m.SoundManager.stopTouringLoop();
                        m.SoundManager.startSpinningLoop();
                    });
                }

                const spinSpeed = 0.5 + spinProgress * spinProgress * 7.5;
                spinRotation.current += delta * spinSpeed;

                const orbitRadius = 2 - spinProgress * 0.5;

                cubeRefs.current.forEach((cube, i) => {
                    if (cube) {
                        const angle = spinRotation.current + (i * Math.PI * 2 / 5);
                        const targetX = cubeCenter[0] + Math.cos(angle) * orbitRadius;
                        const targetY = cubeCenter[1] + Math.sin(angle * 0.5) * 0.5;
                        const targetZ = cubeCenter[2] + Math.sin(angle) * orbitRadius;

                        const smoothFactor = 0.08 + spinProgress * 0.05;
                        cube.position.x += (targetX - cube.position.x) * smoothFactor;
                        cube.position.y += (targetY - cube.position.y) * smoothFactor;
                        cube.position.z += (targetZ - cube.position.z) * smoothFactor;

                        cube.rotation.x += delta * spinSpeed * 0.3;
                        cube.rotation.y += delta * spinSpeed * 0.5;
                        cube.rotation.z += delta * spinSpeed * 0.2;

                        const scaleBoost = 1 + spinProgress * 0.4;
                        cube.scale.setScalar(scaleBoost);
                    }
                });

                glowIntensity.current = spinProgress * 8;
                if (glowRef.current) {
                    glowRef.current.intensity = glowIntensity.current;
                    glowRef.current.distance = 20 + spinProgress * 30;
                }
            }

            // After 14 seconds total (touring+spinning), start suction and move to phase 2
            if (phaseTimer.current >= touringDuration + spinningDuration) {
                startSuction(); // NOW trigger suction
                setPhase(2);
                phaseTimer.current = 0;
                formXProgress.current = 0;
                // Stop spinning, start vortex for suction effect
                import("./web3d/effects/SharedEffects").then(m => {
                    m.SoundManager.stopSpinningLoop();
                    m.SoundManager.startVortexLoop();
                });
            }
            return;
        }

        // Phase 2: Form X formation while suction is happening (2 seconds)
        if (phase === 2) {
            phaseTimer.current += delta;

            // IMMEDIATELY reset group rotation to 0 so cubes form X correctly
            if (groupRef.current) {
                groupRef.current.rotation.y = 0;
                groupRef.current.rotation.x = 0;
                groupRef.current.rotation.z = 0;
            }
            spinRotation.current = 0;

            const xPositions = getXFormationPositions(cubeCenter);
            cubeRefs.current.forEach((cube, i) => {
                if (cube) {
                    const target = xPositions[i];
                    // Set position directly (group rotation is now 0)
                    cube.position.set(target[0], target[1], target[2]);
                    // Stop cube rotation
                    cube.rotation.set(0, 0, 0);
                    cube.scale.setScalar(1.3);
                }
            });

            if (phaseTimer.current >= 2) {
                setPhase(3);
                phaseTimer.current = 0;
            }
            return;
        }

        // Phase 3: Stop, face front, yellow glow (2 seconds)
        if (phase === 3) {
            phaseTimer.current += delta;

            if (groupRef.current) {
                spinRotation.current *= 0.85;
                groupRef.current.rotation.y = spinRotation.current;
                if (Math.abs(spinRotation.current) < 0.05) {
                    groupRef.current.rotation.y = 0;
                    spinRotation.current = 0;
                }
            }

            const xPositions = getXFormationPositions(cubeCenter);
            cubeRefs.current.forEach((cube, i) => {
                if (cube) {
                    const target = xPositions[i];
                    cube.position.set(target[0], target[1], target[2]);
                    cube.rotation.x *= 0.8;
                    cube.rotation.y *= 0.8;
                    cube.rotation.z *= 0.8;
                    cube.scale.setScalar(1.3);
                }
            });

            glowIntensity.current = Math.min(10, glowIntensity.current + delta * 5);
            if (glowRef.current) {
                glowRef.current.intensity = glowIntensity.current;
                glowRef.current.distance = 50;
            }

            if (phaseTimer.current >= 2) {
                setPhase(4);
                phaseTimer.current = 0;
                flashProgress.current = 0;
                setSpawnActive(true); // Activate XLAYER text spawn
                // Stop vortex, start text forming sound
                import("./web3d/effects/SharedEffects").then(m => {
                    m.SoundManager.stopVortexLoop();
                    m.SoundManager.startFormingLoop();
                });
            }
            return;
        }

        // Phase 4: Dancing with yellow flash (5 seconds)
        if (phase === 4) {
            phaseTimer.current += delta;
            flashProgress.current = Math.min(1, phaseTimer.current / 2);

            if (groupRef.current) {
                groupRef.current.rotation.set(0, 0, 0);
            }

            const xPositions = getXFormationPositions(cubeCenter);
            cubeRefs.current.forEach((cube, i) => {
                if (cube) {
                    const target = xPositions[i];
                    cube.position.set(target[0], target[1], target[2]);
                    cube.rotation.set(0, 0, 0);
                    const pulse = 1.3 + Math.sin(phaseTimer.current * 8) * 0.15;
                    cube.scale.setScalar(pulse);
                }
            });

            const explosionIntensity = 10 + flashProgress.current * 50;
            glowIntensity.current = explosionIntensity;
            if (glowRef.current) {
                glowRef.current.intensity = explosionIntensity;
                glowRef.current.distance = 100;
            }

            // After 50 seconds (enough for 4 text phases), reverse animation
            if (phaseTimer.current >= 50) {
                setPhase(5);
                phaseTimer.current = 0;
            }
            return;
        }

        // Phase 5: Reverse - return to normal (2 seconds)
        if (phase === 5) {
            phaseTimer.current += delta;
            const reverseProgress = Math.min(1, phaseTimer.current / 2);

            // Fade out glow
            glowIntensity.current *= 0.9;
            if (glowRef.current) {
                glowRef.current.intensity = glowIntensity.current;
            }

            // Return cubes to original positions
            cubeRefs.current.forEach((cube, i) => {
                if (cube) {
                    const orig = originalPositions[i];
                    const current = cube.position;
                    cube.position.set(
                        current.x + (orig[0] - current.x) * reverseProgress * 0.05,
                        current.y + (orig[1] - current.y) * reverseProgress * 0.05,
                        current.z + (orig[2] - current.z) * reverseProgress * 0.05
                    );
                    cube.scale.setScalar(1 + (1 - reverseProgress) * 0.3);
                }
            });

            if (phaseTimer.current >= 2) {
                // Reset everything
                setPhase(0);
                setSpawnActive(false);
                resetSuction();
                formXProgress.current = 0;
                spinRotation.current = 0;
                glowIntensity.current = 0;
                flashProgress.current = 0;
            }
        }
    });

    // Click handler - start spinning phase first, then trigger suction
    const handleCubeClick = (cubeIndex: number) => {
        if (phase === 0 && !isSucking && !spawnActive) {
            // Collect world positions of all 5 cubes
            const allPositions: [number, number, number][] = [];
            let sumX = 0, sumY = 0, sumZ = 0;

            cubeRefs.current.forEach((cube) => {
                if (cube) {
                    const worldPos = new THREE.Vector3();
                    cube.getWorldPosition(worldPos);
                    allPositions.push([worldPos.x, worldPos.y, worldPos.z]);
                    sumX += worldPos.x;
                    sumY += worldPos.y;
                    sumZ += worldPos.z;
                }
            });

            if (allPositions.length === 0) return;

            // Calculate center of all cubes
            const centerX = sumX / allPositions.length;
            const centerY = sumY / allPositions.length;
            const centerZ = sumZ / allPositions.length;

            const center: [number, number, number] = [centerX, centerY, centerZ + 3];
            setCubeCenter(center);
            setParentCubePositions(allPositions);
            setTextCenter([centerX, centerY, centerZ + 5]);

            // Start touring ambient sound loop
            import("./web3d/effects/SharedEffects").then(m => m.SoundManager.startTouringLoop());

            // Zoom out camera MORE to see full animation
            const focusTarget = createFocusTarget([centerX, centerY, centerZ + 5], 25, 0.3);
            focusOn(focusTarget, 1.5);

            // Start spinning phase - suction will be triggered after spin completes
            setPhase(1); // Phase 1 = spinning
            phaseTimer.current = 0;
            spinRotation.current = 0;

            // Set suction target but DON'T start suction yet
            setSuctionTarget(center);
        }
    };

    const handleSpawnComplete = () => {
        // Don't deactivate spawn during reverse phase
        if (phase === 5) {
            setSpawnActive(false);
        }
    };

    // Target positions for lightning bolts (representing panels, buttons, objects in scene)
    const lightningTargets: [number, number, number][] = [
        [-4, 3, 1],   // Top left panel area
        [4, 3, 1],    // Top right panel area
        [-3, -2, 2],  // Bottom left button area
        [3, -2, 2],   // Bottom right button area
        [0, 4, 0],    // Top center (logo area)
        [-5, 0, -2],  // Left mascot area
        [5, 0, -2],   // Right globe area
        [0, -3, 1],   // Bottom center buttons
    ];

    const color = getColor();
    const emissiveIntensity = phase >= 2 ? 2 : (isSucking ? 1.2 : 0.8);

    return (
        <group ref={groupRef}>

            {originalPositions.map((pos, i) => (
                <Float key={i} speed={phase === 0 ? 0.3 + i * 0.1 : 0} rotationIntensity={phase === 0 ? 1 : 0} floatIntensity={phase === 0 ? 1 : 0}>
                    <mesh
                        ref={(el) => { cubeRefs.current[i] = el; }}
                        position={pos}
                        onClick={() => handleCubeClick(i)}
                    >
                        <boxGeometry args={[0.6, 0.6, 0.6]} />
                        <meshStandardMaterial
                            color={color}
                            wireframe
                            emissive={color}
                            emissiveIntensity={emissiveIntensity}
                        />
                    </mesh>
                </Float>
            ))}

            {/* X LAYER text spawn animation */}
            <XLayerTextSpawner
                parentCubePositions={parentCubePositions}
                textCenter={textCenter}
                isActive={spawnActive}
                onComplete={handleSpawnComplete}
            />

            {/* Green glow light for phases 3-4 */}
            {phase >= 3 && (
                <>
                    <pointLight
                        ref={glowRef}
                        position={[0, 2, 0]}
                        color="#4ade80"
                        intensity={glowIntensity.current}
                        distance={100}
                    />
                    {/* Additional ambient boost for green glow */}
                    <ambientLight color="#4ade80" intensity={phase === 4 ? flashProgress.current * 3 : 0.5} />
                </>
            )}

            {/* Point lights at each cube for edge glow effect in phase 4 */}
            {phase === 4 && (
                <>
                    {getXFormationPositions(cubeCenter).map((pos, i) => (
                        <pointLight
                            key={`edge-${i}`}
                            position={pos}
                            color="#facc15"
                            intensity={glowIntensity.current * 0.5}
                            distance={20 + flashProgress.current * 50}
                        />
                    ))}
                </>
            )}
        </group>
    );
}

function PieChart3D() {
    const groupRef = useRef<THREE.Group>(null);
    const { stats, advancedInfo } = useTokenStatsContext();

    const TOTAL_SUPPLY = 1_000_000_000;


    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
            groupRef.current.position.y = -2 + Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
        }
    });

    // Calculate token distribution percentages
    // Display relative breakdown within circulating supply for better visualization
    const segments = useMemo(() => {
        // Actual data from API
        const circulatingRaw = stats?.circSupply
            ? parseFloat(stats.circSupply.toString().replace(/,/g, ''))
            : 998_000_000;
        const burnedRaw = TOTAL_SUPPLY - circulatingRaw;
        const burnedActual = (burnedRaw / TOTAL_SUPPLY) * 100;

        // Top 20 holders from advancedInfo context
        const top20Actual = advancedInfo?.top10HoldPercent ? parseFloat(advancedInfo.top10HoldPercent) * 2 : 0;

        // For visual display, we show breakdown of CIRCULATING supply
        // Scale values to make all segments visible
        const totalHolders = stats?.holders ? parseInt(stats.holders) : 1000;

        // Visual percentages (scaled for better pie chart display)
        // Burned: actual value but minimum 3% visual
        const burnedVisual = Math.max(burnedActual, 3);
        // Top 20: actual value but minimum 15% visual for visibility
        const top20Visual = Math.max(top20Actual, 15);
        // Liquidity estimate: ~5%
        const liquidityVisual = 5;
        // Others: remaining
        const othersVisual = Math.max(100 - burnedVisual - top20Visual - liquidityVisual, 20);

        // Normalize to 100%
        const total = burnedVisual + top20Visual + liquidityVisual + othersVisual;
        const scale = 100 / total;



        return [
            {
                percent: burnedVisual * scale,
                color: "#ef4444",
                label: `🔥 Burned`
            },
            {
                percent: liquidityVisual * scale,
                color: "#22d3ee",
                label: `💧 Liquidity`
            },
            {
                percent: top20Visual * scale,
                color: "#facc15",
                label: `🐋 Top 20`
            },
            {
                percent: othersVisual * scale,
                color: "#4ade80",
                label: `👥 ${totalHolders.toLocaleString()}+`
            },
        ];
    }, [stats, advancedInfo]);

    let startAngle = 0;

    return (
        <group ref={groupRef} position={[0, -2, 0]}>
            {segments.map((seg, i) => {
                const angle = (seg.percent / 100) * Math.PI * 2;
                const midAngle = startAngle + angle / 2;
                const labelPos: [number, number, number] = [
                    Math.sin(midAngle) * 2.5,
                    0.4,
                    Math.cos(midAngle) * 2.5
                ];
                const mesh = (
                    <group key={i}>
                        <mesh rotation={[0, startAngle, 0]}>
                            <cylinderGeometry args={[1.8, 1.8, 0.4, 32, 1, false, 0, angle]} />
                            <meshStandardMaterial color={seg.color} emissive={seg.color} emissiveIntensity={0.4} />
                        </mesh>
                        <Text
                            position={labelPos}
                            fontSize={0.22}
                            color={seg.color}
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.012}
                            outlineColor="#000000"
                        >
                            {seg.label}
                        </Text>
                    </group>
                );
                startAngle += angle;
                return mesh;
            })}
            <mesh>
                <cylinderGeometry args={[0.8, 0.8, 0.45, 32]} />
                <meshStandardMaterial color="#050510" />
            </mesh>
        </group>
    );
}

function BanmaoCharacter() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.35) * 0.2;
        }
    });

    return (
        <group ref={groupRef} position={[0, -0.5, 0]}>
            <Billboard>
                <Html transform distanceFactor={5} center>
                    <img
                        src="/branding/animated-icon.gif"
                        alt="Banmao"
                        style={{
                            width: '260px',
                            height: 'auto',
                            filter: 'drop-shadow(0 0 40px rgba(250, 204, 21, 0.7))',
                            pointerEvents: 'none',
                        }}
                    />
                </Html>
            </Billboard>
        </group>
    );
}


/* ===================== RESPONSIVE CAMERA ===================== */

function ResponsiveCamera() {
    const { camera, size } = useThree();
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Only set initial position once on mount
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const isMobile = size.width < 768;
        const isPortrait = size.height > size.width;

        if (isMobile && isPortrait) {
            // Mobile portrait: slightly zoomed out for better overview
            camera.position.set(0, 1, 16);
            (camera as THREE.PerspectiveCamera).fov = 60;
        } else if (isMobile) {
            // Mobile landscape
            camera.position.set(0, 2, 14);
            (camera as THREE.PerspectiveCamera).fov = 55;
        } else {
            // Desktop
            camera.position.set(0, 2, 13);
            (camera as THREE.PerspectiveCamera).fov = 55;
        }

        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }, [camera, size]);

    return null;
}

/* ===================== MAIN SCENE ===================== */

function Scene() {
    const { lang, setLang, t } = useTranslation();
    const { startSuction } = useSuction();

    // Use centralized responsive layout system
    const { layout, isMobile, isLaptop, isPortrait } = useResponsiveLayout();

    return (
        <>
            {/* Camera is handled by CustomCameraController wrapper */}

            {/* Lighting */}
            <ambientLight intensity={0.15} />
            <pointLight position={[10, 10, 10]} color="#00f2ff" intensity={2} />
            <pointLight position={[-10, 5, -10]} color="#a855f7" intensity={1.5} />
            <spotLight position={[0, 15, 5]} angle={0.5} penumbra={1} color="#facc15" intensity={2} />

            {/* Environment */}
            <SpaceBackground />
            {layout.showFloatingCubes && <FloatingCubes />}

            {/* Premium Effects - responsive counts */}
            <FloatingParticles count={layout.particleCount} spread={35} size={0.04} />
            <GlowingOrbs count={layout.orbCount} spread={30} />

            {/* Dynamic scene elements - wrapped for suction animation */}
            <SuctionableGroup position={[layout.tokenChart.x, layout.tokenChart.y, layout.tokenChart.z]} delay={0.05}>
                <HologramPlatform />
                <TokenDistributionChart3D
                    position={[layout.tokenChart.x, layout.tokenChart.y, layout.tokenChart.z]}
                    size={isMobile ? 1.2 : 1.8}
                    translations={{
                        tokenDistribution: t("tokenDistribution"),
                        circulating: t("circulating"),
                        burned: t("burned"),
                        totalSupply: t("totalSupply"),
                    }}
                />
            </SuctionableGroup>

            {/* Animated Mascot - responsive size */}
            <SuctionableGroup position={[layout.mascot.x, layout.mascot.y, layout.mascot.z]} delay={0.1}>
                <AnimatedMascot
                    position={[layout.mascot.x, layout.mascot.y, layout.mascot.z]}
                    size={layout.mascotScale}
                />
            </SuctionableGroup>

            {/* Rotating Token Coin - conditional */}
            {layout.showTokenCoin && (
                <SuctionableGroup position={[layout.tokenCoin.x, layout.tokenCoin.y, layout.tokenCoin.z]} delay={0.15}>
                    <TokenCoin3D
                        position={[layout.tokenCoin.x, layout.tokenCoin.y, layout.tokenCoin.z]}
                        size={isMobile ? 0.7 : 1.1}
                    />
                </SuctionableGroup>
            )}

            {/* Community Links Hub - hidden on mobile portrait */}
            {layout.showCommunityHub && (
                <SuctionableGroup position={[layout.communityHub.x, layout.communityHub.y, layout.communityHub.z]} delay={0.2}>
                    <CommunityLinksHub3D
                        position={[layout.communityHub.x, layout.communityHub.y, layout.communityHub.z]}
                        size={isMobile ? 0.9 : 1.4}
                        translations={{
                            community: t("community"),
                            joinUs: t("joinUs"),
                        }}
                    />
                </SuctionableGroup>
            )}


            {/* Dancing Logo - below piechart - SUCTIONABLE */}
            <SuctionableGroup position={[layout.dancingLogo.x, layout.dancingLogo.y, layout.dancingLogo.z]} delay={0.25}>
                <DancingLogo3D
                    position={[layout.dancingLogo.x, layout.dancingLogo.y, layout.dancingLogo.z]}
                    scale={isMobile ? 0.65 : 1}
                />
            </SuctionableGroup>

            {/* Swimming Whale - upper right area near OKX logo */}
            <SwimmingWhale3D
                center={isMobile ? [3, 3, 0] : [5, 1.5, 0]}
                scale={isMobile ? 3 : 4}
                speed={0.4}
                swimRadius={isMobile ? 2.5 : 3.5}
                verticalRange={isMobile ? 0.8 : 1.2}
            />

            <StatusIndicators />

            {/* Black Hole - Data Reset - NOT wrapped in SuctionableGroup */}
            <BlackHole3D
                position={[layout.blackHole.x, layout.blackHole.y, layout.blackHole.z]}
                size={isMobile ? 0.6 : 0.9}
                onSuctionStart={startSuction}
                translations={{
                    title: t("dataVoid"),
                    warning: t("dataVoidWarning"),
                    confirm: t("dataVoidConfirm"),
                    cancel: t("dataVoidCancel"),
                    cleared: t("dataVoidCleared"),
                }}
            />

            {/* OKX Logo - conditional - SUCTIONABLE */}
            {layout.showOKXLogo && (
                <SuctionableGroup position={[layout.okxLogo.x, layout.okxLogo.y, layout.okxLogo.z]} delay={0.35}>
                    <OKXLogo3D position={[layout.okxLogo.x, layout.okxLogo.y, layout.okxLogo.z]} />
                </SuctionableGroup>
            )}

            {/* Info Panels - Samsung DeX Style - SUCTIONABLE */}
            <SuctionableGroup position={[layout.leftPanel.x, layout.leftPanel.y, layout.leftPanel.z]} delay={0.4}>
                <TokenStatsPanel
                    position={[layout.leftPanel.x, layout.leftPanel.y, layout.leftPanel.z]}
                    translations={{
                        tokenStats: t("tokenStats"),
                        totalSupply: t("totalSupply"),
                        circulating: t("circulating"),
                        burned: t("burned"),
                        holders: t("holders"),
                        marketCap: t("marketCap"),
                        change24h: t("change24h"),
                        liquidity: t("liquidity"),
                        volume24h: t("volume24h"),
                        transactions24h: t("transactions24h"),
                        totalTradeVolume: t("totalTradeVolume"),
                    }}
                />
            </SuctionableGroup>

            <SuctionableGroup position={[layout.rightPanel.x, layout.rightPanel.y, layout.rightPanel.z]} delay={0.45}>
                <PriceFeedPanel
                    position={[layout.rightPanel.x, layout.rightPanel.y, layout.rightPanel.z]}
                    translations={{
                        priceFeed: t("priceFeed"),
                        network: t("network"),
                        price: t("price"),
                        token: t("token"),
                        time: t("time"),
                    }}
                />
            </SuctionableGroup>

            {/* Token Info Panel - SUCTIONABLE */}
            <SuctionableGroup position={[layout.tokenInfo.x, layout.tokenInfo.y, layout.tokenInfo.z]} delay={0.47}>
                <TokenInfoPanel3D
                    position={[layout.tokenInfo.x, layout.tokenInfo.y, layout.tokenInfo.z]}
                    translations={{
                        tokenInfoTitle: t("tokenInfoTitle"),
                        tokenInfoDesc: t("tokenInfoDesc"),
                    }}
                />
            </SuctionableGroup>

            {/* Burn Tracker Panel - SUCTIONABLE like other panels */}
            <SuctionableGroup position={[layout.burnPanel.x, layout.burnPanel.y, layout.burnPanel.z]} delay={0.48}>
                <BurnTrackerPanel3D
                    position={[layout.burnPanel.x, layout.burnPanel.y, layout.burnPanel.z]}
                    translations={{
                        totalBurned: t("totalBurned"),
                        burnHistory: t("burnHistory"),
                        burnDescription: t("burnDescription"),
                        burnButton: t("burnButton"),
                    }}
                />
            </SuctionableGroup>

            {/* GameFi Button - left of center - SUCTIONABLE */}
            <SuctionableGroup position={[layout.gamefiMenuX, layout.buttonsY, layout.buttonsZ]} delay={0.5}>
                <GameFiMenu
                    position={[layout.gamefiMenuX, layout.buttonsY, layout.buttonsZ]}
                />
            </SuctionableGroup>

            {/* Staking Button - right of center - SUCTIONABLE */}
            <SuctionableGroup position={[layout.stakingMenuX, layout.buttonsY, layout.buttonsZ]} delay={0.55}>
                <StakingMenu
                    position={[layout.stakingMenuX, layout.buttonsY, layout.buttonsZ]}
                />
            </SuctionableGroup>

            {/* Collection Button - centered below GameFi/DeFi - SUCTIONABLE */}
            <SuctionableGroup position={[0, layout.buttonsY + layout.collectionMenuY, layout.buttonsZ]} delay={0.57}>
                <CollectionMenu
                    position={[0, layout.buttonsY + layout.collectionMenuY, layout.buttonsZ]}
                    label={t("collection")}
                />
            </SuctionableGroup>

            {/* Settings Panel - position based on layout - SUCTIONABLE */}
            <SuctionableGroup position={[layout.settingsPanel.x, layout.settingsPanel.y, layout.settingsPanel.z]} delay={0.6}>
                <DexSettingsPanel3D
                    id="settings-panel"
                    position={[layout.settingsPanel.x, layout.settingsPanel.y, layout.settingsPanel.z]}
                    lang={lang}
                    setLang={setLang}
                    t={t}
                />
            </SuctionableGroup>

            {/* Dock for minimized windows - SUCTIONABLE */}
            <SuctionableGroup position={[0, -3.5, 0]} delay={0.65}>
                <DexDock3D
                    translations={{
                        minimizedApps: t("minimizedApps"),
                        clickToRestore: t("clickToRestore"),
                        appsMinimized: t("appsMinimized"),
                    }}
                />
            </SuctionableGroup>


        </>
    );
}

/* ===================== MAIN PAGE ===================== */

export default function BanmaoWebsite() {
    const [isClient, setIsClient] = useState(false);
    const [lang, setLangState] = useState<Language>("en");

    // Wrapper để lưu ngôn ngữ vào localStorage khi thay đổi
    const setLang = useCallback((newLang: Language) => {
        setLangState(newLang);
        if (typeof window !== "undefined") {
            localStorage.setItem("banmao_language", newLang);
        }
    }, []);

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== "undefined") {
            registerServiceWorker();
            initInstallPrompt();

            // Priority: 1. localStorage, 2. browser language
            const savedLang = localStorage.getItem("banmao_language") as Language | null;
            if (savedLang && ["en", "vi", "zh", "ko", "ru", "id"].includes(savedLang)) {
                setLangState(savedLang);
            } else {
                // Auto-detect browser language
                const browserLang = getBrowserLanguage();
                setLangState(browserLang);
                // Save detected language to localStorage
                localStorage.setItem("banmao_language", browserLang);
            }

            // Reset UI scale and theme when landing page loads (in case coming from game page)
            // This ensures game page theme doesn't bleed into landing page
            document.body.removeAttribute("data-theme");
            document.body.removeAttribute("data-ui-scale");
            document.body.style.zoom = "";
            document.body.style.minHeight = "";
            document.body.style.minWidth = "";
        }
    }, []);

    // Translation function
    const t = (key: string): string => {
        return translations[lang][key] || translations.en[key] || key;
    };

    return (
        <SoundManagerProvider>
            <LanguageContext.Provider value={{ lang, setLang, t }}>
                <div className="scene-3d-full">
                    {isClient && (
                        <Canvas
                            camera={{ position: [0, 2, 12], fov: 50 }}
                            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                            dpr={[1, 1.5]}
                            style={{ width: '100%', height: '100%', display: 'block' }}
                        >
                            <Web3DThemeProvider>
                                <SuctionProvider blackHolePosition={[-7, 4.5, 0]}>
                                    <TokenStatsProvider>
                                        <DexWindowProvider>
                                            <CustomCameraController>
                                                <Suspense fallback={null}>
                                                    <Scene />
                                                </Suspense>
                                            </CustomCameraController>
                                        </DexWindowProvider>
                                    </TokenStatsProvider>
                                </SuctionProvider>
                            </Web3DThemeProvider>
                        </Canvas>
                    )}

                    <div className="scanlines" />

                    {/* PWA Components */}
                    <OfflineIndicator position="top" />
                    <PWAInstallBanner />
                    <SplashScreen minDisplayTime={2000} />
                </div>
            </LanguageContext.Provider>
        </SoundManagerProvider>
    );
}
