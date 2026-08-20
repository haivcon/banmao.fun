"use client";

import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { confirmPageAction as executeConfirmedPageAction, proposePageAction, type AIPageAction } from "../../../lib/ai/client/actionBridge";
import { collectPageElements } from "../../../lib/ai/client/pageContext";
import { fetchWithOneRetry } from "../../../lib/ai/client/recovery";
import { retrieveSessionMemory } from "../../../lib/ai/client/memoryRetrieval";
import { AI_CROSS_SESSION_MEMORY_TOKEN_BUDGET, AI_CURRENT_HISTORY_TOKEN_BUDGET } from "../../../lib/ai/client/tokenBudget";
import { aiText, normalizeAILocale, type AILocale } from "../../../lib/ai/client/i18n";
import { createAILanguageSubscriber, readAILanguage } from "../../../lib/ai/client/locale";
import { subscribeAIChatOpen } from "../../../lib/ai/client/openContract";
import {
  AI_CURRENT_SESSION_KEY,
  AI_PERSISTENCE_ENABLED_KEY,
  AI_SESSION_TOKEN_CAP,
  createIndexedDBPersistenceAdapter,
  createMemoryPersistenceAdapter,
  createSessionRepository,
  estimateStoredTokens,
  selectRecentCompleteTurns,
  SessionQuotaError,
  type ChatSession,
  type LoadedChatSession,
  type SessionInvalidation,
  type StoredChatMessage,
} from "../../../lib/ai/client/persistence";
import { clientMessagesForRequestContext, createClientRequestId, deriveSurface, initialClientState, migratePersistedModel, reduceClientState, type Citation, type ToolActivity } from "../../../lib/ai/client/state";
import { createEmotionState, emotionForSSEEvent, emotionForTransactionEvent, emotionReducer, type TransactionEmotionEvent } from "../../../lib/ai/client/emotion";
import { parseAIStreamBlock, type AIMemoryChunk, type AIModel, type CollectionResultsPayload, type DeFiApp } from "../../../lib/ai/contracts";
import AIChatLauncher from "./AIChatLauncher";
import AIChatPanel from "./AIChatPanel";
import type { FloatingRect } from "./floatingPosition";
import TransactionCopilot from "./TransactionCopilot";
import { getMascotAsset } from "./mascot/mascotAssets";

const PREF_KEY = "banmao-ai-mascot-preferences";
const SYNC_KEY = "banmao-ai-session-sync-v1";
const CHANNEL_NAME = "banmao-ai-sessions-v1";
const CROSS_SESSION_MEMORY_KEY = "banmao-ai-cross-session-memory-v1";

type Repository = ReturnType<typeof createSessionRepository>;
export type AIChatPersistenceAPI = {
  sessions: ChatSession[];
  currentSessionId: string | null;
  persistenceReady: boolean;
  persistenceError?: string;
  persistenceEnabled: boolean;
  estimatedTokens: number;
  quotaTokens: number;
  actionsDisabled: boolean;
  listSessions: () => Promise<ChatSession[]>;
  createSession: () => Promise<ChatSession>;
  switchSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  archiveSession: (id: string) => Promise<void>;
  exportSession: (id?: string) => Promise<LoadedChatSession | null>;
};
const PersistenceContext = createContext<AIChatPersistenceAPI | null>(null);
export function useAIChatPersistence() { const value = useContext(PersistenceContext); if (!value) throw new Error("AI chat persistence is unavailable"); return value; }


function restoredState(loaded: LoadedChatSession) {
  const assistant = loaded.messages.filter((message) => message.role === "assistant");
  return {
    messages: loaded.messages.map(({ role, content, createdAt }) => ({ role, content, createdAt })),
    tools: assistant.flatMap((message) => message.tools || []),
    citations: assistant.flatMap((message) => message.citations || []),
    collectionResults: assistant.map((message) => message.collectionResults).filter(Boolean).at(-1),
  };
}
const uid = createClientRequestId;

export default function AIChatProvider({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [launcherRect, setLauncherRect] = useState<FloatingRect>();
  const [input, setInputState] = useState("");
  const [language, setLanguage] = useState<AILocale>("en");
  const [persistenceEnabled, setPersistenceEnabledState] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [crossSessionMemoryEnabled, setCrossSessionMemoryEnabledState] = useState(false);
  const [usedMemorySessions, setUsedMemorySessions] = useState<Array<{ id: string; title: string }>>([]);
  const [dismissedMemorySessionIds, setDismissedMemorySessionIds] = useState<string[]>([]);
  const [persistenceError, setPersistenceError] = useState<string>();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [actionReviewed, setActionReviewed] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIPageAction | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [txCopilotEnabled, setTxCopilotEnabled] = useState(false);
  const [health, setHealth] = useState<"online" | "degraded" | "offline">("offline");
  const [mascotVisible, setMascotVisibleState] = useState(true);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [state, dispatch] = useReducer(reduceClientState, initialClientState());
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [emotionState, dispatchEmotion] = useReducer(emotionReducer, undefined, createEmotionState);
  const abort = useRef<AbortController | null>(null);
  const requestGeneration = useRef(0);
  const repository = useRef<Repository | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const streamingRef = useRef(false);
  const pendingInvalidations = useRef(new Map<string, SessionInvalidation>());
  const creatingInitialSession = useRef(false);
  const surface = deriveSurface(pathname);
  const app: DeFiApp | undefined = surface === "defi" ? pathname.startsWith("/defi/staking") ? "staking" : pathname.startsWith("/defi/burn") ? "burn" : pathname.startsWith("/defi/airdrop") ? "airdrop" : pathname.startsWith("/defi/box") ? "box" : "overview" : undefined;
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { streamingRef.current = lifecycleBusy; }, [lifecycleBusy]);

  const failPersistenceClosed = useCallback(() => {
    repository.current?.close();
    repository.current = createSessionRepository(createMemoryPersistenceAdapter());
    setSessions([]); setCurrentSessionId(null); currentSessionIdRef.current = null;
    setPersistenceEnabledState(false); setCrossSessionMemoryEnabledState(false); setUsedMemorySessions([]); setPersistenceError("unavailable"); setPersistenceReady(true);
    try { localStorage.setItem(AI_PERSISTENCE_ENABLED_KEY, "false"); localStorage.setItem(CROSS_SESSION_MEMORY_KEY, "false"); localStorage.removeItem(AI_CURRENT_SESSION_KEY); } catch { /* In-memory fallback remains available. */ }
  }, []);

  const runPersistenceAction = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try { return await action(); }
    catch (error) { if (!(error instanceof SessionQuotaError)) failPersistenceClosed(); throw error; }
  }, [failPersistenceClosed]);

  const refreshSessions = useCallback(async () => {
    try {
      const values = await repository.current?.listSessions() || [];
      setSessions(values);
      return values;
    } catch (error) {
      failPersistenceClosed();
      throw error;
    }
  }, [failPersistenceClosed]);
  const publishInvalidation = useCallback((sessionId: string, updatedAt = Date.now(), deleted = false) => {
    const payload: SessionInvalidation = { version: 1, type: "session-invalidated", sessionId, updatedAt, ...(deleted ? { deleted: true } : {}) };
    channel.current?.postMessage(payload);
    try { localStorage.setItem(SYNC_KEY, JSON.stringify(payload)); } catch { /* BroadcastChannel remains preferred. */ }
  }, []);
  const restore = useCallback(async (id: string) => {
    const loaded = await runPersistenceAction(async () => repository.current?.loadSession(id));
    if (!loaded) return;
    const persistedModel = migratePersistedModel(loaded.session.model);
    if (persistedModel.migrated) {
      await repository.current?.replaceSession(id, loaded.messages, persistedModel.model);
      await refreshSessions();
      publishInvalidation(id);
    }
    setCurrentSessionId(id);
    try { localStorage.setItem(AI_CURRENT_SESSION_KEY, id); } catch { /* Small pointer is optional. */ }
    dispatch({ type: "restore", state: restoredState(loaded), model: persistedModel.model, migrated: persistedModel.migrated });
  }, [publishInvalidation, refreshSessions, runPersistenceAction]);
  const listSessions = useCallback(() => refreshSessions(), [refreshSessions]);
  const createSession = useCallback(async () => {
    if (streamingRef.current) throw new Error("Session actions are unavailable while streaming");
    if (!repository.current) throw new Error("Persistence is not ready");
    const created = await runPersistenceAction(() => repository.current!.createSession({ locale: language, model: state.model, title: aiText(language, "newChat") }));
    await refreshSessions(); await restore(created.id); publishInvalidation(created.id, created.updatedAt); return created;
  }, [language, publishInvalidation, refreshSessions, restore, runPersistenceAction, state.model]);
  const switchSession = useCallback(async (id: string) => { if (streamingRef.current) throw new Error("Session actions are unavailable while streaming"); await restore(id); }, [restore]);
  const renameSession = useCallback(async (id: string, title: string) => { if (streamingRef.current) throw new Error("Session actions are unavailable while streaming"); await runPersistenceAction(async () => repository.current?.renameSession(id, title)); await refreshSessions(); publishInvalidation(id); }, [publishInvalidation, refreshSessions, runPersistenceAction]);
  const archiveSession = useCallback(async (id: string) => { if (streamingRef.current) throw new Error("Session actions are unavailable while streaming"); await runPersistenceAction(async () => repository.current?.archiveSession(id)); await refreshSessions(); publishInvalidation(id); }, [publishInvalidation, refreshSessions, runPersistenceAction]);
  const deleteSession = useCallback(async (id: string) => { if (streamingRef.current) throw new Error("Session actions are unavailable while streaming"); await runPersistenceAction(async () => repository.current?.deleteSession(id)); const remaining = await refreshSessions(); publishInvalidation(id, Date.now(), true); if (id === currentSessionId) { if (remaining[0]) await restore(remaining[0].id); else await createSession(); } }, [createSession, currentSessionId, publishInvalidation, refreshSessions, restore, runPersistenceAction]);
  const exportSession = useCallback(async (id = currentSessionId || "") => id ? runPersistenceAction(async () => repository.current?.exportSession(id) || null) : null, [currentSessionId, runPersistenceAction]);
  const applyInvalidation = useCallback(async (payload: SessionInvalidation) => {
    const available = await refreshSessions();
    if (payload.sessionId !== currentSessionIdRef.current) return;
    if (!payload.deleted) { await restore(payload.sessionId); return; }
    const next = available[0];
    if (next) await restore(next.id);
    else {
      setCurrentSessionId(null); currentSessionIdRef.current = null; dispatch({ type: "clear" });
      try { localStorage.removeItem(AI_CURRENT_SESSION_KEY); } catch { /* Small pointer is optional. */ }
    }
  }, [refreshSessions, restore]);

  useEffect(() => createAILanguageSubscriber({ events: window, read: () => readAILanguage(localStorage, document.documentElement.lang, navigator.language), onChange: setLanguage }), []);
  useEffect(() => {
    let cancelled = false;
    const onInvalidation = (event: MessageEvent<SessionInvalidation> | StorageEvent) => {
      let payload: SessionInvalidation | undefined;
      if ("data" in event) payload = event.data;
      else if (event.key === SYNC_KEY && event.newValue) { try { payload = JSON.parse(event.newValue); } catch { return; } }
      if (payload?.version !== 1 || payload.type !== "session-invalidated") return;
      if (streamingRef.current) {
        const pending = pendingInvalidations.current.get(payload.sessionId);
        if (!pending || payload.updatedAt >= pending.updatedAt) pendingInvalidations.current.set(payload.sessionId, payload);
        return;
      }
      void applyInvalidation(payload).catch(failPersistenceClosed);
    };
    try { channel.current = new BroadcastChannel(CHANNEL_NAME); channel.current.onmessage = onInvalidation; } catch { /* storage event fallback below */ }
    window.addEventListener("storage", onInvalidation as EventListener);
    (async () => {
      let enabled = localStorage.getItem(AI_PERSISTENCE_ENABLED_KEY) === "true";
      let adapter = createMemoryPersistenceAdapter();
      if (enabled) {
        try { adapter = await createIndexedDBPersistenceAdapter(); }
        catch {
          enabled = false;
          try { localStorage.setItem(AI_PERSISTENCE_ENABLED_KEY, "false"); } catch { /* In-memory fallback remains available. */ }
          if (!cancelled) setPersistenceError("unavailable");
        }
      }
      if (cancelled) return;
      repository.current = createSessionRepository(adapter);
      setPersistenceEnabledState(enabled);
      setCrossSessionMemoryEnabledState(enabled && localStorage.getItem(CROSS_SESSION_MEMORY_KEY) === "true");
      if (enabled) {
        const initialLocale = readAILanguage(localStorage, document.documentElement.lang, navigator.language);
        await repository.current.migrateLegacy(localStorage, initialLocale);
        const available = await refreshSessions();
        const preferred = localStorage.getItem(AI_CURRENT_SESSION_KEY);
        const selected = preferred && available.some((session) => session.id === preferred) ? preferred : available[0]?.id;
        if (selected) { setSessions(available); await restore(selected); }
      }
      setPersistenceReady(true);
    })().catch(() => { if (!cancelled) failPersistenceClosed(); });
    return () => { cancelled = true; channel.current?.close(); repository.current?.close(); window.removeEventListener("storage", onInvalidation as EventListener); };
  // Initialization deliberately runs once; current locale continues reactively through the separate subscriber.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lifecycleBusy || !pendingInvalidations.current.size) return;
    const queued = [...pendingInvalidations.current.values()].sort((a, b) => a.updatedAt - b.updatedAt);
    pendingInvalidations.current.clear();
    void queued.reduce((chain, payload) => chain.then(() => applyInvalidation(payload)), Promise.resolve()).catch(failPersistenceClosed);
  }, [applyInvalidation, failPersistenceClosed, lifecycleBusy]);

  useEffect(() => {
    try {
      const preferences = JSON.parse(sessionStorage.getItem(PREF_KEY) || "{}");
      if (typeof preferences.mascotVisible === "boolean") setMascotVisibleState(preferences.mascotVisible);
      if (typeof preferences.reducedMotion === "boolean") setReducedMotionState(preferences.reducedMotion);
    } catch { /* Invalid tab preferences fall back safely. */ }
    fetch("/api/ai/models", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { dispatch({ type: "models", models: data.models, defaultModel: data.defaultModel }); setTxCopilotEnabled(data.capabilities?.txCopilot === true); setHealth("online"); }).catch(() => { setHealth("offline"); dispatch({ type: "error", message: "MODEL_UNAVAILABLE" }); dispatchEmotion({ type: "stream-error" }); });
  // Metadata loads once; future errors are rendered from localized error codes where available.
  }, []);
  useEffect(() => {
    if (!persistenceEnabled || !state.model || !repository.current || currentSessionId || sessions.length || creatingInitialSession.current) return;
    creatingInitialSession.current = true;
    repository.current.createSession({ locale: language, model: state.model, title: aiText(language, "newChat") })
      .then(async (created) => { await refreshSessions(); await restore(created.id); setPersistenceReady(true); })
      .catch(() => { setPersistenceError("unavailable"); setPersistenceReady(true); })
      .finally(() => { creatingInitialSession.current = false; });
  }, [currentSessionId, language, persistenceEnabled, refreshSessions, restore, sessions.length, state.model]);
  useEffect(() => { if (!emotionState.closeAfterAnimation) return; const timer = window.setTimeout(() => setOpen(false), reducedMotion ? 0 : getMascotAsset("goodbye").durationMs); return () => window.clearTimeout(timer); }, [emotionState.closeAfterAnimation, emotionState.sequence, reducedMotion]);
  useEffect(() => { if (emotionState.emotion !== "greeting" && emotionState.emotion !== "success") return; const timer = window.setTimeout(() => dispatchEmotion({ type: "animation-complete" }), reducedMotion || !mascotVisible ? 0 : getMascotAsset(emotionState.emotion).durationMs); return () => window.clearTimeout(timer); }, [emotionState.emotion, emotionState.sequence, mascotVisible, reducedMotion]);

  function persistPreferences(next: { mascotVisible: boolean; reducedMotion: boolean }) { try { sessionStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* Optional preference storage. */ } }
  function setMascotVisible(value: boolean) { setMascotVisibleState(value); persistPreferences({ mascotVisible: value, reducedMotion }); }
  function setReducedMotion(value: boolean) { setReducedMotionState(value); persistPreferences({ mascotVisible, reducedMotion: value }); }
  async function setPersistenceEnabled(value: boolean) {
    if (streamingRef.current) return;
    try { localStorage.setItem(AI_PERSISTENCE_ENABLED_KEY, String(value)); } catch { /* In-memory chat remains available. */ }
    if (!value) {
      repository.current?.close();
      repository.current = createSessionRepository(createMemoryPersistenceAdapter());
      setSessions([]); setCurrentSessionId(null); setPersistenceEnabledState(false); setCrossSessionMemoryEnabledState(false); setUsedMemorySessions([]); setPersistenceReady(true);
      try { localStorage.setItem(CROSS_SESSION_MEMORY_KEY, "false"); } catch { /* Preference remains fail-closed. */ }
      return;
    }
    setPersistenceReady(false); setPersistenceError(undefined);
    try {
      const durableRepository = createSessionRepository(await createIndexedDBPersistenceAdapter());
      repository.current?.close();
      repository.current = durableRepository;
      const created = await durableRepository.createSession({ locale: language, model: state.model, title: state.messages.find((message) => message.role === "user")?.content || aiText(language, "newChat") });
      const transcript = state.messages.filter((message) => message.content.trim()).map((message, index): StoredChatMessage => ({ id: `${created.id}-${index}`, sessionId: created.id, role: message.role, content: message.content, createdAt: message.createdAt, ...(message.role === "assistant" ? { status: "complete" as const } : {}) }));
      try { if (transcript.length) await durableRepository.replaceSession(created.id, transcript, state.model); }
      catch (error) { await durableRepository.deleteSession(created.id); throw error; }
      setCurrentSessionId(created.id); currentSessionIdRef.current = created.id;
      try { localStorage.setItem(AI_CURRENT_SESSION_KEY, created.id); } catch { /* Small pointer is optional. */ }
      setPersistenceEnabledState(true); await refreshSessions(); setPersistenceReady(true);
    } catch {
      repository.current = createSessionRepository(createMemoryPersistenceAdapter());
      setPersistenceError("unavailable"); setPersistenceEnabledState(false); setPersistenceReady(true);
      try { localStorage.setItem(AI_PERSISTENCE_ENABLED_KEY, "false"); } catch { /* In-memory chat remains available. */ }
    }
  }
  function setCrossSessionMemoryEnabled(value: boolean) {
    const next = persistenceEnabled && value;
    setCrossSessionMemoryEnabledState(next); if (!next) { setUsedMemorySessions([]); setDismissedMemorySessionIds([]); }
    try { localStorage.setItem(CROSS_SESSION_MEMORY_KEY, String(next)); } catch { /* Optional local preference. */ }
  }
  function dismissMemorySession(id: string) { setDismissedMemorySessionIds((values) => [...new Set([...values, id])]); setUsedMemorySessions((values) => values.filter((item) => item.id !== id)); }
  function setInput(value: string) { setInputState(value); if (value) dispatchEmotion({ type: "input-change" }); }
  function closePanel() { if (state.status === "streaming") stop(); setOpen(false); dispatchEmotion({ type: "panel-close" }); }
  function openPanel() { if (open) closePanel(); else { setOpen(true); dispatchEmotion({ type: "panel-open" }); } }
  useEffect(() => subscribeAIChatOpen(window, (detail) => { const requestedInput = typeof detail.input === "string" ? detail.input : ""; setOpen(true); if (requestedInput) setInput(requestedInput); dispatchEmotion({ type: "panel-open" }); }), []);
  function stop() { abort.current?.abort(); dispatch({ type: "stop" }); dispatchEmotion({ type: "stream-abort" }); }
  function txEmotion(event: TransactionEmotionEvent) { dispatchEmotion(emotionForTransactionEvent(event)); }

  async function send(message: string, retrying = false) {
    if (!message || !state.model) return;
    if (!retrying && persistenceEnabled && currentSession && currentSession.estimatedTokens + estimateStoredTokens(message) > AI_SESSION_TOKEN_CAP) { dispatch({ type: "error", message: "SESSION_QUOTA_EXCEEDED" }); return; }
    const generation = ++requestGeneration.current;
    streamingRef.current = true; setLifecycleBusy(true);
    setInputState(""); dispatch(retrying ? { type: "retry" } : { type: "start", message, createdAt: Date.now() }); dispatchEmotion({ type: "send-start" });
    let persistenceAvailable = persistenceEnabled;
    let loaded = null;
    try { loaded = persistenceAvailable && currentSessionId ? await repository.current?.loadSession(currentSessionId) || null : null; }
    catch { persistenceAvailable = false; failPersistenceClosed(); }
    if (generation !== requestGeneration.current) return;
    const persistedHistory = loaded ? (retrying && loaded.messages.at(-1)?.role === "user" ? loaded.messages.slice(0, -1) : loaded.messages) : [];
    const contextMessages = loaded
      ? persistedHistory
      : clientMessagesForRequestContext(state.messages, state.status, retrying);
    let memory: AIMemoryChunk[] = [];
    if (persistenceAvailable && crossSessionMemoryEnabled && repository.current) {
      try {
        memory = await retrieveSessionMemory(message, sessions.filter((session) => !dismissedMemorySessionIds.includes(session.id)), (id) => repository.current!.loadSession(id), { excludeSessionId: currentSessionId || undefined, maxTokens: AI_CROSS_SESSION_MEMORY_TOKEN_BUDGET });
        setUsedMemorySessions([...new Map(memory.map((chunk) => [chunk.sessionId, { id: chunk.sessionId, title: chunk.sessionTitle }])).values()]);
      } catch { memory = []; setUsedMemorySessions([]); }
    } else setUsedMemorySessions([]);
    if (generation !== requestGeneration.current) return;
    const pageElements = collectPageElements();
    setPendingAction(proposePageAction(message, pageElements)); setActionNotice("");
    const controller = new AbortController(); abort.current = controller; const requestId = uid();
    let receivedFirstDelta = false; let assistantText = ""; const tools: ToolActivity[] = []; const citations: Citation[] = []; let collectionResults: CollectionResultsPayload | undefined; let persisted = false;
    const persistFinalizedTurn = async (assistantStatus?: "complete" | "interrupted") => {
      if (persisted || !persistenceAvailable || !currentSessionId || generation !== requestGeneration.current) return;
      persisted = true;
      const createdAt = Date.now();
      const hasAssistantResult = Boolean(assistantStatus && (assistantText.trim() || tools.length || citations.length || collectionResults));
      const additions: StoredChatMessage[] = [
        { id: uid(), sessionId: currentSessionId, role: "user", content: message, createdAt: createdAt - 1 },
        ...(hasAssistantResult ? [{ id: uid(), sessionId: currentSessionId, role: "assistant" as const, status: assistantStatus, content: assistantText, createdAt, ...(tools.length ? { tools } : {}), ...(citations.length ? { citations } : {}), ...(collectionResults ? { collectionResults } : {}) }] : []),
      ];
      if (!additions.length) return;
      try { const session = retrying ? await repository.current?.replaceTrailingTurn(currentSessionId, message, additions) : await repository.current?.appendTurn(currentSessionId, additions); await refreshSessions(); if (session) publishInvalidation(currentSessionId, session.updatedAt); }
      catch (error) { if (error instanceof SessionQuotaError) dispatch({ type: "error", message: "SESSION_QUOTA_EXCEEDED" }); else { persistenceAvailable = false; failPersistenceClosed(); } }
    };
    try {
      const requestInit: RequestInit = { method: "POST", headers: { "content-type": "application/json","x-request-id":requestId }, signal: controller.signal, body: JSON.stringify({ requestId,message, model: state.model, context: { pathname, surface, ...(app ? { app } : {}), locale: language, pageElements }, ...(loaded ? { conversationId: loaded.session.id } : {}), history: selectRecentCompleteTurns(contextMessages, AI_CURRENT_HISTORY_TOKEN_BUDGET), ...(memory.length ? { memory } : {}) }) };
      // The server owns upstream retries. The browser retries only failures that occur before an SSE response exists.
      const { response } = await fetchWithOneRetry("/api/ai/chat", requestInit);
      if (!response.ok || !response.body) throw new Error(aiText(language, "aiUnavailable"));
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";let doneSeen=false;let streamBytes=0;let degradedOutcome=false;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;streamBytes+=value.byteLength;if(streamBytes>1_000_000)throw new Error("STREAM_TOO_LARGE"); buffer += decoder.decode(value, { stream: true });
        for (;;) {
          const parsed = parseAIStreamBlock(buffer); if (parsed.separator < 0) break; buffer = buffer.slice(parsed.separator + (buffer[parsed.separator] === "\r" ? 4 : 2));
          if (generation !== requestGeneration.current) { await reader.cancel(); return; }
          if (!parsed.event) throw new Error("MALFORMED_SSE_EVENT"); const streamEvent = parsed.event;
          if (streamEvent.data.requestId !== requestId) throw new Error("MISMATCHED_REQUEST_ID");
          const emotionEvent = emotionForSSEEvent(streamEvent.event, streamEvent.data as { text?: unknown; status?: unknown; name?: unknown }, receivedFirstDelta); if (emotionEvent) dispatchEmotion(emotionEvent);
          if (streamEvent.event === "meta") { dispatch({ type: "rag-status", status: streamEvent.data.ragStatus }); if (streamEvent.data.ragStatus === "degraded") { degradedOutcome=true; setHealth("degraded"); } }
          if (streamEvent.event === "delta") { receivedFirstDelta = true; assistantText += streamEvent.data.text; dispatch({ type: "delta", text: streamEvent.data.text }); }
          if (streamEvent.event === "tool") { const existing=tools.findIndex((tool)=>tool.callId===streamEvent.data.callId); if(existing<0) tools.push(streamEvent.data); else tools[existing]=streamEvent.data; if (/unavailable|error|fail|degraded/i.test(streamEvent.data.status)) { degradedOutcome=true; setHealth("degraded"); } dispatch({ type: "tool", tool: streamEvent.data }); }
          if (streamEvent.event === "collection_results") { collectionResults = streamEvent.data; dispatch({ type: "collection_results", payload: streamEvent.data }); }
          if (streamEvent.event === "citation") { citations.push(streamEvent.data); dispatch({ type: "citation", citation: streamEvent.data }); }
          if (streamEvent.event === "error") throw new Error(streamEvent.data.code || aiText(language, "aiUnavailable"));
          if (streamEvent.event === "done" && streamEvent.data.requestId === requestId) doneSeen = true;
        }
      }
      buffer += decoder.decode();
      if(buffer.trim()||!doneSeen)throw new Error("STREAM_INTERRUPTED"); if(!degradedOutcome) setHealth("online"); dispatch({ type: "complete" }); dispatchEmotion({ type: "stream-done" });
      await persistFinalizedTurn("complete");
    } catch (error) {
      await persistFinalizedTurn(receivedFirstDelta ? "interrupted" : undefined);
      if (controller.signal.aborted) { dispatch({ type: "stop" }); dispatchEmotion({ type: "stream-abort" }); }
      else { setHealth(receivedFirstDelta ? "degraded" : "offline"); dispatch({ type: receivedFirstDelta ? "interrupted" : "error", message: error instanceof Error ? error.message : aiText(language, "aiUnavailable") }); dispatchEmotion({ type: "stream-error" }); }
    } finally {
      if (generation === requestGeneration.current) { streamingRef.current = false; setLifecycleBusy(false); }
    }
  }
  async function submit(event: FormEvent) { event.preventDefault(); await send(input.trim()); }
  function confirmPageAction() { if (!pendingAction) return; try { const stage = pendingAction.risk === "transaction" && !actionReviewed ? "review" : "confirm"; const result = executeConfirmedPageAction(pendingAction, stage); if (result.requiresConfirmation) { setActionReviewed(true); setActionNotice(aiText(language, "reviewComplete")); return; } setActionNotice(aiText(language, "actionComplete")); dispatchEmotion({ type: pendingAction.risk === "transaction" ? "tx-warning" : "tx-success" }); setPendingAction(null); setActionReviewed(false); } catch { setActionNotice(aiText(language, "actionFailed")); dispatchEmotion({ type: "tx-error" }); } }
  async function exportData() { const data = await exportSession(); if (!data) return; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `banmao-ai-${data.session.id}.json`; link.click(); URL.revokeObjectURL(url); }
  async function clear() { if (streamingRef.current) return; requestGeneration.current += 1; dispatch({ type: "clear" }); dispatchEmotion({ type: "clear" }); setPendingAction(null); setActionNotice(""); if (persistenceEnabled && currentSessionId) { try { await runPersistenceAction(async () => repository.current?.replaceSession(currentSessionId, [], state.model)); await refreshSessions(); publishInvalidation(currentSessionId); } catch { /* The shared fail-closed path preserves the cleared in-memory transcript. */ } } }
  function finishAnimation() { if (emotionState.closeAfterAnimation) setOpen(false); else dispatchEmotion({ type: "animation-complete" }); }
  const updateLauncherGeometry = useCallback((rect: FloatingRect) => setLauncherRect(rect), []);

  const persistenceAPI: AIChatPersistenceAPI = { sessions, currentSessionId, persistenceReady, persistenceError, persistenceEnabled, estimatedTokens: currentSession?.estimatedTokens || 0, quotaTokens: AI_SESSION_TOKEN_CAP, actionsDisabled: lifecycleBusy, listSessions, createSession, switchSession, renameSession, deleteSession, archiveSession, exportSession };
  return <PersistenceContext.Provider value={persistenceAPI}><div className="banmao-ai-root">
    <AIChatLauncher open={open} health={health} emotion={open ? emotionState.emotion : "idle"} mascotVisible={mascotVisible} reducedMotion={reducedMotion} language={language} onClick={openPanel} onGeometryChange={updateLauncherGeometry} />
    {open && <AIChatPanel launcherRect={launcherRect} state={state} surface={surface} emotion={emotionState.emotion} language={language} input={input} setInput={setInput} onInputFocus={() => dispatchEmotion({ type: "input-focus" })} submit={submit} stop={stop} close={closePanel} retry={() => { if (state.lastPrompt) { dispatchEmotion({ type: "retry" }); void send(state.lastPrompt, true); } }} optIn={persistenceEnabled} setOptIn={setPersistenceEnabled} crossSessionMemory={crossSessionMemoryEnabled} setCrossSessionMemory={setCrossSessionMemoryEnabled} usedMemorySessions={usedMemorySessions} dismissMemorySession={dismissMemorySession} mascotVisible={mascotVisible} setMascotVisible={setMascotVisible} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} onAnimationComplete={finishAnimation} clear={() => void clear()} exportData={() => void exportData()} pendingAction={pendingAction} actionNotice={actionNotice} confirmAction={confirmPageAction} cancelAction={() => setPendingAction(null)} memoryTurns={currentSession?.messageCount || 0} persistenceReady={persistenceReady} persistenceError={persistenceError} persistenceToggleDisabled={lifecycleBusy}>{txCopilotEnabled ? <TransactionCopilot language={language} onEmotion={txEmotion} /> : null}</AIChatPanel>}
    {children}
  </div></PersistenceContext.Provider>;
}
