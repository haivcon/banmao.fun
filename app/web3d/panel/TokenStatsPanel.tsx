// Token Stats Panel component with real-time OKX DEX data + Advanced Info
"use client";

import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { DexWindow3D } from "./DexWindow3D";
import { useTokenStatsContext, useWeb3DTheme } from "../contexts";
import { DEFAULT_3D_FONT } from "../fonts";
import { RoundedPlane } from "../components/RoundedPlane";

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
    const { formattedStats, advancedInfo, isLoading, isMock } = useTokenStatsContext();
    const [hoveredItem, setHoveredItem] = useState<number | null>(null);
    const { primaryColor } = useWeb3DTheme();

    const panelWidth = 3.2;
    const panelHeight = 3.5; // 10 rows

    // Build tag badges text
    const tagBadges = advancedInfo?.tokenTags?.length
        ? advancedInfo.tokenTags.slice(0, 3).map(t => {
            if (t === "communityRecognized") return "✅";
            if (t === "smartMoneyBuy") return "🧠";
            if (t === "devHoldingStatusSellAll") return "👋";
            if (t === "devBurnToken") return "🔥";
            if (t === "dexBoost") return "🚀";
            if (t === "devAddLiquidity") return "💧";
            return "";
        }).filter(Boolean).join(" ")
        : "";

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
            label: "24H High/Low",
            value: isLoading ? "..." : `${formattedStats.maxPrice} / ${formattedStats.minPrice}`,
            color: "#fbbf24"
        },
        {
            label: "Top 10 Hold",
            value: isLoading ? "..." : formattedStats.top10HoldPercent,
            color: "#c084fc"
        },
        {
            label: "Risk",
            value: isLoading ? "..." : formattedStats.riskLevel,
            color: advancedInfo?.riskControlLevel === "1" ? "#4ade80" : advancedInfo?.riskControlLevel === "2" ? "#fbbf24" : "#ef4444"
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
            {/* Tag badges at top */}
            {tagBadges && (
                <Text
                    position={[panelWidth / 2 - 0.3, panelHeight / 2 - 0.08, 0.02]}
                    fontSize={0.12}
                    anchorX="right"
                    anchorY="top"
                    font={SPACE_MONO_FONT}
                >
                    {tagBadges}
                </Text>
            )}

            {dataItems.map((item, i) => {
                const isHovered = hoveredItem === i;

                // Scale and position adjustments when hovered
                const scale = isHovered ? 1.15 : 1;
                const zOffset = isHovered ? 0.3 : 0.01;

                return (
                    <group
                        key={i}
                        position={[0, panelHeight / 2 - 0.25 - i * 0.30, zOffset]}
                        scale={[scale, scale, 1]}
                    >
                        {/* Hover detection area */}
                        <mesh
                            position={[0, 0, 0.02]}
                            onPointerEnter={() => setHoveredItem(i)}
                            onPointerLeave={() => setHoveredItem(null)}
                        >
                            <planeGeometry args={[panelWidth - 0.3, 0.26]} />
                            <meshBasicMaterial transparent opacity={0} />
                        </mesh>

                        {/* Label - brighter when hovered */}
                        <Text
                            position={[-panelWidth / 2 + 0.25, 0, 0]}
                            fontSize={isHovered ? 0.12 : 0.09}
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
                            const charWidth = isHovered ? 0.10 : 0.075;
                            const textWidth = item.value.length * charWidth;
                            const bgWidth = Math.max(textWidth + 0.25, 0.9);
                            const centerX = panelWidth / 2 - 0.15 - bgWidth / 2;

                            return (
                                <>
                                    {/* Background glow */}
                                    <RoundedPlane
                                        width={bgWidth}
                                        height={isHovered ? 0.28 : 0.20}
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
                                        fontSize={isHovered ? 0.18 : 0.12}
                                        color={item.color}
                                        anchorX="center"
                                        anchorY="middle"
                                        outlineWidth={isHovered ? 0.010 : 0.003}
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
                            <mesh position={[0, -0.16, 0]}>
                                <planeGeometry args={[panelWidth - 0.5, 0.005]} />
                                <meshBasicMaterial color="#2a2a4a" transparent opacity={0.4} />
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
