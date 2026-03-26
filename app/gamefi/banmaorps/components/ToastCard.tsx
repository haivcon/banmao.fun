/**
 * ToastCard Component
 * Styled toast notification with close button and actions
 */

"use client";

import React from "react";

export interface ToastCardProps {
    title: string;
    body?: string;
    accent?: "alert" | "success" | "error" | "warning" | "info";
    onClose?: () => void;
    actions?: Array<{
        label: string;
        onClick: () => void;
        secondary?: boolean;
    }>;
    children?: React.ReactNode;
    className?: string;
}

export default function ToastCard({
    title,
    body,
    accent = "alert",
    onClose,
    actions,
    children,
    className = "",
}: ToastCardProps) {
    return (
        <div className={`toast-card toast-card--${accent} ${className}`}>
            {onClose && (
                <button
                    className="toast-close"
                    aria-label="Close notification"
                    onClick={onClose}
                >
                    ×
                </button>
            )}
            <div className="toast-text">
                <strong>{title}</strong>
                {body && <span>{body}</span>}
                {children}
            </div>
            {actions && actions.length > 0 && (
                <div className="toast-actions">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            className={`table-action-button${action.secondary ? " secondary" : ""}`}
                            onClick={action.onClick}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
