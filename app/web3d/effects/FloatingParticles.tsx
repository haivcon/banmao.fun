"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeb3DTheme } from "../contexts";

interface FloatingParticlesProps {
    count?: number;
    spread?: number;
    size?: number;
    speed?: number;
}

export function FloatingParticles({
    count = 200,
    spread = 30,
    size = 0.05,
    speed = 0.1,
}: FloatingParticlesProps) {
    const pointsRef = useRef<THREE.Points>(null);
    const { primaryColor, theme } = useWeb3DTheme();

    // Generate random particle positions
    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const speeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Spread particles in a sphere around the scene
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

            // Random scale for each particle
            scales[i] = Math.random() * 0.5 + 0.5;

            // Random speed for each particle
            speeds[i] = Math.random() * 0.5 + 0.5;
        }

        return { positions, scales, speeds };
    }, [count, spread]);

    // Animate particles (throttled to every other frame for performance)
    const frameCount = useRef(0);
    const localTime = useRef(0);
    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        // Clamp delta to prevent huge jumps on tab resume
        localTime.current += Math.min(delta, 0.1);
        frameCount.current++;

        // Only update positions every other frame — motion is subtle enough
        if (frameCount.current % 2 === 0) {
            const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
            const time = localTime.current * speed;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const particleSpeed = particles.speeds[i];

                // Gentle floating motion
                positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.002 * particleSpeed;

                // Subtle horizontal drift
                positions[i3] += Math.cos(time * 0.5 + i * 0.2) * 0.001 * particleSpeed;
                positions[i3 + 2] += Math.sin(time * 0.3 + i * 0.3) * 0.001 * particleSpeed;

                // Wrap particles that go too far
                if (positions[i3 + 1] > spread / 2) positions[i3 + 1] = -spread / 2;
                if (positions[i3 + 1] < -spread / 2) positions[i3 + 1] = spread / 2;
            }

            pointsRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Slow rotation of entire particle system
        pointsRef.current.rotation.y = localTime.current * speed * 0.02;
    });

    // Theme-aware particle color
    const particleColor = useMemo(() => {
        return theme === "gold" ? "#ffd700" : "#00f3ff";
    }, [theme]);

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particles.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={size}
                color={particleColor}
                transparent
                opacity={0.6}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Secondary layer of larger, slower particles for depth
export function GlowingOrbs({
    count = 15,
    spread = 25,
}: {
    count?: number;
    spread?: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const { theme } = useWeb3DTheme();

    const orbs = useMemo(() => {
        return Array.from({ length: count }, (_, i) => ({
            position: [
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
            ] as [number, number, number],
            scale: Math.random() * 0.3 + 0.1,
            speed: Math.random() * 0.5 + 0.3,
            offset: Math.random() * Math.PI * 2,
        }));
    }, [count, spread]);

    const localTime = useRef(0);
    useFrame((state, delta) => {
        if (!groupRef.current) return;
        localTime.current += Math.min(delta, 0.1);
        const time = localTime.current;

        groupRef.current.children.forEach((child, i) => {
            const orb = orbs[i];
            child.position.y = orb.position[1] + Math.sin(time * orb.speed + orb.offset) * 0.5;
            child.position.x = orb.position[0] + Math.cos(time * orb.speed * 0.5 + orb.offset) * 0.3;
        });
    });

    const orbColor = theme === "gold" ? "#ffb300" : "#bc13fe";

    return (
        <group ref={groupRef}>
            {orbs.map((orb, i) => (
                <mesh key={i} position={orb.position}>
                    <sphereGeometry args={[orb.scale, 16, 16]} />
                    <meshBasicMaterial
                        color={orbColor}
                        transparent
                        opacity={0.15}
                    />
                </mesh>
            ))}
        </group>
    );
}
