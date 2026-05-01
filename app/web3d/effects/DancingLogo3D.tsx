"use client";

import React, { useRef, useState, useMemo } from "react";
import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHtmlScale } from "../hooks";
import { SoundManager } from "./SharedEffects";

// ==================== PROPS ====================
interface DancingLogo3DProps {
    position: [number, number, number];
    scale?: number;
}

// ==================== LOGO SPARKLES ====================
// Orbiting sparkles around text
function LogoSparkles({ isHovered }: { isHovered: boolean }) {
    const sparklesRef = useRef<THREE.Group>(null);
    const count = 16;

    const sparkles = useMemo(() =>
        Array.from({ length: count }).map((_, i) => ({
            offset: (i / count) * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5,
            radius: 0.8 + Math.random() * 0.4,
            yRange: 0.2 + Math.random() * 0.15,
            size: 0.025 + Math.random() * 0.015,
        })), []);

    useFrame((state) => {
        if (!sparklesRef.current) return;
        const time = state.clock.elapsedTime;
        const speed = isHovered ? 2 : 0.8;

        sparklesRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;
            const s = sparkles[i];
            const t = time * s.speed * speed + s.offset;

            mesh.position.x = Math.cos(t) * s.radius;
            mesh.position.z = Math.sin(t) * s.radius * 0.2;
            mesh.position.y = Math.sin(t * 2.5) * s.yRange;

            const scale = isHovered ? s.size * 1.5 + Math.sin(t * 4) * 0.005 : s.size;
            mesh.scale.setScalar(scale);

            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = isHovered ? 0.95 : 0.6;
        });
    });

    return (
        <group ref={sparklesRef}>
            {sparkles.map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[1, 8, 8]} />
                    <meshBasicMaterial
                        color={i % 3 === 0 ? "#facc15" : i % 3 === 1 ? "#00f2ff" : "#ff69b4"}
                        transparent
                        opacity={0.6}
                    />
                </mesh>
            ))}
        </group>
    );
}

// ==================== LOGO GLOW ====================
// Disabled - no yellow background
function LogoGlow({ isHovered }: { isHovered: boolean }) {
    return null;
}

// ==================== MAIN DANCING LOGO COMPONENT ====================
export function DancingLogo3D({ position, scale = 1 }: DancingLogo3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [isHovered, setIsHovered] = useState(false);
    const wasHovered = useRef(false);
    const htmlScale = useHtmlScale();

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        // Gentle floating
        groupRef.current.position.y = position[1] + Math.sin(time * 0.4) * 0.1;

        // Subtle rotation sway
        groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.05;

        // Hover sound - continuous wild drum dance
        if (isHovered && !wasHovered.current) {
            SoundManager.startDrumLoop();
        } else if (!isHovered && wasHovered.current) {
            SoundManager.stopDrumLoop();
        }
        wasHovered.current = isHovered;
    });

    const handleClick = () => {
        import("../effects/SharedEffects").then(m => m.SoundManager.playBanmao());
    };

    return (
        <group
            ref={groupRef}
            position={position}
            scale={[scale, scale, scale]}
            onClick={handleClick}
        >
            {/* Invisible hit area for hover detection */}
            <mesh
                onPointerOver={() => { setIsHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setIsHovered(false); document.body.style.cursor = 'default'; }}
            >
                <boxGeometry args={[4, 1, 0.5]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Background glow aura */}
            <LogoGlow isHovered={isHovered} />

            {/* Orbiting sparkles */}
            <LogoSparkles isHovered={isHovered} />

            <Billboard>
                {/* Main logo with individual dancing letters */}
                <Html center position={[0, 0.15, 0]} style={{ pointerEvents: 'none' }}>
                    <style>{`
                        @font-face {
                            font-family: 'Space Mono';
                            src: url('/fonts/SpaceMono-Regular.woff') format('woff');
                            font-weight: 400 700;
                            font-style: normal;
                            font-display: swap;
                        }

                        @keyframes charDance {
                            0%, 100% { transform: translateY(0) rotate(0deg); }
                            25% { transform: translateY(-4px) rotate(-2deg); }
                            50% { transform: translateY(0) rotate(0deg); }
                            75% { transform: translateY(-2px) rotate(2deg); }
                        }
                        @keyframes charDanceCrazy {
                            0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
                            25% { transform: translateY(-15px) rotate(-15deg) scale(1.3); }
                            50% { transform: translateY(5px) rotate(0deg) scale(0.9); }
                            75% { transform: translateY(-10px) rotate(15deg) scale(1.2); }
                        }
                        @keyframes catBounce {
                            0%, 100% { transform: translateY(0) scale(1); }
                            50% { transform: translateY(-6px) scale(1.05); }
                        }
                        @keyframes catBounceCrazy {
                            0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
                            25% { transform: translateY(-20px) rotate(-20deg) scale(1.4); }
                            50% { transform: translateY(0) rotate(0deg) scale(0.8); }
                            75% { transform: translateY(-15px) rotate(20deg) scale(1.3); }
                        }
                        @keyframes bananaWiggle {
                            0%, 100% { transform: rotate(0deg); }
                            25% { transform: rotate(-10deg); }
                            75% { transform: rotate(10deg); }
                        }
                        @keyframes bananaWiggleCrazy {
                            0%, 100% { transform: rotate(0deg) scale(1); }
                            25% { transform: rotate(-45deg) scale(1.5); }
                            50% { transform: rotate(0deg) scale(1); }
                            75% { transform: rotate(45deg) scale(1.5); }
                        }

                        /* Responsive Typography */
                        .banmao-logo-container {
                            display: flex;
                            align-items: center;
                            gap: 0px;
                            white-space: nowrap;
                            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        }

                        .banmao-char {
                            display: inline-block;
                            font-size: clamp(22px, 5.5vw, 42px);
                            color: #facc15;
                            font-family: 'Space Mono', monospace;
                            font-weight: bold;
                            text-shadow: 0 0 10px rgba(250,204,21,0.5), 2px 2px 4px rgba(0,0,0,0.8);
                            transition: all 0.3s ease;
                        }

                        .banmao-char.hovered {
                            font-size: clamp(26px, 6vw, 48px);
                            color: #fef08a;
                            text-shadow: 0 0 20px #facc15, 0 0 40px #f97316, 2px 2px 4px rgba(0,0,0,0.8);
                        }

                        .banmao-emoji {
                            display: inline-block;
                            font-size: clamp(18px, 4.5vw, 36px);
                            transition: all 0.3s ease;
                            filter: drop-shadow(0 0 5px rgba(250,204,21,0.5));
                        }
                        
                        .banmao-emoji.cat { margin-left: 10px; }
                        .banmao-emoji.banana { margin-left: 5px; }

                        .banmao-emoji.hovered {
                            font-size: clamp(22px, 5.5vw, 42px);
                            filter: drop-shadow(0 0 20px rgba(250,204,21,1));
                        }

                        /* MOBILE MEDIA QUERY */
                        @media (max-width: 768px) {
                            .banmao-char { font-size: clamp(16px, 3.8vw, 22px) !important; }
                            .banmao-char.hovered { font-size: clamp(18px, 4.2vw, 26px) !important; }
                            .banmao-emoji { font-size: clamp(13px, 3.2vw, 18px) !important; }
                            .banmao-emoji.hovered { font-size: clamp(16px, 3.8vw, 22px) !important; }
                            .banmao-emoji.cat { margin-left: 6px; }
                            .banmao-emoji.banana { margin-left: 3px; }
                        }
                        @media (max-width: 400px) {
                            .banmao-char { font-size: 14px !important; }
                            .banmao-char.hovered { font-size: 17px !important; }
                            .banmao-emoji { font-size: 11px !important; }
                            .banmao-emoji.hovered { font-size: 14px !important; }
                            .banmao-emoji.cat { margin-left: 4px; }
                            .banmao-emoji.banana { margin-left: 2px; }
                        }
                    `}</style>
                    <div
                        className="banmao-logo-container"
                        style={{
                            transform: `scale(${isHovered ? htmlScale * 1.2 : htmlScale})`,
                            transformOrigin: 'center'
                        }}
                    >
                        {/* Each character dancing individually */}
                        {'$banmao'.split('').map((char, i) => (
                            <span
                                key={i}
                                className={`banmao-char ${isHovered ? 'hovered' : ''}`}
                                style={{
                                    animation: isHovered
                                        ? `charDanceCrazy 0.25s infinite`
                                        : `charDance 1.2s ease-in-out infinite`,
                                    animationDelay: isHovered ? `${i * 0.03}s` : `${i * 0.15}s`,
                                }}
                            >
                                {char}
                            </span>
                        ))}
                        {/* Cat emoji */}
                        <span
                            className={`banmao-emoji cat ${isHovered ? 'hovered' : ''}`}
                            style={{
                                animation: isHovered
                                    ? 'catBounceCrazy 0.2s infinite'
                                    : 'catBounce 1.5s ease-in-out infinite',
                            }}
                        >🐱</span>
                        {/* Banana emoji */}
                        <span
                            className={`banmao-emoji banana ${isHovered ? 'hovered' : ''}`}
                            style={{
                                animation: isHovered
                                    ? 'bananaWiggleCrazy 0.15s infinite'
                                    : 'bananaWiggle 1.0s ease-in-out infinite',
                            }}
                        >🍌</span>
                    </div>
                </Html>
            </Billboard>
        </group>
    );
}

export default DancingLogo3D;
