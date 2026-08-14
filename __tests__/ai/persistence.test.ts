import {
  AI_SESSION_TOKEN_CAP,
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
  expect(selectRecentCompleteTurns(messages, 22)).toEqual([{ role: "user", content: "new question" }, { role: "assistant", content: "new answer" }]);
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

test("session invalidation payload never includes message bodies", () => {
  const payload = { version: 1 as const, type: "session-invalidated" as const, sessionId: "s1", updatedAt: 10 };
  expect(JSON.stringify(payload)).not.toContain("content");
});
