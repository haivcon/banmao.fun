"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedPlane } from "../components/RoundedPlane";
import { useCustomCamera, createFocusTarget } from "../contexts";
import { SoundManager, easeOutElastic } from "../effects/SharedEffects";

interface JoinMissionButtonProps {
    position: [number, number, number];
    label?: string;
    href?: string;
}

export function JoinMissionButton({
    position,
    label = "JOIN MISSION",
    href = "https://t.me/banmao_X",
}: JoinMissionButtonProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [showRipple, setShowRipple] = useState(false);
    const { focusOn } = useCustomCamera();

    // Animation states
    const spawnProgress = useRef(0);
    const hoverScale = useRef(1);
    const pressScale = useRef(1);
    const glowIntensity = useRef(0.15);
    const borderPulse = useRef(0);
    const wasHovered = useRef(false);
    const rippleProgress = useRef(0);

    const btnWidth = 1.8;
    const btnHeight = 0.42;
    const cyanColor = '#00f2ff';
    const hoverCyan = '#7df9ff';

    useEffect(() => { SoundManager.init(); }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        // Spawn animation
        if (spawnProgress.current < 1) {
            spawnProgress.current = Math.min(spawnProgress.current + delta * 2, 1);
            groupRef.current.scale.setScalar(easeOutElastic(spawnProgress.current));
            return;
        }

        // Hover scale
        const targetHoverScale = isHovered ? 1.08 : 1;
        hoverScale.current += (targetHoverScale - hoverScale.current) * 0.12;

        // Press scale
        const targetPressScale = isPressed ? 0.92 : 1;
        pressScale.current += (targetPressScale - pressScale.current) * 0.2;

        groupRef.current.scale.setScalar(hoverScale.current * pressScale.current);

        // Glow pulse
        const targetGlow = isHovered ? 0.5 + Math.sin(time * 4) * 0.15 : 0.15;
        glowIntensity.current += (targetGlow - glowIntensity.current) * 0.1;

        borderPulse.current = (Math.sin(time * 3) + 1) / 2;

        // Ripple
        if (showRipple) {
            rippleProgress.current += delta * 3;
            if (rippleProgress.current >= 1) {
                setShowRipple(false);
                rippleProgress.current = 0;
            }
        }

        // Hover sound
        if (isHovered && !wasHovered.current) SoundManager.playHover();
        wasHovered.current = isHovered;
    });

    const handleClick = useCallback(() => {
        focusOn(createFocusTarget(position, 3, 0.5), 0.6);
        setIsPressed(true);
        setShowRipple(true);
        rippleProgress.current = 0;
        SoundManager.playClick();
        setTimeout(() => setIsPressed(false), 150);
    }, [position, focusOn]);

    const handleHoverEnter = useCallback(() => {
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
    }, []);

    const handleHoverLeave = useCallback(() => {
        setIsHovered(false);
        document.body.style.cursor = 'default';
    }, []);

    return (
        <group ref={groupRef} position={position} onClick={handleClick} scale={0.01}>
            <Billboard>
                {/* Outer glow */}
                <RoundedPlane width={btnWidth + 0.2} height={btnHeight + 0.2} radius={btnHeight / 2 + 0.1} position={[0, 0, -0.06]}>
                    <meshBasicMaterial color={cyanColor} transparent opacity={glowIntensity.current * 0.6} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Pulsing border */}
                <RoundedPlane width={btnWidth + 0.12} height={btnHeight + 0.12} radius={btnHeight / 2 + 0.06} position={[0, 0, -0.04]}>
                    <meshBasicMaterial color={isHovered ? hoverCyan : cyanColor} transparent opacity={0.2 + borderPulse.current * 0.3} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Inner glow */}
                <RoundedPlane width={btnWidth + 0.05} height={btnHeight + 0.05} radius={btnHeight / 2 + 0.025} position={[0, 0, -0.02]}>
                    <meshBasicMaterial color={cyanColor} transparent opacity={isHovered ? 0.5 : 0.25} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Main glass */}
                <RoundedPlane width={btnWidth} height={btnHeight} radius={btnHeight / 2} position={[0, 0, -0.01]}>
                    <meshBasicMaterial color="#ffffff" transparent opacity={isHovered ? 0.3 : 0.18} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Background */}
                <RoundedPlane width={btnWidth - 0.02} height={btnHeight - 0.02} radius={(btnHeight - 0.02) / 2} position={[0, 0, 0]}>
                    <meshBasicMaterial color="#0a0a1a" transparent opacity={0.4} side={THREE.DoubleSide} />
                </RoundedPlane>

                {/* Ripple */}
                {showRipple && (
                    <RoundedPlane
                        width={(btnWidth + 0.3) * (1 + rippleProgress.current)}
                        height={(btnHeight + 0.3) * (1 + rippleProgress.current)}
                        radius={(btnHeight / 2 + 0.15) * (1 + rippleProgress.current)}
                        position={[0, 0, -0.05]}
                    >
                        <meshBasicMaterial color={cyanColor} transparent opacity={(1 - rippleProgress.current) * 0.4} side={THREE.DoubleSide} />
                    </RoundedPlane>
                )}

                {/* Sparkles */}
                {isHovered && <HoverSparkles width={btnWidth} height={btnHeight} color={cyanColor} />}

                <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'none' }} distanceFactor={8}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transform: isPressed ? 'scale(0.95)' : 'scale(1)', transition: 'transform 0.1s ease' }}>
                        <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))', animation: isHovered ? 'bounce 0.5s ease infinite' : 'none' }}>🚀</span>
                        <span style={{
                            fontSize: '18px',
                            color: isHovered ? hoverCyan : cyanColor,
                            fontFamily: 'Space Mono, monospace',
                            fontWeight: 'bold',
                            textShadow: `1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 ${isHovered ? '12px' : '8px'} rgba(0,242,255,0.5)`,
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s ease',
                        }}>
                            {label}
                        </span>
                    </div>
                </Html>

                <Html center distanceFactor={8}>
                    <a href={href} target="_blank" rel="noopener noreferrer" onMouseEnter={handleHoverEnter} onMouseLeave={handleHoverLeave}
                        style={{ display: 'block', width: '130px', height: '32px', cursor: 'pointer', borderRadius: '16px' }} />
                </Html>
            </Billboard>
        </group>
    );
}

function HoverSparkles({ width, height, color }: { width: number; height: number; color: string }) {
    const sparklesRef = useRef<THREE.Group>(null);
    const count = 6;

    useFrame((state) => {
        if (!sparklesRef.current) return;
        const time = state.clock.elapsedTime;
        sparklesRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;
            const offset = (i / count) * Math.PI * 2;
            const t = time * 2 + offset;
            mesh.position.x = (width / 2 + 0.15) * Math.cos(t);
            mesh.position.y = (height / 2 + 0.1) * Math.sin(t * 0.7);
            mesh.position.z = 0.02;
            mesh.scale.setScalar(0.03 + Math.sin(t * 3) * 0.015);
        });
    });

    return (
        <group ref={sparklesRef}>
            {Array.from({ length: count }).map((_, i) => (
                <mesh key={i}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color={color} transparent opacity={0.8} /></mesh>
            ))}
        </group>
    );
}
