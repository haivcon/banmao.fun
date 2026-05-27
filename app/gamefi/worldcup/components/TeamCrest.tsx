"use client";
import React, { useState } from "react";

interface Props {
    code: string;
    name: string;
    color: string;
    colorSecondary?: string;
    size?: "sm" | "md" | "lg";
}

export default function TeamCrest({ code, name, color, colorSecondary, size = "md" }: Props) {
    const [imgError, setImgError] = useState(false);
    const mascotSrc = `/mascots/${code.slice(0, 3).toUpperCase()}.png?v=3`;

    if (!imgError) {
        return (
            <span
                className={`wc-crest wc-crest-${size} wc-crest-has-img`}
                title={name}
                aria-label={name}
                style={{
                    "--team-color": color,
                    "--team-color-secondary": colorSecondary || color,
                } as React.CSSProperties}
            >
                <img
                    className="wc-crest-img"
                    src={mascotSrc}
                    alt={name}
                    onError={() => setImgError(true)}
                    draggable={false}
                />
            </span>
        );
    }

    return (
        <span
            className={`wc-crest wc-crest-${size}`}
            title={name}
            aria-label={name}
            style={{
                "--team-color": color,
                "--team-color-secondary": colorSecondary || color,
            } as React.CSSProperties}
        >
            <span className="wc-crest-top" />
            <span className="wc-crest-mark">{code.slice(0, 3).toUpperCase()}</span>
            <span className="wc-crest-cut" />
        </span>
    );
}
