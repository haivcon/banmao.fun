// Token Stats Panel component with real-time OKX DEX data
"use client";

import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { DexWindow3D } from "./DexWindow3D";
import { useTokenStats } from "../hooks/useTokenStats";
import { DEFAULT_3D_FONT } from "../fonts";
import { RoundedPlane } from "../components/RoundedPlane";
import { useWeb3DTheme } from "../contexts";

const SPACE_MONO_FONT = DEFAULT_3D_FONT;

interface TokenStatsPanelProps {
    position: [number, number, number];
    translations: {
        tokenStats: string;
        totalSupply: string;
        circulating: string;
        burned: string;
        holders: string;
        marketCap: string;
        change24h: string;
        liquidity: string;
        volume24h: string;
        transactions24h: string;
        totalTradeVolume: string;
    };
}

export function TokenStatsPanel({ position, translations }: TokenStatsPanelProps) {
    const { formattedStats, isLoading, isMock } = useTokenStats(60000);
    const [hoveredItem, setHoveredItem] = useState<number | null>(null);
    const { primaryColor } = useWeb3DTheme();

    const panelWidth = 3.2;
    const panelHeight = 3.0;

    // Data items to display
    const dataItems = [
        {
            label: translations.marketCap,
            value: isLoading ? "Loading..." : formattedStats.marketCap,
            color: "#4ade80"
        },
        {
            label: translations.circulating,
            value: isLoading ? "..." : formattedStats.circSupply,
            color: primaryColor
        },
        {
            label: translations.holders,
            value: isLoading ? "..." : formattedStats.holders,
            color: "#22d3ee"
        },
        {
            label: translations.liquidity,
            value: isLoading ? "..." : formattedStats.liquidity,
            color: "#a855f7"
        },
        {
            label: translations.change24h,
            value: isLoading ? "..." : formattedStats.priceChange24H,
            color: formattedStats.priceChange24H.startsWith("+") ? "#4ade80" : "#ef4444"
        },
        {
            label: translations.volume24h,
            value: isLoading ? "..." : formattedStats.volume24H,
            color: "#fb923c"
        },
        {
            label: translations.transactions24h,
            value: isLoading ? "..." : formattedStats.txs24H,
            color: "#38bdf8"
        },
        {
            label: translations.totalTradeVolume,
            value: isLoading ? "..." : formattedStats.tradeNum,
            color: "#f472b6"
        },
    ];

    return (
        <DexWindow3D
            id="token-stats"
            position={position}
            title={translations.tokenStats}
            icon="📊"
            width={panelWidth}
            height={panelHeight}
            soundType="tokenStats"
        >
            {dataItems.map((item, i) => {
                const isHovered = hoveredItem === i;

                // Scale and position adjustments when hovered
                const scale = isHovered ? 1.15 : 1;
                const zOffset = isHovered ? 0.3 : 0.01;

                return (
                    <group
                        key={i}
                        position={[0, panelHeight / 2 - 0.25 - i * 0.32, zOffset]}
                        scale={[scale, scale, 1]}
                    >
                        {/* Hover detection area */}
                        <mesh
                            position={[0, 0, 0.02]}
                            onPointerEnter={() => setHoveredItem(i)}
                            onPointerLeave={() => setHoveredItem(null)}
                        >
                            <planeGeometry args={[panelWidth - 0.3, 0.28]} />
                            <meshBasicMaterial transparent opacity={0} />
                        </mesh>

                        {/* Label - brighter when hovered */}
                        <Text
                            position={[-panelWidth / 2 + 0.25, 0, 0]}
                            fontSize={isHovered ? 0.13 : 0.10}
                            color={isHovered ? "#ffffff" : "#8892a8"}
                            anchorX="left"
                            anchorY="middle"
                            outlineWidth={isHovered ? 0.004 : 0}
                            outlineColor="#000000"
                            font={SPACE_MONO_FONT}
                        >
                            {item.label}
                        </Text>

                        {/* Value with background */}
                        {(() => {
                            const charWidth = isHovered ? 0.11 : 0.085;
                            const textWidth = item.value.length * charWidth;
                            const bgWidth = Math.max(textWidth + 0.25, 0.9);
                            const centerX = panelWidth / 2 - 0.15 - bgWidth / 2;

                            return (
                                <>
                                    {/* Background glow */}
                                    <RoundedPlane
                                        width={bgWidth}
                                        height={isHovered ? 0.30 : 0.22}
                                        radius={0.05}
                                        position={[centerX, 0, -0.001]}
                                    >
                                        <meshBasicMaterial
                                            color={item.color}
                                            transparent
                                            opacity={isHovered ? 0.25 : 0.10}
                                        />
                                    </RoundedPlane>

                                    {/* Main value text */}
                                    <Text
                                        position={[centerX, 0, 0]}
                                        fontSize={isHovered ? 0.22 : 0.14}
                                        color={item.color}
                                        anchorX="center"
                                        anchorY="middle"
                                        outlineWidth={isHovered ? 0.012 : 0.004}
                                        outlineColor="#000000"
                                        font={SPACE_MONO_FONT}
                                    >
                                        {item.value}
                                    </Text>
                                </>
                            );
                        })()}

                        {/* Point light for glow effect when hovered */}
                        {isHovered && (
                            <pointLight
                                position={[0, 0, 0.5]}
                                color={item.color}
                                intensity={3}
                                distance={2}
                            />
                        )}

                        {/* Row separator */}
                        {i < dataItems.length - 1 && !isHovered && (
                            <mesh position={[0, -0.17, 0]}>
                                <planeGeometry args={[panelWidth - 0.5, 0.006]} />
                                <meshBasicMaterial color="#2a2a4a" transparent opacity={0.5} />
                            </mesh>
                        )}
                    </group>
                );
            })}

            {/* Mock data indicator */}
            {isMock && (
                <Text
                    position={[0, -panelHeight / 2 + 0.15, 0.01]}
                    fontSize={0.06}
                    color="#f97316"
                    anchorX="center"
                    anchorY="middle"
                    font={SPACE_MONO_FONT}
                >
                    ⚠ Sample Data
                </Text>
            )}
        </DexWindow3D>
    );
}

export default TokenStatsPanel;

