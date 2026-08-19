import { docsSearchTool } from "../../lib/ai/server/tools/docs";
import { createToolRegistry } from "../../lib/ai/server/toolRegistry";
import { appForPath, resolveContext } from "../../lib/ai/server/contextRouter";
import { shouldRetrieveDocs } from "../../lib/ai/server/rag/retrievalGate";
import { filterToolsForContext } from "../../lib/ai/server/toolSelection";
import type { ToolDescriptor } from "../../lib/ai/server/toolRegistry";

const emptyTool = (name: string): ToolDescriptor => ({
  name, contexts: ["defi"], auth: "public", timeoutMs: 100, maxBytes: 1000,
  parse: (value) => value, execute: async () => ({ status: "available" }),
});

describe("BANMAO AI DeFi integration", () => {
  test("docs.search exposes the strict model-visible JSON schema and validates execution", async () => {
    const tool = docsSearchTool([]);
    expect(tool).toMatchObject({
      name: "docs.search",
      description: expect.any(String),
      parameters: {
        type: "object", additionalProperties: false, required: ["query"],
        properties: { query: { type: "string", minLength: 1, maxLength: 500 }, topK: { type: "integer", minimum: 1, maximum: 8 } },
      },
    });
    const registry = createToolRegistry([tool]);
    await expect(registry.execute("docs.search", { query: "staking", topK: 2 }, { surface: "defi", authenticated: false })).resolves.toEqual([]);
    await expect(registry.execute("docs.search", { query: "staking", topK: 9 }, { surface: "defi", authenticated: false })).rejects.toThrow("Invalid tool arguments");
    await expect(registry.execute("docs.search", { query: "staking", extra: true }, { surface: "defi", authenticated: false })).rejects.toThrow("Invalid tool arguments");
  });

  test.each([
    ["/defi", "overview"], ["/defi/staking", "staking"], ["/defi/burn", "burn"],
    ["/defi/airdrop", "airdrop"], ["/defi/box", "box"],
  ] as const)("derives %s as %s and rejects a mismatched claim", (pathname, app) => {
    expect(appForPath(pathname)).toBe(app);
    expect(resolveContext(pathname, "defi", app)).toMatchObject({ surface: "defi", app });
    const wrong = app === "staking" ? "burn" : "staking";
    expect(() => resolveContext(pathname, "defi", wrong)).toThrow("App context mismatch");
  });

  test.each([
    ["staking", ["docs.search", "defi.portfolio", "defi.staking"]],
    ["burn", ["docs.search", "defi.burn"]],
    ["airdrop", ["docs.search", "defi.airdrop"]],
    ["box", ["docs.search", "defi.box"]],
  ] as const)("offers the exact bounded %s tool set", (app, names) => {
    const tools = ["docs.search", "defi.portfolio", "defi.staking", "defi.burn", "defi.airdrop", "defi.box"].map(emptyTool);
    const selected = filterToolsForContext(tools, { surface: "defi", app });
    expect(selected.map((tool) => tool.name).sort()).toEqual([...names].sort());
    expect(JSON.stringify(selected).length).toBeLessThan(JSON.stringify(tools).length);
  });

  test.each([
    ["Is the AI service healthy?", false], ["Open the staking amount field", false],
    ["Show my live staking position", false], ["How does the staking contract work according to the docs?", true],
    ["Explain the documented burn policy", true], ["Cite the BanmaoBox guide", true],
  ])("gates documentation retrieval for %s", (message, expected) => expect(shouldRetrieveDocs(message)).toBe(expected));
});

test("DeFi AI shell exposes prepared prompts without auto-send and health/context UI", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const shell = fs.readFileSync(path.join(process.cwd(), "app/defi/DeFiAIContext.tsx"), "utf8");
  expect(shell).toContain("requestAIChatOpen");
  expect(shell).toContain("read-only");
  expect(shell).toContain("X Layer");
  expect(shell).toContain("data-banmao-ai-id");
  expect(shell).not.toContain("requestSubmit");
});
