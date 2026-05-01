"use client";

import React, { useRef, useMemo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Clone } from "@react-three/drei";
import * as THREE from "three";

// ========== MAIN SWIMMING WHALE COMPONENT ==========
interface SwimmingWhale3DProps {
    /** Center point of the orbit path */
    center?: [number, number, number];
    /** Scale of the whale model */
    scale?: number;
    /** Swimming speed multiplier */
    speed?: number;
    /** Boundary radius for swimming area */
    swimRadius?: number;
    /** Vertical swim range */
    verticalRange?: number;
}

export function SwimmingWhale3D({
    center = [5, 4, 0],
    scale = 15,
    speed = 0.4,
    swimRadius = 3.5,
    verticalRange = 1.2,
}: SwimmingWhale3DProps) {
    const outerRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const prevAngle = useRef(0);

    // Load the GLB model
    const { scene } = useGLTF("/models/banmao-whale.glb");

    const onPointerOver = useCallback(() => setHovered(true), []);
    const onPointerOut = useCallback(() => setHovered(false), []);

    // Animation loop
    useFrame((state) => {
        if (!outerRef.current) return;

        const t = state.clock.elapsedTime * speed;
        const angle = t;

        // Elliptical orbit around center point
        const x = center[0] + Math.sin(angle) * swimRadius;
        const z = center[2] + Math.cos(angle) * (swimRadius * 0.4);
        const y = center[1] + Math.sin(angle * 1.7) * verticalRange;

        outerRef.current.position.set(x, y, z);

        // Face direction of travel
        const dx = Math.cos(angle) * swimRadius;
        const dz = -Math.sin(angle) * (swimRadius * 0.4);
        const targetYaw = Math.atan2(dx, dz);
        outerRef.current.rotation.y = THREE.MathUtils.lerp(
            outerRef.current.rotation.y,
            targetYaw,
            0.08
        );

        // Pitch
        const dy = Math.cos(angle * 1.7) * verticalRange * 1.7 * speed;
        const hSpd = Math.sqrt(dx * dx + dz * dz) * speed;
        if (hSpd > 0.01) {
            const targetPitch = Math.atan2(-dy * speed, hSpd) * 0.3;
            outerRef.current.rotation.x = THREE.MathUtils.lerp(
                outerRef.current.rotation.x,
                targetPitch,
                0.05
            );
        }

        // Bank roll
        const angleDelta = angle - prevAngle.current;
        outerRef.current.rotation.z = THREE.MathUtils.lerp(
            outerRef.current.rotation.z,
            -angleDelta * 2,
            0.04
        );
        prevAngle.current = angle;
    });

    const glow = hovered ? 16 : 8;

    return (
        <group ref={outerRef} position={center}>
            {/* Single combined light traveling with the whale */}
            <pointLight color="#e0f7ff" intensity={glow} distance={22} decay={2} position={[0, 1, 3]} />

            {/* Whale model — use drei Clone for proper skeleton/skinned mesh handling */}
            <group
                scale={scale}
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
            >
                <Clone object={scene} />
            </group>

        </group>
    );
}

// Preload
useGLTF.preload("/models/banmao-whale.glb");
