import "server-only";
import type { AIModel } from "../contracts";
import type { AIConfig } from "./config";

export class UpstreamAIError extends Error {
  constructor(readonly code: string, readonly status?: number) {
    super(code);
    this.name = "UpstreamAIError";
  }
}

export type ToolSpec = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};
export type ToolCall = { id: string; name: string; arguments: string };
export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
  | { role: "tool"; tool_call_id: string; content: string };
export type CompletionRequest = {
  model: AIModel;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  toolChoice?: "auto";
};
export type ChatRound = { text: string; toolCalls: ToolCall[]; finishReason: string };
type ClientConfig = Pick<AIConfig, "baseUrl" | "apiKey" | "requestTimeoutMs" | "maxStreamBytes">;

function upstreamCode(status: number) {
  return status === 400 || status === 404 || status === 422 ? "MODEL_REJECTED" : "UPSTREAM_UNAVAILABLE";
}

function abortedError(error: unknown, callerSignal: AbortSignal | undefined, timeout: AbortSignal) {
  if (callerSignal?.aborted) return new UpstreamAIError("REQUEST_ABORTED");
  if (timeout.aborted) return new UpstreamAIError("UPSTREAM_TIMEOUT");
  if (error instanceof DOMException && error.name === "AbortError") return new UpstreamAIError("UPSTREAM_ABORTED");
  return null;
}

export async function* streamCompletion(
  request: CompletionRequest,
  options: { config: ClientConfig; fetchImpl?: typeof fetch; signal?: AbortSignal },
): AsyncGenerator<ChatRound> {
  const fetchImpl = options.fetchImpl || fetch;
  const timeout = AbortSignal.timeout(options.config.requestTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetchImpl(`${options.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${options.config.apiKey}` },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.toolChoice,
        stream: true,
      }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    throw abortedError(error, options.signal, timeout) || new UpstreamAIError("UPSTREAM_UNAVAILABLE");
  }
  if (!response.ok) throw new UpstreamAIError(upstreamCode(response.status), response.status);
  if (!response.body) throw new UpstreamAIError("MALFORMED_UPSTREAM_STREAM");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const calls = new Map<number, ToolCall>();
  let buffer = "";
  let text = "";
  let finishReason = "stop";
  let total = 0;
  let doneSeen = false;
  let finishReasonSeen = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > options.config.maxStreamBytes) throw new UpstreamAIError("UPSTREAM_STREAM_TOO_LARGE");
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";
      for (const event of events) {
        for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") { doneSeen = true; continue; }
          try {
            const parsed = JSON.parse(data);
            const choice = parsed?.choices?.[0];
            if (typeof choice?.delta?.content === "string") text += choice.delta.content;
            if (typeof choice?.finish_reason === "string") {
              finishReason = choice.finish_reason;
              finishReasonSeen = true;
            }
            for (const partial of choice?.delta?.tool_calls || []) {
              const index = Number(partial.index || 0);
              const current = calls.get(index) || { id: "", name: "", arguments: "" };
              if (typeof partial.id === "string") current.id += partial.id;
              if (typeof partial.function?.name === "string") current.name += partial.function.name;
              if (typeof partial.function?.arguments === "string") current.arguments += partial.function.arguments;
              calls.set(index, current);
            }
          } catch {
            throw new UpstreamAIError("MALFORMED_UPSTREAM_STREAM");
          }
        }
      }
    }
    if (buffer.trim() || (!doneSeen && !finishReasonSeen)) throw new UpstreamAIError("MALFORMED_UPSTREAM_STREAM");
    const toolCalls = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);
    if (toolCalls.some((call) => !call.id || !call.name)) throw new UpstreamAIError("MALFORMED_TOOL_CALL");
    yield { text, toolCalls, finishReason };
  } catch (error) {
    if (error instanceof UpstreamAIError) throw error;
    throw abortedError(error, options.signal, timeout) || new UpstreamAIError("UPSTREAM_ABORTED");
  } finally {
    reader.releaseLock();
  }
}

export async function* streamChatCompletion(
  request: { model: AIModel; messages: ChatMessage[] },
  options: { config: ClientConfig; fetchImpl?: typeof fetch; signal?: AbortSignal },
): AsyncGenerator<string> {
  for await (const round of streamCompletion(request, options)) {
    if (round.text) yield round.text;
  }
}
