"use client";

import React, { useRef, useEffect, useState, createContext, useContext, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { useDexWindow } from "../../contexts/DexWindowContext";
import { useWeb3DTheme, useCustomCamera, createFocusTarget } from "../contexts";
import { useViewportScale, useHtmlScale } from "../hooks";
import { RoundedPlane } from "../components/RoundedPlane";
import { easeOutElastic } from "../effects/SharedEffects";

// Context to share window scale with children
const WindowScaleContext = createContext<number>(1);
export const useWindowScale = () => useContext(WindowScaleContext);

// Sound types for different panels
type PanelSoundType = 'click' | 'tokenStats' | 'priceFeed' | 'settings' | 'language' | 'install';

interface DexWindow3DProps {
    id: string;
    position: [number, number, number];
    title: string;
    icon: string;
    titleColor?: string; // If not provided, uses theme primary color
    useThemeColor?: boolean; // If true, overrides titleColor with theme color
    children: React.ReactNode;
    width?: number;
    height?: number;
    soundType?: PanelSoundType; // Panel-specific click sound
}

export function DexWindow3D({
    id,
    position,
    title,
    icon,
    titleColor,
    useThemeColor = true, // By default, use theme color
    children,
    width = 3.2,
    height = 2.6,
    soundType = 'click', // Default to generic click
}: DexWindow3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const { registerWindow, getWindowState, minimizeWindow, maximizeWindow, restoreWindow } = useDexWindow();
    const { primaryColor } = useWeb3DTheme();
    const viewportScale = useViewportScale();
    const htmlScale = useHtmlScale();
    const { focusOn } = useCustomCamera();

    // Sound tracking
    const wasHovered = useRef(false);

    // Click handler to focus camera on this panel
    const handlePanelClick = useCallback(() => {
        const focusTarget = createFocusTarget(position, 6, 1);
        focusOn(focusTarget, 1.0);
        // Play panel-specific sound
        import("../effects/SharedEffects").then(m => {
            switch (soundType) {
                case 'tokenStats': m.SoundManager.playTokenStats(); break;
                case 'priceFeed': m.SoundManager.playPriceFeed(); break;
                case 'settings': m.SoundManager.playSettings(); break;
                case 'language': m.SoundManager.playLanguage(); break;
                case 'install': m.SoundManager.playInstall(); break;
                default: m.SoundManager.playClick();
            }
        });
    }, [position, focusOn, soundType]);

    // Animation states
    const [currentScale, setCurrentScale] = useState(1);
    const [targetScale, setTargetScale] = useState(1);
    const [glowIntensity, setGlowIntensity] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<'idle' | 'minimizing' | 'maximizing' | 'restoring'>('idle');
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [isPanelHovered, setIsPanelHovered] = useState(false);

    // Spawn animation state
    const spawnProgress = useRef(0);
    const spawnStarted = useRef(false);
    const spawnStartTime = useRef(0);
    const glowPulsePhase = useRef(0);

    // Use theme color if useThemeColor is true, otherwise use provided titleColor or fallback
    const effectiveColor = useThemeColor ? primaryColor : (titleColor || "#22d3ee");

    const windowState = getWindowState(id);

    // Register window on mount
    useEffect(() => {
        registerWindow(id, title, icon, position);
    }, [id, title, icon, position, registerWindow]);

    // Trigger animations based on window state changes
    useEffect(() => {
        if (windowState === 'minimized') {
            setAnimationPhase('minimizing');
            setTargetScale(0);
            setGlowIntensity(1);
            setIsAnimating(true);
        } else if (windowState === 'open') {
            setAnimationPhase('restoring');
            setTargetScale(1);
            setGlowIntensity(0.8);
            setIsAnimating(true);
        } else if (windowState === 'maximized') {
            // Note: Maximize zoom disabled because Html elements don't scale with 3D transforms
            // User can zoom manually with mouse scroll for same effect
            setAnimationPhase('maximizing');
            setTargetScale(1); // Changed from 2.9 to 1 - Html elements don't scale
            setGlowIntensity(1);
            setIsAnimating(true);
        }
    }, [windowState]);

    // Smooth spring animation using useFrame
    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        // Spawn animation (easeOutElastic bounce in)
        if (!spawnStarted.current) {
            spawnStartTime.current = time;
            spawnStarted.current = true;
        }

        const spawnDuration = 0.8;
        const spawnDelay = position[0] * 0.1 + position[1] * 0.05; // Stagger based on position
        const spawnElapsed = time - spawnStartTime.current - Math.abs(spawnDelay);

        if (spawnProgress.current < 1 && spawnElapsed > 0) {
            spawnProgress.current = Math.min(spawnElapsed / spawnDuration, 1);
        }

        const spawnScale = easeOutElastic(spawnProgress.current);

        // Glow pulse animation
        glowPulsePhase.current = time * 2;
        const pulseGlow = 0.15 + Math.sin(glowPulsePhase.current) * 0.1;

        // Spring interpolation for scale (smooth easing)
        const springStrength = 8;
        const dampening = 0.85;
        const scaleDiff = targetScale - currentScale;

        if (Math.abs(scaleDiff) > 0.001) {
            const newScale = currentScale + scaleDiff * springStrength * delta;
            setCurrentScale(newScale);

            // Add slight bounce effect during animation
            if (animationPhase === 'minimizing') {
                // Spin effect when minimizing
                setRotation(prev => prev + delta * 8);
            } else if (animationPhase === 'maximizing' || animationPhase === 'restoring') {
                // Subtle pulse during restore/maximize
                setRotation(prev => prev * dampening);
            }
        } else if (isAnimating) {
            setCurrentScale(targetScale);
            setIsAnimating(false);
            setAnimationPhase('idle');
            setRotation(0);
        }

        // Fade glow effect (from state changes) + pulse glow
        if (glowIntensity > 0.01) {
            setGlowIntensity(prev => prev * 0.92);
        }

        // Floating animation (when not minimized)
        if (windowState !== 'minimized') {
            const hoverLift = isPanelHovered ? 0.05 : 0;
            groupRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.1 + hoverLift;
        }

        // Apply spawn scale
        const finalScale = currentScale * spawnScale;
        groupRef.current.scale.setScalar(finalScale);

        // Hover sound trigger
        if (isPanelHovered && !wasHovered.current) {
            import("../effects/SharedEffects").then(m => m.SoundManager.playHover());
        }
        wasHovered.current = isPanelHovered;
    });

    // Don't render if minimized and animation complete
    if (windowState === 'minimized' && currentScale < 0.01) {
        return null;
    }

    const titleBarHeight = 0.35;
    const buttonSize = 0.2;
    const buttonSpacing = 0.28;
    const cornerRadius = 0.12; // Rounded corner radius for professional look

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={[0, rotation, 0]}
        >
            {/* Scale wrapper - applies to all content including Billboard */}
            <group scale={[currentScale, currentScale, currentScale]}>
                <Billboard>
                    {/* Invisible hit area - catches all clicks for focus */}
                    <mesh
                        position={[0, 0, 0.1]}
                        onClick={handlePanelClick}
                        onPointerEnter={() => setIsPanelHovered(true)}
                        onPointerLeave={() => setIsPanelHovered(false)}
                    >
                        <planeGeometry args={[width + 0.3, height + titleBarHeight + 0.3]} />
                        <meshBasicMaterial transparent opacity={0} />
                    </mesh>

                    {/* Outer holographic glow */}
                    {glowIntensity > 0.01 && (
                        <RoundedPlane
                            width={width + 0.2}
                            height={height + titleBarHeight + 0.2}
                            radius={cornerRadius + 0.05}
                            position={[0, 0, -0.008]}
                        >
                            <meshBasicMaterial
                                color="#00f2ff"
                                transparent
                                opacity={glowIntensity * 0.3}
                                side={THREE.DoubleSide}
                            />
                        </RoundedPlane>
                    )}

                    {/* Pulsing border glow - always visible, stronger on hover */}
                    <RoundedPlane
                        width={width + 0.08}
                        height={height + titleBarHeight + 0.08}
                        radius={cornerRadius + 0.02}
                        position={[0, 0, -0.004]}
                    >
                        <meshBasicMaterial
                            color={isPanelHovered ? "#facc15" : effectiveColor}
                            transparent
                            opacity={isPanelHovered ? 0.35 : 0.15 + Math.sin(Date.now() * 0.003) * 0.08}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>

                    {/* Main background - transparent white glass - click to focus */}
                    <RoundedPlane
                        width={width}
                        height={height}
                        radius={cornerRadius}
                        position={[0, -titleBarHeight / 2, -0.001]}
                        onPointerEnter={() => setIsPanelHovered(true)}
                        onPointerLeave={() => setIsPanelHovered(false)}
                        onClick={handlePanelClick}
                    >
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={isPanelHovered ? 0.18 : 0.12}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>

                    {/* Inner dark layer for contrast */}
                    <RoundedPlane
                        width={width - 0.04}
                        height={height - 0.04}
                        radius={cornerRadius - 0.02}
                        position={[0, -titleBarHeight / 2, -0.0005]}
                    >
                        <meshBasicMaterial
                            color="#0a0a1a"
                            transparent
                            opacity={0.75}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>

                    {/* Title bar background - transparent theme color */}
                    <RoundedPlane
                        width={width}
                        height={titleBarHeight}
                        radius={cornerRadius * 0.8}
                        position={[0, height / 2, 0]}
                    >
                        <meshBasicMaterial
                            color={primaryColor}
                            transparent
                            opacity={isPanelHovered ? 0.35 : 0.25}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>

                    {/* Title bar inner layer */}
                    <RoundedPlane
                        width={width - 0.04}
                        height={titleBarHeight - 0.02}
                        radius={(cornerRadius - 0.02) * 0.8}
                        position={[0, height / 2, 0.001]}
                    >
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.08}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>


                    {/* Icon with color (using Html for native emoji colors) */}
                    <Html
                        center
                        position={[-width / 2 + 0.2, height / 2, 0.02]}
                        style={{ pointerEvents: 'none' }}
                        distanceFactor={8}
                    >
                        <span style={{
                            fontSize: '18px',
                            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                            transform: `scale(${htmlScale})`,
                            userSelect: 'none',
                            display: 'flex',
                            whiteSpace: 'nowrap',
                            gap: '2px',
                        }}>
                            {icon}
                        </span>
                    </Html>

                    {/* Title text - theme color with black outline */}
                    <Text
                        position={[-width / 2 + 0.42, height / 2, 0.01]}
                        fontSize={0.14}
                        color={primaryColor}
                        anchorX="left"
                        anchorY="middle"
                        outlineWidth={0.012}
                        outlineColor="#000000"
                    >
                        {title}
                    </Text>

                    {/* Window control button - positioned at far right of title bar */}
                    <group position={[width / 2 - 0.2, height / 2, 0.02]}>
                        {/* Close button with hover effect */}
                        <group position={[0, 0, 0]}>
                            <mesh>
                                <circleGeometry args={[buttonSize / 2, 16]} />
                                <meshBasicMaterial
                                    color={hoveredButton === 'close' ? '#fca5a5' : '#ef4444'}
                                    side={THREE.DoubleSide}
                                />
                            </mesh>
                            <Text
                                position={[0, 0, 0.015]}
                                fontSize={0.1}
                                color="#ffffff"
                                anchorX="center"
                                anchorY="middle"
                            >
                                ✕
                            </Text>
                            <Html center distanceFactor={8}>
                                <style>{`
                                    .dex-close-btn {
                                        width: 22px;
                                        height: 22px;
                                        cursor: pointer;
                                        background: linear-gradient(135deg, #ef4444, #dc2626);
                                        border: 1px solid #fca5a5;
                                        border-radius: 50%;
                                        color: #fff;
                                        font-size: 12px;
                                        font-weight: bold;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
                                        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                                    }
                                    .dex-close-btn:hover {
                                        transform: scale(1.2) rotate(90deg);
                                        box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4);
                                        background: linear-gradient(135deg, #f87171, #ef4444);
                                    }
                                `}</style>
                                <button
                                    className="dex-close-btn"
                                    onMouseEnter={() => setHoveredButton('close')}
                                    onMouseLeave={() => setHoveredButton(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        minimizeWindow(id);
                                        import("../effects/SharedEffects").then(m => m.SoundManager.playClose());
                                    }}
                                    title="Close"
                                >✕</button>
                            </Html>
                        </group>
                    </group>

                    {/* Content area - positioned below title bar, wrapped with scale context */}
                    <group position={[0, -titleBarHeight / 2, 0.01]}>
                        <WindowScaleContext.Provider value={currentScale}>
                            {children}
                        </WindowScaleContext.Provider>
                    </group>
                </Billboard>
            </group>
        </group>
    );
}
