"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useCustomCamera, createFocusTarget } from "../../web3d/contexts";

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

export function OKXLogo3D({ position = [0, 0, 0] as [number, number, number] }) {
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
        import("../../web3d/effects/SharedEffects").then(m => m.SoundManager.playOKX());
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
            import("../../web3d/effects/SharedEffects").then(m => m.SoundManager.startMetallicLoop());
        } else if (!isHovered && wasHovered.current) {
            import("../../web3d/effects/SharedEffects").then(m => m.SoundManager.stopMetallicLoop());
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

export default OKXLogo3D;
