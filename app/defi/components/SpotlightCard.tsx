"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import "./SpotlightCard.css";

interface SpotlightCardProps extends React.PropsWithChildren {
    href?: string;
    className?: string;
    spotlightColor?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
    children,
    href,
    className = "",
    spotlightColor = "rgba(0, 212, 255, 0.2)",
    onClick,
    style
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setPosition({ x, y });

        // 3D TILT EFFECT
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation based on cursor position (max 15 degrees)
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        divRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleFocus = () => {
        setOpacity(1);
    };

    const handleBlur = () => {
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
        // Reset tilt on leave
        if (divRef.current) {
            divRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        }
    };

    const CardContent = (
        <div
            ref={divRef}
            className={`spotlight-card ${className}`}
            onClick={onClick} /* Card click */
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
        >
            <div
                className="spotlight-card-glow"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`
                }}
            />
            <div className="spotlight-card-content">
                {children}
            </div>
        </div>
    );

    // If href is provided, wrap in Link but note that children buttons need e.stopPropagation()
    if (href) {
        return (
            <Link href={href} className="spotlight-card-link">
                {CardContent}
            </Link>
        );
    }

    return CardContent;
};
