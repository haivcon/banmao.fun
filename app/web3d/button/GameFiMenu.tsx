"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedPlane } from "../components/RoundedPlane";
import { useCustomCamera, createFocusTarget } from "../contexts";
import { SoundManager, easeOutElastic } from "../effects/SharedEffects";

interface GameFiMenuProps {
    position: [number, number, number];
}

export function GameFiMenu({ position }: GameFiMenuProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);
    const [showRipple, setShowRipple] = React.useState(false);
    const { focusOn } = useCustomCamera();

    // Animation states
    const spawnProgress = useRef(0);
    const hoverScale = useRef(1);
    const pressScale = useRef(1);
    const glowIntensity = useRef(0.15);
    const borderPulse = useRef(0);
    const wasHovered = useRef(false);
    const rippleProgress = useRef(0);

    // Increased button size for better mobile visibility
    const btnWidth = 2.2;  // Increased from 1.8
    const btnHeight = 0.55; // Increased from 0.42
    const goldColor = '#facc15';
    const hoverGold = '#fef08a';
    const glowCyan = '#00f2ff';

    // Initialize sound
    useEffect(() => {
        SoundManager.init();
    }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        // Spawn animation
        if (spawnProgress.current < 1) {
            spawnProgress.current = Math.min(spawnProgress.current + delta * 2, 1);
            const scale = easeOutElastic(spawnProgress.current);
            groupRef.current.scale.setScalar(scale);
            return;
        }

        // Hover scale animation
        const targetHoverScale = isHovered ? 1.08 : 1;
        hoverScale.current += (targetHoverScale - hoverScale.current) * 0.12;

        // Press scale animation
        const targetPressScale = isPressed ? 0.92 : 1;
        pressScale.current += (targetPressScale - pressScale.current) * 0.2;

        // Combined scale
        groupRef.current.scale.setScalar(hoverScale.current * pressScale.current);

        // Glow intensity pulse
        const targetGlow = isHovered ? 0.5 + Math.sin(time * 4) * 0.15 : 0.15;
        glowIntensity.current += (targetGlow - glowIntensity.current) * 0.1;

        // Border pulse animation
        borderPulse.current = (Math.sin(time * 3) + 1) / 2;

        // Ripple animation
        if (showRipple) {
            rippleProgress.current += delta * 3;
            if (rippleProgress.current >= 1) {
                setShowRipple(false);
                rippleProgress.current = 0;
            }
        }

        // Hover sound
        if (isHovered && !wasHovered.current) {
            SoundManager.playHover();
        }
        wasHovered.current = isHovered;
    });

    const handleClick = useCallback(() => {
        const focusTarget = createFocusTarget(position, 3, 0.5);
        focusOn(focusTarget, 0.6);

        // Press effect
        setIsPressed(true);
        setShowRipple(true);
        rippleProgress.current = 0;
        SoundManager.playClick();

        setTimeout(() => setIsPressed(false), 150);
    }, [position, focusOn]);

    // Navigate to GameFi Hub page
    const handleButtonClick = useCallback(() => {
        SoundManager.playClick();
        setIsPressed(true);
        setShowRipple(true);
        rippleProgress.current = 0;
        setTimeout(() => {
            setIsPressed(false);
            // Navigate to GameFi Hub
            window.location.href = '/gamefi';
        }, 150);
    }, []);

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
                {/* Animated outer glow ring */}
                <RoundedPlane
                    width={btnWidth + 0.2}
                    height={btnHeight + 0.2}
                    radius={btnHeight / 2 + 0.1}
                    position={[0, 0, -0.06]}
                >
                    <meshBasicMaterial
                        color={isHovered ? hoverGold : glowCyan}
                        transparent
                        opacity={glowIntensity.current * 0.6}
                        side={THREE.DoubleSide}
                    />
                </RoundedPlane>

                {/* Pulsing neon border */}
                <RoundedPlane
                    width={btnWidth + 0.12}
                    height={btnHeight + 0.12}
                    radius={btnHeight / 2 + 0.06}
                    position={[0, 0, -0.04]}
                >
                    <meshBasicMaterial
                        color={isHovered ? hoverGold : glowCyan}
                        transparent
                        opacity={0.2 + borderPulse.current * 0.3}
                        side={THREE.DoubleSide}
                    />
                </RoundedPlane>

                {/* Inner glow ring */}
                <RoundedPlane
                    width={btnWidth + 0.05}
                    height={btnHeight + 0.05}
                    radius={btnHeight / 2 + 0.025}
                    position={[0, 0, -0.02]}
                >
                    <meshBasicMaterial
                        color={goldColor}
                        transparent
                        opacity={isHovered ? 0.5 : 0.25}
                        side={THREE.DoubleSide}
                    />
                </RoundedPlane>

                {/* Main button glass */}
                <RoundedPlane
                    width={btnWidth}
                    height={btnHeight}
                    radius={btnHeight / 2}
                    position={[0, 0, -0.01]}
                >
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={isHovered ? 0.3 : 0.18}
                        side={THREE.DoubleSide}
                    />
                </RoundedPlane>

                {/* Button background */}
                <RoundedPlane
                    width={btnWidth - 0.02}
                    height={btnHeight - 0.02}
                    radius={(btnHeight - 0.02) / 2}
                    position={[0, 0, 0]}
                >
                    <meshBasicMaterial
                        color="#0a0a1a"
                        transparent
                        opacity={0.4}
                        side={THREE.DoubleSide}
                    />
                </RoundedPlane>

                {/* Click ripple effect */}
                {showRipple && (
                    <RoundedPlane
                        width={(btnWidth + 0.3) * (1 + rippleProgress.current)}
                        height={(btnHeight + 0.3) * (1 + rippleProgress.current)}
                        radius={(btnHeight / 2 + 0.15) * (1 + rippleProgress.current)}
                        position={[0, 0, -0.05]}
                    >
                        <meshBasicMaterial
                            color={goldColor}
                            transparent
                            opacity={(1 - rippleProgress.current) * 0.4}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>
                )}

                {/* Sparkle particles when hovered */}
                {isHovered && (
                    <HoverSparkles width={btnWidth} height={btnHeight} color={goldColor} />
                )}

                {/* Rotating X sparkles when idle (not hovered) */}
                {!isHovered && (
                    <>
                        <IdleSparklesX width={btnWidth} height={btnHeight} />
                        <BorderOrbitSparkles width={btnWidth} height={btnHeight} />
                    </>
                )}

                <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'none' }} distanceFactor={8}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
                        transition: 'transform 0.1s ease'
                    }}>
                        <span style={{
                            fontSize: '24px',
                            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))',
                            animation: isHovered ? 'bounce 0.5s ease infinite' : 'none',
                        }}>🎮</span>
                        <span style={{
                            fontSize: '22px',
                            color: isHovered ? hoverGold : goldColor,
                            fontFamily: 'Space Mono, monospace',
                            fontWeight: 'bold',
                            textShadow: `1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 ${isHovered ? '12px' : '8px'} rgba(250,204,21,0.5)`,
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s ease',
                        }}>
                            GameFi →
                        </span>
                    </div>
                </Html>

                <Html center distanceFactor={8}>
                    <div
                        onMouseEnter={handleHoverEnter}
                        onMouseLeave={handleHoverLeave}
                        onClick={handleButtonClick}
                        style={{
                            width: '160px',
                            height: '42px',
                            cursor: 'pointer',
                            borderRadius: '21px',
                        }}
                    />
                </Html>
            </Billboard>
        </group>
    );
}

// Sparkle particles component
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

            // Orbit around button
            const rx = (width / 2 + 0.15) * Math.cos(t);
            const ry = (height / 2 + 0.1) * Math.sin(t * 0.7);

            mesh.position.x = rx;
            mesh.position.y = ry;
            mesh.position.z = 0.02;

            // Pulse scale
            const scale = 0.03 + Math.sin(t * 3) * 0.015;
            mesh.scale.setScalar(scale);
        });
    });

    return (
        <group ref={sparklesRef}>
            {Array.from({ length: count }).map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[1, 8, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} />
                </mesh>
            ))}
        </group>
    );
}

// Idle sparkles - Rotating X pattern when button is at rest
function IdleSparklesX({ width, height }: { width: number; height: number }) {
    const group1Ref = useRef<THREE.Group>(null);
    const group2Ref = useRef<THREE.Group>(null);
    const sparkleCount = 8;

    // Sparkle colors - cyan/gold/white mix
    const colors = ['#00f2ff', '#facc15', '#ffffff', '#00f2ff', '#facc15', '#ffffff', '#00f2ff', '#facc15'];

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        // Rotate the two diagonal lines in opposite directions
        if (group1Ref.current) {
            group1Ref.current.rotation.z = time * 0.5;
        }
        if (group2Ref.current) {
            group2Ref.current.rotation.z = -time * 0.5;
        }

        // Animate individual sparkles
        [group1Ref, group2Ref].forEach((groupRef, groupIndex) => {
            if (!groupRef.current) return;

            groupRef.current.children.forEach((child, i) => {
                const mesh = child as THREE.Mesh;
                const t = time * 3 + i * 0.5;

                // Twinkle effect - varying opacity and scale
                const twinkle = 0.5 + Math.sin(t + groupIndex * Math.PI) * 0.5;
                const scale = 0.02 + Math.sin(t * 2 + i) * 0.01;
                mesh.scale.setScalar(scale);

                // Update material opacity for twinkle
                const mat = mesh.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.4 + twinkle * 0.4;
            });
        });
    });

    // Calculate positions along diagonal lines
    const getDiagonalPositions = (diagonal: 1 | 2) => {
        const positions: [number, number, number][] = [];
        const extent = Math.max(width, height) * 0.6;

        for (let i = 0; i < sparkleCount; i++) {
            const t = (i / (sparkleCount - 1)) * 2 - 1; // -1 to 1
            const x = t * extent;
            const y = diagonal === 1 ? t * extent * 0.4 : -t * extent * 0.4;
            positions.push([x, y, 0.03]);
        }
        return positions;
    };

    const diag1Positions = getDiagonalPositions(1);
    const diag2Positions = getDiagonalPositions(2);

    return (
        <>
            {/* First diagonal - rotates clockwise */}
            <group ref={group1Ref}>
                {diag1Positions.map((pos, i) => (
                    <mesh key={`d1-${i}`} position={pos}>
                        <sphereGeometry args={[1, 6, 6]} />
                        <meshBasicMaterial
                            color={colors[i % colors.length]}
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                ))}
            </group>

            {/* Second diagonal - rotates counter-clockwise */}
            <group ref={group2Ref}>
                {diag2Positions.map((pos, i) => (
                    <mesh key={`d2-${i}`} position={pos}>
                        <sphereGeometry args={[1, 6, 6]} />
                        <meshBasicMaterial
                            color={colors[(i + 4) % colors.length]}
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                ))}
            </group>
        </>
    );
}

// Border orbit sparkles - sparkles running along the button edge
function BorderOrbitSparkles({ width, height }: { width: number; height: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const sparkleCount = 6;

    // Sparkle colors - mix of cyan, gold, and white for variety
    const colors = ['#00f2ff', '#facc15', '#ffffff', '#7dd3fc', '#fef08a', '#a5f3fc'];

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        groupRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;

            // Each sparkle has its own offset for spacing
            const offset = (i / sparkleCount) * Math.PI * 2;
            const t = time * 1.2 + offset; // Speed of orbit

            // Elliptical path matching pill button shape
            const rx = width / 2 + 0.08; // Slightly outside button edge
            const ry = height / 2 + 0.08;

            mesh.position.x = rx * Math.cos(t);
            mesh.position.y = ry * Math.sin(t);
            mesh.position.z = 0.04; // In front of button

            // Twinkle effect - varying scale
            const twinkle = 0.5 + Math.sin(time * 4 + i * 0.8) * 0.5;
            const scale = 0.018 + twinkle * 0.012;
            mesh.scale.setScalar(scale);

            // Update material opacity for twinkle
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.5 + twinkle * 0.4;
        });
    });

    return (
        <group ref={groupRef}>
            {Array.from({ length: sparkleCount }).map((_, i) => (
                <mesh key={`border-${i}`}>
                    <sphereGeometry args={[1, 8, 8]} />
                    <meshBasicMaterial
                        color={colors[i % colors.length]}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}
        </group>
    );
}
