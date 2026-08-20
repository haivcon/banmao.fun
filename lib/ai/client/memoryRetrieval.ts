import type { AIMemoryChunk } from "../contracts";
import type { ChatSession, LoadedChatSession, StoredChatMessage } from "./persistence";
import { estimateModelTokens } from "./tokenBudget";

const STOP = new Set("a an and are as at be but by for from how i in is it of on or that the this to was what when where who why with you và là của có cho trong một những được tôi bạn gì nào với".split(" "));
function terms(value: string) {
  return [...new Set(value.toLocaleLowerCase().match(/0x[a-f0-9]{8,}|#[0-9]+|[\p{L}\p{N}_.:-]{2,}/gu) || [])].filter((term) => !STOP.has(term));
}

export function completeMemoryTurns(messages: readonly StoredChatMessage[]) {
  const turns: Array<{ user: StoredChatMessage; assistant: StoredChatMessage }> = [];
  for (let index = 0; index + 1 < messages.length; index += 1) {
    const user = messages[index], assistant = messages[index + 1];
    if (user.role === "user" && assistant.role === "assistant" && assistant.status !== "interrupted" && user.content.trim() && assistant.content.trim()) {
      turns.push({ user, assistant }); index += 1;
    }
  }
  return turns;
}

export function rankMemoryChunks(query: string, loaded: readonly LoadedChatSession[], options: { excludeSessionId?: string; maxChunks?: number; maxTokens?: number } = {}): AIMemoryChunk[] {
  const queryTerms = terms(query);
  if (!queryTerms.length) return [];
  const newest = Math.max(1, ...loaded.map((item) => item.session.updatedAt));
  const candidates = loaded.flatMap(({ session, messages }) => {
    if (session.id === options.excludeSessionId) return [];
    return completeMemoryTurns(messages).map(({ user, assistant }) => {
      const haystack = `${session.title} ${user.content} ${assistant.content}`.toLocaleLowerCase();
      const matched = queryTerms.filter((term) => haystack.includes(term));
      const entities = matched.filter((term) => /^0x|^#\d+$|\d/.test(term));
      const score = matched.length * 3 + entities.length * 8 + (session.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ? 5 : 0) + session.updatedAt / newest;
      return { score, chunk: { sessionId: session.id, sessionTitle: session.title, createdAt: user.createdAt, user: user.content, assistant: assistant.content } satisfies AIMemoryChunk };
    });
  }).filter((item) => item.score >= 3).sort((a, b) => b.score - a.score || b.chunk.createdAt - a.chunk.createdAt);

  const selected: AIMemoryChunk[] = [];
  let used = 0;
  for (const { chunk } of candidates) {
    const cost = estimateModelTokens(chunk.sessionTitle + chunk.user + chunk.assistant);
    if (selected.length >= (options.maxChunks ?? 8) || used + cost > (options.maxTokens ?? 32_000)) continue;
    selected.push(chunk); used += cost;
  }
  return selected;
}

export async function retrieveSessionMemory(query: string, sessions: readonly ChatSession[], load: (id: string) => Promise<LoadedChatSession | null>, options: { excludeSessionId?: string; maxChunks?: number; maxTokens?: number } = {}) {
  const loaded = (await Promise.all(sessions.map((session) => load(session.id)))).filter((item): item is LoadedChatSession => Boolean(item));
  return rankMemoryChunks(query, loaded, options);
}
