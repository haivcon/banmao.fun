/**
 * SectionHeading Component
 * Heading with optional refresh button
 */

"use client";

import React from "react";
import { FaSyncAlt } from "react-icons/fa";

export interface SectionHeadingProps {
    title: string;
    refreshLabel?: string;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    showRefresh?: boolean;
    className?: string;
}

export default function SectionHeading({
    title,
    refreshLabel = "Refresh",
    isRefreshing = false,
    onRefresh,
    showRefresh = false,
    className = "",
}: SectionHeadingProps) {
    return (
        <div className={`section-heading ${className}`}>
            <h3 className="glowing-title">{title}</h3>
            {showRefresh && onRefresh && (
                <button
                    type="button"
                    className={`icon-refresh-button section-heading__refresh${isRefreshing ? " icon-refresh-button--spinning" : ""
                        }`}
                    onClick={onRefresh}
                    title={refreshLabel}
                    aria-label={refreshLabel}
                    disabled={isRefreshing}
                >
                    <FaSyncAlt className="icon-refresh-button__icon" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
