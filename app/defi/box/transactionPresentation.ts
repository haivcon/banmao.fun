import type { Address } from "viem";
import { normalizeLiveTokenSymbol, tokenSymbolFallback } from "./tokenIdentity";

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

export function safeLiveTokenSymbol(value: unknown): string | undefined {
  return normalizeLiveTokenSymbol(value)?.full;
}

export function symbolFallback(token: Address | string, genericToken: string): string {
  return tokenSymbolFallback(token as Address, genericToken);
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
  const stored = normalizeLiveTokenSymbol(storedSymbol);
  if (!isGenericStoredSymbol(storedSymbol) && stored) return stored.full;
  return safeLiveTokenSymbol(liveSymbol) ?? symbolFallback(token, genericToken);
}
