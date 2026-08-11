import manifestJson from "../../../../public/ai/mascot/mascot-manifest.json";
import { BANMAO_EMOTIONS, type BanmaoEmotion } from "../../../../lib/ai/client/emotion";

export type MascotAsset = {
  frames: readonly string[];
  poster: string;
  heroPoster: string;
  frameDurationMs: number;
  durationMs: number;
  loop: boolean;
  eager: boolean;
};

type ManifestEmotion = {
  frames?: Array<{ src?: unknown }>;
  poster?: { src?: unknown };
  heroPoster?: { src?: unknown };
  frameDurationMs?: unknown;
  durationMs?: unknown;
  loop?: unknown;
  preload?: unknown;
};

function isSafeAssetPath(path: unknown, emotion: BanmaoEmotion): path is string {
  return typeof path === "string" && path.startsWith(`/ai/mascot/frames/${emotion}/`) && !path.includes("..") && path.endsWith(".webp");
}

function checkedAsset(emotion: BanmaoEmotion): MascotAsset | null {
  const raw = (manifestJson.emotions as Record<string, ManifestEmotion>)[emotion];
  if (!raw || !Array.isArray(raw.frames)) return null;
  const frames = raw.frames.map((frame) => frame.src);
  if (frames.length < 3 || frames.length > 4 || !frames.every((path) => isSafeAssetPath(path, emotion))) return null;
  if (!isSafeAssetPath(raw.poster?.src, emotion) || !isSafeAssetPath(raw.heroPoster?.src, emotion)) return null;
  if (typeof raw.frameDurationMs !== "number" || typeof raw.durationMs !== "number" || typeof raw.loop !== "boolean") return null;
  return {
    frames,
    poster: raw.poster.src,
    heroPoster: raw.heroPoster.src,
    frameDurationMs: Math.max(200, raw.frameDurationMs),
    durationMs: Math.max(raw.frameDurationMs, raw.durationMs),
    loop: raw.loop,
    eager: raw.preload === "eager",
  };
}

const fallback: MascotAsset = {
  frames: [
    "/ai/mascot/frames/idle/frame-01@256.webp",
    "/ai/mascot/frames/idle/frame-02@256.webp",
    "/ai/mascot/frames/idle/frame-03@256.webp",
    "/ai/mascot/frames/idle/frame-04@256.webp",
  ],
  poster: "/ai/mascot/frames/idle/poster@256.webp",
  heroPoster: "/ai/mascot/frames/idle/poster@384.webp",
  frameDurationMs: 750,
  durationMs: 3000,
  loop: true,
  eager: true,
};

export const MASCOT_ASSETS = Object.fromEntries(
  BANMAO_EMOTIONS.map((emotion) => [emotion, checkedAsset(emotion) ?? fallback]),
) as Record<BanmaoEmotion, MascotAsset>;

export function getMascotAsset(emotion: BanmaoEmotion): MascotAsset {
  return MASCOT_ASSETS[emotion] ?? MASCOT_ASSETS.idle;
}

export function shouldAnimateMascot(options: { userReducedMotion: boolean; systemReducedMotion: boolean; documentVisible: boolean }): boolean {
  return !options.userReducedMotion && !options.systemReducedMotion && options.documentVisible;
}
