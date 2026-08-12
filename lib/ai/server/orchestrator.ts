import "server-only";
import type { AIConversationTurn, AIModel, AISurface, CollectionMediaResult } from "../contracts";
import type { ChatMessage, ChatRound, CompletionRequest, ToolSpec } from "./client";
import { buildBanmaoSystemPrompt, BANMAO_PERSONA_VERSION } from "./persona";
import { createToolRegistry, type ToolDescriptor } from "./toolRegistry";
import { inspectBanmaoVoice } from "./voiceGuard";

export { BANMAO_PERSONA_VERSION };

export type RAGEvidence = {
  chunkId: string;
  sourcePath: string;
  excerpt: string;
};

export type OrchestratorEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; callId: string; name: string; status: "running" | "available" | "unavailable" | "error"; source: string; summary: string }
  | { type: "collection_results"; callId: string; observedAt: string; searchMode: "metadata"; results: CollectionMediaResult[] }
  | { type: "citation"; chunkId: string; sourcePath: string }
  | { type: "error"; code: string };

function providerToolName(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function providerTools(tools: readonly ToolDescriptor[]) {
  const internalNames = new Map<string, string>();
  const specs: ToolSpec[] = tools.map((tool) => {
    const providerName = providerToolName(tool.name);
    const existing = internalNames.get(providerName);
    if (existing && existing !== tool.name) throw new Error(`Tool name collision: ${existing}, ${tool.name}`);
    internalNames.set(providerName, tool.name);
    return {
      type: "function",
      function: {
        name: providerName,
        description: tool.description || `Read-only ${tool.name} tool`,
        parameters: tool.parameters || { type: "object", additionalProperties: false, properties: {} },
      },
    };
  });
  return { specs, internalNames };
}

function errorResult(code: string, source = "banmao-ai:tool-registry") {
  return { status: "error", code, source, asOf: new Date().toISOString() };
}

function sanitizeCollectionResults(callId: string, value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const envelope = value as Record<string, unknown>;
  const payload = envelope.value && typeof envelope.value === "object" ? envelope.value as Record<string, unknown> : undefined;
  if (!payload || !Array.isArray(payload.results)) return undefined;
  const observedAt = [payload.observedAt, envelope.observedAt, envelope.asOf].find((item) => typeof item === "string") as string | undefined || new Date().toISOString();
  const results = payload.results.slice(0, 10).flatMap((raw): CollectionMediaResult[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const publicId = typeof item.public_id === "string" ? item.public_id.slice(0, 240) : "";
    const secureUrl = typeof item.secure_url === "string" && /^https:\/\/res\.cloudinary\.com\//.test(item.secure_url) ? item.secure_url : "";
    if (!publicId || !secureUrl) return [];
    const leaf = publicId.split("/").at(-1) || publicId;
    const boundedNumber = (candidate: unknown, max: number) => typeof candidate === "number" && Number.isFinite(candidate) ? Math.max(0, Math.min(max, candidate)) : 0;
    return [{ publicId, secureUrl, thumbnailUrl: secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_480,c_limit/"), name: leaf.replace(/[_-]+/g, " ").trim().slice(0, 120), folder: typeof item.folder === "string" ? item.folder.slice(0, 160) : "", width: boundedNumber(item.width, 20_000), height: boundedNumber(item.height, 20_000), format: typeof item.format === "string" ? item.format.slice(0, 20) : "", score: boundedNumber(item.score, 10_000), matchedTerms: Array.isArray(item.matchedTerms) ? item.matchedTerms.filter((term): term is string => typeof term === "string").slice(0, 10).map((term) => term.slice(0, 40)) : [], matchReason: typeof item.matchReason === "string" ? item.matchReason.slice(0, 80) : "metadata", searchMode: "metadata", observedAt }];
  });
  return { type: "collection_results" as const, callId, observedAt, searchMode: "metadata" as const, results };
}

export async function* runOrchestrator(
  input: {
    model: AIModel;
    message: string;
    context: { surface: AISurface; pathname: string; locale?: string; pageElements?: Array<{ id: string; type: string; label: string; state?: string; action?: string; risk?: string }> };
    evidence: RAGEvidence[];
    history?: AIConversationTurn[];
    recentMotifs?: string[];
    authenticated: boolean;
  },
  options: {
    tools: ToolDescriptor[];
    completion: (request: CompletionRequest, signal?: AbortSignal) => AsyncGenerator<ChatRound>;
    maxToolRounds: number;
    signal?: AbortSignal;
  },
): AsyncGenerator<OrchestratorEvent> {
  const registry = createToolRegistry(options.tools);
  const { specs, internalNames } = providerTools(registry.descriptors);
  const messages: ChatMessage[] = [
    { role: "system", content: buildBanmaoSystemPrompt({
      surface: input.context.surface,
      pathname: input.context.pathname,
      message: input.message,
      locale: input.context.locale,
      evidence: input.evidence,
      recentMotifs: input.recentMotifs,
      pageElements: input.context.pageElements,
    }) },
    ...(input.history || []).map((turn): ChatMessage => turn.role === "user"
      ? { role: "user", content: turn.content }
      : { role: "assistant", content: turn.content }),
    { role: "user", content: input.message },
  ];
  for (const citation of input.evidence) {
    yield { type: "citation", chunkId: citation.chunkId, sourcePath: citation.sourcePath };
  }

  for (let roundIndex = 0; roundIndex <= options.maxToolRounds; roundIndex++) {
    if (options.signal?.aborted) {
      yield { type: "error", code: "REQUEST_ABORTED" };
      return;
    }
    let response: ChatRound | undefined;
    let pendingText = "";
    for await (const value of options.completion({
      model: input.model,
      messages,
      tools: specs.length ? specs : undefined,
      toolChoice: specs.length ? "auto" : undefined,
    }, options.signal)) {
      if (value.complete !== true && value.text) {
        pendingText += value.text;
        if (!value.toolCalls.length) {
          const safeBoundary = pendingText.match(/^([\s\S]*[.!?。！？]\s+)([\s\S]*)$/);
          if (safeBoundary) {
            if (inspectBanmaoVoice(safeBoundary[1]).financial > 0) { yield { type: "error", code: "UNSAFE_FINANCIAL_LANGUAGE" }; return; }
            yield { type: "delta", text: safeBoundary[1] };
            pendingText = safeBoundary[2];
          }
        }
      }
      if (value.complete !== false || value.toolCalls.length) response = value;
    }
    if (!response) {
      yield { type: "error", code: "EMPTY_UPSTREAM_RESPONSE" };
      return;
    }
    if (!response.toolCalls.length) {
      if (pendingText) {
        const diagnostics = inspectBanmaoVoice(pendingText);
        if (diagnostics.financial > 0) {
          yield { type: "error", code: "UNSAFE_FINANCIAL_LANGUAGE" };
          return;
        }
        yield { type: "delta", text: pendingText };
      }
      return;
    }
    if (roundIndex >= options.maxToolRounds) {
      yield { type: "error", code: "MAX_TOOL_ROUNDS" };
      return;
    }

    messages.push({ role: "assistant", content: response.text || null, tool_calls: response.toolCalls.map((call) => ({
      id: call.id,
      type: "function" as const,
      function: { name: call.name, arguments: call.arguments },
    })) });

    const results = await Promise.all(response.toolCalls.map(async (call) => {
      const internalName = internalNames.get(call.name) || call.name;
      let result: unknown;
      try {
        const args = JSON.parse(call.arguments);
        result = await registry.execute(internalName, args, {
          surface: input.context.surface,
          authenticated: input.authenticated,
          signal: options.signal,
        });
        const envelope = result as { status?: string; source?: string };
        const status = envelope.status === "unavailable" ? "unavailable" : "available";
        return { call, internalName, result, status, source: envelope.source || "banmao-ai:tool-registry", summary: status === "available" ? "Read completed" : "Source unavailable" } as const;
      } catch (error) {
        const code = error instanceof Error ? error.message : "TOOL_FAILED";
        result = errorResult(code);
        return { call, internalName, result, status: "error" as const, source: "banmao-ai:tool-registry", summary: code };
      }
    }));
    for (const call of response.toolCalls) yield { type: "tool", callId: call.id, name: internalNames.get(call.name) || call.name, status: "running", source: "banmao-ai:tool-registry", summary: "Reading approved source" };
    for (const item of results) {
      yield { type: "tool", callId: item.call.id, name: item.internalName, status: item.status, source: item.source, summary: item.summary };
      if (item.internalName === "collection.search" && item.status === "available") {
        const media = sanitizeCollectionResults(item.call.id, item.result);
        if (media) yield media;
      }
      messages.push({ role: "tool", tool_call_id: item.call.id, content: JSON.stringify(item.result) });
    }
  }
}
