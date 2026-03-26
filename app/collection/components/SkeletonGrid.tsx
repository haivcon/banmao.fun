"use client";

import React from "react";

/**
 * Skeleton grid placeholder shown during initial data fetch.
 * Matches the gallery card layout with shimmer animation.
 */
export default function SkeletonGrid({ cols = 5, count = 24 }: { cols?: number; count?: number }) {
    return (
        <div
            className="col-skeleton-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="col-skeleton-card">
                    <div className="col-skeleton-img" />
                    <div className="col-skeleton-text">
                        <div className="col-skeleton-line col-skeleton-line-w70" />
                        <div className="col-skeleton-line col-skeleton-line-w40" />
                    </div>
                </div>
            ))}
        </div>
    );
}
