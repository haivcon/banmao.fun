import { streamChatCompletion, UpstreamAIError } from "../../lib/ai/server/client";

const config = {
  baseUrl: "https://xlayerbot.fun/v1" as const,
  apiKey: "unit-test-placeholder",
  models: ["banmao.fun", "open9", "xenon1"] as const,
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
      expect(requestBody.model).toBe("xenon1");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer unit-test-placeholder",
      );
      return sseResponse(
        'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
      );
    });

    const chunks: string[] = [];
    for await (const chunk of streamChatCompletion(
      { model: "xenon1", messages: [{ role: "user", content: "hello" }] },
      { config, fetchImpl },
    )) chunks.push(chunk);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://xlayerbot.fun/v1/chat/completions");
    expect(chunks).toEqual(["Hi"]);
  });

  test("redacts non-2xx upstream errors and never retries/falls back", async () => {
    const fetchImpl = jest.fn(async () =>
      new Response("Bearer unit-test-placeholder internal detail", { status: 503 }),
    );

    await expect(async () => {
      for await (const _chunk of streamChatCompletion(
        { model: "open9", messages: [{ role: "user", content: "hello" }] },
        { config, fetchImpl },
      )) {
        // consume stream
      }
    }).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE", status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("accepts the upstream terminal finish reason when the provider omits [DONE]", async () => {
    const fetchImpl = jest.fn(async () => sseResponse(
      'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n' +
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
    ));
    const chunks: string[] = [];
    for await (const chunk of streamChatCompletion(
      { model: "open9", messages: [{ role: "user", content: "hello" }] },
      { config, fetchImpl },
    )) chunks.push(chunk);
    expect(chunks).toEqual(["Hi"]);
  });

  test.each([
    "data: not-json\n\n",
    'data: {"choices":[{"delta":{"content":"truncated"}}]}\n\n',
  ])("rejects malformed or truncated SSE", async (body) => {
    const fetchImpl = jest.fn(async () => sseResponse(body));
    await expect(async () => {
      for await (const _chunk of streamChatCompletion(
        { model: "open9", messages: [{ role: "user", content: "hello" }] },
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
        { model: "open9", messages: [{ role: "user", content: "hello" }] },
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
          { model: "open9", messages: [{ role: "user", content: "hello" }] },
          { config: { ...config, requestTimeoutMs: 5 }, fetchImpl: fetchImpl as typeof fetch },
        )) {
          // consume stream
        }
      }).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
    },
  );
});
