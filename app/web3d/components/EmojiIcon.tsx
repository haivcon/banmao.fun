"use client";

import React from "react";
import { Html } from "@react-three/drei";

interface EmojiIconProps {
    emoji: string;
    position?: [number, number, number];
    size?: number;
    shadow?: boolean;
}

/**
 * Renders a colorful emoji in 3D space using Html component
 * This allows native browser emoji rendering with full color support
 */
export function EmojiIcon({
    emoji,
    position = [0, 0, 0],
    size = 14,
    shadow = true,
}: EmojiIconProps) {
    return (
        <Html
            center
            position={position}
            style={{ pointerEvents: 'none' }}
            distanceFactor={8}
        >
            <span style={{
                fontSize: `${size}px`,
                filter: shadow ? 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' : 'none',
                userSelect: 'none',
                lineHeight: 1,
            }}>
                {emoji}
            </span>
        </Html>
    );
}
