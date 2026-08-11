import "server-only";
import type { AIConversationTurn, AIModel, AISurface } from "../contracts";
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
    for await (const value of options.completion({
      model: input.model,
      messages,
      tools: specs.length ? specs : undefined,
      toolChoice: specs.length ? "auto" : undefined,
    }, options.signal)) response = value;
    if (!response) {
      yield { type: "error", code: "EMPTY_UPSTREAM_RESPONSE" };
      return;
    }
    if (!response.toolCalls.length) {
      if (response.text) {
        const diagnostics = inspectBanmaoVoice(response.text);
        if (diagnostics.financial > 0) {
          yield { type: "error", code: "UNSAFE_FINANCIAL_LANGUAGE" };
          return;
        }
        yield { type: "delta", text: response.text };
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

    for (const call of response.toolCalls) {
      const internalName = internalNames.get(call.name) || call.name;
      yield { type: "tool", callId: call.id, name: internalName, status: "running", source: "banmao-ai:tool-registry", summary: "Reading approved source" };
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
        yield { type: "tool", callId: call.id, name: internalName, status, source: envelope.source || "banmao-ai:tool-registry", summary: status === "available" ? "Read completed" : "Source unavailable" };
      } catch (error) {
        const code = error instanceof Error ? error.message : "TOOL_FAILED";
        result = errorResult(code);
        yield { type: "tool", callId: call.id, name: internalName, status: "error", source: "banmao-ai:tool-registry", summary: code };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
}
