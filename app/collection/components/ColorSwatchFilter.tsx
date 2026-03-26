"use client";

import React from "react";

const COLOR_MAP: Record<string, string> = {
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    green: "#22c55e",
    cyan: "#06b6d4",
    blue: "#3b82f6",
    purple: "#a855f7",
    pink: "#ec4899",
    white: "#f5f5f5",
    black: "#1a1a1a",
};

const COLOR_NAMES = Object.keys(COLOR_MAP);

interface Props {
    active: string;
    onChange: (color: string) => void;
    counts?: Record<string, number>;
}

/**
 * Visual color swatch filter — replaces dropdown with a row of colored circles.
 * Each swatch shows the actual color with an optional count badge.
 */
export default function ColorSwatchFilter({ active, onChange, counts = {} }: Props) {
    return (
        <div className="col-color-swatches">
            {/* "All" swatch — rainbow gradient */}
            <button
                className={`col-color-swatch col-color-swatch-all${active === "all" ? " active" : ""}`}
                onClick={() => onChange("all")}
                title="All colors"
            />
            {COLOR_NAMES.map((color) => (
                <button
                    key={color}
                    className={`col-color-swatch${active === color ? " active" : ""}`}
                    style={{ background: COLOR_MAP[color] }}
                    onClick={() => onChange(color)}
                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                >
                    {counts[color] ? (
                        <span className="col-color-swatch-count">{counts[color]}</span>
                    ) : null}
                </button>
            ))}
        </div>
    );
}
