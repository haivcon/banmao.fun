import { getAddress, type Address } from "viem";
import { sameAddress } from "./safety";

const UNSAFE_FORMATTING = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd-\uffff]/;
const MAX_SOURCE_CODE_POINTS = 96;
const MAX_DISPLAY_GRAPHEMES = 18;

export type SafeTokenText = { full: string; display: string };

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

type SegmenterConstructor = new (
  locale?: string,
  options?: { granularity: "grapheme" },
) => { segment: (value: string) => Iterable<{ segment: string }> };

function graphemes(value: string): string[] {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter;
  if (Segmenter) {
    return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(value), ({ segment }) => segment);
  }
  return Array.from(value);
}

export function normalizeLiveTokenSymbol(value: unknown): SafeTokenText | null {
  if (typeof value !== "string" || hasUnpairedSurrogate(value)) return null;
  try {
    encodeURIComponent(value);
  } catch {
    return null;
  }
  const full = value.normalize("NFC");
  if (
    !full.trim() ||
    full.indexOf("\ufffd") >= 0 ||
    hasUnpairedSurrogate(full) ||
    UNSAFE_FORMATTING.test(full) ||
    Array.from(full).length > MAX_SOURCE_CODE_POINTS
  ) return null;
  const parts = graphemes(full);
  const display = parts.length > MAX_DISPLAY_GRAPHEMES
    ? `${parts.slice(0, MAX_DISPLAY_GRAPHEMES).join("")}…`
    : full;
  return { full, display };
}

export function normalizeLiveTokenName(value: unknown): SafeTokenText | null {
  return normalizeLiveTokenSymbol(value);
}

export function tokenSymbolFallback(address: Address, genericToken: string): string {
  return `${genericToken} ${address.slice(0, 8)}…${address.slice(-5)}`;
}

export type TokenIdentity = {
  address: Address;
  collectionAddress?: Address;
  name: string;
  symbol: string;
  displaySymbol: string;
  decimals: number;
  isCanonicalBanmao: boolean;
};

export function buildTokenIdentity(
  input: {
    address: Address;
    collectionAddress?: Address;
    canonicalAddress: Address;
    liveName?: unknown;
    liveSymbol?: unknown;
    storedSymbol?: unknown;
    decimals?: unknown;
  },
  genericToken: string,
): TokenIdentity {
  const live = normalizeLiveTokenSymbol(input.liveSymbol);
  const stored = normalizeLiveTokenSymbol(input.storedSymbol);
  // Older Box snapshots used the literal TOKEN when token metadata could not be
  // decoded. It is not authoritative; a live ERC-20 symbol of TOKEN still is.
  const selected = live ?? (stored?.full.trim().toUpperCase() === "TOKEN" ? null : stored);
  const fallback = tokenSymbolFallback(input.address, genericToken);
  const name = normalizeLiveTokenName(input.liveName)?.full ?? selected?.full ?? fallback;
  const decimals = Number(input.decimals);
  return {
    address: input.address,
    collectionAddress: input.collectionAddress,
    name,
    symbol: selected?.full ?? fallback,
    displaySymbol: selected?.display ?? fallback,
    decimals: Number.isInteger(decimals) && decimals >= 0 && decimals <= 69 ? decimals : 18,
    isCanonicalBanmao: sameAddress(input.address, input.canonicalAddress),
  };
}

export function tokenExplorerUrl(address: Address): string {
  const checksum = getAddress(address);
  return `https://web3.okx.com/explorer/x-layer/evm/token/${checksum.toLowerCase()}?address=${checksum}`;
}
