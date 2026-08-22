import {
  DEFAULT_COLLECTION_DISPLAY_SETTINGS,
  collectionCardTargetColumns,
  collectionContentMaxWidth,
  collectionDensityGap,
  normalizeCollectionDisplaySettings,
  parseCollectionDisplaySettings,
} from "../app/collection/collectionDisplaySettings";

test("display settings parse valid browser-local preferences", () => {
  expect(parseCollectionDisplaySettings(JSON.stringify({ contentWidth: "full", cardSize: "small", density: "compact", showCardInfo: false }))).toEqual({ contentWidth: "full", cardSize: "small", density: "compact", showCardInfo: false });
});

test("invalid and partial settings migrate safely to defaults", () => {
  expect(parseCollectionDisplaySettings("not-json")).toEqual(DEFAULT_COLLECTION_DISPLAY_SETTINGS);
  expect(normalizeCollectionDisplaySettings({ cardSize: "tiny", showCardInfo: false })).toEqual({ ...DEFAULT_COLLECTION_DISPLAY_SETTINGS, showCardInfo: false });
});

test("card presets remain responsive and density changes only spacing", () => {
  expect(collectionCardTargetColumns("small", false)).toBe(9);
  expect(collectionCardTargetColumns("small", true)).toBe(4);
  expect(collectionCardTargetColumns("large", true)).toBe(2);
  expect(collectionDensityGap("compact", 1200)).toBeLessThan(collectionDensityGap("comfortable", 1200));
  expect(collectionDensityGap("compact", 390)).toBeLessThan(collectionDensityGap("comfortable", 390));
});

test("content width presets expose bounded CSS values", () => {
  expect(collectionContentMaxWidth("focused")).toBe("1120px");
  expect(collectionContentMaxWidth("wide")).toBe("1600px");
  expect(collectionContentMaxWidth("full")).toBe("none");
});
