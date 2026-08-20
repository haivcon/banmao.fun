import "server-only";
import type { AIModel } from "../contracts";
import type { AIConfig } from "./config";

export type UpstreamPhase = "connecting" | "streaming";
export class UpstreamAIError extends Error {
  constructor(readonly code: string, readonly status?: number, readonly phase?: UpstreamPhase) {
    super(code);
    this.name = "UpstreamAIError";
  }
  get retryable() { return ["UPSTREAM_CONNECTION_FAILED", "UPSTREAM_RATE_LIMITED", "UPSTREAM_SERVER_ERROR", "UPSTREAM_TIMEOUT"].includes(this.code); }
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
export type ChatRound = { text: string; toolCalls: ToolCall[]; finishReason: string; complete?: boolean; usage?: { inputTokens: number; outputTokens: number } };
type ClientConfig = Pick<AIConfig, "baseUrl" | "apiKey" | "requestTimeoutMs" | "maxStreamBytes"> & Partial<Pick<AIConfig, "connectTimeoutMs" | "streamIdleTimeoutMs" | "upstreamRetryLimit">>;
type StreamOptions = { config: ClientConfig; fetchImpl?: typeof fetch; signal?: AbortSignal; sleep?: (ms: number) => Promise<void>; random?: () => number; onAttempt?: (attempt: number, phase: "connecting" | "retrying" | "streaming") => void };

function upstreamCode(status: number) {
  if (status === 401 || status === 403) return "UPSTREAM_AUTH_FAILED";
  if (status === 429) return "UPSTREAM_RATE_LIMITED";
  if (status >= 500) return "UPSTREAM_SERVER_ERROR";
  return status === 400 || status === 404 || status === 422 ? "MODEL_REJECTED" : "UPSTREAM_REJECTED";
}

function abortedError(error: unknown, callerSignal: AbortSignal | undefined, totalTimeout: AbortSignal, phaseTimeout: AbortSignal, phase: UpstreamPhase) {
  if (callerSignal?.aborted) return new UpstreamAIError("REQUEST_ABORTED", undefined, phase);
  if (totalTimeout.aborted || phaseTimeout.aborted) return new UpstreamAIError("UPSTREAM_TIMEOUT", undefined, phase);
  if (error instanceof DOMException && error.name === "AbortError") return new UpstreamAIError("UPSTREAM_ABORTED", undefined, phase);
  return null;
}

async function readWithTimeout(reader: ReadableStreamDefaultReader<Uint8Array>, timeoutMs: number, signals: { caller?: AbortSignal; total: AbortSignal }) {
  const idle = new AbortController();
  const timer = setTimeout(() => { idle.abort(); void reader.cancel("stream idle timeout").catch(() => undefined); }, timeoutMs);
  const aborted = new Promise<never>((_, reject) => idle.signal.addEventListener("abort", () => reject(idle.signal.reason), { once: true }));
  try { return await Promise.race([reader.read(), aborted]); }
  catch (error) { throw abortedError(error, signals.caller, signals.total, idle.signal, "streaming") || new UpstreamAIError("UPSTREAM_CONNECTION_FAILED", undefined, "streaming"); }
  finally { clearTimeout(timer); }
}

export async function* streamCompletion(request: CompletionRequest, options: StreamOptions): AsyncGenerator<ChatRound> {
  const fetchImpl = options.fetchImpl || fetch;
  const totalTimeout = AbortSignal.timeout(options.config.requestTimeoutMs);
  const retryLimit = options.config.upstreamRetryLimit ?? 1;
  const sleep = options.sleep || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random || Math.random;
  let outputEmitted = false;

  for (let attempt = 1; ; attempt += 1) {
    const connectTimeout = new AbortController();
    const connectTimer = setTimeout(() => connectTimeout.abort(), options.config.connectTimeoutMs ?? Math.min(15_000, options.config.requestTimeoutMs));
    const signal = AbortSignal.any([...(options.signal ? [options.signal] : []), totalTimeout, connectTimeout.signal]);
    options.onAttempt?.(attempt, attempt === 1 ? "connecting" : "retrying");
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetchImpl(`${options.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${options.config.apiKey}` },
        body: JSON.stringify({ model: request.model, messages: request.messages, tools: request.tools, tool_choice: request.toolChoice, stream: true }),
        cache: "no-store",
        signal,
      });
      clearTimeout(connectTimer);
      if (!response.ok) throw new UpstreamAIError(upstreamCode(response.status), response.status, "connecting");
      if (!response.body) throw new UpstreamAIError("MALFORMED_UPSTREAM_STREAM", undefined, "connecting");
      options.onAttempt?.(attempt, "streaming");
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      const calls = new Map<number, ToolCall>();
      let buffer = "", finishReason = "stop", total = 0;
      let doneSeen = false, finishReasonSeen = false;
      let usage: ChatRound["usage"];
      while (true) {
        const { done, value } = await readWithTimeout(reader, options.config.streamIdleTimeoutMs ?? 30_000, { caller: options.signal, total: totalTimeout });
        if (done) break;
        total += value.byteLength;
        if (total > options.config.maxStreamBytes) throw new UpstreamAIError("UPSTREAM_STREAM_TOO_LARGE", undefined, "streaming");
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/); buffer = events.pop() || "";
        for (const event of events) for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") { doneSeen = true; continue; }
              let parsed;
          try { parsed = JSON.parse(data); } catch { throw new UpstreamAIError("MALFORMED_UPSTREAM_STREAM", undefined, "streaming"); }
          const choice = parsed?.choices?.[0];
          if (Number.isFinite(parsed?.usage?.prompt_tokens) && Number.isFinite(parsed?.usage?.completion_tokens)) usage = { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens };
          if (typeof choice?.delta?.content === "string" && choice.delta.content) { outputEmitted = true; yield { text: choice.delta.content, toolCalls: [], finishReason: "", complete: false }; }
          if (typeof choice?.finish_reason === "string") { finishReason = choice.finish_reason; finishReasonSeen = true; }
          for (const partial of choice?.delta?.tool_calls || []) {
            outputEmitted = true;
            const index = Number(partial.index || 0), current = calls.get(index) || { id: "", name: "", arguments: "" };
            if (typeof partial.id === "string") current.id += partial.id;
            if (typeof partial.function?.name === "string") current.name += partial.function.name;
            if (typeof partial.function?.arguments === "string") current.arguments += partial.function.arguments;
            calls.set(index, current);
          }
        }
      }
      if (buffer.trim() || (!doneSeen && !finishReasonSeen)) throw new UpstreamAIError("MALFORMED_UPSTREAM_STREAM", undefined, "streaming");
      const toolCalls = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);
      if (toolCalls.some((call) => !call.id || !call.name)) throw new UpstreamAIError("MALFORMED_TOOL_CALL", undefined, "streaming");
      yield { text: "", toolCalls, finishReason, complete: true, usage }; return;
    } catch (cause) {
      const error = cause instanceof UpstreamAIError ? cause : abortedError(cause, options.signal, totalTimeout, connectTimeout.signal, "connecting") || new UpstreamAIError("UPSTREAM_CONNECTION_FAILED", undefined, "connecting");
      if (outputEmitted || !error.retryable || attempt > retryLimit || options.signal?.aborted || totalTimeout.aborted) throw error;
      await sleep(Math.min(1_000, 200 * attempt * (1 + random())));
    } finally { clearTimeout(connectTimer);reader?.releaseLock(); }
  }
}

export async function* streamChatCompletion(
  request: { model: AIModel; messages: ChatMessage[] },
  options: StreamOptions,
): AsyncGenerator<string> {
  for await (const round of streamCompletion(request, options)) {
    if (round.text) yield round.text;
  }
}
