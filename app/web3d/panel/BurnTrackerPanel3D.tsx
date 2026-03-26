// BurnTracker 3D Panel - Shows total burned $BANMAO tokens with history link
// Compact version with all content
"use client";

import React, { useState } from "react";
import { Text, Html } from "@react-three/drei";
import { DexWindow3D } from "./DexWindow3D";
import { useBurnTracker } from "../hooks/useBurnTracker";
import { DEFAULT_3D_FONT } from "../fonts";
import { RoundedPlane } from "../components/RoundedPlane";
import { useWeb3DTheme } from "../contexts";

const SPACE_MONO_FONT = DEFAULT_3D_FONT;

// Links
const BURN_HISTORY_DOC = "https://docs.google.com/document/d/1ObVjHuoVCjXbF5zuWqzbcUuoqT86CdCm4Z9mwMWCpp0/edit?usp=sharing";
const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb";
const SHORT_WALLET = COMMUNITY_WALLET.slice(0, 10) + "..." + COMMUNITY_WALLET.slice(-8);

interface BurnTrackerPanel3DProps {
    position: [number, number, number];
    translations: {
        totalBurned: string;
        burnHistory: string;
        burnDescription: string;
        burnButton: string;
    };
}

export function BurnTrackerPanel3D({ position, translations }: BurnTrackerPanel3DProps) {
    const { burnedAmount, isLoading } = useBurnTracker(60000);
    const [historyHovered, setHistoryHovered] = useState(false);
    const [walletHovered, setWalletHovered] = useState(false);
    const [walletExpanded, setWalletExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const { primaryColor } = useWeb3DTheme();

    const panelWidth = 3.0;
    const panelHeight = 2.0;

    // Colors
    const fireColor = "#ff4500";
    const goldColor = "#ffd700";
    const cyanColor = "#22d3ee";

    const displayValue = isLoading ? "Loading..." : burnedAmount;

    // Handle wallet copy
    const handleWalletClick = async () => {
        if (!walletExpanded) {
            setWalletExpanded(true);
            return;
        }
        try {
            await navigator.clipboard.writeText(COMMUNITY_WALLET);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setWalletExpanded(false);
            }, 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <DexWindow3D
            id="burn-tracker-panel"
            position={position}
            title={translations.totalBurned}
            icon="🔥"
            width={panelWidth}
            height={panelHeight}
            soundType="click"
        >
            {/* Burned Amount - Large */}
            <group position={[0, panelHeight / 2 - 0.28, 0.01]}>
                <Text
                    position={[-panelWidth / 2 + 0.2, 0, 0]}
                    fontSize={0.10}
                    color="#8892a8"
                    anchorX="left"
                    anchorY="middle"
                    font={SPACE_MONO_FONT}
                >
                    BURNED
                </Text>
                <RoundedPlane
                    width={1.8}
                    height={0.26}
                    radius={0.05}
                    position={[panelWidth / 2 - 1.1, 0, -0.001]}
                >
                    <meshBasicMaterial color={goldColor} transparent opacity={0.12} />
                </RoundedPlane>
                <Text
                    position={[panelWidth / 2 - 1.1, 0, 0]}
                    fontSize={0.14}
                    color={goldColor}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.004}
                    outlineColor="#000000"
                    font={SPACE_MONO_FONT}
                >
                    {displayValue}
                </Text>
            </group>

            {/* Token symbol row */}
            <group position={[0, panelHeight / 2 - 0.58, 0.01]}>
                <Text
                    position={[-panelWidth / 2 + 0.2, 0, 0]}
                    fontSize={0.10}
                    color="#8892a8"
                    anchorX="left"
                    anchorY="middle"
                    font={SPACE_MONO_FONT}
                >
                    TOKEN
                </Text>
                <Text
                    position={[panelWidth / 2 - 1.1, 0, 0]}
                    fontSize={0.12}
                    color={fireColor}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.003}
                    outlineColor="#000000"
                    font={SPACE_MONO_FONT}
                >
                    $BANMAO
                </Text>
            </group>

            {/* Separator */}
            <mesh position={[0, 0.1, 0.01]}>
                <planeGeometry args={[panelWidth - 0.4, 0.005]} />
                <meshBasicMaterial color="#2a2a4a" transparent opacity={0.6} />
            </mesh>

            {/* Burn Button - Glowing with Breathing Effect */}
            <group position={[0, -0.25, 0.02]}>
                <RoundedPlane
                    width={2.2}
                    height={0.38}
                    radius={0.19}
                    position={[0, 0, -0.001]}
                >
                    <meshBasicMaterial
                        color={historyHovered ? "#ff8c00" : fireColor}
                        transparent
                        opacity={historyHovered ? 0.6 : 0.4}
                    />
                </RoundedPlane>

                {/* Glowing outline */}
                <RoundedPlane
                    width={2.3}
                    height={0.48}
                    radius={0.24}
                    position={[0, 0, -0.002]}
                >
                    <meshBasicMaterial
                        color={goldColor}
                        transparent
                        opacity={0.15}
                    />
                </RoundedPlane>

                <Text
                    position={[0, 0, 0]}
                    fontSize={0.12}
                    color={historyHovered ? "#ffffff" : goldColor}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.003}
                    outlineColor="#000000"
                    font={SPACE_MONO_FONT}
                >
                    {translations.burnButton || "🔥 Burn 🎁"}
                </Text>

                <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'auto' }}>
                    <a
                        href="/defi/burn"
                        onMouseEnter={() => setHistoryHovered(true)}
                        onMouseLeave={() => setHistoryHovered(false)}
                        style={{
                            display: 'block',
                            width: '200px',
                            height: '40px',
                            cursor: 'pointer',
                        }}
                    />
                </Html>
            </group>
        </DexWindow3D>
    );
}

export default BurnTrackerPanel3D;
