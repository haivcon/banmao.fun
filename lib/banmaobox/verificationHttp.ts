import { db } from "../db";
import type { Hex } from "viem";
import type { VerificationResult } from "./verifyNewCollection";

const MAX_BODY_BYTES = 512;
const WINDOW_MS = 60_000;
const IP_LIMIT = 12;
const TX_LIMIT = 6;
const CLEANUP_BATCH_SIZE = 100;
let rateTableReady: Promise<void> | undefined;

export class VerificationHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export type VerificationRateLimiter = {
  take(key: string): Promise<{ allowed: boolean; retryAfterMs: number }>;
};

async function ensureRateTable() {
  rateTableReady ??= db.execute(`CREATE TABLE IF NOT EXISTS banmaobox_verification_rate_limits (
    bucket_key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
  )`).then(() => undefined);
  return rateTableReady;
}

export const durableVerificationRateLimiter: VerificationRateLimiter = {
  async take(key) {
    await ensureRateTable();
    const now = Date.now();
    await db.execute({
      sql: `DELETE FROM banmaobox_verification_rate_limits WHERE bucket_key IN (
        SELECT bucket_key FROM banmaobox_verification_rate_limits WHERE expires_at <= ? LIMIT ?
      )`,
      args: [now, CLEANUP_BATCH_SIZE],
    });
    const bucketStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
    const expiresAt = bucketStart + WINDOW_MS;
    const limit = key.startsWith("ip:") ? IP_LIMIT : TX_LIMIT;
    const bucketKey = `${key.toLowerCase()}:${bucketStart}`;
    const result = await db.execute({
      sql: `INSERT INTO banmaobox_verification_rate_limits (bucket_key, count, expires_at)
        VALUES (?, 1, ?) ON CONFLICT(bucket_key) DO UPDATE SET count=count+1
        WHERE count < ?`,
      args: [bucketKey, expiresAt, limit],
    });
    return {
      allowed: result.rowsAffected === 1,
      retryAfterMs: Math.max(1_000, expiresAt - now),
    };
  },
};

function trustedDeploymentClient(request: Request) {
  if (process.env.VERCEL !== "1") return "anonymous";
  const normalized = request.headers.get("x-vercel-forwarded-for")?.trim();
  return normalized && /^[0-9a-f:.]+$/i.test(normalized) ? normalized : "anonymous";
}

export async function parseVerificationRequest(request: Request): Promise<{ txHash: Hex }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    throw new VerificationHttpError("Content-Type must be application/json", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new VerificationHttpError("Request body is too large", 413);
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw new VerificationHttpError("Request body is too large", 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new VerificationHttpError("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new VerificationHttpError("Request body must be an object", 400);
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("txHash" in record)) {
    throw new VerificationHttpError("Request body must contain only txHash", 400);
  }
  if (typeof record.txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(record.txHash)) {
    throw new VerificationHttpError("txHash must be a 32-byte hex transaction hash", 400);
  }
  return { txHash: record.txHash.toLowerCase() as Hex };
}

function json(body: unknown, status: number, retryAfterMs?: number) {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (retryAfterMs !== undefined) {
    headers["retry-after"] = String(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  }
  return Response.json(body, { status, headers });
}

export async function verificationHttpResponse(
  request: Request,
  verify: (txHash: Hex) => Promise<VerificationResult>,
  limiter: VerificationRateLimiter = durableVerificationRateLimiter,
): Promise<Response> {
  try {
    const { txHash } = await parseVerificationRequest(request);
    const [ipRate, txRate] = await Promise.all([
      limiter.take(`ip:${trustedDeploymentClient(request)}`),
      limiter.take(`tx:${txHash}`),
    ]);
    if (!ipRate.allowed || !txRate.allowed) {
      throw new VerificationHttpError(
        "Verification request rate limit exceeded",
        429,
        Math.max(ipRate.allowed ? 0 : ipRate.retryAfterMs, txRate.allowed ? 0 : txRate.retryAfterMs),
      );
    }
    const result = await verify(txHash);
    if (result.status === "pending" || result.status === "waiting-for-indexer") {
      return json(result, 202, result.retryAfterMs);
    }
    if (result.status === "transient-unavailable") return json(result, 503, result.retryAfterMs);
    if (result.status === "failed" || result.status === "retry-exhausted" || result.status === "manual-reconciliation") return json(result, 422);
    return json(result, 200);
  } catch (error) {
    if (error instanceof VerificationHttpError) {
      return json({ error: error.message }, error.status, error.retryAfterMs);
    }
    const message = error instanceof Error ? error.message : "Verification service unavailable";
    const clientError = /receipt|transaction|event|factory|registry|runtime|release|underlying|renderer/i.test(message);
    return json({ error: message }, clientError ? 400 : 503, clientError ? undefined : 30_000);
  }
}
