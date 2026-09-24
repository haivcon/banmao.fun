import expansion from "./expansion.json";
import royal from './royal-contract.json';
const KING_BODY = { name: royal.BODY_NAME, color: royal.BODY_COLOR, shade: royal.BODY_SHADE };
const KING_BACKGROUND = { name: royal.BACKGROUND_NAME, color: royal.BACKGROUND_COLOR, accent: royal.BACKGROUND_ACCENT };
export const BODY_TRAITS = [
  { name: "Golden Banana", color: "#ffe53b", shade: "#d9ad14" },
  { name: "Ripe Sunshine", color: "#fff36b", shade: "#efbe28" },
  { name: "Lime Banana", color: "#b9e44a", shade: "#76b83d" },
  { name: "Peach Banana", color: "#ffad6b", shade: "#e06b45" },
  { name: "Cyborg Suit", color: "#d8d8d8", shade: "#777777" },
  ...expansion.bodies,
  KING_BODY,
  { name: "Frost Suit", color: "#b4efff", shade: "#4e9fc9" },
] as const;

export const EXPRESSION_TRAITS = [
  "Happy Smile",
  "Joy",
  "Wink",
  "Love Eyes",
  "Sleepy",
  "Surprised",
  "Determined",
  "Teary",
  "Silly",
  "Cool Gaze",
  "Starstruck",
  "Zen",
  ...expansion.expressions.map(v => v.name),
] as const;

export const ACCESSORY_TRAITS = [
  "None",
  "King Crown",
  "Red Bow",
  "Round Glasses",
  "Pixel Shades",
  "Party Hat",
  "AK Rifle",
  "Flying Sword",
  "Headphones",
  "Wizard Hat",
  "Halo",
  "Star Lantern",
  ...expansion.accessories.map(v => v.name),
  'Imperial Regalia',
  'Mini Banmao',
  'Boxing Gloves',
  'Green Candles',
  'Ruby Wine Glass',
] as const;

// Public accessory IDs equal catalogue ordinals (1–25). Artwork indices are private.
export const ACCESSORY_IDS: readonly number[] = Array.from({ length: ACCESSORY_TRAITS.length }, (_, index) => index + 1);
/** Convert validated public IDs to the canonical artwork dispatch index. */
export function accessoryArtworkIndex(id: number): number {
  if (!Number.isInteger(id) || id < 1 || id > ACCESSORY_TRAITS.length) throw new RangeError('Invalid accessory ID');
  // Artwork slot 23 is retired. Public IDs remain contiguous: 24/25 must
  // dispatch to slots 24/25 (Green Candles / Ruby Wine Glass), not 23/24.
  return id <= 23 ? id - 1 : id;
}
export const accessoryIndex = (id: number): number => ACCESSORY_IDS.indexOf(id);
export const accessoryName = (id: number): string | undefined => ACCESSORY_TRAITS[accessoryIndex(id)];

export const BACKGROUND_TRAITS = [
  { name: "Banana Cream", color: "#D8CDBD", accent: "#ffe76a" },
  { name: "Cyberpunk Nexus", color: "#101329", accent: "#75f7ec" },
  { name: "Mint Bubbles", color: "#75d7c3", accent: "#eafffa" },
  { name: "Royal Split", color: "#7766cc", accent: "#493b9b" },
  { name: "Midnight Grid", color: "#17233d", accent: "#5ed3ff" },
  { name: "Mango Burst", color: "#ffcf61", accent: "#ff7f50" },
  { name: "Candy Ring", color: "#ffb8dc", accent: "#ffffff" },
  { name: "Cloud Blue", color: "#b9d8ff", accent: "#e9f4ff" },
  ...expansion.backgrounds,
  KING_BACKGROUND,
] as const;

export type BanmaoKingTraitSelection = {
  body: number;
  expression: number;
  accessory: number;
  background: number;
};

export const TOTAL_COMBINATIONS =
  BODY_TRAITS.length *
  EXPRESSION_TRAITS.length *
  ACCESSORY_TRAITS.length *
  BACKGROUND_TRAITS.length;
