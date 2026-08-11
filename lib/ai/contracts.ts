export const AI_MODELS = ["banmao.fun", "open9", "xenon1"] as const;
export type AIModel = (typeof AI_MODELS)[number];
export const AI_SURFACES = ["landing", "defi", "gamefi", "collection"] as const;
export type AISurface = (typeof AI_SURFACES)[number];

export type AIConversationTurn = { role: "user" | "assistant"; content: string };
export type AIEpisodicState = {
  recentTopics: string[];
  recentMotifs: string[];
};

export type AIChatRequest = {
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
  wallet?: { address: `0x${string}`; chainId: number };
};

export type ValidatedAIChatRequest = Omit<AIChatRequest, "model"> & { model: AIModel };

export type AIStreamEvent =
  | { event: "meta"; data: { requestId: string; conversationId?: string; model: AIModel; surface: AISurface; personaVersion: string; ragHitCount: number } }
  | { event: "delta"; data: { text: string } }
  | { event: "tool"; data: { callId: string; name: string; status: string; source: string; summary: string } }
  | { event: "citation"; data: { documentId?: string; sourcePath: string; version?: string; excerpt?: string } }
  | { event: "usage"; data: { inputTokens: number; outputTokens: number; budgetStatus: string } }
  | { event: "error"; data: { code: string; retryable: boolean; requestId: string } }
  | { event: "done"; data: { finishReason: string } };
