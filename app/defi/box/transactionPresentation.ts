import type { Address } from "viem";

export type TransactionErrorKind =
  | "disconnected"
  | "wrong-chain"
  | "rejected"
  | "replaced"
  | "timeout"
  | "failed";

export type TransactionErrorClassification = {
  kind: TransactionErrorKind;
  submitted: boolean;
};

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const value = error as Record<string, unknown>;
  return [value.name, value.message, value.shortMessage, value.details]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
}

export function classifyTransactionError(
  error: unknown,
  submitted: boolean,
): TransactionErrorClassification {
  const value = error as { code?: unknown } | null;
  const text = errorText(error);
  if (value?.code === 4001 || /userrejected|user rejected|request rejected|denied transaction/.test(text)) {
    return { kind: "rejected", submitted: false };
  }
  if (/transactionreplaced|transaction replaced|repriced|cancelled transaction/.test(text)) {
    return { kind: "replaced", submitted: true };
  }
  if (/waitfortransactionreceipttimeout|timed? ?out|timeout/.test(text)) {
    return { kind: "timeout", submitted };
  }
  if (/connect (your )?wallet|wallet.*not connected|connector.*not connected/.test(text)) {
    return { kind: "disconnected", submitted: false };
  }
  if (/wrong.*(chain|network)|chain mismatch|unsupported chain|switch.*network/.test(text)) {
    return { kind: "wrong-chain", submitted: false };
  }
  return { kind: "failed", submitted };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const UNSAFE_CODEPOINT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufffe\uffff]/;

export function safeLiveTokenSymbol(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const input = encoder.encode(value);
  if (
    input.length === 0 ||
    input.length > 64 ||
    UNSAFE_CODEPOINT.test(value) ||
    decoder.decode(input) !== value
  ) return undefined;

  let output = "";
  for (const codepoint of value) {
    if (encoder.encode(output + codepoint).length > 32) break;
    output += codepoint;
  }
  return output || undefined;
}

export function symbolFallback(token: Address | string, genericToken: string): string {
  return `${genericToken} ${token.slice(0, 8)}...${token.slice(-4)}`;
}

export function transactionProgressIndex(phase: string, hasHash: boolean): 0 | 1 | 2 {
  if (phase === "success") return 2;
  return hasHash ? 1 : 0;
}

export function isGenericStoredSymbol(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "" || value.trim().toUpperCase() === "TOKEN";
}

export function resolveStoredAssetSymbol(
  storedSymbol: unknown,
  liveSymbol: unknown,
  token: Address | string,
  genericToken: string,
): string {
  if (!isGenericStoredSymbol(storedSymbol)) return String(storedSymbol);
  return safeLiveTokenSymbol(liveSymbol) ?? symbolFallback(token, genericToken);
}
