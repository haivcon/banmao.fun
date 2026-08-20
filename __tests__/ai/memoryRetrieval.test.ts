import { completeMemoryTurns, rankMemoryChunks } from "../../lib/ai/client/memoryRetrieval";
import type { LoadedChatSession, StoredChatMessage } from "../../lib/ai/client/persistence";

const msg = (role: "user" | "assistant", content: string, createdAt: number, status?: "complete" | "interrupted"): StoredChatMessage => ({ id: `${role}-${createdAt}`, sessionId: "s", role, content, createdAt, ...(status ? { status } : {}) });
const loaded = (id: string, title: string, messages: StoredChatMessage[], updatedAt = 10): LoadedChatSession => ({ session: { id, title, createdAt: 1, updatedAt, localeAtCreation: "en", model: "banmao.fun", estimatedTokens: 0, messageCount: messages.length }, messages });

test("chunks only complete user/assistant turns and excludes interrupted output", () => {
  const messages = [msg("user", "complete question", 1), msg("assistant", "complete answer", 2), msg("user", "broken", 3), msg("assistant", "partial", 4, "interrupted")];
  expect(completeMemoryTurns(messages).map((turn) => turn.user.content)).toEqual(["complete question"]);
});

test("lexical/entity retrieval ranks relevant prior sessions and excludes the active session", () => {
  const sessions = [
    loaded("active", "Current", [msg("user", "BanmaoBox #1", 1), msg("assistant", "current", 2)]),
    loaded("box", "BanmaoBox research", [msg("user", "Inspect BanmaoBox #1 owner", 3), msg("assistant", "Use a fresh chain read", 4)], 20),
    loaded("staking", "Staking", [msg("user", "Explain lock periods", 5), msg("assistant", "30 or 90 days", 6)], 30),
  ];
  const result = rankMemoryChunks("What about BanmaoBox #1 owner?", sessions, { excludeSessionId: "active" });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ sessionId: "box", sessionTitle: "BanmaoBox research" });
});

test("retrieval honors chunk and token budgets", () => {
  const sessions = [loaded("one", "One", [msg("user", "staking alpha", 1), msg("assistant", "x".repeat(100), 2)]), loaded("two", "Two", [msg("user", "staking beta", 3), msg("assistant", "answer", 4)])];
  expect(rankMemoryChunks("staking", sessions, { maxChunks: 1 })).toHaveLength(1);
  expect(rankMemoryChunks("staking", sessions, { maxTokens: 1 })).toEqual([]);
});
