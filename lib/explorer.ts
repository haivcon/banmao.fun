/** Canonical X Layer explorer links. Locale is optional; identifiers are URL-safe. */
export function xLayerExplorerUrl(kind: "token" | "address" | "tx", identifier: string, locale?: string): string {
  const language = locale === "vi" ? "/vi" : "";
  return `https://web3.okx.com${language}/explorer/x-layer/evm/${kind}/${encodeURIComponent(identifier.toLowerCase())}`;
}
