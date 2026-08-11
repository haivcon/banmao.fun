import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const checks: Record<string, string> = {};
  try { const { loadAIConfig } = await import("../../../../lib/ai/server/config"); const c = loadAIConfig(); checks.config = `OK model=${c.defaultModel} chat=${c.flags.chat}`; } catch (e) { checks.config = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  try { const { loadApprovedCorpus } = await import("../../../../lib/ai/server/rag/corpus"); const c = await loadApprovedCorpus(); checks.rag = `OK chunks=${c.length}`; } catch (e) { checks.rag = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  try { const { createDomainToolDescriptors } = await import("../../../../lib/ai/server/tools/liveAdapters"); const t = createDomainToolDescriptors(); checks.tools = `OK count=${t.length}`; } catch (e) { checks.tools = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  try { const { createToolRegistry } = await import("../../../../lib/ai/server/toolRegistry"); createToolRegistry([]); checks.registry = "OK"; } catch (e) { checks.registry = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  try { const { buildBanmaoSystemPrompt } = await import("../../../../lib/ai/server/persona"); buildBanmaoSystemPrompt({ surface: "landing", pathname: "/", message: "test", evidence: [] }); checks.persona = "OK"; } catch (e) { checks.persona = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  try { const { routeContext } = await import("../../../../lib/ai/server/contextRouter"); routeContext({ pathname: "/", surface: "landing" }); checks.router = "OK"; } catch (e) { checks.router = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  try { const { validateChatRequest } = await import("../../../../lib/ai/server/schemas"); validateChatRequest({ message: "hello", model: "banmao.fun", context: { pathname: "/", surface: "landing" } }, "banmao.fun"); checks.schemas = "OK"; } catch (e) { checks.schemas = `FAIL: ${e instanceof Error ? e.message : String(e)}`; }
  return NextResponse.json(checks, { headers: { "cache-control": "no-store" } });
}
