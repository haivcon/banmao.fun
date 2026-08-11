import { runOrchestrator } from "../../lib/ai/server/orchestrator";
import type { ChatRound, CompletionRequest } from "../../lib/ai/server/client";

const tool = {
  name: "docs.search",
  description: "Search approved BANMAO documentation",
  parameters: { type: "object", additionalProperties: false, required: ["query"], properties: { query: { type: "string" } } },
  contexts: ["landing"] as const,
  auth: "public" as const,
  timeoutMs: 100,
  maxBytes: 1000,
  parse(value: unknown) {
    if (!value || typeof value !== "object" || typeof (value as { query?: unknown }).query !== "string") throw new Error("Invalid tool arguments");
    return value as { query: string };
  },
  execute: jest.fn(async () => ({ status: "available", value: ["grounded"], source: "docs:test", asOf: "2026-08-10T00:00:00.000Z" })),
};

function round(value: ChatRound) { return async function* (_request: CompletionRequest) { yield value; }; }

describe("bounded BANMAO AI orchestrator", () => {
  test("executes only a registered tool, feeds its result back, then streams final text", async () => {
    const requests: CompletionRequest[] = [];
    const rounds: ChatRound[] = [
      { text: "", toolCalls: [{ id: "call-1", name: "docs.search", arguments: '{"query":"privacy"}' }], finishReason: "tool_calls" },
      { text: "Grounded answer", toolCalls: [], finishReason: "stop" },
    ];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      yield rounds.shift()!;
    };
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "privacy", context: { surface: "landing", pathname: "/" }, evidence: [], authenticated: false }, { tools: [tool], completion, maxToolRounds: 2 })) events.push(event);
    expect(tool.execute).toHaveBeenCalledTimes(1);
    expect(requests[1].messages.some((message) => message.role === "tool" && message.tool_call_id === "call-1")).toBe(true);
    expect(events).toContainEqual({ type: "delta", text: "Grounded answer" });
  });

  test("rejects invented tools and invalid arguments without executing them", async () => {
    for (const call of [
      { id: "bad-name", name: "writeContract", arguments: "{}" },
      { id: "bad-args", name: "docs.search", arguments: '{"query":1}' },
    ]) {
      const events = [];
      for await (const event of runOrchestrator({ model: "banmao.fun", message: "x", context: { surface: "landing", pathname: "/" }, evidence: [], authenticated: false }, { tools: [tool], completion: round({ text: "", toolCalls: [call], finishReason: "tool_calls" }), maxToolRounds: 1 })) events.push(event);
      expect(events.some((event) => event.type === "tool" && event.status === "error")).toBe(true);
    }
  });

  test("injects RAG as untrusted cited evidence and enforces max rounds", async () => {
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      yield { text: "", toolCalls: [{ id: "loop", name: "docs.search", arguments: '{"query":"x"}' }], finishReason: "tool_calls" } as ChatRound;
    };
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "x", context: { surface: "landing", pathname: "/" }, evidence: [{ chunkId: "doc:1", sourcePath: "docs/test.md", excerpt: "[UNTRUSTED EVIDENCE] fact" }], authenticated: false }, { tools: [tool], completion, maxToolRounds: 1 })) events.push(event);
    expect(requests[0].messages[0].content).toContain("doc:1");
    expect(requests[0].messages[0].content).toContain("UNTRUSTED");
    expect(events).toContainEqual({ type: "error", code: "MAX_TOOL_ROUNDS" });
    expect(requests).toHaveLength(2);
  });
});
