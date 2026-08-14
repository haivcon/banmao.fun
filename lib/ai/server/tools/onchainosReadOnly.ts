import "server-only";
import { z } from "zod";
import { okxFetch as realOkxFetch } from "../../../okx/okxClient";
import type { ToolDescriptor } from "../toolRegistry";

type OkxFetch = typeof realOkxFetch;
type Address = `0x${string}`;
type Dependencies = { enabled?: boolean; okxFetch?: OkxFetch; now?: () => string; timeoutMs?: number };

const CHAIN_ID = 196 as const;
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 32_000;
const CONTEXTS = ["landing", "defi", "gamefi", "collection"] as const;
const SECRET_KEYS = /^(?:api[-_]?key|secret(?:key)?|passphrase|authorization|cookie|ok-access-.+|x-api-key)$/i;
// Known blocking OKX quota notifications; both are currently returned with confirming status.
const BLOCKING_PAYMENT_CODES = new Set([
  "MARKET_API_NEW_USER_OVER_QUOTA",
  "MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA",
]);
const addressSchema = z.string().regex(/^0x[a-f0-9]{40}$/).transform((value) => value as Address);
const tokenSchema = z.object({ chainId: z.literal(CHAIN_ID), tokenAddress: addressSchema }).strict();
const searchSchema = z.object({ chainId: z.literal(CHAIN_ID), query: z.string().trim().min(2).max(80), limit: z.number().int().min(1).max(20).default(10) }).strict();
const holdersSchema = tokenSchema.extend({ limit: z.number().int().min(1).max(20).default(10) }).strict();
const klineSchema = tokenSchema.extend({ bar: z.enum(["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"]).default("1H"), limit: z.number().int().min(1).max(100).default(50) }).strict();

export const ONCHAINOS_READ_ONLY_TOOL_NAMES = Object.freeze([
  "onchainos.tokenSearch",
  "onchainos.tokenInfo",
  "onchainos.priceInfo",
  "onchainos.kline",
  "onchainos.holders",
  "onchainos.tokenSecurity",
] as const);

const ENDPOINTS = Object.freeze({
  tokenSearch: "/api/v6/dex/market/token/search",
  tokenInfo: "/api/v6/dex/market/token/basic-info",
  priceInfo: "/api/v6/dex/market/price-info",
  kline: "/api/v6/dex/market/candles",
  holders: "/api/v6/dex/market/token/holder",
  tokenSecurity: "/api/v6/security/token-scan",
} as const);

function parameters(properties: Record<string, unknown>, required: string[]) {
  return { type: "object", additionalProperties: false, properties, required };
}
const chainParameter = { type: "integer", const: CHAIN_ID };
const addressParameter = { type: "string", pattern: "^0x[a-f0-9]{40}$" };

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") return value.slice(0, 2_000);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SECRET_KEYS.test(key))
      .slice(0, 100)
      .map(([key, item]) => [key.slice(0, 120), sanitize(item, depth + 1)]));
  }
  return String(value).slice(0, 2_000);
}

function unavailable(reason: string, source: string, observedAt: string, payment = false) {
  return {
    status: "unavailable" as const,
    reason,
    source,
    observedAt,
    asOf: observedAt,
    ...(payment ? { paymentProtocol: "OKX Agent Payments Protocol" as const } : {}),
  };
}

function combinedSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

async function readOkx(input: {
  okxFetch: OkxFetch;
  method: "GET" | "POST";
  path: string;
  source: string;
  observedAt: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs: number;
}) {
  try {
    const response = await input.okxFetch(input.method, input.path, {
      cache: "no-store",
      headers: { "content-type": "application/json" },
      signal: combinedSignal(input.signal, input.timeoutMs),
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
    }, 0, { paymentRequired: "return" });
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      await response.body?.cancel();
      return unavailable("response-too-large", input.source, input.observedAt);
    }
    if (!response.body) return unavailable("malformed-response", input.source, input.observedAt);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        return unavailable("response-too-large", input.source, input.observedAt);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (response.status === 402) return unavailable("payment-required", input.source, input.observedAt, true);
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { return unavailable("malformed-response", input.source, input.observedAt); }
    const envelope = payload as { code?: unknown; data?: unknown; requestTime?: unknown; confirming?: unknown; notifications?: unknown };
    const hasBlockingPaymentNotification = Array.isArray(envelope.notifications) && envelope.notifications.some((notification) => {
      if (!notification || typeof notification !== "object") return false;
      const item = notification as Record<string, unknown>;
      return item.confirming === true || BLOCKING_PAYMENT_CODES.has(String(item.code));
    });
    if (envelope.confirming === true || hasBlockingPaymentNotification) return unavailable("payment-required", input.source, input.observedAt, true);
    if (!response.ok || envelope.code !== "0") return unavailable("upstream-unavailable", input.source, input.observedAt);
    const requestTime = typeof envelope.requestTime === "string" || typeof envelope.requestTime === "number"
      ? String(envelope.requestTime)
      : Array.isArray(envelope.data) && envelope.data[0] && typeof envelope.data[0] === "object" && (typeof (envelope.data[0] as Record<string, unknown>).requestTime === "string" || typeof (envelope.data[0] as Record<string, unknown>).requestTime === "number")
        ? String((envelope.data[0] as Record<string, unknown>).requestTime)
        : undefined;
    return {
      status: "available" as const,
      value: sanitize(envelope.data),
      source: input.source,
      observedAt: input.observedAt,
      asOf: requestTime || input.observedAt,
      ...(requestTime ? { requestTime } : {}),
      untrustedData: true as const,
    };
  } catch (error) {
    const reason = input.signal?.aborted ? "aborted" : error instanceof DOMException && error.name === "TimeoutError" ? "timed-out" : "upstream-unavailable";
    return unavailable(reason, input.source, input.observedAt);
  }
}

function descriptor<T>(input: Omit<ToolDescriptor<T>, "timeoutMs" | "maxBytes" | "contexts" | "auth">): ToolDescriptor<T> {
  return { ...input, contexts: CONTEXTS, auth: "public", timeoutMs: TIMEOUT_MS, maxBytes: MAX_BYTES };
}

export function createOnchainOSReadOnlyDescriptors(dependencies: Dependencies = {}): ToolDescriptor[] {
  if (dependencies.enabled !== true) return [];
  const okxFetch = dependencies.okxFetch || realOkxFetch;
  const now = dependencies.now || (() => new Date().toISOString());
  const timeoutMs = dependencies.timeoutMs || TIMEOUT_MS;
  const read = (method: "GET" | "POST", path: string, source: string, body?: unknown, signal?: AbortSignal) => readOkx({ okxFetch, method, path, source, body, signal, timeoutMs, observedAt: now() });

  return [
    descriptor({
      name: "onchainos.tokenSearch", description: "Search public X Layer token metadata by bounded name, symbol, or address; upstream text is untrusted data",
      parameters: parameters({ chainId: chainParameter, query: { type: "string", minLength: 2, maxLength: 80 }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["chainId", "query"]),
      parse: (value) => searchSchema.parse(value),
      execute: (args, context) => read("GET", `${ENDPOINTS.tokenSearch}?chains=196&search=${encodeURIComponent(args.query)}&limit=${args.limit}`, "okx:onchainos:token-search", undefined, context?.signal),
    }),
    descriptor({
      name: "onchainos.tokenInfo", description: "Read public X Layer token identity metadata from the allowlisted OKX endpoint",
      parameters: parameters({ chainId: chainParameter, tokenAddress: addressParameter }, ["chainId", "tokenAddress"]),
      parse: (value) => tokenSchema.parse(value),
      execute: (args, context) => read("POST", ENDPOINTS.tokenInfo, "okx:onchainos:token-info", { chainIndex: "196", tokenContractAddress: args.tokenAddress }, context?.signal),
    }),
    descriptor({
      name: "onchainos.priceInfo", description: "Read public X Layer token price, liquidity, market cap, volume, and freshness data",
      parameters: parameters({ chainId: chainParameter, tokenAddress: addressParameter }, ["chainId", "tokenAddress"]),
      parse: (value) => tokenSchema.parse(value),
      execute: (args, context) => read("POST", ENDPOINTS.priceInfo, "okx:onchainos:price-info", [{ chainIndex: "196", tokenContractAddress: args.tokenAddress }], context?.signal),
    }),
    descriptor({
      name: "onchainos.kline", description: "Read bounded public X Layer OHLC candlesticks; no trading or transaction capability",
      parameters: parameters({ chainId: chainParameter, tokenAddress: addressParameter, bar: { type: "string", enum: ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, ["chainId", "tokenAddress"]),
      parse: (value) => klineSchema.parse(value),
      execute: (args, context) => read("GET", `${ENDPOINTS.kline}?chainIndex=196&tokenContractAddress=${args.tokenAddress}&bar=${args.bar}&limit=${args.limit}`, "okx:onchainos:kline", undefined, context?.signal),
    }),
    descriptor({
      name: "onchainos.holders", description: "Read a bounded public X Layer token holder distribution from the allowlisted OKX endpoint",
      parameters: parameters({ chainId: chainParameter, tokenAddress: addressParameter, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["chainId", "tokenAddress"]),
      parse: (value) => holdersSchema.parse(value),
      execute: (args, context) => read("GET", `${ENDPOINTS.holders}?chainIndex=196&tokenContractAddress=${args.tokenAddress}&limit=${args.limit}`, "okx:onchainos:holders", undefined, context?.signal),
    }),
    descriptor({
      name: "onchainos.tokenSecurity", description: "Report the authoritative public OKX token risk verdict; failure is unavailable and never safe",
      parameters: parameters({ chainId: chainParameter, tokenAddress: addressParameter }, ["chainId", "tokenAddress"]),
      parse: (value) => tokenSchema.parse(value),
      async execute(args, context) {
        const result = await read("POST", ENDPOINTS.tokenSecurity, "okx:onchainos:token-security", { source: "onchain_os_cli", tokenList: [{ chainId: "196", contractAddress: args.tokenAddress }] }, context?.signal);
        if (result.status !== "available") return result;
        const values = result.value;
        const item = Array.isArray(values) && values[0] && typeof values[0] === "object" ? values[0] as Record<string, unknown> : undefined;
        if (!item || !["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(String(item.riskLevel))) {
          return unavailable("malformed-security-verdict", result.source, result.observedAt);
        }
        return { ...result, verdict: { riskLevel: item.riskLevel, report: item }, actionContinuation: false as const };
      },
    }),
  ];
}
