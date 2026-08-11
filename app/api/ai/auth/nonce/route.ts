import { aiNonceStore } from "../../../../../lib/ai/server/auth/store";
import { loadAIConfig } from "../../../../../lib/ai/server/config";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (!loadAIConfig().flags.txCopilot) return new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 503 });
  }
  const sessionId = crypto.randomUUID();
  const issued = aiNonceStore.issue(sessionId);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(issued, {
    headers: {
      "cache-control": "no-store",
      "set-cookie": `banmao_ai_nonce=${sessionId}; HttpOnly; SameSite=Strict; Path=/api/ai/auth; Max-Age=300${secure}`,
    },
  });
}
