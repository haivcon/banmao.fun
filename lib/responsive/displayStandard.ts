import type { Viewport } from "next";

export type DisplayAppGroup = "platform" | "gamefi" | "defi" | "collection";
export type DisplayDensity = "compact" | "standard" | "expanded" | "wide";

export type DisplayProfile = {
  id: string;
  routePrefix: string;
  group: DisplayAppGroup;
  minimumLayoutWidth: number;
  contentMaxWidth: number;
  readableTextFloor: number;
  touchTarget: number;
};

/**
 * The web-safe viewport shared by every BANMAO route.
 *
 * xKey can override Android smallestScreenWidthDp at Activity level. A website
 * cannot do that safely, so BANMAO keeps a 1:1 CSS viewport and gains density
 * through reflow, wider containers, and additional columns instead.
 */
export function createStandardViewport(themeColor: string): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
    themeColor,
  };
}

export const DISPLAY_SCALE_STORAGE_KEY = "banmao-display-scale-v1";
export const DISPLAY_SCALE_EVENT = "banmao-display-scale-change";
export const DISPLAY_SCALE_OPTIONS = [0.875, 1, 1.125, 1.25] as const;

export const DISPLAY_SCALE_LIMITS = Object.freeze({
  minimum: DISPLAY_SCALE_OPTIONS[0],
  default: DISPLAY_SCALE_OPTIONS[1],
  maximum: DISPLAY_SCALE_OPTIONS[DISPLAY_SCALE_OPTIONS.length - 1],
});

export const DISPLAY_PROFILES = Object.freeze([
  {
    id: "collection",
    routePrefix: "/collection",
    group: "collection",
    minimumLayoutWidth: 320,
    contentMaxWidth: 1600,
    readableTextFloor: 12,
    touchTarget: 44,
  },
  {
    id: "gamefi",
    routePrefix: "/gamefi",
    group: "gamefi",
    minimumLayoutWidth: 320,
    contentMaxWidth: 1600,
    readableTextFloor: 12,
    touchTarget: 44,
  },
  {
    id: "defi",
    routePrefix: "/defi",
    group: "defi",
    minimumLayoutWidth: 320,
    contentMaxWidth: 1520,
    readableTextFloor: 12,
    touchTarget: 44,
  },
  {
    id: "platform",
    routePrefix: "/",
    group: "platform",
    minimumLayoutWidth: 320,
    contentMaxWidth: 1440,
    readableTextFloor: 12,
    touchTarget: 44,
  },
] satisfies readonly DisplayProfile[]);

export function resolveDisplayProfile(pathname: string | null | undefined): DisplayProfile {
  const normalizedPath = pathname?.startsWith("/") ? pathname : "/";
  return DISPLAY_PROFILES.find((profile) => (
    profile.routePrefix === "/"
      ? true
      : normalizedPath === profile.routePrefix || normalizedPath.startsWith(`${profile.routePrefix}/`)
  )) ?? DISPLAY_PROFILES[DISPLAY_PROFILES.length - 1];
}

export function resolveDisplayDensity(viewportWidth: number): DisplayDensity {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 600) return "compact";
  if (viewportWidth < 1200) return "standard";
  if (viewportWidth < 1800) return "expanded";
  return "wide";
}

export function clampDisplayScale(scale: number): number {
  if (!Number.isFinite(scale)) return DISPLAY_SCALE_LIMITS.default;
  return Math.min(DISPLAY_SCALE_LIMITS.maximum, Math.max(DISPLAY_SCALE_LIMITS.minimum, scale));
}

/** Parses both the current numeric value and an optional legacy JSON payload. */
export function parseDisplayScale(serialized: string | null | undefined): number {
  if (!serialized) return DISPLAY_SCALE_LIMITS.default;
  try {
    const parsed: unknown = JSON.parse(serialized);
    const value = typeof parsed === "number"
      ? parsed
      : parsed && typeof parsed === "object" && "scale" in parsed
        ? Number((parsed as { scale?: unknown }).scale)
        : Number.NaN;
    return clampDisplayScale(value);
  } catch {
    return clampDisplayScale(Number(serialized));
  }
}

export function displayProfileCssVariables(profile: DisplayProfile): Record<string, string> {
  return {
    "--bm-app-min-width": `${profile.minimumLayoutWidth}px`,
    "--bm-content-max": `${profile.contentMaxWidth}px`,
    "--bm-readable-text-floor": `${profile.readableTextFloor}px`,
    "--bm-touch-target": `${profile.touchTarget}px`,
    "--bm-display-scale": String(DISPLAY_SCALE_LIMITS.default),
  };
}
