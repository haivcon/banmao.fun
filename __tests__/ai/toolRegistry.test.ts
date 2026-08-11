import { createToolRegistry } from "../../lib/ai/server/toolRegistry";

describe("deterministic tool registry", () => {
  const registry = createToolRegistry([{ name: "docs.search", contexts: ["landing"], auth: "public", timeoutMs: 100, maxBytes: 100, parse: (v) => { if (!v || typeof v !== "object" || Object.keys(v).some(k => k !== "query")) throw new Error("Invalid tool arguments"); return v as {query:string}; }, execute: async () => ({ ok: true }) }]);
  test("runs an allowlisted tool", async () => expect(await registry.execute("docs.search", {query:"hi"}, {surface:"landing", authenticated:false})).toEqual({ok:true}));
  test("rejects unknown and cross-context tools", async () => { await expect(registry.execute("writeContract", {}, {surface:"landing", authenticated:true})).rejects.toThrow("Unknown tool"); await expect(registry.execute("docs.search", {query:"hi"}, {surface:"defi", authenticated:false})).rejects.toThrow("Tool not allowed"); });
  test("rejects extra args and oversized results", async () => { await expect(registry.execute("docs.search", {query:"hi", url:"http://localhost"}, {surface:"landing", authenticated:false})).rejects.toThrow("Invalid tool arguments"); const large=createToolRegistry([{...registry.descriptors[0], execute:async()=>"x".repeat(101)}]); await expect(large.execute("docs.search", {query:"hi"}, {surface:"landing", authenticated:false})).rejects.toThrow("Tool result too large"); });
});
