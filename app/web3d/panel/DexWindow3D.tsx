"use client";

import React, { useRef, useEffect, useState, createContext, useContext, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { useDexWindow } from "../../contexts/DexWindowContext";
import { useWeb3DTheme, useCustomCamera, createFocusTarget } from "../contexts";
import { useViewportScale, useHtmlScale } from "../hooks";
import { RoundedPlane } from "../components/RoundedPlane";
import { SoundManager, easeOutElastic } from "../effects/SharedEffects";

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
    const scaleWrapperRef = useRef<THREE.Group>(null);
    const outerGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const innerGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const mainBgMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const titleBarMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

    const { registerWindow, getWindowState, minimizeWindow, maximizeWindow, restoreWindow } = useDexWindow();
    const { primaryColor } = useWeb3DTheme();
    const viewportScale = useViewportScale();
    const htmlScale = useHtmlScale();
    const { focusOn } = useCustomCamera();

    // Sound tracking
    const wasHovered = useRef(false);

    // Click handler to focus camera on this panel
    const handlePanelClick = useCallback((e?: any) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const focusTarget = createFocusTarget(position, 6, 1);
        focusOn(focusTarget, 1.0);
        // Play panel-specific sound
        switch (soundType) {
            case 'tokenStats': SoundManager.playTokenStats(); break;
            case 'priceFeed': SoundManager.playPriceFeed(); break;
            case 'settings': SoundManager.playSettings(); break;
            case 'language': SoundManager.playLanguage(); break;
            case 'install': SoundManager.playInstall(); break;
            default: SoundManager.playClick();
        }
    }, [position, focusOn, soundType]);

    // Animation states as refs to prevent re-renders in useFrame
    const currentScale = useRef(0); // Start at 0 for spawn animation
    const targetScale = useRef(1);
    const glowIntensity = useRef(0);
    const rotation = useRef(0);
    const isAnimating = useRef(false);
    const animationPhase = useRef<'idle' | 'minimizing' | 'maximizing' | 'restoring'>('idle');
    const isPanelHovered = useRef(false);

    // UI React States (Only trigger renders on open/close/button-hover)
    const windowState = getWindowState(id);
    const [isMinimizedHidden, setIsMinimizedHidden] = useState(windowState === 'minimized');
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);

    // Spawn animation state
    const spawnProgress = useRef(0);
    const spawnStarted = useRef(false);
    const spawnStartTime = useRef(0);
    const glowPulsePhase = useRef(0);

    // Use theme color if useThemeColor is true, otherwise use provided titleColor or fallback
    const effectiveColor = useThemeColor ? primaryColor : (titleColor || "#22d3ee");

    // Register window on mount
    useEffect(() => {
        registerWindow(id, title, icon, position);
    }, [id, title, icon, position, registerWindow]);

    // Trigger animations based on window state changes
    useEffect(() => {
        if (windowState === 'minimized') {
            animationPhase.current = 'minimizing';
            targetScale.current = 0;
            glowIntensity.current = 1;
            isAnimating.current = true;
            setIsMinimizedHidden(false); // Make sure it is visible so animation can run
        } else if (windowState === 'open') {
            animationPhase.current = 'restoring';
            targetScale.current = 1;
            glowIntensity.current = 0.8;
            isAnimating.current = true;
            setIsMinimizedHidden(false);
        } else if (windowState === 'maximized') {
            animationPhase.current = 'maximizing';
            targetScale.current = 1;
            glowIntensity.current = 1;
            isAnimating.current = true;
            setIsMinimizedHidden(false);
        }
    }, [windowState]);

    // Smooth spring animation using useFrame
    useFrame((state, delta) => {
        if (!groupRef.current || !scaleWrapperRef.current) return;
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

        // Spring interpolation for scale (smooth easing)
        const springStrength = 8;
        const dampening = 0.85;
        const scaleDiff = targetScale.current - currentScale.current;

        if (Math.abs(scaleDiff) > 0.001) {
            currentScale.current += scaleDiff * springStrength * delta;

            // Add slight bounce effect during animation
            if (animationPhase.current === 'minimizing') {
                // Spin effect when minimizing
                rotation.current += delta * 8;
            } else if (animationPhase.current === 'maximizing' || animationPhase.current === 'restoring') {
                // Subtle pulse during restore/maximize
                rotation.current *= dampening;
            }
        } else if (isAnimating.current) {
            currentScale.current = targetScale.current;
            isAnimating.current = false;
            animationPhase.current = 'idle';
            rotation.current = 0;
            
            if (targetScale.current === 0) {
                // Re-render ONLY ONCE at the very end to remove from DOM
                setIsMinimizedHidden(true);
            }
        }

        // Fade glow effect
        if (glowIntensity.current > 0.01) {
            glowIntensity.current *= 0.92;
        }

        // Floating animation (when not minimized)
        if (windowState !== 'minimized') {
            const hoverLift = isPanelHovered.current ? 0.05 : 0;
            groupRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.1 + hoverLift;
        }

        // Apply scale & rotation DIRECTLY without triggering React State re-renders!
        const finalScale = currentScale.current * spawnScale;
        scaleWrapperRef.current.scale.setScalar(finalScale);
        groupRef.current.rotation.set(0, rotation.current, 0);

        // Update Materials directly
        if (outerGlowMaterialRef.current) {
            outerGlowMaterialRef.current.opacity = glowIntensity.current * 0.3;
            outerGlowMaterialRef.current.visible = glowIntensity.current > 0.01;
        }
        
        if (innerGlowMaterialRef.current) {
            const pulseGlow = isPanelHovered.current ? 0.35 : 0.15 + Math.sin(Date.now() * 0.003) * 0.08;
            innerGlowMaterialRef.current.color.set(isPanelHovered.current ? "#facc15" : effectiveColor);
            innerGlowMaterialRef.current.opacity = pulseGlow;
        }
        
        if (mainBgMaterialRef.current) {
            mainBgMaterialRef.current.opacity = isPanelHovered.current ? 0.18 : 0.12;
        }

        if (titleBarMaterialRef.current) {
            titleBarMaterialRef.current.opacity = isPanelHovered.current ? 0.35 : 0.25;
        }

        // Hover sound trigger
        if (isPanelHovered.current && !wasHovered.current) {
            SoundManager.playHover();
        }
        wasHovered.current = isPanelHovered.current;
    });

    // Don't render if minimized and animation complete
    if (isMinimizedHidden) {
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
        >
            {/* Scale wrapper - applies to all content including Billboard */}
            <group ref={scaleWrapperRef}>
                <Billboard>
                    {/* Invisible hit area - catches all clicks for focus */}
                    <mesh
                        position={[0, 0, 0.1]}
                        onClick={handlePanelClick}
                        onPointerEnter={() => { isPanelHovered.current = true; document.body.style.cursor = 'pointer'; }}
                        onPointerLeave={() => { isPanelHovered.current = false; document.body.style.cursor = 'default'; }}
                    >
                        <planeGeometry args={[width + 0.3, height + titleBarHeight + 0.3]} />
                        <meshBasicMaterial transparent opacity={0} />
                    </mesh>

                    {/* Outer holographic glow */}
                    <RoundedPlane
                        width={width + 0.2}
                        height={height + titleBarHeight + 0.2}
                        radius={cornerRadius + 0.05}
                        position={[0, 0, -0.008]}
                    >
                        <meshBasicMaterial
                            ref={outerGlowMaterialRef}
                            color="#00f2ff"
                            transparent
                            opacity={0} // Managed via useFrame
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>

                    {/* Pulsing border glow - always visible, stronger on hover */}
                    <RoundedPlane
                        width={width + 0.08}
                        height={height + titleBarHeight + 0.08}
                        radius={cornerRadius + 0.02}
                        position={[0, 0, -0.004]}
                    >
                        <meshBasicMaterial
                            ref={innerGlowMaterialRef}
                            color={effectiveColor}
                            transparent
                            opacity={0.15} // Managed via useFrame
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>

                    {/* Main background - transparent white glass - click to focus */}
                    <RoundedPlane
                        width={width}
                        height={height}
                        radius={cornerRadius}
                        position={[0, -titleBarHeight / 2, -0.001]}
                        onPointerEnter={() => { isPanelHovered.current = true; }}
                        onPointerLeave={() => { isPanelHovered.current = false; }}
                        onClick={handlePanelClick}
                    >
                        <meshBasicMaterial
                            ref={mainBgMaterialRef}
                            color="#ffffff"
                            transparent
                            opacity={0.12} // Managed via useFrame
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
                            ref={titleBarMaterialRef}
                            color={primaryColor}
                            transparent
                            opacity={0.25} // Managed via useFrame
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
                                        SoundManager.playClose();
                                    }}
                                    title="Close"
                                >✕</button>
                            </Html>
                        </group>
                    </group>

                    {/* Content area - positioned below title bar, wrapped with scale context */}
                    <group position={[0, -titleBarHeight / 2, 0.01]}>
                        <WindowScaleContext.Provider value={1}>
                            {children}
                        </WindowScaleContext.Provider>
                    </group>
                </Billboard>
            </group>
        </group>
    );
}
