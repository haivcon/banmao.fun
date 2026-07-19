"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

function SvgIcon({ children, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
            {children}
        </svg>
    );
}

export function Web2DIcon({ name, className }: { name: string; className?: string }) {
    const props = { className };

    switch (name) {
        case "gamepad":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M7.2 9.2h9.6a4.4 4.4 0 0 1 4.2 3.1l.8 2.7a3.1 3.1 0 0 1-5.3 3l-1.4-1.5H8.9L7.5 18a3.1 3.1 0 0 1-5.3-3l.8-2.7a4.4 4.4 0 0 1 4.2-3.1Z" />
                    <path {...strokeProps} d="M8 12v3M6.5 13.5h3M16.5 13h.01M18.8 15h.01" />
                    <path {...strokeProps} d="M9 9.2V7.8A1.8 1.8 0 0 1 10.8 6h2.4A1.8 1.8 0 0 0 15 4.2V4" />
                </SvgIcon>
            );
        case "diamond":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m12 21 9-11-4-6H7l-4 6 9 11Z" />
                    <path {...strokeProps} d="M3 10h18M7 4l5 17 5-17M7 4l5 6 5-6" />
                </SvgIcon>
            );
        case "gallery":
            return (
                <SvgIcon {...props}>
                    <rect {...strokeProps} x="3" y="5" width="18" height="14" rx="2" />
                    <path {...strokeProps} d="m7 15 3-3 3 3 2-2 3 3M8 9h.01" />
                </SvgIcon>
            );
        case "fist":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M7 12V7.8a1.8 1.8 0 1 1 3.6 0V12" />
                    <path {...strokeProps} d="M10.6 12V6.8a1.8 1.8 0 1 1 3.6 0V12" />
                    <path {...strokeProps} d="M14.2 12V8a1.8 1.8 0 1 1 3.6 0v5.8A6.2 6.2 0 0 1 11.6 20H11a6 6 0 0 1-6-6v-2.4a1.8 1.8 0 0 1 3.6 0V14" />
                </SvgIcon>
            );
        case "snake":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M16 5.5c2.3 0 4 1.5 4 3.6s-1.6 3.5-4 3.5H9.2A3.2 3.2 0 0 0 6 15.8 3.2 3.2 0 0 0 9.2 19H18" />
                    <path {...strokeProps} d="M16 5.5H8.5A4.5 4.5 0 0 0 4 10" />
                    <path {...strokeProps} d="M17.8 8.3h.01M20 8.2l1.2-.7" />
                </SvgIcon>
            );
        case "slots":
            return (
                <SvgIcon {...props}>
                    <rect {...strokeProps} x="4" y="5" width="14" height="15" rx="2" />
                    <path {...strokeProps} d="M18 8h2a2 2 0 0 1 0 4h-2M7 9h8M7 13h8M7 17h8" />
                    <path {...strokeProps} d="M9 9v8M13 9v8" />
                </SvgIcon>
            );
        case "pickaxe":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m14 7 6 6M4 20l9-9" />
                    <path {...strokeProps} d="M8 5c3-2 7-1.5 10 1.5L15.5 9C13 6.5 10 5.5 8 5Z" />
                </SvgIcon>
            );
        case "flame":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22c4 0 7-2.8 7-6.8 0-2.8-1.5-5-4.2-6.8.2 2-1 3.1-2.4 3.9.5-3.1-.8-5.5-3.6-7.3.2 4-3.8 5.9-3.8 10.2C5 19.2 8 22 12 22Z" />
                    <path {...strokeProps} d="M12 18c1.7 0 3-1.2 3-2.9 0-1.2-.6-2.1-1.8-2.9.1.9-.4 1.5-1 1.9.2-1.4-.4-2.4-1.5-3.1.1 1.8-1.7 2.6-1.7 4.5 0 1.5 1.3 2.5 3 2.5Z" />
                </SvgIcon>
            );
        case "trophy":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
                    <path {...strokeProps} d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3M12 12v4M9 20h6M10 16h4" />
                </SvgIcon>
            );
        case "seedling":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 21V10" />
                    <path {...strokeProps} d="M12 10c0-3.2 2.4-5.7 6-6 0 3.6-2.6 6-6 6Z" />
                    <path {...strokeProps} d="M12 13c0-2.8-2.1-4.9-5.4-5.1C6.6 11 8.9 13 12 13Z" />
                </SvgIcon>
            );
        case "parachute":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M4 10a8 8 0 0 1 16 0H4Z" />
                    <path {...strokeProps} d="M4 10l5 6M20 10l-5 6M12 10v6" />
                    <rect {...strokeProps} x="9" y="16" width="6" height="4" rx="1" />
                </SvgIcon>
            );
        case "rocket":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M14 4c2.8 0 4.8.7 6 2-1.3 5.2-4 8.8-8.2 10.8L7.2 12.2C9.2 8 12.8 5.3 18 4Z" />
                    <path {...strokeProps} d="M7 13 4 16l4 1 1 4 3-3M15 8.5h.01" />
                </SvgIcon>
            );
        case "droplet":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22a7 7 0 0 0 7-7c0-4.7-7-13-7-13S5 10.3 5 15a7 7 0 0 0 7 7Z" />
                </SvgIcon>
            );
        case "wheat":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22V3M8 6c0 2 1.5 3.5 4 3.5M16 6c0 2-1.5 3.5-4 3.5M8 11c0 2 1.5 3.5 4 3.5M16 11c0 2-1.5 3.5-4 3.5M8 16c0 2 1.5 3.5 4 3.5M16 16c0 2-1.5 3.5-4 3.5" />
                </SvgIcon>
            );
        case "bank":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M3 10h18L12 4 3 10ZM5 10v8M9 10v8M15 10v8M19 10v8M4 18h16M3 21h18" />
                </SvgIcon>
            );
        case "cat":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M6 9 4 4l5 2.2A8 8 0 0 1 12 6a8 8 0 0 1 3 .6L20 4l-2 5a7 7 0 0 1 1 3.6C19 17 16 20 12 20s-7-3-7-7.4A7 7 0 0 1 6 9Z" />
                    <path {...strokeProps} d="M9 12h.01M15 12h.01M10 16h4" />
                </SvgIcon>
            );
        case "sparkles":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z" />
                </SvgIcon>
            );
        case "x":
            return (
                <SvgIcon {...props}>
                    <path fill="currentColor" d="M17.7 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.4 21H2.3l7.3-8.4L2 3h6.4l4.4 5.8L17.7 3Zm-1.1 16.2h1.7L7.5 4.7H5.7l10.9 14.5Z" />
                </SvgIcon>
            );
        case "chat":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.3-4A8 8 0 1 1 21 12Z" />
                    <path {...strokeProps} d="M8 11h8M8 15h5" />
                </SvgIcon>
            );
        case "target":
            return (
                <SvgIcon {...props}>
                    <circle {...strokeProps} cx="12" cy="12" r="8" />
                    <circle {...strokeProps} cx="12" cy="12" r="4" />
                    <circle fill="currentColor" cx="12" cy="12" r="1.4" />
                </SvgIcon>
            );
        case "download":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 3v11M8 10l4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                </SvgIcon>
            );
        case "chart-bar":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                </SvgIcon>
            );
        case "trending-up":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m3 17 6-6 4 4 7-8" />
                    <path {...strokeProps} d="M14 7h6v6" />
                </SvgIcon>
            );
        case "pie":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 3v9h9A9 9 0 1 1 12 3Z" />
                    <path {...strokeProps} d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
                </SvgIcon>
            );
        case "search":
            return (
                <SvgIcon {...props}>
                    <circle {...strokeProps} cx="11" cy="11" r="7" />
                    <path {...strokeProps} d="m16 16 5 5" />
                </SvgIcon>
            );
        case "bolt":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
                </SvgIcon>
            );
        case "compass":
            return (
                <SvgIcon {...props}>
                    <circle {...strokeProps} cx="12" cy="12" r="9" />
                    <path {...strokeProps} d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
                </SvgIcon>
            );
        case "globe":
            return (
                <SvgIcon {...props}>
                    <circle {...strokeProps} cx="12" cy="12" r="9" />
                    <path {...strokeProps} d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z" />
                </SvgIcon>
            );
        case "settings":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                    <path {...strokeProps} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .3 1.7 1.7 0 0 0-.8 1.6V22h-4v-.2a1.7 1.7 0 0 0-.8-1.6 1.7 1.7 0 0 0-2-.3l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1.2H4v-4h.2a1.7 1.7 0 0 0 1.4-1.2 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.3 1.7 1.7 0 0 0 .8-1.6V2h4v.2a1.7 1.7 0 0 0 .8 1.6 1.7 1.7 0 0 0 2 .3l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1.2h.2v4h-.2A1.7 1.7 0 0 0 19.4 15Z" />
                </SvgIcon>
            );
        case "chevron-down":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m6 9 6 6 6-6" />
                </SvgIcon>
            );
        default:
            return (
                <SvgIcon {...props}>
                    <rect {...strokeProps} x="4" y="4" width="16" height="16" rx="4" />
                    <path {...strokeProps} d="M8 12h8M12 8v8" />
                </SvgIcon>
            );
    }
}