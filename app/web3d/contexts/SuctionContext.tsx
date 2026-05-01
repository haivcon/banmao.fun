// Suction Context - Provides state for suction animation (black hole or floating cubes)
"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface SuctionContextType {
    isSucking: boolean;
    suctionProgress: number; // 0 to 1
    suctionTarget: [number, number, number]; // Dynamic target position
    cubePositions: [number, number, number][]; // Current positions of flying cubes
    startSuction: () => void;
    setSuctionTarget: (position: [number, number, number]) => void;
    setCubePositions: (positions: [number, number, number][]) => void;
    resetSuction: () => void;
    getSuctionOffset: (objectPosition: [number, number, number], delay: number) => [number, number, number];
    getAvoidanceOffset: (objectPosition: [number, number, number]) => [number, number, number];
}

const DEFAULT_TARGET: [number, number, number] = [-7, 4.5, 0]; // Black hole default

const SuctionContext = createContext<SuctionContextType>({
    isSucking: false,
    suctionProgress: 0,
    suctionTarget: DEFAULT_TARGET,
    cubePositions: [],
    startSuction: () => { },
    setSuctionTarget: () => { },
    setCubePositions: () => { },
    resetSuction: () => { },
    getSuctionOffset: () => [0, 0, 0],
    getAvoidanceOffset: () => [0, 0, 0],
});

export function useSuction() {
    return useContext(SuctionContext);
}

interface SuctionProviderProps {
    children: React.ReactNode;
    blackHolePosition?: [number, number, number];
}

export function SuctionProvider({
    children,
    blackHolePosition = DEFAULT_TARGET
}: SuctionProviderProps) {
    const [isSucking, setIsSucking] = useState(false);
    const [suctionProgress, setSuctionProgress] = useState(0);
    const [suctionTarget, setSuctionTargetState] = useState<[number, number, number]>(blackHolePosition);
    const [cubePositions, setCubePositionsState] = useState<[number, number, number][]>([]);
    const animationRef = useRef<number | null>(null);

    const setSuctionTarget = useCallback((position: [number, number, number]) => {
        setSuctionTargetState(position);
    }, []);

    const setCubePositions = useCallback((positions: [number, number, number][]) => {
        setCubePositionsState(positions);
    }, []);

    const resetSuction = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        setIsSucking(false);
        setSuctionProgress(0);
        setSuctionTargetState(blackHolePosition);
    }, [blackHolePosition]);

    const startSuction = useCallback(() => {
        if (isSucking) return;

        setIsSucking(true);
        setSuctionProgress(0);

        const startTime = Date.now();
        const duration = 5000; // 5 seconds for suction with spiral

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Slower easing - gradual spiral acceleration
            const easedProgress = progress * progress;
            setSuctionProgress(easedProgress);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [isSucking]);

    // Calculate offset for an object with SPIRAL VORTEX effect
    const getSuctionOffset = useCallback((
        objectPosition: [number, number, number],
        delay: number = 0
    ): [number, number, number] => {
        if (!isSucking || suctionProgress === 0) return [0, 0, 0];

        // Apply delay - objects start moving at different times for staggered effect
        const delayedProgress = Math.max(0, suctionProgress - delay);
        if (delayedProgress === 0) return [0, 0, 0];

        // Direction toward suction target
        const dx = suctionTarget[0] - objectPosition[0];
        const dy = suctionTarget[1] - objectPosition[1];
        const dz = suctionTarget[2] - objectPosition[2];

        // Calculate distance for spiral intensity
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Spiral rotation angle - increases with progress and distance
        const spiralAngle = delayedProgress * 8 * Math.PI; // 4 full rotations
        const spiralRadius = distance * (1 - delayedProgress) * 0.3;

        // Spiral offset perpendicular to direction
        const spiralX = Math.cos(spiralAngle) * spiralRadius;
        const spiralY = Math.sin(spiralAngle) * spiralRadius * 0.5; // Less vertical spiral

        // Scale factor increases as object gets closer - gradual acceleration
        const scaleFactor = delayedProgress * delayedProgress * 1.2;

        return [
            dx * scaleFactor + spiralX,
            dy * scaleFactor + spiralY,
            dz * scaleFactor
        ];
    }, [isSucking, suctionProgress, suctionTarget]);

    // Calculate avoidance offset - objects move away from nearby cubes
    const getAvoidanceOffset = useCallback((objectPosition: [number, number, number]): [number, number, number] => {
        if (cubePositions.length === 0) return [0, 0, 0];

        let avoidX = 0, avoidY = 0, avoidZ = 0;
        const avoidanceRadius = 3;
        const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;
        const maxAvoidance = 2;

        cubePositions.forEach(cubePos => {
            const dx = objectPosition[0] - cubePos[0];
            const dy = objectPosition[1] - cubePos[1];
            const dz = objectPosition[2] - cubePos[2];
            const distSq = dx * dx + dy * dy + dz * dz;

            // Early exit with squared distance comparison (avoids sqrt)
            if (distSq < avoidanceRadiusSq && distSq > 0.0001) {
                const distance = Math.sqrt(distSq);
                const strength = Math.pow(1 - distance / avoidanceRadius, 2) * maxAvoidance;
                const invDist = 1 / distance;

                avoidX += dx * invDist * strength;
                avoidY += dy * invDist * strength;
                avoidZ += dz * invDist * strength;
            }
        });

        return [avoidX, avoidY, avoidZ];
    }, [cubePositions]);

    return (
        <SuctionContext.Provider value={{
            isSucking,
            suctionProgress,
            suctionTarget,
            cubePositions,
            startSuction,
            setSuctionTarget,
            setCubePositions,
            resetSuction,
            getSuctionOffset,
            getAvoidanceOffset,
        }}>
            {children}
        </SuctionContext.Provider>
    );
}

export default SuctionContext;

