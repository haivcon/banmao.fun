"use client";

import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { confirmPageAction as executeConfirmedPageAction, proposePageAction, type AIPageAction } from "../../../lib/ai/client/actionBridge";
import { collectPageElements } from "../../../lib/ai/client/pageContext";
import { fetchWithOneRetry } from "../../../lib/ai/client/recovery";
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
import { deriveSurface, initialClientState, reduceClientState, type Citation, type ToolActivity } from "../../../lib/ai/client/state";
import { createEmotionState, emotionForSSEEvent, emotionForTransactionEvent, emotionReducer, type TransactionEmotionEvent } from "../../../lib/ai/client/emotion";
import type { AIModel, CollectionResultsPayload } from "../../../lib/ai/contracts";
import AIChatLauncher from "./AIChatLauncher";
import AIChatPanel from "./AIChatPanel";
import TransactionCopilot from "./TransactionCopilot";
import { getMascotAsset } from "./mascot/mascotAssets";

const PREF_KEY = "banmao-ai-mascot-preferences";
const SYNC_KEY = "banmao-ai-session-sync-v1";
const CHANNEL_NAME = "banmao-ai-sessions-v1";
const REQUEST_CONTEXT_TOKEN_BUDGET = 7_000;

type Repository = ReturnType<typeof createSessionRepository>;
export type AIChatPersistenceAPI = {
  sessions: ChatSession[];
  currentSessionId: string | null;
  persistenceReady: boolean;
  persistenceError?: string;
  persistenceEnabled: boolean;
  estimatedTokens: number;
  quotaTokens: number;
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

function parseBlock(buffer: string) {
  const separator = buffer.indexOf("\n\n");
  const block = buffer.slice(0, separator);
  const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
  return { separator, event: block.split("\n").find((line) => line.startsWith("event: "))?.slice(7), data: dataLine ? JSON.parse(dataLine.slice(6)) : {} };
}
function restoredState(loaded: LoadedChatSession) {
  const assistant = loaded.messages.filter((message) => message.role === "assistant");
  return {
    messages: loaded.messages.map(({ role, content, createdAt }) => ({ role, content, createdAt })),
    tools: assistant.flatMap((message) => message.tools || []),
    citations: assistant.flatMap((message) => message.citations || []),
    collectionResults: assistant.map((message) => message.collectionResults).filter(Boolean).at(-1),
  };
}
function uid() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export default function AIChatProvider({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInputState] = useState("");
  const [language, setLanguage] = useState<AILocale>("en");
  const [persistenceEnabled, setPersistenceEnabledState] = useState(true);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string>();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [actionReviewed, setActionReviewed] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIPageAction | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [txCopilotEnabled, setTxCopilotEnabled] = useState(false);
  const [mascotVisible, setMascotVisibleState] = useState(true);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [state, dispatch] = useReducer(reduceClientState, initialClientState("banmao.fun"));
  const [emotionState, dispatchEmotion] = useReducer(emotionReducer, undefined, createEmotionState);
  const abort = useRef<AbortController | null>(null);
  const repository = useRef<Repository | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const surface = deriveSurface(pathname);
  const currentSession = sessions.find((session) => session.id === currentSessionId);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  const refreshSessions = useCallback(async () => {
    const values = await repository.current?.listSessions() || [];
    setSessions(values);
    return values;
  }, []);
  const publishInvalidation = useCallback((sessionId: string, updatedAt = Date.now(), deleted = false) => {
    const payload: SessionInvalidation = { version: 1, type: "session-invalidated", sessionId, updatedAt, ...(deleted ? { deleted: true } : {}) };
    channel.current?.postMessage(payload);
    try { localStorage.setItem(SYNC_KEY, JSON.stringify(payload)); } catch { /* BroadcastChannel remains preferred. */ }
  }, []);
  const restore = useCallback(async (id: string) => {
    const loaded = await repository.current?.loadSession(id);
    if (!loaded) return;
    setCurrentSessionId(id);
    try { localStorage.setItem(AI_CURRENT_SESSION_KEY, id); } catch { /* Small pointer is optional. */ }
    dispatch({ type: "restore", state: restoredState(loaded), model: loaded.session.model });
  }, []);
  const listSessions = useCallback(() => refreshSessions(), [refreshSessions]);
  const createSession = useCallback(async () => {
    if (!repository.current) throw new Error("Persistence is not ready");
    const created = await repository.current.createSession({ locale: language, model: state.model, title: aiText(language, "newChat") });
    await refreshSessions(); await restore(created.id); publishInvalidation(created.id, created.updatedAt); return created;
  }, [language, publishInvalidation, refreshSessions, restore, state.model]);
  const switchSession = useCallback(async (id: string) => { await restore(id); }, [restore]);
  const renameSession = useCallback(async (id: string, title: string) => { await repository.current?.renameSession(id, title); await refreshSessions(); publishInvalidation(id); }, [publishInvalidation, refreshSessions]);
  const archiveSession = useCallback(async (id: string) => { await repository.current?.archiveSession(id); await refreshSessions(); publishInvalidation(id); }, [publishInvalidation, refreshSessions]);
  const deleteSession = useCallback(async (id: string) => { await repository.current?.deleteSession(id); const remaining = await refreshSessions(); publishInvalidation(id, Date.now(), true); if (id === currentSessionId) { if (remaining[0]) await restore(remaining[0].id); else await createSession(); } }, [createSession, currentSessionId, publishInvalidation, refreshSessions, restore]);
  const exportSession = useCallback(async (id = currentSessionId || "") => id ? repository.current?.exportSession(id) || null : null, [currentSessionId]);

  useEffect(() => createAILanguageSubscriber({ events: window, read: () => readAILanguage(localStorage, document.documentElement.lang, navigator.language), onChange: setLanguage }), []);
  useEffect(() => {
    let cancelled = false;
    const onInvalidation = (event: MessageEvent<SessionInvalidation> | StorageEvent) => {
      let payload: SessionInvalidation | undefined;
      if ("data" in event) payload = event.data;
      else if (event.key === SYNC_KEY && event.newValue) { try { payload = JSON.parse(event.newValue); } catch { return; } }
      if (payload?.version !== 1 || payload.type !== "session-invalidated") return;
      void refreshSessions();
      if (payload.sessionId === currentSessionIdRef.current && !payload.deleted) void restore(payload.sessionId);
    };
    try { channel.current = new BroadcastChannel(CHANNEL_NAME); channel.current.onmessage = onInvalidation; } catch { /* storage event fallback below */ }
    window.addEventListener("storage", onInvalidation as EventListener);
    (async () => {
      let adapter;
      try { adapter = await createIndexedDBPersistenceAdapter(); }
      catch { adapter = createMemoryPersistenceAdapter(); if (!cancelled) setPersistenceError("unavailable"); }
      if (cancelled) return;
      repository.current = createSessionRepository(adapter);
      const enabled = localStorage.getItem(AI_PERSISTENCE_ENABLED_KEY) !== "false";
      const initialLocale = readAILanguage(localStorage, document.documentElement.lang, navigator.language);
      setPersistenceEnabledState(enabled);
      try { await repository.current.migrateLegacy(localStorage, initialLocale); } catch { /* Migration failure must not block chat. */ }
      let available = await refreshSessions();
      const preferred = localStorage.getItem(AI_CURRENT_SESSION_KEY);
      let selected = preferred && available.some((session) => session.id === preferred) ? preferred : available[0]?.id;
      if (!selected) { const created = await repository.current.createSession({ locale: initialLocale, model: "banmao.fun", title: aiText(initialLocale, "newChat") }); selected = created.id; available = await refreshSessions(); }
      setSessions(available); await restore(selected); setPersistenceReady(true);
    })().catch(() => { if (!cancelled) { repository.current = createSessionRepository(createMemoryPersistenceAdapter()); setPersistenceError("unavailable"); setPersistenceReady(true); } });
    return () => { cancelled = true; channel.current?.close(); window.removeEventListener("storage", onInvalidation as EventListener); };
  // Initialization deliberately runs once; current locale continues reactively through the separate subscriber.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const preferences = JSON.parse(sessionStorage.getItem(PREF_KEY) || "{}");
      if (typeof preferences.mascotVisible === "boolean") setMascotVisibleState(preferences.mascotVisible);
      if (typeof preferences.reducedMotion === "boolean") setReducedMotionState(preferences.reducedMotion);
    } catch { /* Invalid tab preferences fall back safely. */ }
    fetch("/api/ai/models", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { dispatch({ type: "models", models: data.models, defaultModel: data.defaultModel }); setTxCopilotEnabled(data.capabilities?.txCopilot === true); }).catch(() => { dispatch({ type: "error", message: "MODEL_UNAVAILABLE" }); dispatchEmotion({ type: "stream-error" }); });
  // Metadata loads once; future errors are rendered from localized error codes where available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!emotionState.closeAfterAnimation) return; const timer = window.setTimeout(() => setOpen(false), reducedMotion ? 0 : getMascotAsset("goodbye").durationMs); return () => window.clearTimeout(timer); }, [emotionState.closeAfterAnimation, emotionState.sequence, reducedMotion]);
  useEffect(() => { if (emotionState.emotion !== "greeting" && emotionState.emotion !== "success") return; const timer = window.setTimeout(() => dispatchEmotion({ type: "animation-complete" }), reducedMotion || !mascotVisible ? 0 : getMascotAsset(emotionState.emotion).durationMs); return () => window.clearTimeout(timer); }, [emotionState.emotion, emotionState.sequence, mascotVisible, reducedMotion]);

  function persistPreferences(next: { mascotVisible: boolean; reducedMotion: boolean }) { try { sessionStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* Optional preference storage. */ } }
  function setMascotVisible(value: boolean) { setMascotVisibleState(value); persistPreferences({ mascotVisible: value, reducedMotion }); }
  function setReducedMotion(value: boolean) { setReducedMotionState(value); persistPreferences({ mascotVisible, reducedMotion: value }); }
  function setPersistenceEnabled(value: boolean) { setPersistenceEnabledState(value); try { localStorage.setItem(AI_PERSISTENCE_ENABLED_KEY, String(value)); } catch { /* In-memory chat remains available. */ } }
  function setInput(value: string) { setInputState(value); if (value) dispatchEmotion({ type: "input-change" }); }
  function openPanel() { if (open) dispatchEmotion({ type: "panel-close" }); else { setOpen(true); dispatchEmotion({ type: "panel-open" }); } }
  useEffect(() => subscribeAIChatOpen(window, (detail) => { const requestedInput = typeof detail.input === "string" ? detail.input : ""; setOpen(true); if (requestedInput) setInput(requestedInput); dispatchEmotion({ type: "panel-open" }); }), []);
  function stop() { abort.current?.abort(); dispatch({ type: "stop" }); dispatchEmotion({ type: "stream-abort" }); }
  function txEmotion(event: TransactionEmotionEvent) { dispatchEmotion(emotionForTransactionEvent(event)); }

  async function send(message: string, retrying = false) {
    if (!message) return;
    if (persistenceEnabled && currentSession && currentSession.estimatedTokens + estimateStoredTokens(message) > AI_SESSION_TOKEN_CAP) { dispatch({ type: "error", message: "SESSION_QUOTA_EXCEEDED" }); return; }
    setInputState(""); dispatch(retrying ? { type: "retry" } : { type: "start", message, createdAt: Date.now() }); dispatchEmotion({ type: "send-start" });
    const loaded = persistenceEnabled && currentSessionId ? await repository.current?.loadSession(currentSessionId) : null;
    const persistedHistory = loaded ? (retrying && loaded.messages.at(-1)?.role === "user" ? loaded.messages.slice(0, -1) : loaded.messages) : [];
    const pageElements = collectPageElements();
    setPendingAction(proposePageAction(message, pageElements)); setActionNotice("");
    const controller = new AbortController(); abort.current = controller;
    let receivedFirstDelta = false; let assistantText = ""; const tools: ToolActivity[] = []; const citations: Citation[] = []; let collectionResults: CollectionResultsPayload | undefined; let persisted = false;
    const persistFinalizedTurn = async () => {
      if (persisted || !persistenceEnabled || !currentSessionId) return;
      persisted = true;
      const createdAt = Date.now();
      const hasAssistantResult = Boolean(assistantText.trim() || tools.length || citations.length || collectionResults);
      const additions: StoredChatMessage[] = [
        { id: uid(), sessionId: currentSessionId, role: "user", content: message, createdAt: createdAt - 1 },
        ...(hasAssistantResult ? [{ id: uid(), sessionId: currentSessionId, role: "assistant" as const, content: assistantText, createdAt, ...(tools.length ? { tools } : {}), ...(citations.length ? { citations } : {}), ...(collectionResults ? { collectionResults } : {}) }] : []),
      ];
      if (!additions.length) return;
      try { const session = await repository.current?.appendTurn(currentSessionId, additions); await refreshSessions(); if (session) publishInvalidation(currentSessionId, session.updatedAt); }
      catch (error) { if (error instanceof SessionQuotaError) dispatch({ type: "error", message: "SESSION_QUOTA_EXCEEDED" }); else setPersistenceError("unavailable"); }
    };
    try {
      const requestInit: RequestInit = { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ message, model: state.model, context: { pathname, surface, locale: language, pageElements }, ...(loaded ? { conversationId: loaded.session.id, history: selectRecentCompleteTurns(persistedHistory, REQUEST_CONTEXT_TOKEN_BUDGET) } : {}), ...(isConnected && address && chainId === 196 ? { wallet: { address, chainId } } : {}) }) };
      const { response } = await fetchWithOneRetry("/api/ai/chat", requestInit);
      if (!response.ok || !response.body) throw new Error(aiText(language, "aiUnavailable"));
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        for (;;) {
          const parsed = parseBlock(buffer); if (parsed.separator < 0) break; buffer = buffer.slice(parsed.separator + 2);
          const emotionEvent = emotionForSSEEvent(parsed.event, parsed.data, receivedFirstDelta); if (emotionEvent) dispatchEmotion(emotionEvent);
          if (parsed.event === "delta") { receivedFirstDelta = true; assistantText += typeof parsed.data.text === "string" ? parsed.data.text : ""; dispatch({ type: "delta", text: parsed.data.text }); }
          if (parsed.event === "tool") { tools.push(parsed.data); dispatch({ type: "tool", tool: parsed.data }); }
          if (parsed.event === "collection_results") { collectionResults = parsed.data; dispatch({ type: "collection_results", payload: parsed.data }); }
          if (parsed.event === "citation") { const citation = { ...parsed.data, sourcePath: parsed.data.sourcePath || "approved-project-doc" }; citations.push(citation); dispatch({ type: "citation", citation }); }
          if (parsed.event === "error") throw new Error(parsed.data.code || aiText(language, "aiUnavailable"));
        }
      }
      dispatch({ type: "stop" }); dispatchEmotion({ type: "stream-done" });
      await persistFinalizedTurn();
    } catch (error) {
      await persistFinalizedTurn();
      if (controller.signal.aborted) { dispatch({ type: "stop" }); dispatchEmotion({ type: "stream-abort" }); }
      else { dispatch({ type: "error", message: error instanceof Error ? error.message : aiText(language, "aiUnavailable") }); dispatchEmotion({ type: "stream-error" }); }
    }
  }
  async function submit(event: FormEvent) { event.preventDefault(); await send(input.trim()); }
  function confirmPageAction() { if (!pendingAction) return; try { const stage = pendingAction.risk === "transaction" && !actionReviewed ? "review" : "confirm"; const result = executeConfirmedPageAction(pendingAction, stage); if (result.requiresConfirmation) { setActionReviewed(true); setActionNotice(aiText(language, "reviewComplete")); return; } setActionNotice(aiText(language, "actionComplete")); dispatchEmotion({ type: pendingAction.risk === "transaction" ? "tx-warning" : "tx-success" }); setPendingAction(null); setActionReviewed(false); } catch { setActionNotice(aiText(language, "actionFailed")); dispatchEmotion({ type: "tx-error" }); } }
  async function exportData() { const data = await exportSession(); if (!data) return; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `banmao-ai-${data.session.id}.json`; link.click(); URL.revokeObjectURL(url); }
  async function clear() { dispatch({ type: "clear" }); dispatchEmotion({ type: "clear" }); setPendingAction(null); setActionNotice(""); if (persistenceEnabled && currentSessionId) { await repository.current?.replaceSession(currentSessionId, [], state.model); await refreshSessions(); publishInvalidation(currentSessionId); } }
  function finishAnimation() { if (emotionState.closeAfterAnimation) setOpen(false); else dispatchEmotion({ type: "animation-complete" }); }

  const persistenceAPI: AIChatPersistenceAPI = { sessions, currentSessionId, persistenceReady, persistenceError, persistenceEnabled, estimatedTokens: currentSession?.estimatedTokens || 0, quotaTokens: AI_SESSION_TOKEN_CAP, listSessions, createSession, switchSession, renameSession, deleteSession, archiveSession, exportSession };
  return <PersistenceContext.Provider value={persistenceAPI}><div className="banmao-ai-root">
    <AIChatLauncher open={open} emotion={open ? emotionState.emotion : "idle"} mascotVisible={mascotVisible} reducedMotion={reducedMotion} language={language} onClick={openPanel} />
    {open && <AIChatPanel state={state} surface={surface} emotion={emotionState.emotion} language={language} input={input} setInput={setInput} onInputFocus={() => dispatchEmotion({ type: "input-focus" })} submit={submit} stop={stop} close={openPanel} retry={() => { if (state.lastPrompt) { dispatchEmotion({ type: "retry" }); void send(state.lastPrompt, true); } }} optIn={persistenceEnabled} setOptIn={setPersistenceEnabled} mascotVisible={mascotVisible} setMascotVisible={setMascotVisible} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} onAnimationComplete={finishAnimation} clear={() => void clear()} exportData={() => void exportData()} selectModel={(model: AIModel) => dispatch({ type: "select-model", model })} pendingAction={pendingAction} actionNotice={actionNotice} confirmAction={confirmPageAction} cancelAction={() => setPendingAction(null)} memoryTurns={currentSession?.messageCount || 0} persistenceReady={persistenceReady} persistenceError={persistenceError}>{txCopilotEnabled ? <TransactionCopilot language={language} onEmotion={txEmotion} /> : null}</AIChatPanel>}
    {children}
  </div></PersistenceContext.Provider>;
}
