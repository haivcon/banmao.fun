"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

// Letter patterns for text formation
const LETTER_PATTERNS: { [key: string]: number[][] } = {
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
    '$': [
        [0, 1, 1, 1, 0],
        [1, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 1],
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
};

// Text sequences to display
const TEXT_SEQUENCES = [
    ['X', 'L', 'A', 'Y', 'E', 'R'],
    ['$', 'B', 'A', 'N', 'M', 'A', 'O'],
    ['I', '❤', 'Y', 'O', 'U'],
    ['W', 'E', 'G', 'O', 'M', 'O', 'O', 'N'],
];

// ===================== X LAYER TEXT SPAWNER =====================
export function XLayerTextSpawner({
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
    const [textPhase, setTextPhase] = useState(0); // 0=XLAYER, 1=$BANMAO, 2=I❤YOU, 3=WEGOMOON
    const [isTransitioning, setIsTransitioning] = useState(false);
    const startTime = useRef(0);
    const phaseStartTime = useRef(0);
    const hasCompleted = useRef(false);

    // Generate cube positions based on current text phase
    const cubeData = useMemo(() => {
        const letters = TEXT_SEQUENCES[textPhase] || [];
        // Smaller cubes for longer text
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
            const pattern = LETTER_PATTERNS[letter];
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
    }, [textCenter, parentCubePositions, textPhase]);

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
                    import("../../web3d/effects/SharedEffects").then(m => {
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
                    import("../../web3d/effects/SharedEffects").then(m => {
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
                import("../../web3d/effects/SharedEffects").then(m => m.SoundManager.playScatter());
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

export default XLayerTextSpawner;
