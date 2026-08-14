
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { enforceRequestBudget } from "../../../../lib/ai/server/security/abuse";
import { streamCompletion, UpstreamAIError } from "../../../../lib/ai/server/client";
import { loadAIConfig } from "../../../../lib/ai/server/config";
import { routeContext } from "../../../../lib/ai/server/contextRouter";
import { BANMAO_PERSONA_VERSION, runOrchestrator } from "../../../../lib/ai/server/orchestrator";
import { loadApprovedCorpus } from "../../../../lib/ai/server/rag/corpus";
import { retrieveHybrid } from "../../../../lib/ai/server/rag/retriever";
import { safeLogRecord } from "../../../../lib/ai/server/observability";
import { validateChatRequest, AIValidationError } from "../../../../lib/ai/server/schemas";
import { createRateLimiter } from "../../../../lib/ai/server/security/rateLimit";
import { createToolRegistry } from "../../../../lib/ai/server/toolRegistry";
import { docsSearchTool } from "../../../../lib/ai/server/tools/docs";
import { createDomainToolDescriptors } from "../../../../lib/ai/server/tools/liveAdapters";
import { createOnchainOSReadOnlyDescriptors, preferOnchainOSReadOnlyTools } from "../../../../lib/ai/server/tools/onchainosReadOnly";

export const runtime = "nodejs";
const encoder = new TextEncoder();
function sse(event: string, data: unknown) { return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }

const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
const requestClaims = new Map<string, { state: "in-flight" | "complete"; expires: number; fingerprint: string; body?: Uint8Array }>();
function requestSubject(request: Request) {
  const candidate = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  return candidate && /^[a-fA-F0-9:.]{3,64}$/.test(candidate) ? candidate : "anonymous";
}
function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.slice(0, -1);
  return origin === (host ? `${protocol}://${host}` : url.origin);
}
function errorStatus(error: unknown) {
  if (!(error instanceof UpstreamAIError)) return 502;
  if (error.code === "MODEL_REJECTED") return 422;
  if (error.code === "REQUEST_ABORTED") return 499;
  if (error.code === "UPSTREAM_TIMEOUT") return 504;
  return 502;
}
function errorCode(error: unknown) { return error instanceof UpstreamAIError ? error.code : "UPSTREAM_UNAVAILABLE"; }

export async function POST(request: Request) {
  let config: ReturnType<typeof loadAIConfig>;
  try { config = loadAIConfig(); } catch { return NextResponse.json({ error: "AI unavailable" }, { status: 503 }); }
  if (!config.flags.chat) return new NextResponse(null, { status: 404 });
  if (!originAllowed(request)) return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  const rate=await limiter.take(requestSubject(request));
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded",rateLimit:rate.mode }, { status: 429,headers:{"retry-after":String(Math.max(1,Math.ceil(rate.retryAfterMs/1000))) } });

  const raw = await request.text();
  if (Buffer.byteLength(raw) > config.maxRequestBytes) return NextResponse.json({ error: "Request budget exceeded" }, { status: 413 });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  let validated: ReturnType<typeof validateChatRequest>;
  try { validated = validateChatRequest(parsed, config.defaultModel); enforceRequestBudget({ message: validated.message, maxPromptBytes: config.maxRequestBytes, maxEstimatedTokens: config.maxEstimatedTokens }); }
  catch (error) { return NextResponse.json({ error: error instanceof AIValidationError ? error.message : "Request budget exceeded" }, { status: error instanceof AIValidationError ? 400 : 413 }); }

  const now = Date.now();
  for (const [id, claim] of requestClaims) if (claim.expires <= now) requestClaims.delete(id);
  const fingerprint = createHash("sha256").update(raw).digest("hex");
  const existing = requestClaims.get(validated.requestId);
  if (existing && existing.fingerprint !== fingerprint) return NextResponse.json({ error: "Request id payload conflict", requestId: validated.requestId, idempotency: "local-degraded" }, { status: 409 });
  if (existing?.state === "complete" && existing.body) {
    const replay = existing.body;
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(replay); controller.close(); } }), { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-store", "x-idempotent-replay": "local-degraded" } });
  }
  if (existing) return NextResponse.json({ error: "Request already in flight", requestId: validated.requestId, idempotency: "local-degraded" }, { status: 409, headers: { "retry-after": "1" } });
  requestClaims.set(validated.requestId, { state: "in-flight", expires: now + 60_000, fingerprint });
  const routed = routeContext(validated.context);
  const startedAt = Date.now();
  let ragMode: "lexical" | "hybrid" = "lexical";
  let ragStatus: "ready" | "disabled" | "degraded" = config.flags.rag ? "ready" : "disabled";
  let corpus: Awaited<ReturnType<typeof loadApprovedCorpus>> = [];
  let evidence: Array<{ chunkId: string; sourcePath: string; excerpt: string }> = [];
  if (config.flags.rag) {
    try { corpus = await loadApprovedCorpus(); const result = await retrieveHybrid(corpus, validated.message, 4); evidence = result.hits; ragMode = result.mode; } catch { evidence = []; ragStatus = "degraded"; }
  }
  const domainTools = createDomainToolDescriptors().filter((tool) => {
    if (!tool.contexts.includes(routed.surface)) return false;
    if (tool.name.startsWith("defi.") && !config.flags.defiAdvisor) return false;
    if (tool.name.startsWith("gamefi.") && !config.flags.gamefiCoach) return false;
    if (tool.name.startsWith("collection.") && !config.flags.collectionAdvisor) return false;
    if (tool.name.startsWith("market.") && !config.flags.marketNarrator) return false;
    return true;
  });
  const onchainosTools = createOnchainOSReadOnlyDescriptors({ enabled: config.flags.onchainosReadOnly });
  const marketTools = preferOnchainOSReadOnlyTools(domainTools, onchainosTools);
  const tools = createToolRegistry(config.flags.tools ? [...(ragStatus === "ready" ? [docsSearchTool(corpus)] : []), ...marketTools] : []).descriptors;
  const requestId = validated.requestId;
  const orchestrationAbort = new AbortController();
  if (request.signal.aborted) orchestrationAbort.abort(request.signal.reason);
  else request.signal.addEventListener("abort", () => orchestrationAbort.abort(request.signal.reason), { once: true });
  const body = new ReadableStream({
    async start(controller) {
      const chunks:Uint8Array[]=[];let streamBytes=0;let firstTokenAt:number|undefined;let finishReason="unknown";let inputTokens:number|undefined;let outputTokens:number|undefined;let toolRounds=0;
      const emit=(event:string,data:unknown)=>{const chunk=sse(event,data);chunks.push(chunk);streamBytes+=chunk.byteLength;controller.enqueue(chunk);};
      emit("meta", { requestId, model: validated.model, personaVersion: BANMAO_PERSONA_VERSION, ragMode, ragStatus,ragHitCount: evidence.length, surface: routed.surface,idempotency:"local-degraded",rateLimit:rate.mode });
      try {
        for await (const event of runOrchestrator({
          model: validated.model,
          message: validated.message,
          context: { ...routed, locale: validated.context.locale, pageElements: validated.context.pageElements },
          evidence,
          history: validated.history,
          recentMotifs: validated.episodic?.recentMotifs,
          authenticated: false,
        }, {
          tools: [...tools],
          maxToolRounds: config.maxToolRounds,
          signal: orchestrationAbort.signal,
          completion: (completionRequest, signal) => streamCompletion(completionRequest, { config, signal }),
        })) {
          if (event.type === "delta") {firstTokenAt??=Date.now();emit("delta", { requestId,text: event.text });}
          else if (event.type === "citation") emit("citation", { requestId, ...event });
          else if (event.type === "tool") {toolRounds++;emit("tool", { requestId, ...event });}
          else if (event.type === "collection_results") emit("collection_results", { requestId, ...event });
          else if(event.type==="usage"){inputTokens=event.inputTokens;outputTokens=event.outputTokens;emit("usage",{requestId,...event,budgetStatus:"available"});}
          else if(event.type==="finish")finishReason=event.finishReason;
          else emit("error", { code: event.code,retryable:false,requestId });
        }
        emit("done", { requestId,finishReason });const replay=new Uint8Array(streamBytes);let offset=0;for(const chunk of chunks){replay.set(chunk,offset);offset+=chunk.byteLength;}requestClaims.set(requestId,{state:"complete",expires:Date.now()+60_000,fingerprint,body:replay});
        console.info("banmao_ai_metric", safeLogRecord({ requestId, model: validated.model, surface: routed.surface, status: "ok", durationMs: Date.now() - startedAt,ttftMs:firstTokenAt?firstTokenAt-startedAt:undefined,streamBytes,finishReason,inputTokens,outputTokens,toolRounds, ragMode,ragStatus, ragHitCount: evidence.length }));
      } catch (error) {
        requestClaims.delete(requestId);
        emit("error", { code: errorCode(error), status: errorStatus(error),retryable:errorStatus(error)>=500,requestId });
        console.warn("banmao_ai_metric", safeLogRecord({ requestId, model: validated.model, surface: routed.surface, status: "error", durationMs: Date.now() - startedAt, ragMode,ragStatus, ragHitCount: evidence.length, errorCode: errorCode(error) }));
      } finally { controller.close(); }
    },
    cancel(reason) { orchestrationAbort.abort(reason); },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-store", connection: "keep-alive", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; frame-ancestors 'none'" } });
}
