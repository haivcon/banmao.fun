// components/ShareButton.tsx
"use client";

import { useState, useCallback } from "react";
import { FaShare, FaCheck, FaCopy } from "react-icons/fa";
import { shareData, canNativeShare } from "../lib/shareUtils";

interface ShareButtonProps {
    /** Data to share */
    title?: string;
    text?: string;
    url: string;
    /** Button label */
    label?: string;
    /** Show label on button */
    showLabel?: boolean;
    /** Button size variant */
    size?: "small" | "medium" | "large";
    /** Button style variant */
    variant?: "primary" | "secondary" | "ghost";
    /** Callback after successful share */
    onShare?: (method: "native" | "clipboard") => void;
    /** Callback on share error */
    onError?: (error: Error) => void;
    /** Custom class name */
    className?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Aria label for accessibility */
    ariaLabel?: string;
    /** i18n labels */
    labels?: {
        share?: string;
        copied?: string;
        copyFailed?: string;
    };
}

export default function ShareButton({
    title = "BANMAO RPS",
    text,
    url,
    label,
    showLabel = true,
    size = "medium",
    variant = "secondary",
    onShare,
    onError,
    className = "",
    disabled = false,
    ariaLabel,
    labels = {},
}: ShareButtonProps) {
    const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
    const [isSharing, setIsSharing] = useState(false);

    const defaultLabels = {
        share: labels.share || "Share",
        copied: labels.copied || "Copied!",
        copyFailed: labels.copyFailed || "Failed",
    };

    const handleShare = useCallback(async () => {
        if (disabled || isSharing) return;

        setIsSharing(true);
        setStatus("idle");

        try {
            const result = await shareData({ title, text, url });

            if (result.success) {
                if (result.method === "clipboard") {
                    setStatus("copied");
                    setTimeout(() => setStatus("idle"), 2000);
                }
                if (result.method !== "failed") {
                    onShare?.(result.method);
                }
            } else {
                setStatus("failed");
                setTimeout(() => setStatus("idle"), 2000);
            }
        } catch (error) {
            setStatus("failed");
            setTimeout(() => setStatus("idle"), 2000);
            onError?.(error as Error);
        } finally {
            setIsSharing(false);
        }
    }, [title, text, url, disabled, isSharing, onShare, onError]);

    const sizeClasses = {
        small: "share-btn--small",
        medium: "share-btn--medium",
        large: "share-btn--large",
    };

    const variantClasses = {
        primary: "share-btn--primary",
        secondary: "share-btn--secondary",
        ghost: "share-btn--ghost",
    };

    const statusIcon = {
        idle: canNativeShare() ? <FaShare /> : <FaCopy />,
        copied: <FaCheck />,
        failed: <FaCopy />,
    };

    const statusLabel = {
        idle: label || defaultLabels.share,
        copied: defaultLabels.copied,
        failed: defaultLabels.copyFailed,
    };

    return (
        <button
            type="button"
            className={`share-btn ${sizeClasses[size]} ${variantClasses[variant]} ${status !== "idle" ? `share-btn--${status}` : ""} ${className}`}
            onClick={handleShare}
            disabled={disabled || isSharing}
            aria-label={ariaLabel || defaultLabels.share}
            title={ariaLabel || defaultLabels.share}
        >
            <span className="share-btn__icon">{statusIcon[status]}</span>
            {showLabel && <span className="share-btn__label">{statusLabel[status]}</span>}
        </button>
    );
}
