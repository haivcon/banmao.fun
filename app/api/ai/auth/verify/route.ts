import { verifyMessage } from "viem";
import { z } from "zod";
import { aiNonceStore } from "../../../../../lib/ai/server/auth/store";
import { parseAndValidateSiwe } from "../../../../../lib/ai/server/auth/siwe";
import { createSessionToken } from "../../../../../lib/ai/server/auth/session";
import { loadAIConfig } from "../../../../../lib/ai/server/config";

export const runtime = "nodejs";
const schema = z.object({
  message: z.string().min(1).max(4000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
}).strict();

function cookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function POST(request: Request) {
  try {
    if (!loadAIConfig().flags.txCopilot) return new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 503 });
  }
  const secret = process.env.AI_SESSION_SECRET;
  if (!secret) return Response.json({ error: "Proof-of-wallet unavailable" }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid proof" }, { status: 400 });
  const sessionId = cookie(request, "banmao_ai_nonce");
  if (!sessionId) return Response.json({ error: "Invalid proof" }, { status: 401 });
  const nonce = /\nNonce: ([A-Za-z0-9-]+)/.exec(parsed.data.message)?.[1];
  if (!nonce || !aiNonceStore.consume(sessionId, nonce)) {
    return Response.json({ error: "Invalid or replayed proof" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const proof = parseAndValidateSiwe(parsed.data.message, {
      domain: url.host,
      uri: url.origin,
      chainIds: [196],
      nonce,
      now: new Date(),
    });
    const valid = await verifyMessage({
      address: proof.address,
      message: parsed.data.message,
      signature: parsed.data.signature as `0x${string}`,
    });
    if (!valid) throw new Error("signature");
    const expiresAt = Date.now() + 30 * 60_000;
    const token = createSessionToken({
      sessionId,
      address: proof.address,
      chainId: proof.chainId,
      expiresAt,
    }, secret);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json({
      authenticated: true,
      address: proof.address,
      chainId: proof.chainId,
      expiresAt: new Date(expiresAt).toISOString(),
    }, {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `banmao_ai_session=${token}; HttpOnly; SameSite=Strict; Path=/api/ai; Max-Age=1800${secure}`,
      },
    });
  } catch {
    return Response.json({ error: "Invalid proof" }, { status: 401 });
  }
}
