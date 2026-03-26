"use client";

import React, { useState, useEffect } from "react";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { DexWindow3D } from "./DexWindow3D";
import { RoundedPlane } from "../components/RoundedPlane";
import { canPromptInstall, promptInstall } from "../../../lib/registerSW";

interface DexInstallPanel3DProps {
    id: string;
    position: [number, number, number];
}

const INSTALLED_STORAGE_KEY = "banmao_pwa_installed";

export function DexInstallPanel3D({ id, position }: DexInstallPanel3DProps) {
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [status, setStatus] = useState("Checking...");
    const [canInstall, setCanInstall] = useState(false);
    const [isButtonHovered, setIsButtonHovered] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check if already installed via localStorage (persists across browser/PWA sessions)
        const wasInstalledBefore = localStorage.getItem(INSTALLED_STORAGE_KEY) === "true";
        if (wasInstalledBefore) {
            setIsInstalled(true);
            setStatus("Already installed");
            return;
        }

        // Check if running in standalone mode (PWA)
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone === true;
        if (isStandalone) {
            setIsInstalled(true);
            setStatus("Already installed");
            // Also save to localStorage for future browser sessions
            localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
            return;
        }

        // Check for iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setIsIOS(true);
            setStatus("iOS - Use Share menu");
        }

        // Check install availability periodically
        const checkInstall = () => {
            const available = canPromptInstall();
            setCanInstall(available);
            if (available) {
                setStatus("Ready to install!");
            } else if (!isIOS) {
                setStatus("Waiting for browser...");
            }
        };

        checkInstall();
        const interval = setInterval(checkInstall, 1000);

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setStatus("Installed!");
            // Save to localStorage so we remember across sessions
            localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
        };

        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            clearInterval(interval);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, [isIOS]);

    const handleInstall = async () => {
        if (canInstall) {
            try {
                setStatus("Prompting...");
                const accepted = await promptInstall();
                if (accepted) {
                    setIsInstalled(true);
                    setStatus("Installed!");
                    // Save to localStorage so we remember across sessions
                    localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
                } else {
                    setStatus("Cancelled");
                }
            } catch (err) {
                console.error("[PWA] Error:", err);
                setStatus("Error");
            }
        } else if (isIOS) {
            setStatus("Use Share → Add to Home");
        } else {
            setStatus("Not ready");
        }
    };

    // Don't show if already installed
    if (isInstalled) return null;

    const panelWidth = 2.6;
    const panelHeight = 1.6;

    return (
        <DexWindow3D
            id={id}
            position={position}
            title="Install App"
            icon="📱"
            titleColor="#a855f7"
            width={panelWidth}
            height={panelHeight}
            soundType="install"
        >
            {/* Icon with color */}
            <Html center position={[0, 0.35, 0.01]} style={{ pointerEvents: 'none' }} distanceFactor={8}>
                <span style={{ fontSize: '36px' }}>⬇️</span>
            </Html>

            {/* Description */}
            <Text
                position={[0, -0.05, 0.01]}
                fontSize={0.08}
                color="#a1a1aa"
                anchorX="center"
                anchorY="middle"
                maxWidth={panelWidth - 0.4}
                textAlign="center"
            >
                {isIOS ? "Tap Share → Add to Home Screen" : "Add to home screen for faster access!"}
            </Text>

            {/* Status */}
            <Text
                position={[0, -0.28, 0.01]}
                fontSize={0.07}
                color={canInstall ? "#22c55e" : "#f59e0b"}
                anchorX="center"
                anchorY="middle"
            >
                Status: {status}
            </Text>

            {/* Install Button with hover effects */}
            <group position={[0, -0.55, 0.02]}>
                <RoundedPlane width={1.7} height={0.4} radius={0.1}>
                    <meshBasicMaterial
                        color={isButtonHovered
                            ? (canInstall ? "#4ade80" : "#c084fc")
                            : (canInstall ? "#22c55e" : "#a855f7")
                        }
                        side={THREE.DoubleSide}
                    />
                </RoundedPlane>
                {/* Glow effect on hover */}
                {isButtonHovered && (
                    <RoundedPlane width={1.8} height={0.5} radius={0.12} position={[0, 0, -0.01]}>
                        <meshBasicMaterial
                            color={canInstall ? "#22c55e" : "#a855f7"}
                            transparent
                            opacity={0.3}
                            side={THREE.DoubleSide}
                        />
                    </RoundedPlane>
                )}
                <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'none' }} distanceFactor={8}>
                    <span style={{
                        fontSize: '12px',
                        color: '#ffffff',
                        fontFamily: 'Space Mono, monospace',
                        fontWeight: 'bold',
                        textShadow: '0 0 4px rgba(0,0,0,0.8)',
                    }}>
                        {isIOS ? '📖 How to Install' : canInstall ? '✅ Install Now' : '⬇️ Install Now'}
                    </span>
                </Html>

                <Html center distanceFactor={8}>
                    <button
                        onMouseEnter={() => setIsButtonHovered(true)}
                        onMouseLeave={() => setIsButtonHovered(false)}
                        onClick={handleInstall}
                        style={{
                            width: '130px',
                            height: '32px',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '12px',
                            transition: 'transform 0.2s ease',
                            transform: isButtonHovered ? 'scale(1.05)' : 'scale(1)',
                        }}
                    />
                </Html>
            </group>
        </DexWindow3D>
    );
}
