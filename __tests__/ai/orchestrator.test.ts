import { describe, expect, jest, test } from "@jest/globals";
import { runOrchestrator } from "../../lib/ai/server/orchestrator";
import type { ChatRound, CompletionRequest } from "../../lib/ai/server/client";
import { createDomainToolDescriptors } from "../../lib/ai/server/tools/liveAdapters";
import { createOnchainOSReadOnlyDescriptors, ONCHAINOS_READ_ONLY_TOOL_NAMES, preferOnchainOSReadOnlyTools } from "../../lib/ai/server/tools/onchainosReadOnly";

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
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "find vui", context: { surface: "collection", pathname: "/collection" }, evidence: [], authenticated: false }, { tools: [collectionTool], completion, maxToolRounds: 2 })) events.push(event);
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
  ] as const)("directly executes metadata media search for Collection concept %s", async (message, locale) => {
    const collectionRead = jest.fn(async (_name: "search" | "prompts" | "quests", _args: Record<string, unknown>) => ({
      observedAt: "2026-08-10T00:00:00.000Z",
      results: Array.from({ length: 12 }, (_, index) => ({
        public_id: `banmao/Concept_${index}`,
        secure_url: `https://res.cloudinary.com/demo/image/upload/concept-${index}.png`,
        context: { secret: "never-stream" },
      })),
    }));
    const collectionTool = createDomainToolDescriptors({ collectionRead }).find((descriptor) => descriptor.name === "collection.search")!;
    const requests: CompletionRequest[] = [];
    const events = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      yield { text: "Done", toolCalls: [], finishReason: "stop" };
    };
    for await (const event of runOrchestrator({ model: "banmao.fun", message, context: { surface: "collection", pathname: "/collection", locale }, evidence: [], authenticated: false }, { tools: [collectionTool], completion, maxToolRounds: 2 })) events.push(event);
    expect(collectionRead).toHaveBeenCalledTimes(1);
    expect(collectionRead).toHaveBeenCalledWith("search", { query: message, limit: 10 });
    expect(events.filter((event) => event.type === "tool")).toHaveLength(1);
    expect(events.filter((event) => event.type === "collection_results")).toHaveLength(1);
    const media = events.find((event) => event.type === "collection_results");
    expect(media).toMatchObject({ searchMode: "metadata" });
    expect(media?.type === "collection_results" ? media.results[0] : undefined).toMatchObject({ publicId: "banmao/Concept_0" });
    expect(media?.type === "collection_results" ? media.results : []).toHaveLength(10);
    expect(JSON.stringify(media)).not.toContain("never-stream");
    expect(requests).toHaveLength(1);
    expect(requests[0].tools?.map((spec) => spec.function.name) || []).not.toContain("collection_search");
    expect(requests[0].messages.some((entry) => entry.role === "assistant" && entry.tool_calls?.[0].function.name === "collection_search")).toBe(true);
    expect(requests[0].messages.some((entry) => entry.role === "tool" && entry.content.includes("Concept_0"))).toBe(true);
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
    const collectionRead = jest.fn(async (_name: "search" | "prompts" | "quests", _args: Record<string, unknown>) => ({ results: [] }));
    const collectionTool = createDomainToolDescriptors({ collectionRead }).find((descriptor) => descriptor.name === "collection.search")!;
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) { requests.push(request); yield { text: "Answer", toolCalls: [], finishReason: "stop" }; };
    for await (const _event of runOrchestrator({ model: "banmao.fun", message, context: { surface, pathname }, evidence: [], authenticated: false }, { tools: [collectionTool], completion, maxToolRounds: 1 })) { /* consume */ }
    expect(collectionRead).not.toHaveBeenCalled();
    expect(requests[0].tools?.map((spec) => spec.function.name)).toContain("collection_search");
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

  test("round-trips all OnchainOS provider-safe names to internal names and tool events", async () => {
    const tools = createOnchainOSReadOnlyDescriptors({ enabled: true, okxFetch: jest.fn(async () => new Response()) }).map((descriptor) => ({
      ...descriptor,
      parse: jest.fn((value: unknown) => value),
      execute: jest.fn(async () => ({ status: "available", source: "okx:test", value: [] })),
    }));
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      if (requests.length === 1) {
        yield {
          text: "",
          toolCalls: request.tools!.map((spec, index) => ({ id: `okx-${index}`, name: spec.function.name, arguments: "{}" })),
          finishReason: "tool_calls",
        } as ChatRound;
      } else yield { text: "Done", toolCalls: [], finishReason: "stop" } as ChatRound;
    };
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "read tokens", context: { surface: "landing", pathname: "/" }, evidence: [], authenticated: false }, { tools, completion, maxToolRounds: 2 })) events.push(event);

    const providerNames = requests[0].tools!.map((spec) => spec.function.name);
    expect(providerNames).toEqual(ONCHAINOS_READ_ONLY_TOOL_NAMES.map((name) => name.replace(".", "_")));
    expect(providerNames.every((name) => name.includes("_") && !name.includes("."))).toBe(true);
    expect(tools.every((descriptor) => descriptor.execute.mock.calls.length === 1)).toBe(true);
    const eventNames = events.filter((event) => event.type === "tool").map((event) => event.type === "tool" ? event.name : "");
    expect(eventNames).toHaveLength(ONCHAINOS_READ_ONLY_TOOL_NAMES.length * 2);
    for (const name of ONCHAINOS_READ_ONLY_TOOL_NAMES) expect(eventNames.filter((eventName) => eventName === name)).toHaveLength(2);
  });

  test("a price intent can invoke only the OnchainOS equivalent when enabled", async () => {
    const legacy = createDomainToolDescriptors();
    const onchainos = createOnchainOSReadOnlyDescriptors({ enabled: true, okxFetch: jest.fn(async () => new Response()) });
    const tools = preferOnchainOSReadOnlyTools(legacy, onchainos);
    const price = tools.find((descriptor) => descriptor.name === "onchainos.priceInfo")!;
    const execute = jest.spyOn(price, "execute").mockResolvedValue({ status: "unavailable", reason: "payment-required", paymentRequired: true, source: "okx:onchainos:price-info", observedAt: "now", asOf: "now" });
    const requests: CompletionRequest[] = [];
    const completion = async function* (request: CompletionRequest) {
      requests.push(request);
      if (requests.length === 1) yield { text: "", toolCalls: [{ id: "price-1", name: "onchainos_priceInfo", arguments: JSON.stringify({ chainId: 196, tokenAddress: "0x0000000000000000000000000000000000001234" }) }], finishReason: "tool_calls" } as ChatRound;
      else yield { text: "Market data is unavailable. Retry later or open the explorer.", toolCalls: [], finishReason: "stop" } as ChatRound;
    };
    const events = [];
    for await (const event of runOrchestrator({ model: "banmao.fun", message: "BANMAO price?", context: { surface: "landing", pathname: "/" }, evidence: [], authenticated: false }, { tools, completion, maxToolRounds: 2 })) events.push(event);
    const offered = requests[0].tools?.map((spec) => spec.function.name) || [];
    expect(offered).toContain("onchainos_priceInfo");
    expect(offered).not.toEqual(expect.arrayContaining(["market_price", "market_tokenInfo", "market_holders"]));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual(expect.objectContaining({ type: "tool", callId: "price-1", status: "unavailable", summary: "Payment required" }));
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
