import * as fs from "node:fs";
import * as path from "node:path";
import { AI_SESSION_TOKEN_CAP, type ChatSession } from "../../lib/ai/client/persistence";
import { filterSessions, getQuotaState, validateSessionTitle, runConfirmedDelete } from "../../lib/ai/client/sessionUI";

const session = (id: string, title: string, archivedAt?: number): ChatSession => ({
  id, title, archivedAt, createdAt: 1, updatedAt: 1, localeAtCreation: "en", model: "banmao.fun", estimatedTokens: 0, messageCount: 0,
});

test("filters active and archived sessions locally with normalized search", () => {
  const sessions = [session("1", "  Market Notes  "), session("2", "DeFi Risks", 2)];
  expect(filterSessions(sessions, "market", false).map((item) => item.id)).toEqual(["1"]);
  expect(filterSessions(sessions, " RISK ", true).map((item) => item.id)).toEqual(["2"]);
  expect(filterSessions(sessions, "missing", false)).toEqual([]);
});

test("validates trimmed session names without silently accepting invalid input", () => {
  expect(validateSessionTitle("   ")).toEqual({ valid: false, title: "" });
  expect(validateSessionTitle("  Research  ")).toEqual({ valid: true, title: "Research" });
  expect(validateSessionTitle("x".repeat(121))).toEqual({ valid: false, title: "x".repeat(121) });
});

test("quota meter distinguishes normal, near-limit, and full storage states", () => {
  expect(getQuotaState(0, AI_SESSION_TOKEN_CAP)).toMatchObject({ level: "normal", percent: 0 });
  expect(getQuotaState(450_000, AI_SESSION_TOKEN_CAP)).toMatchObject({ level: "near", percent: 90 });
  expect(getQuotaState(AI_SESSION_TOKEN_CAP, AI_SESSION_TOKEN_CAP)).toMatchObject({ level: "full", percent: 100 });
});

test("delete only runs after confirmation for the same pending session", async () => {
  const deleted: string[] = [];
  await runConfirmedDelete("one", "two", async (id) => { deleted.push(id); });
  expect(deleted).toEqual([]);
  await runConfirmedDelete("one", "one", async (id) => { deleted.push(id); });
  expect(deleted).toEqual(["one"]);
});

test("desktop low-height panel reserves the root offset and panel gap", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "app/components/ai/ai-chat.css"), "utf8");
  const rootRule = css.match(/\.banmao-ai-root \{([^}]*)\}/)?.[1];
  const rule = css.match(/@media \(max-height: 650px\) and \(min-width: 641px\) \{\s*\.banmao-ai-panel \{([^}]*)\}/)?.[1];

  expect(rootRule).toMatch(/--ai-root-bottom:\s*max\(20px,\s*calc\(env\(safe-area-inset-bottom\)\s*\+\s*68px\)\)/);
  expect(rootRule).toMatch(/bottom:\s*var\(--ai-root-bottom\)/);
  expect(rule).toBeDefined();
  expect(rule).toMatch(/height:\s*min\(760px,\s*calc\(100dvh\s*-\s*var\(--ai-root-bottom\)\s*-\s*72px\s*-\s*20px\)\)/);
  expect(rule).toMatch(/bottom:\s*72px/);
});
