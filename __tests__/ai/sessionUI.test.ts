import * as fs from "node:fs";
import * as path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownRenderer from "../../app/components/ai/MarkdownRenderer";
import { COPY_FEEDBACK_MS, scheduleCopyFeedbackReset } from "../../app/components/ai/AIMessage";
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

test("markdown horizontal rules render as separators instead of literal text", () => {
  const html=renderToStaticMarkup(createElement(MarkdownRenderer,{content:"First\n\n---\n\nSecond",language:"en"}));
  expect(html).toContain("<hr/>");
  expect(html).not.toContain(">---<");
});

test("copy feedback lasts about two seconds and completed chats hide onboarding suggestions", () => {
  expect(COPY_FEEDBACK_MS).toBe(2000);
  const reset=jest.fn();
  const schedule=jest.fn((_callback:()=>void,_delay:number)=>42);
  expect(scheduleCopyFeedbackReset(reset,schedule)).toBe(42);
  expect(schedule).toHaveBeenCalledWith(reset,2000);
  expect(reset).not.toHaveBeenCalled();
  (schedule.mock.calls[0][0] as () => void)();
  expect(reset).toHaveBeenCalledTimes(1);
  const panel=fs.readFileSync(path.join(process.cwd(), "app/components/ai/AIChatPanel.tsx"), "utf8");
  expect(panel).not.toMatch(/state\.messages\.length\s*&&\s*<div className="banmao-ai-suggestions"/);
});

test("persisted tool activity coalesces running and terminal entries by call ID", () => {
  const provider=fs.readFileSync(path.join(process.cwd(), "app/components/ai/AIChatProvider.tsx"), "utf8");
  expect(provider).toMatch(/tools\.findIndex\(\(tool\)=>tool\.callId===streamEvent\.data\.callId\)/);
  expect(provider).toMatch(/tools\[existing\]=streamEvent\.data/);
  expect(provider).not.toMatch(/tools\.push\(streamEvent\.data\); dispatch/);
});

test("Escape closes the dialog and mount cleanup restores launcher focus", () => {
  const panel=fs.readFileSync(path.join(process.cwd(), "app/components/ai/AIChatPanel.tsx"), "utf8");
  const provider=fs.readFileSync(path.join(process.cwd(), "app/components/ai/AIChatProvider.tsx"), "utf8");
  expect(panel).toMatch(/event\.key\s*===\s*"Escape"\) props\.close\(\)/);
  expect(panel).toMatch(/previous\?\.focus\(\)/);
  expect(panel).toMatch(/role="dialog" aria-modal="true"/);
  expect(provider).toMatch(/function closePanel\(\) \{ if \(state\.status === "streaming"\) stop\(\); setOpen\(false\)/);
  expect(provider).toMatch(/close=\{closePanel\}/);
});

test("singleton model identity is static and no model selector is rendered", () => {
  const panel=fs.readFileSync(path.join(process.cwd(), "app/components/ai/AIChatPanel.tsx"), "utf8");
  const modelIdentity=fs.readFileSync(path.join(process.cwd(), "app/components/ai/ModelSelector.tsx"), "utf8");
  expect(panel).not.toContain("models={props.state.models}");
  expect(modelIdentity).toContain("banmao.fun");
  expect(modelIdentity).not.toContain("<select");
});
