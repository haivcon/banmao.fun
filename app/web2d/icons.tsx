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
                </SvgIcon>
            );
        case "seedling":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22V10" />
                    <path {...strokeProps} d="M6 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    <path {...strokeProps} d="M12 10c0-3-2.5-5-6-6 0 3.5 2.5 6 6 6Z" />
                    <path {...strokeProps} d="M12 10c0-3 2.5-5 6-6 0 3.5-2.5 6-6 6Z" />
                </SvgIcon>
            );
        case "cat":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22c4.4 0 8-2.7 8-6V7l-3-4-2 2-3-2-3 2-2-2L4 7v9c0 3.3 3.6 6 8 6Z" />
                    <path {...strokeProps} d="M10 14h.01M14 14h.01M10 17c.8.7 1.4 1 2 1s1.2-.3 2-1" />
                </SvgIcon>
            );
        case "sparkles":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z" />
                    <path {...strokeProps} d="m5 19-1 2.5L6.5 20 9 21l-1-2.5L9 16l-2.5 1L4 16l1 2.5Z" />
                </SvgIcon>
            );
        case "parachute":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M4 12a8 8 0 0 1 16 0" />
                    <path {...strokeProps} d="M4 12c2 2 3-2 4 0s2 2 4 0 2-2 4 0 2 2 4 0" />
                    <path {...strokeProps} d="M8 12v1l4 7 4-7v-1" />
                </SvgIcon>
            );
        case "rocket":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 15c-2.4 0-4 1.2-4 4h8c0-2.8-1.6-4-4-4Z" />
                    <path {...strokeProps} d="M12 2c-3 4-4 7.4-4 13h8c0-5.6-1-9-4-13Z" />
                    <path {...strokeProps} d="M7 18c-1-1-3-1-4 0 1 1 3 3 4 2ZM17 18c1-1 3-1 4 0-1 1-3 3-4 2Z" />
                    <circle fill="currentColor" cx="12" cy="11" r="1.5" />
                </SvgIcon>
            );
        case "droplet":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22a7 7 0 0 1-7-7c0-4 7-12 7-12s7 8 7 12a7 7 0 0 1-7 7Z" />
                </SvgIcon>
            );
        case "wheat":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22V12M8 8l4 4 4-4M6 12l6 4 6-4M4 16l8 4 8-4" />
                </SvgIcon>
            );
        case "bank":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M3 21h18M4 18h16M5 14V9M9 14V9M15 14V9M19 14V9" />
                    <path {...strokeProps} d="M12 3 2 9h20L12 3Z" />
                </SvgIcon>
            );
        case "chat":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
                </SvgIcon>
            );
        case "x":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M4 4l6.5 8L4 20h2l5.3-6.5L15 20h5l-6.8-8.3L19.5 4h-2l-5 6L9 4H4Z" />
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

        /* === NEW ICONS FOR REDESIGN === */
        case "twitter":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M4 4l6.5 8L4 20h2l5.3-6.5L15 20h5l-6.8-8.3L19.5 4h-2l-5 6L9 4H4Z" />
                </SvgIcon>
            );
        case "telegram":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M21 3 9.5 13.5M21 3l-7 18-3.5-7.5L3 10l18-7Z" />
                </SvgIcon>
            );
        case "users":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle {...strokeProps} cx="9" cy="7" r="4" />
                    <path {...strokeProps} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </SvgIcon>
            );
        case "zap":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
                </SvgIcon>
            );
        case "star":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="m12 2 3.1 6.3L22 9.3l-5 4.8 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.8 6.9-1L12 2Z" />
                </SvgIcon>
            );
        case "shield":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path {...strokeProps} d="m9 12 2 2 4-4" />
                </SvgIcon>
            );
        case "heart":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
                </SvgIcon>
            );
        case "arrow-right":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M5 12h14M12 5l7 7-7 7" />
                </SvgIcon>
            );
        case "external-link":
            return (
                <SvgIcon {...props}>
                    <path {...strokeProps} d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
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

