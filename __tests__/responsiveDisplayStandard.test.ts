import {
  DISPLAY_PROFILES,
  DISPLAY_SCALE_LIMITS,
  DISPLAY_SCALE_OPTIONS,
  DISPLAY_SCALE_STORAGE_KEY,
  clampDisplayScale,
  createStandardViewport,
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

test("route profiles classify current and future nested apps", () => {
  expect(resolveDisplayProfile("/collection").group).toBe("collection");
  expect(resolveDisplayProfile("/collection/creator/banmao").group).toBe("collection");
  expect(resolveDisplayProfile("/defi/staking").group).toBe("defi");
  expect(resolveDisplayProfile("/gamefi/banmaorps/room/42").group).toBe("gamefi");
  expect(resolveDisplayProfile("/").group).toBe("platform");
  expect(resolveDisplayProfile("/unknown-future-route").group).toBe("platform");
  expect(DISPLAY_PROFILES.every((profile) => profile.minimumLayoutWidth <= 320)).toBe(true);
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
