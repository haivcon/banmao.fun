"use client";

import React from "react";
import { Text } from "@react-three/drei";
import { DexWindow3D } from "./DexWindow3D";
import { DEFAULT_3D_FONT } from "../fonts";
import { useWeb3DTheme } from "../contexts";

// Use centralized font configuration
const SPACE_MONO_FONT = DEFAULT_3D_FONT;

interface DexPanel3DProps {
    id: string;
    position: [number, number, number];
    title: string;
    icon: string;
    titleColor?: string; // Optional - will use theme if not provided
    data: { label: string; value: string; color?: string }[];
}

export function DexPanel3D({
    id,
    position,
    title,
    icon,
    titleColor,
    data,
}: DexPanel3DProps) {
    const { primaryColor } = useWeb3DTheme();
    const panelWidth = 3.2;
    const panelHeight = 2.2; // Slightly smaller since title is now in window bar

    return (
        <DexWindow3D
            id={id}
            position={position}
            title={title}
            icon={icon}
            titleColor={titleColor || primaryColor}
            useThemeColor={!titleColor} // Use theme color if no custom color provided
            width={panelWidth}
            height={panelHeight}
        >
            {/* Data rows */}
            {data.map((item, i) => (
                <group key={i} position={[0, panelHeight / 2 - 0.35 - i * 0.42, 0.01]}>
                    <Text
                        position={[-panelWidth / 2 + 0.25, 0, 0]}
                        fontSize={0.11}
                        color="#8892a8"
                        anchorX="left"
                        anchorY="middle"
                        font={SPACE_MONO_FONT}
                    >
                        {item.label}
                    </Text>
                    <Text
                        position={[panelWidth / 2 - 0.25, 0, 0]}
                        fontSize={0.15}
                        color={item.color || "#ffffff"}
                        anchorX="right"
                        anchorY="middle"
                        outlineWidth={0.005}
                        outlineColor="#000000"
                        font={SPACE_MONO_FONT}
                    >
                        {item.value}
                    </Text>
                    {/* Row separator */}
                    {i < data.length - 1 && (
                        <mesh position={[0, -0.2, 0]}>
                            <planeGeometry args={[panelWidth - 0.5, 0.008]} />
                            <meshBasicMaterial color="#2a2a4a" transparent opacity={0.6} />
                        </mesh>
                    )}
                </group>
            ))}
        </DexWindow3D>
    );
}
