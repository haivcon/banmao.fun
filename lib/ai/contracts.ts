export const AI_MODELS = ["banmao.fun"] as const;
export type AIModel = (typeof AI_MODELS)[number];
export const AI_SURFACES = ["landing", "defi", "gamefi", "collection"] as const;
export type AISurface = (typeof AI_SURFACES)[number];

export type AIConversationTurn = { role: "user" | "assistant"; content: string };
export type AIEpisodicState = {
  recentTopics: string[];
  recentMotifs: string[];
};

export type AIChatRequest = {
  requestId: string;
  conversationId?: string;
  message: string;
  model?: AIModel;
  context: {
    surface: AISurface;
    pathname: string;
    locale?: string;
    entity?: { type: string; id: string };
    pageElements?: Array<{
      id: string;
      type: "button" | "link" | "input" | "status" | "section";
      label: string;
      state?: string;
      action?: "navigate" | "focus" | "fill" | "activate";
      risk?: "none" | "reversible" | "transaction";
    }>;
  };
  history?: AIConversationTurn[];
  episodic?: AIEpisodicState;
  connectedWalletHint?: { address: `0x${string}`; chainId: number };
};

export type ValidatedAIChatRequest = Omit<AIChatRequest, "model"> & { model: AIModel };

export type CollectionMediaResult = { publicId: string; secureUrl: string; thumbnailUrl: string; name: string; folder: string; width: number; height: number; format: string; score: number; matchedTerms: string[]; matchReason: string; searchMode: "metadata"; observedAt: string };
export type CollectionResultsPayload = { callId: string; observedAt: string; searchMode: "metadata"; results: CollectionMediaResult[] };

export type AIStreamEvent =
  | { event: "meta"; data: { requestId: string; conversationId?: string; model: AIModel; surface: AISurface; personaVersion: string; ragStatus: "ready"|"disabled"|"degraded"; ragHitCount: number; idempotency: "distributed"|"local-degraded"; rateLimit: "distributed"|"local-degraded" } }
  | { event: "delta"; data: { requestId:string; text: string } }
  | { event: "tool"; data: { requestId: string; callId: string; name: string; status: string; source: string; summary: string } }
  | { event: "collection_results"; data: CollectionResultsPayload & { requestId: string } }
  | { event: "citation"; data: { requestId: string; documentId?: string; sourcePath: string; version?: string; excerpt?: string } }
  | { event: "usage"; data: { requestId:string; inputTokens: number; outputTokens: number; budgetStatus: string } }
  | { event: "error"; data: { code: string; retryable: boolean; requestId: string } }
  | { event: "done"; data: { requestId:string; finishReason: string } };

export const AI_STREAM_MAX_EVENT_BYTES = 64 * 1024;
const AI_STREAM_EVENTS = new Set(["meta", "delta", "tool", "collection_results", "citation", "usage", "error", "done"]);
export function parseAIStreamBlock(buffer: string): { separator: number; event?: AIStreamEvent } {
  const separator = buffer.search(/\r?\n\r?\n/);
  if (separator < 0) { if (new TextEncoder().encode(buffer).byteLength > AI_STREAM_MAX_EVENT_BYTES) throw new Error("SSE_EVENT_TOO_LARGE"); return { separator }; }
  const block = buffer.slice(0, separator);
  if (new TextEncoder().encode(block).byteLength > AI_STREAM_MAX_EVENT_BYTES) throw new Error("SSE_EVENT_TOO_LARGE");
  const lines = block.split(/\r?\n/); const eventName = lines.find((line) => line.startsWith("event: "))?.slice(7); const dataLines = lines.filter((line) => line.startsWith("data: "));
  if (!eventName || !AI_STREAM_EVENTS.has(eventName) || dataLines.length !== 1) throw new Error("MALFORMED_SSE_EVENT");
  let data: unknown; try { data = JSON.parse(dataLines[0].slice(6)); } catch { throw new Error("MALFORMED_SSE_EVENT"); }
  if (!data || typeof data !== "object") throw new Error("MALFORMED_SSE_EVENT");
  const value = data as Record<string, unknown>;
  if (typeof value.requestId !== "string") throw new Error("MALFORMED_SSE_EVENT");
  if (eventName === "delta" && typeof value.text !== "string") throw new Error("MALFORMED_SSE_EVENT");
  if (eventName === "done" && typeof value.finishReason !== "string") throw new Error("MALFORMED_SSE_EVENT");
  if (eventName === "error" && (typeof value.code !== "string" || typeof value.retryable !== "boolean")) throw new Error("MALFORMED_SSE_EVENT");
  if (eventName === "meta" && (!["ready", "disabled", "degraded"].includes(String(value.ragStatus)) || typeof value.ragHitCount !== "number")) throw new Error("MALFORMED_SSE_EVENT");
  return { separator, event: { event: eventName, data } as AIStreamEvent };
}
