import { getAddress, isAddress, type Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function sameAddress(
  left: Address | string | undefined,
  right: Address | string | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function isCanonicalBoxCollection(
  token: Address,
  box: Address,
  canonicalToken: Address,
  canonicalBox: Address,
): boolean {
  return sameAddress(token, canonicalToken) && sameAddress(box, canonicalBox);
}

export function normalizeTokenDecimals(value: unknown, fallback = 18): number {
  const decimals = Number(value);
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 69
    ? decimals
    : fallback;
}

export function normalizeTokenSymbol(value: unknown, fallback = "TOKEN"): string {
  return typeof value === "string" && /^[A-Za-z0-9 ._-]{1,16}$/.test(value)
    ? value
    : fallback;
}

export function parseStoredCollection(
  value: string | null,
): { token: Address; box: Address } | null {
  if (!value) return null;
  const parts = value.split(":");
  if (
    parts.length !== 2 ||
    !isAddress(parts[0]) ||
    !isAddress(parts[1]) ||
    sameAddress(parts[0], ZERO_ADDRESS) ||
    sameAddress(parts[1], ZERO_ADDRESS)
  ) {
    return null;
  }
  return { token: getAddress(parts[0]), box: getAddress(parts[1]) };
}

/**
 * Render contract-provided SVG as an isolated image document, never as nodes in
 * the page DOM. This prevents renderer markup from reaching the app's DOM context.
 */
export function svgImageDataUri(svg: string): string {
  const normalized = svg.replace(/^\uFEFF/, "").trimStart();
  const legacyPrefix = /^(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)?(?=<svg(?:\s|>))/i;
  const artwork = legacyPrefix.test(normalized)
    ? normalized.replace(legacyPrefix, "")
    : '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#0b0d12"/><text x="300" y="307" fill="#ffd85a" font-family="sans-serif" font-size="18" text-anchor="middle">Artwork unavailable</text></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork)}`;
}
