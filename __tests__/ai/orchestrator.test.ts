import { describe, expect, jest, test } from "@jest/globals";
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
  test("emits only sanitized structured Collection media results", async () => {
    const collectionTool = {
      ...tool, name: "collection.search", contexts: ["collection"] as const,
      execute: jest.fn(async () => ({ status: "available", source: "cloudinary:test", asOf: "2026-08-10T00:00:00.000Z", value: { observedAt: "2026-08-10T00:00:00.000Z", results: [{ public_id: "banmao/Happy_Smile", secure_url: "https://res.cloudinary.com/demo/image/upload/happy.png", folder: "banmao", format: "png", width: 100, height: 50, score: 48, matchedTerms: ["happy"], matchReason: "public_id", searchMode: "metadata", context: { secret: "never-stream" }, bytes: 999 }] } })),
    };
    let calls = 0;
    const completion = async function* () { calls += 1; yield calls === 1 ? { text: "", toolCalls: [{ id: "collection-1", name: "collection_search", arguments: '{"query":"vui"}' }], finishReason: "tool_calls" } : { text: "Found one", toolCalls: [], finishReason: "stop" }; };
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "vui", context: { surface: "collection", pathname: "/collection" }, evidence: [], authenticated: false }, { tools: [collectionTool], completion, maxToolRounds: 2 })) events.push(event);
    expect(events).toContainEqual({ type: "collection_results", callId: "collection-1", observedAt: "2026-08-10T00:00:00.000Z", searchMode: "metadata", results: [{ publicId: "banmao/Happy_Smile", secureUrl: "https://res.cloudinary.com/demo/image/upload/happy.png", thumbnailUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_480,c_limit/happy.png", name: "Happy Smile", folder: "banmao", width: 100, height: 50, format: "png", score: 48, matchedTerms: ["happy"], matchReason: "public_id", searchMode: "metadata", observedAt: "2026-08-10T00:00:00.000Z" }] });
    expect(JSON.stringify(events)).not.toContain("never-stream");
    expect(JSON.stringify(events)).not.toContain("bytes");
  });

  test.each([
    ["vui", "vi"],
    ["happy", "en"],
    ["cyberpunk", "en"],
    ["hạnh phúc", "vi"],
    ["vui vẻ", "vi"],
    ["赛博朋克", "zh"],
    ["사이버펑크", "ko"],
    ["киберпанк", "ru"],
    ["bahagia", "id"],
  ] as const)("forces metadata media search for Collection concept %s", async (message, locale) => {
    const collectionTool = {
      ...tool,
      name: "collection.search",
      contexts: ["collection"] as const,
      execute: jest.fn(async (_args: unknown, _context?: unknown) => ({ status: "available", source: "cloudinary:test", value: { results: [{ public_id: "banmao/Concept", secure_url: "https://res.cloudinary.com/demo/image/upload/concept.png" }] } })),
    };
    const requests: CompletionRequest[] = [];
    const events = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      if (requests.length === 1 && request.toolChoice !== "auto") {
        yield { text: "", toolCalls: [{ id: "concept-search", name: "collection_search", arguments: JSON.stringify({ query: message }) }], finishReason: "tool_calls" };
      } else {
        yield { text: "Done", toolCalls: [], finishReason: "stop" };
      }
    };
    for await (const event of runOrchestrator({ model: "banmao.fun", message, context: { surface: "collection", pathname: "/collection", locale }, evidence: [], authenticated: false }, { tools: [collectionTool], completion, maxToolRounds: 2 })) events.push(event);
    expect(requests[0].toolChoice).toEqual({ type: "function", function: { name: "collection_search" } });
    expect(collectionTool.execute).toHaveBeenCalledWith({ query: message }, expect.anything());
    expect(events.filter((event) => event.type === "collection_results")).toHaveLength(1);
    expect(events.find((event) => event.type === "collection_results")).toMatchObject({ searchMode: "metadata", results: [{ publicId: "banmao/Concept" }] });
    expect(requests[1].toolChoice).toBe("auto");
  });

  test.each([
    ["hello", "collection", "/collection"],
    ["What is BANMAO?", "collection", "/collection"],
    ["Tell me about happiness", "collection", "/collection"],
    ["unhappy", "collection", "/collection"],
    ["v", "collection", "/collection"],
    ["vu", "collection", "/collection"],
    ["happy", "landing", "/"],
  ] as const)("does not force Collection search for unrelated or out-of-context prompt %s", async (message, surface, pathname) => {
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) { requests.push(request); yield { text: "Answer", toolCalls: [], finishReason: "stop" }; };
    for await (const _event of runOrchestrator({ model: "banmao.fun", message, context: { surface, pathname }, evidence: [], authenticated: false }, { tools: [{ ...tool, name: "collection.search", contexts: ["collection"] as const }], completion, maxToolRounds: 1 })) { /* consume */ }
    expect(requests[0].toolChoice).toBe("auto");
  });

  test("executes only a registered tool, feeds its result back, then streams final text", async () => {
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      if (requests.length === 1) {
        yield { text: "", toolCalls: [{ id: "call-1", name: request.tools![0].function.name, arguments: '{"query":"privacy"}' }], finishReason: "tool_calls" };
      } else {
        yield { text: "Grounded answer", toolCalls: [], finishReason: "stop" };
      }
    };
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "privacy", context: { surface: "landing", pathname: "/" }, evidence: [], authenticated: false }, { tools: [tool], completion, maxToolRounds: 2 })) events.push(event);
    expect(tool.execute).toHaveBeenCalledTimes(1);
    expect(requests[0].tools?.[0].function.name).toBe("docs_search");
    expect(requests[0].tools?.every(({ function: fn }) => /^[a-zA-Z0-9_-]+$/.test(fn.name))).toBe(true);
    expect(requests[1].messages.some((message) => message.role === "assistant" && message.tool_calls?.[0].function.name === "docs_search")).toBe(true);
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

  test("places bounded conversation history before the current user turn", async () => {
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      yield { text: "Continued answer", toolCalls: [], finishReason: "stop" } as ChatRound;
    };
    for await (const _event of runOrchestrator({ model: "banmao.fun", message: "current", context: { surface: "defi", pathname: "/defi", locale: "vi" }, evidence: [], history: [{ role: "user", content: "earlier" }, { role: "assistant", content: "earlier answer" }], recentMotifs: ["staking and lock mechanics"], authenticated: false }, { tools: [], completion, maxToolRounds: 1 })) { /* consume */ }
    expect(requests[0].messages.map((message) => message.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(requests[0].messages[0].content).toContain("Reply in natural Vietnamese");
    expect(requests[0].messages[0].content).toContain("staking and lock mechanics");
  });

  test("fails closed on explicit promotional guaranteed-profit language", async () => {
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "Should I buy?", context: { surface: "defi", pathname: "/defi" }, evidence: [], authenticated: false }, { tools: [], completion: round({ text: "This offers guaranteed profit.", toolCalls: [], finishReason: "stop" }), maxToolRounds: 1 })) events.push(event);
    expect(events).toEqual([{ type: "error", code: "UNSAFE_FINANCIAL_LANGUAGE" }]);
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
