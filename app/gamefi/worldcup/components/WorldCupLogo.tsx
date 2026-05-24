"use client";

import type { SeasonBranding } from "../lib/seasonBranding";

interface Props {
    branding: SeasonBranding;
    size?: "sm" | "md";
}

export default function WorldCupLogo({ branding, size = "md" }: Props) {
    return (
        <span
            className={`wc-season-logo wc-season-logo-${size}`}
            style={{
                "--season-accent": branding.accentColor,
                "--season-secondary": branding.secondaryColor,
            } as React.CSSProperties}
            aria-label={branding.title}
        >
            {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.title} />
            ) : (
                <>
                    <span className="wc-season-logo-emblem">
                        <span className="wc-season-logo-globe">
                            <span />
                            <span />
                        </span>
                        <span className="wc-season-logo-trophy">
                            <span className="wc-season-logo-year">{branding.logoText || "26"}</span>
                        </span>
                        <span className="wc-season-logo-base" />
                    </span>
                </>
            )}
        </span>
    );
}
