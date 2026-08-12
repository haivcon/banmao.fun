import { AI_MODELS, type AIModel, type AISurface, type CollectionResultsPayload } from "../contracts";

export type ClientMessage = { role: "user" | "assistant"; content: string; createdAt: number };
export type ToolActivity = { callId: string; name: string; status: string; source: string; summary: string };
export type Citation = { documentId?: string; sourcePath: string; version?: string; excerpt?: string };
export type ClientState = {
  model: AIModel;
  models: AIModel[];
  messages: ClientMessage[];
  tools: ToolActivity[];
  citations: Citation[];
  collectionResults?: CollectionResultsPayload;
  lastPrompt?: string;
  status: "idle" | "streaming" | "error";
  error?: string;
};
export function deriveSurface(pathname: string): AISurface {
  if (pathname === "/") return "landing";
  for (const surface of ["defi", "gamefi", "collection"] as const) {
    if (pathname === `/${surface}` || pathname.startsWith(`/${surface}/`)) return surface;
  }
  return "landing";
}
export const SUGGESTED_PROMPTS: Record<AISurface, readonly string[]> = {
  landing: [
    "Banmao, introduce yourself and the ecosystem",
    "Map the live BANMAO products and their current status",
    "Show the current BANMAO market context with sources",
    "What should a newcomer verify first?",
  ],
  defi: [
    "Walk me through BANMAO staking and its risks",
    "Show the live staking protocol status",
    "Explain the burn and airdrop systems",
    "Is BanmaoBox deployed on X Layer mainnet?",
  ],
  gamefi: [
    "Show the current FOMO round from on-chain data",
    "Explain Slots commit/reveal and pool risks",
    "Which GameFi products are verified live?",
    "Explain Snake rewards and current limits",
  ],
  collection: [
    "Show recent public BanmaoHub activity",
    "Help me search the Banmao media collection",
    "Explain Hub quests, identity, and privacy",
    "Which Collection features are live versus proposed?",
  ],
};
export function initialClientState(model: AIModel): ClientState { return { model, models: [model], messages: [], tools: [], citations: [], status: "idle" }; }
type Action =
  | { type: "models"; models: AIModel[]; defaultModel: AIModel }
  | { type: "select-model"; model: AIModel }
  | { type: "start"; message: string; createdAt?: number }
  | { type: "delta"; text: string }
  | { type: "tool"; tool: ToolActivity }
  | { type: "citation"; citation: Citation }
  | { type: "collection_results"; payload: CollectionResultsPayload }
  | { type: "error"; message: string }
  | { type: "stop" }
  | { type: "clear" };
export function reduceClientState(state: ClientState, action: Action): ClientState {
  switch (action.type) {
    case "models": {
      const models = action.models.filter((model) => AI_MODELS.includes(model));
      if (!models.length || !models.includes(action.defaultModel)) throw new Error("Invalid model metadata");
      return { ...state, models, model: models.includes(state.model) ? state.model : action.defaultModel };
    }
    case "select-model":
      if (!state.models.includes(action.model)) throw new Error("Invalid model");
      return { ...state, model: action.model };
    case "start":
      const createdAt = action.createdAt ?? 0;
      return { ...state, status: "streaming", error: undefined, lastPrompt: action.message, tools: [], citations: [], collectionResults: undefined, messages: [...state.messages, { role: "user", content: action.message, createdAt }, { role: "assistant", content: "", createdAt }] };
    case "delta": {
      const messages = [...state.messages];
      const last = messages.at(-1);
      if (last?.role === "assistant") messages[messages.length - 1] = { ...last, content: last.content + action.text };
      return { ...state, messages };
    }
    case "tool": return { ...state, tools: [...state.tools, action.tool] };
    case "collection_results": return { ...state, collectionResults: { ...action.payload, results: action.payload.results.slice(0, 10) } };
    case "citation": return state.citations.some((item) => item.sourcePath === action.citation.sourcePath && item.version === action.citation.version) ? state : { ...state, citations: [...state.citations, action.citation] };
    case "error": return { ...state, status: "error", error: action.message };
    case "stop": return { ...state, status: "idle" };
    case "clear": return { ...state, messages: [], tools: [], citations: [], collectionResults: undefined, lastPrompt: undefined, status: "idle", error: undefined };
  }
}
