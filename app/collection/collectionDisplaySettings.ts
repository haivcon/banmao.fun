export const COLLECTION_DISPLAY_STORAGE_KEY = "banmao-collection-display-v1";
export const COLLECTION_DISPLAY_EVENT = "banmao-collection-display-change";

export const COLLECTION_CONTENT_WIDTHS = ["focused", "wide", "full"] as const;
export const COLLECTION_CARD_SIZES = ["large", "medium", "small"] as const;
export const COLLECTION_DENSITIES = ["comfortable", "compact"] as const;

export type CollectionContentWidth = (typeof COLLECTION_CONTENT_WIDTHS)[number];
export type CollectionCardSize = (typeof COLLECTION_CARD_SIZES)[number];
export type CollectionDensity = (typeof COLLECTION_DENSITIES)[number];

export type CollectionDisplaySettings = {
  contentWidth: CollectionContentWidth;
  cardSize: CollectionCardSize;
  density: CollectionDensity;
  showCardInfo: boolean;
};

export const DEFAULT_COLLECTION_DISPLAY_SETTINGS: CollectionDisplaySettings = Object.freeze({
  contentWidth: "wide",
  cardSize: "medium",
  density: "comfortable",
  showCardInfo: true,
});

const includes = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && values.includes(value as T);

export function normalizeCollectionDisplaySettings(value: unknown): CollectionDisplaySettings {
  const input = value && typeof value === "object" ? value as Partial<CollectionDisplaySettings> : {};
  return {
    contentWidth: includes(COLLECTION_CONTENT_WIDTHS, input.contentWidth) ? input.contentWidth : DEFAULT_COLLECTION_DISPLAY_SETTINGS.contentWidth,
    cardSize: includes(COLLECTION_CARD_SIZES, input.cardSize) ? input.cardSize : DEFAULT_COLLECTION_DISPLAY_SETTINGS.cardSize,
    density: includes(COLLECTION_DENSITIES, input.density) ? input.density : DEFAULT_COLLECTION_DISPLAY_SETTINGS.density,
    showCardInfo: typeof input.showCardInfo === "boolean" ? input.showCardInfo : DEFAULT_COLLECTION_DISPLAY_SETTINGS.showCardInfo,
  };
}

export function parseCollectionDisplaySettings(serialized: string | null): CollectionDisplaySettings {
  if (!serialized) return { ...DEFAULT_COLLECTION_DISPLAY_SETTINGS };
  try { return normalizeCollectionDisplaySettings(JSON.parse(serialized)); }
  catch { return { ...DEFAULT_COLLECTION_DISPLAY_SETTINGS }; }
}

export function collectionCardTargetColumns(cardSize: CollectionCardSize, mobile: boolean): number {
  if (mobile) return cardSize === "large" ? 2 : cardSize === "small" ? 4 : 3;
  return cardSize === "large" ? 3 : cardSize === "small" ? 9 : 5;
}

export function collectionContentMaxWidth(contentWidth: CollectionContentWidth): string {
  return contentWidth === "focused" ? "1120px" : contentWidth === "full" ? "none" : "1600px";
}

export function collectionDensityGap(density: CollectionDensity, containerWidth: number): number {
  if (containerWidth <= 640) return density === "compact" ? 3 : 5;
  return density === "compact" ? 10 : 16;
}
