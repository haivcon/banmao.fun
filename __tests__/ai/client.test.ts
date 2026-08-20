import { streamChatCompletion, UpstreamAIError } from "../../lib/ai/server/client";

const config = {
  baseUrl: "https://xlayerbot.fun/v1" as const,
  apiKey: "unit-test-placeholder",
  models: ["banmao.fun"] as const,
  defaultModel: "banmao.fun" as const,
  requestTimeoutMs: 100,
  maxStreamBytes: 1024,
};

function sseResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("OpenAI-compatible client", () => {
  test("injects auth server-side and preserves selected model", async () => {
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const requestBody = JSON.parse(String(init?.body));
      expect(requestBody.model).toBe("banmao.fun");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer unit-test-placeholder",
      );
      return sseResponse(
        'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
      );
    });

    const chunks: string[] = [];
    for await (const chunk of streamChatCompletion(
      { model: "banmao.fun", messages: [{ role: "user", content: "hello" }] },
      { config, fetchImpl },
    )) chunks.push(chunk);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://xlayerbot.fun/v1/chat/completions");
    expect(chunks).toEqual(["Hi"]);
  });

  test("redacts non-2xx upstream errors and retries once before output without fallback", async () => {
    const fetchImpl = jest.fn(async () =>
      new Response("Bearer unit-test-placeholder internal detail", { status: 503 }),
    );

    await expect(async () => {
      for await (const _chunk of streamChatCompletion(
        { model: "banmao.fun", messages: [{ role: "user", content: "hello" }] },
        { config, fetchImpl },
      )) {
        // consume stream
      }
    }).rejects.toMatchObject({ code: "UPSTREAM_SERVER_ERROR", status: 503, phase: "connecting", retryable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("retries a transient connection once before output and reports attempt phases", async () => {
    const phases: string[] = [];
    const fetchImpl = jest.fn().mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(sseResponse('data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
    const chunks: string[] = [];
    for await (const chunk of streamChatCompletion({ model: "banmao.fun", messages: [{ role: "user", content: "hello" }] }, { config, fetchImpl, sleep: async () => {}, random: () => 0, onAttempt: (attempt, phase) => phases.push(`${attempt}:${phase}`) })) chunks.push(chunk);
    expect(chunks).toEqual(["Hi"]); expect(fetchImpl).toHaveBeenCalledTimes(2); expect(phases).toEqual(["1:connecting", "2:retrying", "2:streaming"]);
  });

  test("never retries after the first output token", async () => {
    let reads = 0;
    const fetchImpl = jest.fn(async () => new Response(new ReadableStream({ pull(controller) { if (reads++ === 0) controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')); else controller.error(new TypeError("reset")); } })));
    const chunks: string[] = [];
    await expect(async () => { for await (const chunk of streamChatCompletion({ model: "banmao.fun", messages: [{ role: "user", content: "hello" }] }, { config, fetchImpl, sleep: async () => {} })) chunks.push(chunk); }).rejects.toBeInstanceOf(UpstreamAIError);
    expect(chunks).toEqual(["partial"]); expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test.each([[401,"UPSTREAM_AUTH_FAILED"],[429,"UPSTREAM_RATE_LIMITED"],[503,"UPSTREAM_SERVER_ERROR"]])("classifies upstream HTTP %s as %s",async(status,code)=>{const fetchImpl=jest.fn(async()=>new Response("",{status}));await expect(async()=>{for await(const _chunk of streamChatCompletion({model:"banmao.fun",messages:[{role:"user",content:"hello"}]},{config:{...config,upstreamRetryLimit:0},fetchImpl})) {}}).rejects.toMatchObject({code,status});});

  test("accepts the upstream terminal finish reason when the provider omits [DONE]", async () => {
    const fetchImpl = jest.fn(async () => sseResponse(
      'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n' +
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
    ));
    const chunks: string[] = [];
    for await (const chunk of streamChatCompletion(
      { model: "banmao.fun", messages: [{ role: "user", content: "hello" }] },
      { config, fetchImpl },
    )) chunks.push(chunk);
    expect(chunks).toEqual(["Hi"]);
  });

  test("retains authoritative provider usage on the terminal round", async () => {
    const fetchImpl = jest.fn(async () => sseResponse('data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":7,"completion_tokens":2}}\n\ndata: [DONE]\n\n'));
    const { streamCompletion } = await import("../../lib/ai/server/client"); const rounds=[];
    for await(const value of streamCompletion({model:"banmao.fun",messages:[{role:"user",content:"hello"}]},{config,fetchImpl})) rounds.push(value);
    expect(rounds.at(-1)).toMatchObject({finishReason:"stop",usage:{inputTokens:7,outputTokens:2}});
  });

  test.each([
    "data: not-json\n\n",
    'data: {"choices":[{"delta":{"content":"truncated"}}]}\n\n',
  ])("rejects malformed or truncated SSE", async (body) => {
    const fetchImpl = jest.fn(async () => sseResponse(body));
    await expect(async () => {
      for await (const _chunk of streamChatCompletion(
        { model: "banmao.fun", messages: [{ role: "user", content: "hello" }] },
        { config, fetchImpl },
      )) {
        // consume stream
      }
    }).rejects.toBeInstanceOf(UpstreamAIError);
  });

  test("passes caller abort to upstream", async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });

    await expect(async () => {
      for await (const _chunk of streamChatCompletion(
        { model: "banmao.fun", messages: [{ role: "user", content: "hello" }] },
        { config, fetchImpl, signal: controller.signal },
      )) {
        // consume stream
      }
    }).rejects.toMatchObject({ code: "REQUEST_ABORTED" });
  });

  test.each(["connecting", "streaming"])(
    "reports the upstream timeout while %s separately from caller cancellation",
    async (phase) => {
      const fetchImpl = jest.fn((_url: string | URL | Request, init?: RequestInit) => {
        if (phase === "connecting") {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
          });
        }
        return Promise.resolve(new Response(new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason), { once: true });
          },
        })));
      });

      await expect(async () => {
        for await (const _chunk of streamChatCompletion(
          { model: "banmao.fun", messages: [{ role: "user", content: "hello" }] },
          { config: { ...config, requestTimeoutMs: 5 }, fetchImpl: fetchImpl as typeof fetch },
        )) {
          // consume stream
        }
      }).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
    },
  );
});
