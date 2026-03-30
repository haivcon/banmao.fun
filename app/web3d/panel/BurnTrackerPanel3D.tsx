// BurnTracker 3D Panel - Shows total burned $BANMAO tokens with progress bar + LP info
// Enhanced version with burn % visualization
"use client";

import React, { useState } from "react";
import { Text, Html } from "@react-three/drei";
import { DexWindow3D } from "./DexWindow3D";
import { useBurnTracker } from "../hooks/useBurnTracker";
import { DEFAULT_3D_FONT } from "../fonts";
import { RoundedPlane } from "../components/RoundedPlane";
import { useWeb3DTheme } from "../contexts";
import { useHtmlScale } from "../hooks";

const SPACE_MONO_FONT = DEFAULT_3D_FONT;

// Links
const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb";

interface BurnTrackerPanel3DProps {
    position: [number, number, number];
    translations: {
        totalBurned: string;
        burnHistory: string;
        burnDescription: string;
        burnButton: string;
    };
}

// Total supply constant
const TOTAL_SUPPLY = 1_000_000_000;

export function BurnTrackerPanel3D({ position, translations }: BurnTrackerPanel3DProps) {
    const { burnedAmount, isLoading } = useBurnTracker(60000);
    const [historyHovered, setHistoryHovered] = useState(false);
    const { primaryColor } = useWeb3DTheme();
    const htmlScale = useHtmlScale();

    const panelWidth = 3.0;
    const panelHeight = 2.2;

    // Colors
    const fireColor = "#ff4500";
    const goldColor = "#ffd700";

    const displayValue = isLoading ? "Loading..." : burnedAmount;

    // Calculate burn percentage
    const burnedNum = parseFloat(burnedAmount.replace(/,/g, ''));
    const burnPercent = isNaN(burnedNum) ? 0 : Math.min((burnedNum / TOTAL_SUPPLY) * 100, 100);
    const burnPercentDisplay = burnPercent > 0 ? `${burnPercent.toFixed(2)}%` : "—";

    // Progress bar dimensions
    const barWidth = panelWidth - 0.6;
    const barHeight = 0.12;
    const filledWidth = barWidth * (burnPercent / 100);

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
            <group position={[0, panelHeight / 2 - 0.54, 0.01]}>
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

            {/* === Burn Progress Bar === */}
            <group position={[0, panelHeight / 2 - 0.78, 0.01]}>
                {/* Label */}
                <Text
                    position={[-panelWidth / 2 + 0.2, 0.08, 0]}
                    fontSize={0.07}
                    color="#8892a8"
                    anchorX="left"
                    anchorY="middle"
                    font={SPACE_MONO_FONT}
                >
                    BURN PROGRESS
                </Text>

                {/* Percentage */}
                <Text
                    position={[panelWidth / 2 - 0.2, 0.08, 0]}
                    fontSize={0.09}
                    color={fireColor}
                    anchorX="right"
                    anchorY="middle"
                    outlineWidth={0.002}
                    outlineColor="#000000"
                    font={SPACE_MONO_FONT}
                >
                    {burnPercentDisplay}
                </Text>

                {/* Progress bar background */}
                <RoundedPlane
                    width={barWidth}
                    height={barHeight}
                    radius={barHeight / 2}
                    position={[0, -0.06, -0.001]}
                >
                    <meshBasicMaterial color="#1a1a2e" transparent opacity={0.8} />
                </RoundedPlane>

                {/* Progress bar fill */}
                {filledWidth > 0.02 && (
                    <RoundedPlane
                        width={filledWidth}
                        height={barHeight}
                        radius={barHeight / 2}
                        position={[-barWidth / 2 + filledWidth / 2, -0.06, 0]}
                    >
                        <meshBasicMaterial color={fireColor} transparent opacity={0.85} />
                    </RoundedPlane>
                )}

                {/* Glow behind bar */}
                {filledWidth > 0.02 && (
                    <RoundedPlane
                        width={filledWidth + 0.04}
                        height={barHeight + 0.04}
                        radius={(barHeight + 0.04) / 2}
                        position={[-barWidth / 2 + filledWidth / 2, -0.06, -0.002]}
                    >
                        <meshBasicMaterial color={goldColor} transparent opacity={0.15} />
                    </RoundedPlane>
                )}
            </group>


            {/* Separator */}
            <mesh position={[0, panelHeight / 2 - 1.0, 0.01]}>
                <planeGeometry args={[panelWidth - 0.4, 0.005]} />
                <meshBasicMaterial color="#2a2a4a" transparent opacity={0.6} />
            </mesh>

            {/* Burn Button - Glowing with Breathing Effect */}
            <group position={[0, -panelHeight / 2 + 0.38, 0.02]}>
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

                <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'auto' }} distanceFactor={8}>
                    <a
                        href="/defi/burn"
                        onMouseEnter={() => setHistoryHovered(true)}
                        onMouseLeave={() => setHistoryHovered(false)}
                        style={{
                            display: 'block',
                            width: '220px',
                            height: '50px',
                            borderRadius: '25px',
                            background: 'transparent',
                            cursor: 'pointer',
                            transform: `scale(${htmlScale})`,
                            transformOrigin: 'center'
                        }}
                    />
                </Html>
            </group>
        </DexWindow3D>
    );
}

export default BurnTrackerPanel3D;
