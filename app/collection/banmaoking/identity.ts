import { compositionWatermark } from "./composition";
import type { BanmaoKingTraitSelection } from "./traits";
export function parseKingId(value: string): bigint {
  const digits = value.trim().replace(/^#/, '');
  if (!/^\d{1,78}$/.test(digits)) throw new Error('Invalid token ID');
  const id = BigInt(digits);
  if (id < 1n || id >= 1n << 256n) throw new Error('Invalid token ID');
  return id;
}

// Presentation copy only: the original tokenURI remains untouched.
export function identifiedKingImage(image: string, traits: BanmaoKingTraitSelection): string {
  const prefix = 'data:image/svg+xml;base64,';
  if (!image.startsWith(prefix)) throw new Error('Invalid SVG');
  // Keep the byte string intact: the inserted watermark is ASCII, and btoa
  // preserves any existing UTF-8 bytes without a lossy text conversion.
  let svg: string;
  try { svg = atob(image.slice(prefix.length)); } catch { throw new Error('Invalid SVG base64'); }
  if (!/^<svg(?:\s|>)/.test(svg) || !/<\/svg>\s*$/.test(svg)) throw new Error('Invalid SVG');
  const clean = svg.replace(/<g class="king-(?:id|composition)-watermark">[\s\S]*?<\/g>/g, "");
  return prefix + btoa(clean.replace("</svg>", compositionWatermark(traits) + "</svg>"));
}

export function kingSharePath(id: bigint): string {
  return `/collection/banmaoking?token=${parseKingId(String(id))}#king-lookup`;
}
