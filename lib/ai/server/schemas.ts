import { z } from "zod";
import { AI_MODELS, AI_SURFACES, type AIModel, type ValidatedAIChatRequest } from "../contracts";

const contextSchema = z.object({
  surface: z.enum(AI_SURFACES),
  pathname: z.string().min(1).max(512).startsWith("/"),
  locale: z.string().min(2).max(16).optional(),
  entity: z.object({ type: z.string().min(1).max(64), id: z.string().min(1).max(128) }).strict().optional(),
}).strict();

const chatRequestSchema = z.object({
  conversationId: z.string().min(1).max(128).optional(),
  message: z.string().min(1).max(8000),
  model: z.enum(AI_MODELS).optional(),
  context: contextSchema,
  wallet: z.object({
    address: z.custom<`0x${string}`>((value) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)),
    chainId: z.literal(196),
  }).strict().optional(),
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
      : issue.path[0] === "model"
        ? "Invalid model"
        : issue.path[0] === "message" && issue.code === "too_big"
          ? "Message is too long"
          : "Invalid chat request";
    throw new AIValidationError(message, parsed.error.issues);
  }
  return { ...parsed.data, model: parsed.data.model || defaultModel };
}
