export const AI_MODELS = ["banmao.fun", "open9", "xenon1"] as const;
export type AIModel = (typeof AI_MODELS)[number];
export const AI_SURFACES = ["landing", "defi", "gamefi", "collection"] as const;
export type AISurface = (typeof AI_SURFACES)[number];

export type AIChatRequest = {
  conversationId?: string;
  message: string;
  model?: AIModel;
  context: {
    surface: AISurface;
    pathname: string;
    locale?: string;
    entity?: { type: string; id: string };
  };
  wallet?: { address: `0x${string}`; chainId: number };
};

export type ValidatedAIChatRequest = Omit<AIChatRequest, "model"> & { model: AIModel };

export type AIStreamEvent =
  | { event: "meta"; data: { requestId: string; conversationId: string; model: AIModel; surface: AISurface } }
  | { event: "delta"; data: { text: string } }
  | { event: "tool"; data: { callId: string; name: string; status: string; source: string; summary: string } }
  | { event: "citation"; data: { documentId?: string; sourcePath: string; version?: string; excerpt?: string } }
  | { event: "usage"; data: { inputTokens: number; outputTokens: number; budgetStatus: string } }
  | { event: "error"; data: { code: string; retryable: boolean; requestId: string } }
  | { event: "done"; data: { finishReason: string } };
