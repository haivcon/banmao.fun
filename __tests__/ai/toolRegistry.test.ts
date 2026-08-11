import { createToolRegistry } from "../../lib/ai/server/toolRegistry";

describe("deterministic tool registry", () => {
  const registry = createToolRegistry([{ name: "docs.search", contexts: ["landing"], auth: "public", timeoutMs: 100, maxBytes: 100, parse: (v) => { if (!v || typeof v !== "object" || Object.keys(v).some(k => k !== "query")) throw new Error("Invalid tool arguments"); return v as {query:string}; }, execute: async () => ({ ok: true }) }]);
  test("runs an allowlisted tool", async () => expect(await registry.execute("docs.search", {query:"hi"}, {surface:"landing", authenticated:false})).toEqual({ok:true}));
  test("rejects unknown and cross-context tools", async () => { await expect(registry.execute("writeContract", {}, {surface:"landing", authenticated:true})).rejects.toThrow("Unknown tool"); await expect(registry.execute("docs.search", {query:"hi"}, {surface:"defi", authenticated:false})).rejects.toThrow("Tool not allowed"); });
  test("rejects extra args and oversized results", async () => { await expect(registry.execute("docs.search", {query:"hi", url:"http://localhost"}, {surface:"landing", authenticated:false})).rejects.toThrow("Invalid tool arguments"); const large=createToolRegistry([{...registry.descriptors[0], execute:async()=>"x".repeat(101)}]); await expect(large.execute("docs.search", {query:"hi"}, {surface:"landing", authenticated:false})).rejects.toThrow("Tool result too large"); });
});


test("read-only cache is bounded TTL-aware and keyed by validated args",async()=>{let now=0;const execute=jest.fn(async()=>({status:"available",value:now}));const d={name:"read",contexts:["landing"] as const,auth:"public" as const,timeoutMs:100,maxBytes:1000,cacheTtlMs:10,parse:(v:unknown)=>v as {id:number},execute};const r=createToolRegistry([d],{now:()=>now,maxCacheEntries:1});const c={surface:"landing" as const,authenticated:false};await r.execute("read",{id:1},c);await r.execute("read",{id:1},c);expect(execute).toHaveBeenCalledTimes(1);await r.execute("read",{id:2},c);now=20;await r.execute("read",{id:2},c);expect(execute).toHaveBeenCalledTimes(3);});
