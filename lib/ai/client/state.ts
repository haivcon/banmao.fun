import { AI_MODELS, type AIModel, type AISurface } from "../contracts";

export type ClientMessage = { role: "user" | "assistant"; content: string };
export type ToolActivity = { callId: string; name: string; status: string; source: string; summary: string };
export type Citation = { documentId?: string; sourcePath: string; version?: string; excerpt?: string };
export type ClientState = {
  model: AIModel;
  models: AIModel[];
  messages: ClientMessage[];
  tools: ToolActivity[];
  citations: Citation[];
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
  landing: ["What can BANMAO AI explain?", "Show the current BANMAO market context"],
  defi: ["Explain BANMAO staking", "Show staking protocol status", "What are the DeFi risks?"],
  gamefi: ["Show the current FOMO round", "Explain the jackpot and timer", "Which GameFi products are live?"],
  collection: ["Help me explore BANMAO collections", "Show public Hub activity", "Explain collection privacy"],
};
export function initialClientState(model: AIModel): ClientState { return { model, models: [model], messages: [], tools: [], citations: [], status: "idle" }; }
type Action =
  | { type: "models"; models: AIModel[]; defaultModel: AIModel }
  | { type: "select-model"; model: AIModel }
  | { type: "start"; message: string }
  | { type: "delta"; text: string }
  | { type: "tool"; tool: ToolActivity }
  | { type: "citation"; citation: Citation }
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
      return { ...state, status: "streaming", error: undefined, lastPrompt: action.message, tools: [], citations: [], messages: [...state.messages, { role: "user", content: action.message }, { role: "assistant", content: "" }] };
    case "delta": {
      const messages = [...state.messages];
      const last = messages.at(-1);
      if (last?.role === "assistant") messages[messages.length - 1] = { ...last, content: last.content + action.text };
      return { ...state, messages };
    }
    case "tool": return { ...state, tools: [...state.tools, action.tool] };
    case "citation": return state.citations.some((item) => item.sourcePath === action.citation.sourcePath && item.version === action.citation.version) ? state : { ...state, citations: [...state.citations, action.citation] };
    case "error": return { ...state, status: "error", error: action.message };
    case "stop": return { ...state, status: "idle" };
    case "clear": return { ...state, messages: [], tools: [], citations: [], lastPrompt: undefined, status: "idle", error: undefined };
  }
}
