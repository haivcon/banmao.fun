import "server-only";
import { AI_MODELS, type AIModel } from "../contracts";

const BASE_URL = "https://xlayerbot.fun/v1" as const;

function enabled(value: string | undefined): boolean {
  return value === "true";
}

export function loadAIConfig(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is required");

  const defaultModel = env.AI_DEFAULT_MODEL || "banmao.fun";
  if (!AI_MODELS.includes(defaultModel as AIModel)) {
    throw new Error("AI_DEFAULT_MODEL must be allowlisted");
  }
  const txCopilot = enabled(env.AI_TX_COPILOT_ENABLED);
  if (env.NODE_ENV === "production" && txCopilot && !enabled(env.AI_DISTRIBUTED_STATE_READY)) {
    throw new Error("AI transaction copilot requires distributed state readiness in production");
  }

  return Object.freeze({
    baseUrl: BASE_URL,
    apiKey,
    models: AI_MODELS,
    defaultModel: defaultModel as AIModel,
    requestTimeoutMs: Number(env.AI_REQUEST_TIMEOUT_MS || 75_000),
    connectTimeoutMs: Number(env.AI_CONNECT_TIMEOUT_MS || 15_000),
    streamIdleTimeoutMs: Number(env.AI_STREAM_IDLE_TIMEOUT_MS || 30_000),
    upstreamRetryLimit: Math.min(1, Math.max(0, Number(env.AI_UPSTREAM_RETRY_LIMIT || 1))),
    heartbeatIntervalMs: Math.max(5_000, Number(env.AI_HEARTBEAT_INTERVAL_MS || 10_000)),
    maxStreamBytes: Number(env.AI_MAX_STREAM_BYTES || 1_000_000),
    maxRequestBytes: Number(env.AI_MAX_REQUEST_BYTES || 1_800_000),
    maxEstimatedTokens: Number(env.AI_MAX_ESTIMATED_TOKENS || 450_000),
    maxToolRounds: Number(env.AI_MAX_TOOL_ROUNDS || 3),
    flags: Object.freeze({
      chat: enabled(env.AI_CHAT_ENABLED),
      tools: enabled(env.AI_TOOLS_ENABLED),
      rag: enabled(env.AI_RAG_ENABLED),
      txCopilot,
      defiAdvisor: enabled(env.AI_DEFI_ADVISOR_ENABLED),
      gamefiCoach: enabled(env.AI_GAMEFI_COACH_ENABLED),
      collectionAdvisor: enabled(env.AI_COLLECTION_ADVISOR_ENABLED),
      marketNarrator: enabled(env.AI_MARKET_NARRATOR_ENABLED),
      onchainosReadOnly: enabled(env.AI_ONCHAINOS_READ_ONLY_ENABLED),
    }),
  });
}

export type AIConfig = ReturnType<typeof loadAIConfig>;
