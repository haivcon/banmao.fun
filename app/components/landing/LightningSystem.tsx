"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ===================== LIGHTNING BOLT =====================
// Realistic electric beam with branching and glow
export function LightningBolt({
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
export function LightningSystem({
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

export default LightningSystem;
