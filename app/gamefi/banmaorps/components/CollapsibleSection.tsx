/**
 * CollapsibleSection Component
 * Section with toggle header that can be collapsed
 */

"use client";

import React, { useCallback } from "react";
import { FaChevronDown } from "react-icons/fa";

export interface CollapsibleSectionProps {
    title: string;
    isCollapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    contentClassName?: string;
    headerId?: string;
    contentId?: string;
    onBeforeToggle?: () => void;
}

export default function CollapsibleSection({
    title,
    isCollapsed,
    onToggle,
    children,
    icon,
    className = "",
    contentClassName = "",
    headerId,
    contentId,
    onBeforeToggle,
}: CollapsibleSectionProps) {
    const handleToggle = useCallback(() => {
        onBeforeToggle?.();
        onToggle();
    }, [onToggle, onBeforeToggle]);

    return (
        <section className={`collapsible-section${isCollapsed ? " collapsible-section--collapsed" : ""} ${className}`}>
            <button
                type="button"
                id={headerId}
                className="collapsible-section__toggle"
                onClick={handleToggle}
                aria-expanded={!isCollapsed}
                aria-controls={contentId}
            >
                {icon && <span className="collapsible-section__icon">{icon}</span>}
                <span className="collapsible-section__title">{title}</span>
                <FaChevronDown
                    className={`collapsible-section__chevron${isCollapsed ? "" : " collapsible-section__chevron--open"}`}
                    aria-hidden="true"
                />
            </button>
            <div
                id={contentId}
                className={`collapsible-section__content ${contentClassName}`}
                hidden={isCollapsed}
                aria-hidden={isCollapsed}
            >
                {children}
            </div>
        </section>
    );
}
