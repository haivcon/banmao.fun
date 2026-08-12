import type { AIModel, AIConversationTurn, CollectionResultsPayload } from "../contracts";
import type { Citation, ToolActivity } from "./state";
import type { AILocale } from "./i18n";

export const AI_SESSION_DB_NAME = "banmao-ai-chat";
export const AI_SESSION_DB_VERSION = 1;
export const AI_SESSION_TOKEN_CAP = 500_000;
export const AI_CURRENT_SESSION_KEY = "banmao-ai-current-session-v1";
export const AI_PERSISTENCE_ENABLED_KEY = "banmao-ai-persistence-enabled-v1";
export const AI_LEGACY_MEMORY_KEY = "banmao-ai-memory-v1";
export const AI_LEGACY_MIGRATION_KEY = "banmao-ai-legacy-migrated-v1";

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  localeAtCreation: AILocale;
  model: AIModel;
  estimatedTokens: number;
  messageCount: number;
  archivedAt?: number;
};

export type StoredChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  tools?: ToolActivity[];
  citations?: Citation[];
  collectionResults?: CollectionResultsPayload;
};

export type LoadedChatSession = { session: ChatSession; messages: StoredChatMessage[] };
export type SessionInvalidation = { version: 1; type: "session-invalidated"; sessionId: string; updatedAt: number; deleted?: boolean };

export class SessionQuotaError extends Error {
  readonly code = "SESSION_QUOTA_EXCEEDED";
  constructor(readonly projectedTokens: number) { super("Session storage quota exceeded"); this.name = "SessionQuotaError"; }
}

/** Conservative storage estimate: one token per UTF-8 byte, never fewer than one for non-empty text. */
export function estimateStoredTokens(value: string): number {
  if (!value) return 0;
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
  return unescape(encodeURIComponent(value)).length;
}

function messageTokens(message: StoredChatMessage): number {
  const structured = { ...(message.tools ? { tools: message.tools } : {}), ...(message.citations ? { citations: message.citations } : {}), ...(message.collectionResults ? { collectionResults: message.collectionResults } : {}) };
  return estimateStoredTokens(message.content) + (Object.keys(structured).length ? estimateStoredTokens(JSON.stringify(structured)) : 0);
}

export function selectRecentCompleteTurns(messages: readonly Pick<StoredChatMessage, "role" | "content">[], maxTokens: number, maxMessages = 12): AIConversationTurn[] {
  const complete: AIConversationTurn[][] = [];
  for (let index = 0; index + 1 < messages.length; index += 1) {
    const user = messages[index];
    const assistant = messages[index + 1];
    if (user.role === "user" && assistant.role === "assistant" && user.content && assistant.content) {
      complete.push([{ role: "user", content: user.content.slice(0, 4000) }, { role: "assistant", content: assistant.content.slice(0, 4000) }]);
      index += 1;
    }
  }
  const selected: AIConversationTurn[][] = [];
  let used = 0;
  for (let index = complete.length - 1; index >= 0; index -= 1) {
    const turn = complete[index];
    const cost = turn.reduce((sum, item) => sum + estimateStoredTokens(item.content), 0);
    if (used + cost > maxTokens || selected.flat().length + 2 > maxMessages) break;
    selected.unshift(turn); used += cost;
  }
  return selected.flat();
}

export interface PersistenceAdapter {
  listSessions(): Promise<ChatSession[]>;
  loadSession(id: string): Promise<LoadedChatSession | null>;
  putSession(session: ChatSession, messages: StoredChatMessage[]): Promise<void>;
  deleteSession(id: string): Promise<void>;
  appendMessages?(id: string, additions: StoredChatMessage[], updatedAt: number): Promise<ChatSession>;
}

export function createMemoryPersistenceAdapter(): PersistenceAdapter {
  const values = new Map<string, LoadedChatSession>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    async listSessions() { return Array.from(values.values()).map((value) => clone(value.session)).sort((a, b) => b.updatedAt - a.updatedAt); },
    async loadSession(id) { const value = values.get(id); return value ? clone(value) : null; },
    async putSession(session, messages) { values.set(session.id, clone({ session, messages })); },
    async deleteSession(id) { values.delete(id); },
    async appendMessages(id, additions, updatedAt) {
      const loaded = values.get(id); if (!loaded) throw new Error("Chat session not found");
      const projected = loaded.session.estimatedTokens + additions.reduce((sum, item) => sum + messageTokens(item), 0);
      if (projected > AI_SESSION_TOKEN_CAP) throw new SessionQuotaError(projected);
      const messages = [...loaded.messages, ...additions.map((item) => ({ ...item, sessionId: id }))];
      const firstUser = messages.find((item) => item.role === "user")?.content.trim();
      const session = { ...loaded.session, title: loaded.session.messageCount === 0 && firstUser ? firstUser.slice(0, 120) : loaded.session.title, updatedAt, estimatedTokens: projected, messageCount: messages.length };
      values.set(id, clone({ session, messages })); return clone(session);
    },
  };
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error || new Error("IndexedDB request failed")); });
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed")); transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted")); });
}

export async function createIndexedDBPersistenceAdapter(factory: IDBFactory = indexedDB): Promise<PersistenceAdapter> {
  const opening = factory.open(AI_SESSION_DB_NAME, AI_SESSION_DB_VERSION);
  opening.onupgradeneeded = () => {
    const db = opening.result;
    if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
    if (!db.objectStoreNames.contains("messages")) {
      const store = db.createObjectStore("messages", { keyPath: "id" });
      store.createIndex("sessionId", "sessionId", { unique: false });
    }
  };
  const db = await request(opening);
  return {
    async listSessions() {
      const tx = db.transaction("sessions", "readonly");
      const result = await request(tx.objectStore("sessions").getAll()) as ChatSession[];
      await transactionDone(tx);
      return result.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async loadSession(id) {
      const tx = db.transaction(["sessions", "messages"], "readonly");
      const session = await request(tx.objectStore("sessions").get(id)) as ChatSession | undefined;
      const messages = await request(tx.objectStore("messages").index("sessionId").getAll(id)) as StoredChatMessage[];
      await transactionDone(tx);
      return session ? { session, messages: messages.sort((a, b) => a.createdAt - b.createdAt) } : null;
    },
    async putSession(session, messages) {
      const tx = db.transaction(["sessions", "messages"], "readwrite");
      tx.objectStore("sessions").put(session);
      const store = tx.objectStore("messages");
      const existing = await request(store.index("sessionId").getAllKeys(session.id));
      existing.forEach((key) => store.delete(key));
      messages.forEach((message) => store.put(message));
      await transactionDone(tx);
    },
    async deleteSession(id) {
      const tx = db.transaction(["sessions", "messages"], "readwrite");
      tx.objectStore("sessions").delete(id);
      const store = tx.objectStore("messages");
      const keys = await request(store.index("sessionId").getAllKeys(id));
      keys.forEach((key) => store.delete(key));
      await transactionDone(tx);
    },
    async appendMessages(id, additions, updatedAt) {
      const tx = db.transaction(["sessions", "messages"], "readwrite");
      const sessionStore = tx.objectStore("sessions");
      const messageStore = tx.objectStore("messages");
      const session = await request(sessionStore.get(id)) as ChatSession | undefined;
      if (!session) { tx.abort(); throw new Error("Chat session not found"); }
      const projected = session.estimatedTokens + additions.reduce((sum, item) => sum + messageTokens(item), 0);
      if (projected > AI_SESSION_TOKEN_CAP) { tx.abort(); throw new SessionQuotaError(projected); }
      const firstUser = session.messageCount === 0 ? additions.find((item) => item.role === "user")?.content.trim() : undefined;
      const next = { ...session, title: firstUser ? firstUser.slice(0, 120) : session.title, updatedAt, estimatedTokens: projected, messageCount: session.messageCount + additions.length };
      sessionStore.put(next);
      additions.forEach((message) => messageStore.put({ ...message, sessionId: id }));
      await transactionDone(tx); return next;
    },
  };
}

export function createSessionRepository(adapter: PersistenceAdapter, options: { now?: () => number; uuid?: () => string } = {}) {
  const now = options.now || Date.now;
  const uuid = options.uuid || (() => crypto.randomUUID());
  return {
    listSessions: () => adapter.listSessions(),
    loadSession: (id: string) => adapter.loadSession(id),
    async createSession(input: { locale: AILocale; model: AIModel; title?: string }) {
      const timestamp = now();
      const session: ChatSession = { id: uuid(), title: input.title?.trim().slice(0, 120) || "New chat", createdAt: timestamp, updatedAt: timestamp, localeAtCreation: input.locale, model: input.model, estimatedTokens: 0, messageCount: 0 };
      await adapter.putSession(session, []); return session;
    },
    async appendTurn(id: string, additions: StoredChatMessage[]) {
      if (adapter.appendMessages) return adapter.appendMessages(id, additions, now());
      const loaded = await adapter.loadSession(id); if (!loaded) throw new Error("Chat session not found");
      const projected = loaded.session.estimatedTokens + additions.reduce((sum, item) => sum + messageTokens(item), 0);
      if (projected > AI_SESSION_TOKEN_CAP) throw new SessionQuotaError(projected);
      const messages = [...loaded.messages, ...additions.map((item) => ({ ...item, sessionId: id }))];
      const firstUser = messages.find((item) => item.role === "user")?.content.trim();
      const session = { ...loaded.session, title: loaded.session.messageCount === 0 && firstUser ? firstUser.slice(0, 120) : loaded.session.title, updatedAt: now(), estimatedTokens: projected, messageCount: messages.length };
      await adapter.putSession(session, messages); return session;
    },
    async replaceSession(id: string, messages: StoredChatMessage[], model?: AIModel) {
      const loaded = await adapter.loadSession(id); if (!loaded) throw new Error("Chat session not found");
      const estimatedTokens = messages.reduce((sum, item) => sum + messageTokens(item), 0);
      if (estimatedTokens > AI_SESSION_TOKEN_CAP) throw new SessionQuotaError(estimatedTokens);
      const session = { ...loaded.session, ...(model ? { model } : {}), updatedAt: now(), estimatedTokens, messageCount: messages.length };
      await adapter.putSession(session, messages); return session;
    },
    async renameSession(id: string, title: string) { const loaded = await adapter.loadSession(id); if (!loaded) throw new Error("Chat session not found"); await adapter.putSession({ ...loaded.session, title: title.trim().slice(0, 120) || loaded.session.title, updatedAt: now() }, loaded.messages); },
    async archiveSession(id: string, archivedAt = now()) { const loaded = await adapter.loadSession(id); if (!loaded) throw new Error("Chat session not found"); await adapter.putSession({ ...loaded.session, archivedAt, updatedAt: now() }, loaded.messages); },
    deleteSession: (id: string) => adapter.deleteSession(id),
    async exportSession(id: string) { return adapter.loadSession(id); },
    async migrateLegacy(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, locale: AILocale = "en") {
      if (storage.getItem(AI_LEGACY_MIGRATION_KEY)) return null;
      let parsed: { version?: number; turns?: Array<{ turn?: { role?: string; content?: string }; at?: number }> } | null = null;
      try { parsed = JSON.parse(storage.getItem(AI_LEGACY_MEMORY_KEY) || "null"); } catch { /* Invalid legacy data is marked handled without being imported. */ }
      storage.setItem(AI_LEGACY_MIGRATION_KEY, "1");
      const turns = parsed?.version === 1 && Array.isArray(parsed.turns) ? parsed.turns : [];
      const valid = turns.flatMap((item, index): StoredChatMessage[] => item.turn && (item.turn.role === "user" || item.turn.role === "assistant") && typeof item.turn.content === "string" ? [{ id: `${uuid()}-${index}`, sessionId: "", role: item.turn.role, content: item.turn.content.slice(0, 4000), createdAt: typeof item.at === "number" ? item.at : now() }] : []);
      if (!valid.length) return null;
      const session = await this.createSession({ locale, model: "banmao.fun", title: valid.find((item) => item.role === "user")?.content });
      await this.appendTurn(session.id, valid);
      return session.id;
    },
  };
}
