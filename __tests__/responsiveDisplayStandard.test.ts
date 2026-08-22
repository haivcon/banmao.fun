import {
  DISPLAY_PROFILES,
  DISPLAY_SCALE_LIMITS,
  DISPLAY_SCALE_OPTIONS,
  DISPLAY_SCALE_STORAGE_KEY,
  clampDisplayScale,
  createDesktopViewport,
  createStandardViewport,
  DESKTOP_CANVAS_WIDTH,
  parseDisplayScale,
  resolveDisplayDensity,
  resolveDisplayProfile,
} from "../lib/responsive/displayStandard";

test("all application groups share a zoomable 1:1 web viewport", () => {
  for (const color of ["#a855f7", "#22d3ee", "#05070d", "#f472b6"]) {
    expect(createStandardViewport(color)).toMatchObject({
      width: "device-width",
      initialScale: 1,
      maximumScale: 5,
      userScalable: true,
      viewportFit: "cover",
      themeColor: color,
    });
  }
});

test("desktop viewport preserves user zoom while exposing the full canvas", () => {
  expect(createDesktopViewport("#05070d")).toMatchObject({
    width: DESKTOP_CANVAS_WIDTH,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  });
  expect(createDesktopViewport("#05070d").initialScale).toBeUndefined();
});

test("route profiles classify desktop canvases and responsive exceptions", () => {
  expect(resolveDisplayProfile("/collection")).toMatchObject({ group: "collection", mode: "desktop-canvas" });
  expect(resolveDisplayProfile("/collection/creator/banmao").mode).toBe("desktop-canvas");
  expect(resolveDisplayProfile("/defi").mode).toBe("desktop-canvas");
  expect(resolveDisplayProfile("/defi/staking")).toMatchObject({ group: "defi", mode: "responsive" });
  expect(resolveDisplayProfile("/gamefi/banmaorps/room/42")).toMatchObject({ group: "gamefi", mode: "desktop-canvas" });
  expect(resolveDisplayProfile("/gamefi/banmaosnake").mode).toBe("responsive");
  expect(resolveDisplayProfile("/gamefi/banmaofomo/round/2").mode).toBe("responsive");
  expect(resolveDisplayProfile("/")).toMatchObject({ group: "platform", mode: "responsive" });
  expect(resolveDisplayProfile("/unknown-future-route").group).toBe("platform");
  expect(DISPLAY_PROFILES.filter((profile) => profile.mode === "responsive").every((profile) => profile.minimumLayoutWidth <= 320)).toBe(true);
  expect(DISPLAY_PROFILES.filter((profile) => profile.mode === "desktop-canvas").every((profile) => profile.minimumLayoutWidth === DESKTOP_CANVAS_WIDTH)).toBe(true);
});

test("route layouts publish desktop canvases and preserve responsive exceptions", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
  for (const file of [
    "app/defi/layout.tsx",
    "app/defi/box/layout.tsx",
    "app/gamefi/layout.tsx",
    "app/gamefi/banmaorps/layout.tsx",
    "app/gamefi/banmaoslots/layout.tsx",
    "app/gamefi/admin/layout.tsx",
    "app/collection/layout.tsx",
  ]) expect(read(file)).toContain("createDesktopViewport");
  for (const file of [
    "app/defi/staking/layout.tsx",
    "app/gamefi/banmaosnake/layout.tsx",
    "app/gamefi/banmaofomo/layout.tsx",
  ]) expect(read(file)).toContain("createStandardViewport");
});

test("real viewport width selects density while display scale remains safely clamped", () => {
  expect(resolveDisplayDensity(320)).toBe("compact");
  expect(resolveDisplayDensity(768)).toBe("standard");
  expect(resolveDisplayDensity(1440)).toBe("expanded");
  expect(resolveDisplayDensity(2560)).toBe("wide");
  expect(clampDisplayScale(0.5)).toBe(DISPLAY_SCALE_LIMITS.minimum);
  expect(clampDisplayScale(1)).toBe(1);
  expect(clampDisplayScale(2)).toBe(DISPLAY_SCALE_LIMITS.maximum);
  expect(clampDisplayScale(Number.NaN)).toBe(DISPLAY_SCALE_LIMITS.default);
});

test("website scale presets persist as a versioned, safely parsed preference", () => {
  expect(DISPLAY_SCALE_STORAGE_KEY).toBe("banmao-display-scale-v1");
  expect(DISPLAY_SCALE_OPTIONS).toEqual([0.875, 1, 1.125, 1.25]);
  expect(parseDisplayScale("1.125")).toBe(1.125);
  expect(parseDisplayScale(JSON.stringify({ scale: 1.25 }))).toBe(1.25);
  expect(parseDisplayScale("2")).toBe(DISPLAY_SCALE_LIMITS.maximum);
  expect(parseDisplayScale("invalid")).toBe(DISPLAY_SCALE_LIMITS.default);
  expect(parseDisplayScale(null)).toBe(DISPLAY_SCALE_LIMITS.default);
});
