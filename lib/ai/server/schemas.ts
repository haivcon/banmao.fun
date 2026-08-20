import { z } from "zod";
import { AI_MODELS, AI_SURFACES, DEFI_APPS, type AIModel, type ValidatedAIChatRequest } from "../contracts";

const contextSchema = z.object({
  surface: z.enum(AI_SURFACES),
  app: z.enum(DEFI_APPS).optional(),
  pathname: z.string().min(1).max(512).startsWith("/"),
  locale: z.string().min(2).max(16).optional(),
  entity: z.object({ type: z.string().min(1).max(64), id: z.string().min(1).max(128) }).strict().optional(),
  pageElements: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9._:-]{1,80}$/),
    type: z.enum(["button", "link", "input", "status", "section"]),
    label: z.string().min(1).max(160),
    state: z.string().max(160).optional(),
    action: z.enum(["navigate", "focus", "fill", "activate"]).optional(),
    risk: z.enum(["none", "reversible", "transaction"]).optional(),
  }).strict()).max(40).optional(),
}).strict();

const historySchema = z.array(z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(16_000),
}).strict()).max(2048);

const memorySchema = z.array(z.object({
  sessionId: z.string().min(1).max(128),
  sessionTitle: z.string().min(1).max(120),
  createdAt: z.number().int().nonnegative(),
  user: z.string().min(1).max(8_000),
  assistant: z.string().min(1).max(8_000),
}).strict()).max(12);

const motifSchema = z.enum([
  "staking and lock mechanics",
  "market inspection",
  "game rules and fairness",
  "collection and community",
  "risk and verification",
  "identity and ecosystem",
]);

const episodicSchema = z.object({
  recentTopics: z.array(z.string().min(1).max(80)).max(8),
  recentMotifs: z.array(motifSchema).max(8),
}).strict();

const chatRequestSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().min(1).max(128).optional(),
  message: z.string().min(1).max(8000),
  model: z.enum(AI_MODELS).optional(),
  context: contextSchema,
  history: historySchema.optional(),
  memory: memorySchema.optional(),
  episodic: episodicSchema.optional(),
}).strict();

export class AIValidationError extends Error {
  constructor(message: string, readonly issues: z.core.$ZodIssue[]) {
    super(message);
    this.name = "AIValidationError";
  }
}

export function validateChatRequest(input: unknown, defaultModel: AIModel): ValidatedAIChatRequest {
  const parsed = chatRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue.code === "unrecognized_keys"
      ? "Unknown field"
      : issue.path[0] === "requestId"
        ? "Invalid requestId"
        : issue.path[0] === "model"
          ? "Invalid model"
          : issue.path[0] === "message" && issue.code === "too_big"
            ? "Message is too long"
            : "Invalid chat request";
    throw new AIValidationError(message, parsed.error.issues);
  }
  return { ...parsed.data, model: parsed.data.model || defaultModel };
}
