import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { enforceRequestBudget } from "../../../../lib/ai/server/security/abuse";
import { streamCompletion, UpstreamAIError } from "../../../../lib/ai/server/client";
import { loadAIConfig } from "../../../../lib/ai/server/config";
import { routeContext } from "../../../../lib/ai/server/contextRouter";
import { runOrchestrator } from "../../../../lib/ai/server/orchestrator";
import { loadApprovedCorpus } from "../../../../lib/ai/server/rag/corpus";
import { retrieve } from "../../../../lib/ai/server/rag/retriever";
import { validateChatRequest, AIValidationError } from "../../../../lib/ai/server/schemas";
import { createLocalRateLimiter } from "../../../../lib/ai/server/security/rateLimit";
import { createToolRegistry } from "../../../../lib/ai/server/toolRegistry";
import { docsSearchTool } from "../../../../lib/ai/server/tools/docs";
import { createDomainToolDescriptors } from "../../../../lib/ai/server/tools/liveAdapters";

export const runtime = "nodejs";
const encoder = new TextEncoder();
function sse(event: string, data: unknown) { return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }

const limiter = createLocalRateLimiter({ limit: 20, windowMs: 60_000 });
function requestSubject(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"; }
function originAllowed(request: Request) { const origin=request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }
function errorStatus(error: unknown) {
  if (error instanceof UpstreamAIError && error.code === "MODEL_REJECTED") return 422;
  if (error instanceof UpstreamAIError && error.code === "UPSTREAM_ABORTED") return 504;
  return 502;
}
function errorCode(error: unknown) { return error instanceof UpstreamAIError ? error.code : "UPSTREAM_UNAVAILABLE"; }

export async function POST(request: Request) {
  let config: ReturnType<typeof loadAIConfig>;
  try { config = loadAIConfig(); } catch { return NextResponse.json({ error: "AI unavailable" }, { status: 503 }); }
  if (!config.flags.chat) return new NextResponse(null, { status: 404 });
  if (!originAllowed(request)) return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  if (!limiter.take(requestSubject(request)).allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const raw = await request.text();
  if (Buffer.byteLength(raw) > config.maxRequestBytes) return NextResponse.json({ error: "Request budget exceeded" }, { status: 413 });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  let validated: ReturnType<typeof validateChatRequest>;
  try { validated = validateChatRequest(parsed, config.defaultModel); enforceRequestBudget({ message: validated.message, maxPromptBytes: config.maxRequestBytes, maxEstimatedTokens: config.maxEstimatedTokens }); }
  catch (error) { return NextResponse.json({ error: error instanceof AIValidationError ? error.message : "Request budget exceeded" }, { status: error instanceof AIValidationError ? 400 : 413 }); }

  const routed = routeContext(validated.context);
  let evidence: Array<{ chunkId: string; sourcePath: string; excerpt: string }> = [];
  if (config.flags.rag) {
    try { evidence = retrieve(await loadApprovedCorpus(), validated.message, 4); } catch { evidence = []; }
  }
  const domainTools = createDomainToolDescriptors().filter((tool) => {
    if (!tool.contexts.includes(routed.surface)) return false;
    if (tool.name.startsWith("defi.") && !config.flags.defiAdvisor) return false;
    if (tool.name.startsWith("gamefi.") && !config.flags.gamefiCoach) return false;
    if (tool.name.startsWith("collection.") && !config.flags.collectionAdvisor) return false;
    if (tool.name.startsWith("market.") && !config.flags.marketNarrator) return false;
    return true;
  });
  const tools = createToolRegistry(config.flags.tools ? [docsSearchTool(await loadApprovedCorpus()), ...domainTools] : []).descriptors;
  const requestId = randomUUID();
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse("meta", { requestId, model: validated.model }));
      try {
        for await (const event of runOrchestrator({
          model: validated.model,
          message: validated.message,
          context: routed,
          evidence,
          authenticated: false,
        }, {
          tools: [...tools],
          maxToolRounds: config.maxToolRounds,
          signal: request.signal,
          completion: (completionRequest, signal) => streamCompletion(completionRequest, { config, signal }),
        })) {
          if (event.type === "delta") controller.enqueue(sse("delta", { text: event.text }));
          else if (event.type === "citation") controller.enqueue(sse("citation", event));
          else if (event.type === "tool") controller.enqueue(sse("tool", event));
          else controller.enqueue(sse("error", { code: event.code }));
        }
        controller.enqueue(sse("done", { requestId }));
      } catch (error) {
        controller.enqueue(sse("error", { code: errorCode(error), status: errorStatus(error) }));
      } finally { controller.close(); }
    },
    cancel() {},
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-store", connection: "keep-alive", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; frame-ancestors 'none'" } });
}
