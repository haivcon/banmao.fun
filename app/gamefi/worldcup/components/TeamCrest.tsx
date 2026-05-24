"use client";
import React from "react";

interface Props {
    code: string;
    name: string;
    color: string;
    colorSecondary?: string;
    size?: "sm" | "md" | "lg";
}

export default function TeamCrest({ code, name, color, colorSecondary, size = "md" }: Props) {
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
