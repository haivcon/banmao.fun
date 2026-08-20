import type { AIModel, AISurface, CollectionResultsPayload } from "../contracts";

export type ClientMessage = { role: "user" | "assistant"; content: string; createdAt: number };
export type ToolActivity = { requestId?: string; callId: string; name: string; status: string; source: string; summary: string };
export type Citation = { requestId?: string; documentId?: string; sourcePath: string; version?: string; excerpt?: string };
export type ClientState = {
  model: AIModel | null;
  models: AIModel[];
  messages: ClientMessage[];
  tools: ToolActivity[];
  citations: Citation[];
  collectionResults?: CollectionResultsPayload;
  lastPrompt?: string;
  status: "idle" | "streaming" | "interrupted" | "error";
  error?: string;
  notice?: "MODEL_MIGRATED";
  ragStatus?: "ready" | "disabled" | "degraded";
};
type ClientCrypto = { randomUUID?: () => string; getRandomValues?: <T extends ArrayBufferView>(array: T) => T };
export function createClientRequestId(source: ClientCrypto | undefined = typeof crypto === "undefined" ? undefined : crypto): string {
  if (source?.randomUUID) return source.randomUUID();
  const bytes = new Uint8Array(16);
  if (source?.getRandomValues) source.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
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
export function initialClientState(model: AIModel | null = null): ClientState { return { model, models: model ? [model] : [], messages: [], tools: [], citations: [], status: "idle" }; }

export function clientMessagesForRequestContext(
  messages: readonly ClientMessage[],
  status: ClientState["status"],
  retrying = false,
): Array<ClientMessage & { status?: "interrupted" }> {
  const hasTrailingTurn = messages.at(-2)?.role === "user" && messages.at(-1)?.role === "assistant";
  const end = retrying && hasTrailingTurn ? messages.length - 2 : messages.length;
  return messages.slice(0, end).map((message, index) => ({
    ...message,
    ...(status === "interrupted" && !retrying && index === messages.length - 1 && message.role === "assistant"
      ? { status: "interrupted" as const }
      : {}),
  }));
}

export function migratePersistedModel(model: unknown): { model: AIModel; migrated: boolean } {
  if (model === "banmao.fun") return { model, migrated: false };
  if (model === "open9" || model === "xenon1") return { model: "banmao.fun", migrated: true };
  throw new Error("Invalid persisted model");
}
type Action =
  | { type: "models"; models: AIModel[]; defaultModel: AIModel }
  | { type: "start"; message: string; createdAt?: number }
  | { type: "retry" }
  | { type: "delta"; text: string }
  | { type: "rag-status"; status: "ready" | "disabled" | "degraded" }
  | { type: "tool"; tool: ToolActivity }
  | { type: "citation"; citation: Citation }
  | { type: "collection_results"; payload: CollectionResultsPayload }
  | { type: "restore"; state: Pick<ClientState, "messages" | "tools" | "citations" | "collectionResults">; model?: unknown; migrated?: boolean }
  | { type: "error"; message: string }
  | { type: "interrupted"; message: string }
  | { type: "complete" }
  | { type: "stop" }
  | { type: "clear" };
export function reduceClientState(state: ClientState, action: Action): ClientState {
  switch (action.type) {
    case "models": {
      if (action.models.length !== 1 || action.models[0] !== "banmao.fun" || action.defaultModel !== "banmao.fun") throw new Error("Invalid model metadata");
      return { ...state, models: ["banmao.fun"], model: state.model ?? "banmao.fun" };
    }
    case "start":
      const createdAt = action.createdAt ?? 0;
      return { ...state, status: "streaming", error: undefined, lastPrompt: action.message, tools: [], citations: [], collectionResults: undefined, messages: [...state.messages, { role: "user", content: action.message, createdAt }, { role: "assistant", content: "", createdAt }] };
    case "retry": {
      const messages = [...state.messages];
      const last = messages.at(-1);
      if (last?.role === "assistant") messages[messages.length - 1] = { ...last, content: "" };
      return { ...state, status: "streaming", error: undefined, tools: [], citations: [], collectionResults: undefined, messages };
    }
    case "delta": {
      const messages = [...state.messages];
      const last = messages.at(-1);
      if (last?.role === "assistant") messages[messages.length - 1] = { ...last, content: last.content + action.text };
      return { ...state, messages };
    }
    case "rag-status": return { ...state, ragStatus: action.status };
    case "tool": {
      const existing = state.tools.findIndex((tool) => tool.callId === action.tool.callId);
      if (existing < 0) return { ...state, tools: [...state.tools, action.tool] };
      const tools = [...state.tools];
      tools[existing] = action.tool;
      return { ...state, tools };
    }
    case "collection_results": return { ...state, collectionResults: { ...action.payload, results: action.payload.results.slice(0, 10) } };
    case "citation": return state.citations.some((item) => item.sourcePath === action.citation.sourcePath && item.version === action.citation.version) ? state : { ...state, citations: [...state.citations, action.citation] };
    case "restore": {
      const persisted = action.model === undefined ? undefined : migratePersistedModel(action.model);
      return { ...state, ...action.state, ...(persisted ? { model: persisted.model } : {}), ...(action.migrated || persisted?.migrated ? { notice: "MODEL_MIGRATED" as const } : {}), status: "idle", error: undefined, lastPrompt: undefined };
    }
    case "error": return { ...state, status: "error", error: action.message };
    case "interrupted": return { ...state, status: "interrupted", error: action.message };
    case "complete": return { ...state, status: "idle", error: undefined };
    case "stop": return { ...state, status: "idle" };
    case "clear": return { ...state, messages: [], tools: [], citations: [], collectionResults: undefined, lastPrompt: undefined, status: "idle", error: undefined };
  }
}
