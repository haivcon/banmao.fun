// Price Feed Panel component with real-time OKX DEX price data + Recent Trades
"use client";

import React, { useState, useEffect } from "react";
import { Text, Html, Billboard } from "@react-three/drei";
import { DexWindow3D } from "./DexWindow3D";
import { usePrice } from "../hooks/usePrice";
import { useTrades, formatTimeAgo, formatVolume, shortenAddress } from "../hooks/useTrades";
import { DEFAULT_3D_FONT } from "../fonts";
import { RoundedPlane } from "../components/RoundedPlane";
import { useWeb3DTheme } from "../contexts";
import { useHtmlScale } from "../hooks";

// Token contract address
const TOKEN_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
const SPACE_MONO_FONT = DEFAULT_3D_FONT;

interface PriceFeedPanelProps {
    position: [number, number, number];
    translations: {
        priceFeed: string;
        network: string;
        price: string;
        token: string;
        time: string;
    };
}

export function PriceFeedPanel({ position, translations }: PriceFeedPanelProps) {
    const { priceUSD, network, isLoading, isMock } = usePrice(30000);
    const { trades } = useTrades(15000);
    const [currentTime, setCurrentTime] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [addressHovered, setAddressHovered] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<number | null>(null);
    const { primaryColor } = useWeb3DTheme();
    const htmlScale = useHtmlScale();

    // Update time every second
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            setCurrentTime(`${hours}:${minutes}:${seconds}`);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const [addressExpanded, setAddressExpanded] = useState(false);

    const handleAddressClick = async () => {
        if (!addressExpanded) {
            setAddressExpanded(true);
            return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(TOKEN_ADDRESS);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = TOKEN_ADDRESS;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setAddressExpanded(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const shortAddress = `${TOKEN_ADDRESS.slice(0, 10)}...${TOKEN_ADDRESS.slice(-6)}`;
    const fullAddress = TOKEN_ADDRESS;

    const getAddressDisplay = () => {
        if (copied) return "Copied! ✓";
        if (addressExpanded) return fullAddress;
        return shortAddress;
    };

    const panelWidth = 3.2;
    const panelHeight = 3.2; // Taller to fit trades

    const dataItems = [
        { label: translations.network, value: network, color: "#22d3ee", isAddress: false },
        { label: translations.price, value: isLoading ? "Loading..." : priceUSD, color: primaryColor, isAddress: false },
        { label: translations.token, value: getAddressDisplay(), color: copied ? "#4ade80" : (addressExpanded ? "#22d3ee" : "#a855f7"), isAddress: true },
        { label: translations.time, value: currentTime || "...", color: isMock ? "#f97316" : "#4ade80", isAddress: false },
    ];

    // Recent trades to display (max 3)
    const recentTrades = trades.slice(0, 3);

    return (
        <DexWindow3D
            id="price-feed"
            position={position}
            title={translations.priceFeed}
            icon="📈"
            width={panelWidth}
            height={panelHeight}
            soundType="priceFeed"
        >
            {dataItems.map((item, i) => {
                const isHovered = hoveredItem === i && !item.isAddress;

                // Scale and position adjustments when hovered
                const scale = isHovered ? 1.15 : 1;
                const zOffset = isHovered ? 0.3 : 0.01;

                return (
                    <group
                        key={i}
                        position={[0, panelHeight / 2 - 0.35 - i * 0.38, zOffset]}
                        scale={[scale, scale, 1]}
                    >
                        {/* Hover detection for non-address rows */}
                        {!item.isAddress && (
                            <mesh
                                position={[0, 0, 0.02]}
                                onPointerEnter={() => setHoveredItem(i)}
                                onPointerLeave={() => setHoveredItem(null)}
                            >
                                <planeGeometry args={[panelWidth - 0.3, 0.32]} />
                                <meshBasicMaterial transparent opacity={0} />
                            </mesh>
                        )}

                        {/* Label - brighter when hovered */}
                        <Text
                            position={[-panelWidth / 2 + 0.25, 0, 0]}
                            fontSize={isHovered ? 0.14 : 0.11}
                            color={isHovered ? "#ffffff" : "#8892a8"}
                            anchorX="left"
                            anchorY="middle"
                            outlineWidth={isHovered ? 0.004 : 0}
                            outlineColor="#000000"
                            font={SPACE_MONO_FONT}
                        >
                            {item.label}
                        </Text>

                        {/* Value */}
                        {(() => {
                            const charWidth = isHovered ? 0.12 : 0.09;
                            const textWidth = item.value.length * charWidth;
                            const bgWidth = Math.max(textWidth + 0.2, 0.8);
                            const centerX = panelWidth / 2 - 0.15 - bgWidth / 2;

                            if (item.isAddress) {
                                return (
                                    <>
                                        <group position={[centerX, 0, 0]}>
                                            <Text
                                                fontSize={0.15}
                                                color={addressHovered ? "#c084fc" : item.color}
                                                anchorX="center"
                                                anchorY="middle"
                                                outlineWidth={0.005}
                                                outlineColor="#000000"
                                                font={SPACE_MONO_FONT}
                                            >
                                                {item.value}
                                            </Text>
                                            <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'auto' }} distanceFactor={8}>
                                                <button
                                                    onClick={handleAddressClick}
                                                    onMouseEnter={() => setAddressHovered(true)}
                                                    onMouseLeave={() => setAddressHovered(false)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        width: '200px',
                                                        height: '40px',
                                                        transform: `scale(${htmlScale})`
                                                    }}
                                                    title={addressExpanded ? "Click to copy" : "Click to show full address"}
                                                />
                                            </Html>
                                        </group>
                                    </>
                                );
                            }

                            return (
                                <>
                                    {/* Background glow */}
                                    <RoundedPlane
                                        width={bgWidth}
                                        height={isHovered ? 0.34 : 0.26}
                                        radius={0.06}
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
                                        fontSize={isHovered ? 0.24 : 0.15}
                                        color={item.color}
                                        anchorX="center"
                                        anchorY="middle"
                                        outlineWidth={isHovered ? 0.012 : 0.005}
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
                            <mesh position={[0, -0.2, 0]}>
                                <planeGeometry args={[panelWidth - 0.5, 0.008]} />
                                <meshBasicMaterial color="#2a2a4a" transparent opacity={0.6} />
                            </mesh>
                        )}
                    </group>
                );
            })}

            {/* === Recent Trades Section === */}
            {recentTrades.length > 0 && (
                <group position={[0, -panelHeight / 2 + 0.75, 0.01]}>
                    {/* Section separator */}
                    <mesh position={[0, 0.32, 0]}>
                        <planeGeometry args={[panelWidth - 0.4, 0.008]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
                    </mesh>

                    {/* Section title */}
                    <Text
                        position={[-panelWidth / 2 + 0.25, 0.20, 0]}
                        fontSize={0.08}
                        color="#64748b"
                        anchorX="left"
                        anchorY="middle"
                        font={SPACE_MONO_FONT}
                    >
                        RECENT TRADES
                    </Text>

                    {/* Trade rows */}
                    {recentTrades.map((trade, i) => {
                        const isBuy = trade.type === "buy";
                        const icon = isBuy ? "▲" : "▼";
                        const color = isBuy ? "#4ade80" : "#ef4444";
                        const vol = formatVolume(trade.volume);
                        const time = formatTimeAgo(trade.time);
                        const addr = shortenAddress(trade.userAddress);

                        return (
                            <group key={trade.id || i} position={[0, -i * 0.18, 0]}>
                                {/* Buy/Sell icon */}
                                <Text
                                    position={[-panelWidth / 2 + 0.25, 0, 0]}
                                    fontSize={0.09}
                                    color={color}
                                    anchorX="left"
                                    anchorY="middle"
                                    font={SPACE_MONO_FONT}
                                >
                                    {`${icon} ${isBuy ? "BUY" : "SELL"}`}
                                </Text>

                                {/* Volume */}
                                <Text
                                    position={[0, 0, 0]}
                                    fontSize={0.09}
                                    color={color}
                                    anchorX="center"
                                    anchorY="middle"
                                    outlineWidth={0.003}
                                    outlineColor="#000000"
                                    font={SPACE_MONO_FONT}
                                >
                                    {vol}
                                </Text>

                                {/* Address + Time */}
                                <Text
                                    position={[panelWidth / 2 - 0.25, 0, 0]}
                                    fontSize={0.07}
                                    color="#64748b"
                                    anchorX="right"
                                    anchorY="middle"
                                    font={SPACE_MONO_FONT}
                                >
                                    {`${addr} ${time}`}
                                </Text>
                            </group>
                        );
                    })}
                </group>
            )}
        </DexWindow3D>
    );
}

export default PriceFeedPanel;
