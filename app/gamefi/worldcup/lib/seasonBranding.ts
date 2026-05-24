"use client";

import { useEffect, useState } from "react";

export interface SeasonBranding {
    title: string;
    subtitle: string;
    logoUrl: string;
    logoText: string;
    hostText: string;
    accentColor: string;
    secondaryColor: string;
}

export const DEFAULT_SEASON_BRANDING: SeasonBranding = {
    title: "World Cup 2026 Yield Wars",
    subtitle: "USA • Canada • Mexico · 48-team tournament pools",
    logoUrl: "",
    logoText: "26",
    hostText: "FIFA-style 2026 season",
    accentColor: "#34d399",
    secondaryColor: "#f59e0b",
};

export const SEASON_BRANDING_KEY = "wc_season_branding_v1";

export function readSeasonBranding(): SeasonBranding {
    if (typeof window === "undefined") return DEFAULT_SEASON_BRANDING;
    try {
        const raw = localStorage.getItem(SEASON_BRANDING_KEY);
        if (!raw) return DEFAULT_SEASON_BRANDING;
        return { ...DEFAULT_SEASON_BRANDING, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SEASON_BRANDING;
    }
}

export function saveSeasonBranding(next: SeasonBranding) {
    localStorage.setItem(SEASON_BRANDING_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("wc-season-branding-updated", { detail: next }));
}

export function useSeasonBranding() {
    const [branding, setBranding] = useState<SeasonBranding>(DEFAULT_SEASON_BRANDING);

    useEffect(() => {
        setBranding(readSeasonBranding());
        const sync = () => setBranding(readSeasonBranding());
        window.addEventListener("storage", sync);
        window.addEventListener("wc-season-branding-updated", sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("wc-season-branding-updated", sync);
        };
    }, []);

    return branding;
}
