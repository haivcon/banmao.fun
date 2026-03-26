"use client";

import React, { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DexWindow3D } from "./DexWindow3D";
import { useWeb3DTheme } from "../contexts";
import { RoundedPlane } from "../components/RoundedPlane";

interface TokenInfoPanel3DProps {
    position: [number, number, number];
    translations: {
        tokenInfoTitle: string;
        tokenInfoDesc: string;
    };
}

export function TokenInfoPanel3D({ position, translations }: TokenInfoPanel3DProps) {
    const { primaryColor, accentColor } = useWeb3DTheme();
    const glowRef = useRef<THREE.Mesh>(null);

    // Panel size - optimized to fit content snugly
    const panelWidth = 3.6;
    const panelHeight = 2.4; // Reduced to remove excess empty space

    useFrame((state) => {
        if (glowRef.current) {
            const t = state.clock.elapsedTime;
            (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + Math.sin(t * 1.5) * 0.01;
        }
    });

    return (
        <DexWindow3D
            id="token-info"
            position={position}
            title={translations.tokenInfoTitle}
            icon=" 🐱🍌"
            width={panelWidth}
            height={panelHeight}
            soundType="click"
        >
            {/* Subtle background glow */}
            <mesh ref={glowRef} position={[0, 0, -0.02]}>
                <planeGeometry args={[panelWidth - 0.2, panelHeight - 0.3]} />
                <meshBasicMaterial color={primaryColor} transparent opacity={0.02} side={THREE.DoubleSide} />
            </mesh>

            {/* Content */}
            <Html
                center
                position={[0, 0, 0.02]}
                style={{ pointerEvents: 'none' }}
                distanceFactor={7.5}
            >
                <style>{`
                    .info-panel {
                        width: 380px; /* Reduced from 420px for better fit */
                        max-width: 90vw;
                        height: 250px;
                        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        overflow-y: auto;
                        overflow-x: hidden;
                        pointer-events: auto;
                        scrollbar-width: thin;
                        scrollbar-color: rgba(250, 204, 21, 0.5) rgba(0, 0, 0, 0.1);
                        padding: 4px;
                    }

                    /* Custom Scrollbar */
                    .info-panel::-webkit-scrollbar {
                        width: 4px; /* Thinner scrollbar */
                    }
                    .info-panel::-webkit-scrollbar-track {
                        background: rgba(0, 0, 0, 0.05);
                        border-radius: 2px;
                    }
                    .info-panel::-webkit-scrollbar-thumb {
                        background: rgba(250, 204, 21, 0.5);
                        border-radius: 2px;
                    }
                    
                    /* Logo Section */
                    .logo-row {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 8px;
                        pointer-events: none;
                    }
                    
                    /* Emoji */
                    .logo-emoji {
                        font-size: 24px;
                        animation: float 3s ease-in-out infinite;
                    }
                    .logo-emoji.cat { animation-delay: 0s; }
                    .logo-emoji.banana { animation-delay: 1.5s; }
                    
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                    
                    /* Logo text */
                    .logo-text {
                        font-size: 26px; /* Slightly smaller */
                        font-weight: 700;
                        color: #facc15;
                        text-shadow: 0 0 15px rgba(250, 204, 21, 0.4);
                        animation: textGlow 2.5s ease-in-out infinite;
                    }
                    
                    @keyframes textGlow {
                        0%, 100% { text-shadow: 0 0 15px rgba(250, 204, 21, 0.4); }
                        50% { text-shadow: 0 0 25px rgba(250, 204, 21, 0.6), 0 0 35px rgba(250, 204, 21, 0.3); }
                    }
                    
                    /* Description */
                    .description {
                        font-size: 14px;
                        line-height: 1.5;
                        color: #d1d5db;
                        text-align: center;
                        animation: fadeIn 0.5s ease-out;
                        padding: 0 8px;
                        padding-bottom: 15px;
                    }
                    
                    /* Mobile adjustments */
                    @media (max-width: 768px) {
                        .info-panel {
                            width: 280px; /* Much narrower for mobile */
                            height: 200px; /* Shorter height */
                        }
                        .logo-emoji { font-size: 20px; }
                        .logo-text { font-size: 22px; }
                        .description {
                            font-size: 13px;
                            padding: 0 4px;
                        }
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(5px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
                <div
                    className="info-panel"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerOver={(e) => { document.body.style.cursor = 'text'; }}
                    onPointerOut={(e) => { document.body.style.cursor = 'default'; }}
                >
                    <div className="logo-row">
                        <span className="logo-emoji cat">🐱</span>
                        <span className="logo-text">$banmao</span>
                        <span className="logo-emoji banana">🍌</span>
                    </div>
                    <div className="divider"></div>
                    <p className="description">
                        {translations.tokenInfoDesc}
                    </p>
                </div>
            </Html>

            {/* Subtle accent line at bottom */}
            <RoundedPlane
                width={panelWidth - 1}
                height={0.015}
                radius={0.007}
                position={[0, -panelHeight / 2 + 0.22, 0.01]}
            >
                <meshBasicMaterial color={primaryColor} transparent opacity={0.25} side={THREE.DoubleSide} />
            </RoundedPlane>
        </DexWindow3D>
    );
}

export default TokenInfoPanel3D;
