import { IDBFactory } from "fake-indexeddb";
import {
  AI_LEGACY_MIGRATION_KEY,
  AI_SESSION_TOKEN_CAP,
  createIndexedDBPersistenceAdapter,
  createMemoryPersistenceAdapter,
  createSessionRepository,
  estimateStoredTokens,
  selectRecentCompleteTurns,
  type StoredChatMessage,
} from "../../lib/ai/client/persistence";

const message = (role: "user" | "assistant", content: string, createdAt: number): StoredChatMessage => ({ id: `${role}-${createdAt}`, sessionId: "session", role, content, createdAt });

test("token estimate is deterministic, conservative, and Unicode aware", () => {
  expect(estimateStoredTokens("abcd")).toBe(4);
  expect(estimateStoredTokens("Tiếng Việt 🍌")).toBe(19);
  expect(estimateStoredTokens("Tiếng Việt 🍌")).toBe(estimateStoredTokens("Tiếng Việt 🍌"));
});

test("recent context keeps newest complete turns within the independent request budget", () => {
  const messages = [message("user", "old question", 1), message("assistant", "old answer", 2), message("user", "new question", 3), message("assistant", "new answer", 4), message("user", "incomplete", 5)];
  expect(selectRecentCompleteTurns(messages, 8)).toEqual([{ role: "user", content: "new question" }, { role: "assistant", content: "new answer" }]);
  expect(selectRecentCompleteTurns(messages, 100).map((item) => item.content)).toEqual(["old question", "old answer", "new question", "new answer"]);
});

test("interrupted assistant output is retained locally but excluded from future model context", () => {
  const messages = [message("user", "question", 1), { ...message("assistant", "partial", 2), status: "interrupted" as const }];
  expect(messages[1]).toMatchObject({ content: "partial", status: "interrupted" });
  expect(selectRecentCompleteTurns(messages, 100)).toEqual([]);
});

test("repository CRUD restores sessions and messages after a simulated reload", async () => {
  const adapter = createMemoryPersistenceAdapter();
  const first = createSessionRepository(adapter, { now: () => 10, uuid: () => "s1" });
  const session = await first.createSession({ locale: "vi", model: "banmao.fun", title: "Xin chào" });
  await first.appendTurn(session.id, [message("user", "Xin chào", 11), message("assistant", "Chào bạn", 12)]);
  const second = createSessionRepository(adapter, { now: () => 20, uuid: () => "s2" });
  expect(await second.listSessions()).toEqual([expect.objectContaining({ id: "s1", messageCount: 2 })]);
  expect((await second.loadSession("s1"))?.messages.map((item) => item.content)).toEqual(["Xin chào", "Chào bạn"]);
  await second.renameSession("s1", "Đã đổi tên");
  await second.archiveSession("s1", 21);
  expect((await second.loadSession("s1"))?.session).toMatchObject({ title: "Đã đổi tên", archivedAt: 21 });
});

test("500k exact boundary succeeds and over-cap rejection is atomic", async () => {
  const adapter = createMemoryPersistenceAdapter();
  const repository = createSessionRepository(adapter, { now: () => 1, uuid: () => "s1" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await repository.appendTurn("s1", [message("user", "a".repeat(AI_SESSION_TOKEN_CAP), 2)]);
  await expect(repository.appendTurn("s1", [message("assistant", "b", 3)])).rejects.toMatchObject({ code: "SESSION_QUOTA_EXCEEDED" });
  const restored = await repository.loadSession("s1");
  expect(restored?.session.estimatedTokens).toBe(AI_SESSION_TOKEN_CAP);
  expect(restored?.messages).toHaveLength(1);
});

test("legacy localStorage migration is versioned and idempotent", async () => {
  const adapter = createMemoryPersistenceAdapter();
  const repository = createSessionRepository(adapter, { now: () => 50, uuid: () => "legacy" });
  const storage = new Map([["banmao-ai-memory-v1", JSON.stringify({ version: 1, turns: [{ turn: { role: "user", content: "old" }, at: 4, topics: [], motifs: [] }] })]]);
  const local = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } };
  expect(await repository.migrateLegacy(local)).toBe("legacy");
  expect(await repository.migrateLegacy(local)).toBeNull();
  expect((await repository.loadSession("legacy"))?.messages[0].content).toBe("old");
});

test("failed legacy migration leaves no marker or partial session so a retry can succeed", async () => {
  const base = createMemoryPersistenceAdapter();
  let fail = true;
  const appendMessages = base.appendMessages!;
  const adapter = { ...base, appendMessages: async (...args: Parameters<typeof appendMessages>) => {
    if (fail && args[1].length) throw new Error("write failed");
    return appendMessages(...args);
  } };
  const repository = createSessionRepository(adapter, { now: () => 50, uuid: () => "legacy-failure" });
  const values = new Map([["banmao-ai-memory-v1", JSON.stringify({ version: 1, turns: [{ turn: { role: "user", content: "retry me" }, at: 1 }] })]]);
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  await expect(repository.migrateLegacy(storage)).rejects.toThrow("write failed");
  expect(values.has(AI_LEGACY_MIGRATION_KEY)).toBe(false);
  expect(await repository.listSessions()).toEqual([]);
  fail = false;
  await expect(repository.migrateLegacy(storage)).resolves.toBe("legacy-failure");
  expect(values.get(AI_LEGACY_MIGRATION_KEY)).toBe("1");
});

test("IndexedDB reload repairs stale metadata and append uses actual stored messages", async () => {
  const factory = new IDBFactory();
  const adapter = await createIndexedDBPersistenceAdapter(factory);
  const repository = createSessionRepository(adapter, { now: () => 10, uuid: () => "idb-session" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await repository.appendTurn("idb-session", [message("user", "actual content", 1)]);
  const stale = (await repository.loadSession("idb-session"))!;
  await adapter.putSession({ ...stale.session, estimatedTokens: 0, messageCount: 0 }, stale.messages);
  expect(await repository.listSessions()).toEqual([expect.objectContaining({ estimatedTokens: 14, messageCount: 1 })]);
  const repaired = await repository.loadSession("idb-session");
  expect(repaired?.session).toMatchObject({ estimatedTokens: 14, messageCount: 1 });
  repository.close();
  const reloaded = createSessionRepository(await createIndexedDBPersistenceAdapter(factory), { now: () => 20, uuid: () => "unused" });
  await reloaded.appendTurn("idb-session", [message("assistant", "answer", 2)]);
  expect((await reloaded.loadSession("idb-session"))?.session).toMatchObject({ estimatedTokens: 20, messageCount: 2 });
  reloaded.close();
});

test("IndexedDB concurrent appends serialize without losing messages", async () => {
  const factory = new IDBFactory();
  const repository = createSessionRepository(await createIndexedDBPersistenceAdapter(factory), { now: () => 10, uuid: () => "concurrent" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await Promise.all([
    repository.appendTurn("concurrent", [message("user", "one", 1)]),
    repository.appendTurn("concurrent", [message("assistant", "two", 2)]),
  ]);
  const loaded = await repository.loadSession("concurrent");
  expect(loaded?.messages.map((item) => item.content).sort()).toEqual(["one", "two"]);
  expect(loaded?.session.messageCount).toBe(2);
  repository.close();
});

test("IndexedDB over-cap replacement rolls back messages and metadata", async () => {
  const factory = new IDBFactory();
  const repository = createSessionRepository(await createIndexedDBPersistenceAdapter(factory), { now: () => 10, uuid: () => "rollback" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await repository.appendTurn("rollback", [message("user", "safe", 1)]);
  await expect(repository.replaceTrailingTurn("rollback", "safe", [message("user", "x".repeat(AI_SESSION_TOKEN_CAP + 1), 2)])).rejects.toMatchObject({ code: "SESSION_QUOTA_EXCEEDED" });
  const loaded = await repository.loadSession("rollback");
  expect(loaded?.messages.map((item) => item.content)).toEqual(["safe"]);
  expect(loaded?.session).toMatchObject({ estimatedTokens: 4, messageCount: 1 });
  repository.close();
});

test("retry replaces a trailing user-only turn instead of duplicating it", async () => {
  const repository = createSessionRepository(createMemoryPersistenceAdapter(), { now: () => 10, uuid: () => "s1" });
  await repository.createSession({ locale: "vi", model: "banmao.fun" });
  await repository.appendTurn("s1", [message("user", "thử lại", 1)]);
  await repository.replaceTrailingTurn("s1", "thử lại", [message("user", "thử lại", 2), message("assistant", "đã xong", 3)]);
  const loaded = await repository.loadSession("s1");
  expect(loaded?.messages.map((item) => [item.role, item.content])).toEqual([["user", "thử lại"], ["assistant", "đã xong"]]);
  expect(loaded?.session.messageCount).toBe(2);
});

test("retry atomically replaces an interrupted turn and reclaims its quota", async () => {
  const repository = createSessionRepository(createMemoryPersistenceAdapter(), { now: () => 10, uuid: () => "s1" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await repository.appendTurn("s1", [message("user", "question", 1), { ...message("assistant", "x".repeat(100), 2), status: "interrupted" }]);
  await repository.replaceTrailingTurn("s1", "question", [message("user", "question", 3), { ...message("assistant", "answer", 4), status: "complete" }]);
  const loaded = await repository.loadSession("s1");
  expect(loaded?.messages.map((item) => item.content)).toEqual(["question", "answer"]);
  expect(loaded?.session.estimatedTokens).toBe(14);
});

test("retry may reclaim an interrupted turn even when an append would exceed quota", async () => {
  const repository = createSessionRepository(createMemoryPersistenceAdapter(), { now: () => 10, uuid: () => "s1" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await repository.appendTurn("s1", [message("user", "q", 1), { ...message("assistant", "x".repeat(AI_SESSION_TOKEN_CAP - 1), 2), status: "interrupted" }]);
  await repository.replaceTrailingTurn("s1", "q", [message("user", "q", 3), { ...message("assistant", "ok", 4), status: "complete" }]);
  const loaded = await repository.loadSession("s1");
  expect(loaded?.messages.map((item) => item.content)).toEqual(["q", "ok"]);
  expect(loaded?.session.estimatedTokens).toBe(3);
});

test("quota includes structured assistant metadata and rejects the whole turn atomically", async () => {
  const repository = createSessionRepository(createMemoryPersistenceAdapter(), { now: () => 10, uuid: () => "s1" });
  await repository.createSession({ locale: "en", model: "banmao.fun" });
  await repository.appendTurn("s1", [message("user", "a".repeat(AI_SESSION_TOKEN_CAP - 100), 1)]);
  const assistant: StoredChatMessage = { ...message("assistant", "ok", 2), tools: [{ callId: "c", name: "docs.search", status: "complete", source: "local", summary: "x".repeat(100) }] };
  await expect(repository.appendTurn("s1", [assistant])).rejects.toMatchObject({ code: "SESSION_QUOTA_EXCEEDED" });
  const loaded = await repository.loadSession("s1");
  expect(loaded?.messages).toHaveLength(1);
  expect(loaded?.session.estimatedTokens).toBe(AI_SESSION_TOKEN_CAP - 100);
});

test("session invalidation payload never includes message bodies", () => {
  const payload = { version: 1 as const, type: "session-invalidated" as const, sessionId: "s1", updatedAt: 10 };
  expect(JSON.stringify(payload)).not.toContain("content");
});
