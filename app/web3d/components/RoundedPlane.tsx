"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface RoundedPlaneProps {
    width: number;
    height: number;
    radius?: number;
    position?: [number, number, number];
    children?: React.ReactNode;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    onClick?: () => void;
}

/**
 * A flat 2D plane with rounded corners using THREE.Shape
 * Unlike RoundedBox, this is a flat plane, not a 3D box
 */
export function RoundedPlane({
    width,
    height,
    radius = 0.1,
    position = [0, 0, 0],
    children,
    onPointerEnter,
    onPointerLeave,
    onClick,
}: RoundedPlaneProps) {
    const geometry = useMemo(() => {
        // Limit radius to half the smallest dimension
        const r = Math.min(radius, width / 2, height / 2);
        const x = -width / 2;
        const y = -height / 2;

        const shape = new THREE.Shape();

        // Start from bottom-left + radius
        shape.moveTo(x + r, y);

        // Bottom edge
        shape.lineTo(x + width - r, y);
        // Bottom-right corner
        shape.quadraticCurveTo(x + width, y, x + width, y + r);

        // Right edge
        shape.lineTo(x + width, y + height - r);
        // Top-right corner
        shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);

        // Top edge
        shape.lineTo(x + r, y + height);
        // Top-left corner
        shape.quadraticCurveTo(x, y + height, x, y + height - r);

        // Left edge
        shape.lineTo(x, y + r);
        // Bottom-left corner
        shape.quadraticCurveTo(x, y, x + r, y);

        return new THREE.ShapeGeometry(shape);
    }, [width, height, radius]);

    return (
        <mesh
            geometry={geometry}
            position={position}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onClick={onClick}
        >
            {children}
        </mesh>
    );
}
