"use client";

import { type FormEvent, useEffect, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { createTabMemory } from "../../../lib/ai/client/memory";
import { executePageAction, proposePageAction, type AIPageAction } from "../../../lib/ai/client/actionBridge";
import { collectPageElements } from "../../../lib/ai/client/pageContext";
import { deriveSurface, initialClientState, reduceClientState } from "../../../lib/ai/client/state";
import {
  createEmotionState,
  emotionForSSEEvent,
  emotionForTransactionEvent,
  emotionReducer,
  type TransactionEmotionEvent,
} from "../../../lib/ai/client/emotion";
import type { AIModel } from "../../../lib/ai/contracts";
import AIChatLauncher from "./AIChatLauncher";
import AIChatPanel from "./AIChatPanel";
import TransactionCopilot from "./TransactionCopilot";
import { getMascotAsset } from "./mascot/mascotAssets";

const memory = createTabMemory({ maxTurns: 20, ttlMs: 30 * 60_000 });
const PREF_KEY = "banmao-ai-mascot-preferences";

function parseBlock(buffer: string) {
  const separator = buffer.indexOf("\n\n");
  const block = buffer.slice(0, separator);
  const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
  return {
    separator,
    event: block.split("\n").find((line) => line.startsWith("event: "))?.slice(7),
    data: dataLine ? JSON.parse(dataLine.slice(6)) : {},
  };
}

export default function AIChatProvider() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInputState] = useState("");
  const [optIn, setOptInState] = useState(true);
  const [pendingAction, setPendingAction] = useState<AIPageAction | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [txCopilotEnabled, setTxCopilotEnabled] = useState(false);
  const [mascotVisible, setMascotVisibleState] = useState(true);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [state, dispatch] = useReducer(reduceClientState, initialClientState("banmao.fun"));
  const [emotionState, dispatchEmotion] = useReducer(emotionReducer, undefined, createEmotionState);
  const abort = useRef<AbortController | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const surface = deriveSurface(pathname);

  useEffect(() => {
    memory.setOptIn(true);
    try {
      const preferences = JSON.parse(sessionStorage.getItem(PREF_KEY) || "{}");
      if (typeof preferences.mascotVisible === "boolean") setMascotVisibleState(preferences.mascotVisible);
      if (typeof preferences.reducedMotion === "boolean") setReducedMotionState(preferences.reducedMotion);
    } catch { /* Invalid tab-only preferences fall back safely. */ }
    fetch("/api/ai/models", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        dispatch({ type: "models", models: data.models, defaultModel: data.defaultModel });
        setTxCopilotEnabled(data.capabilities?.txCopilot === true);
      })
      .catch(() => {
        dispatch({ type: "error", message: "AI model metadata unavailable" });
        dispatchEmotion({ type: "stream-error" });
      });
  }, []);

  useEffect(() => {
    if (!emotionState.closeAfterAnimation) return;
    const timer = window.setTimeout(() => setOpen(false), reducedMotion ? 0 : getMascotAsset("goodbye").durationMs);
    return () => window.clearTimeout(timer);
  }, [emotionState.closeAfterAnimation, emotionState.sequence, reducedMotion]);

  useEffect(() => {
    if (emotionState.emotion !== "greeting" && emotionState.emotion !== "success") return;
    const timer = window.setTimeout(
      () => dispatchEmotion({ type: "animation-complete" }),
      reducedMotion || !mascotVisible ? 0 : getMascotAsset(emotionState.emotion).durationMs,
    );
    return () => window.clearTimeout(timer);
  }, [emotionState.emotion, emotionState.sequence, mascotVisible, reducedMotion]);

  function persistPreferences(next: { mascotVisible: boolean; reducedMotion: boolean }) {
    try { sessionStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  }
  function setMascotVisible(value: boolean) {
    setMascotVisibleState(value);
    persistPreferences({ mascotVisible: value, reducedMotion });
  }
  function setReducedMotion(value: boolean) {
    setReducedMotionState(value);
    persistPreferences({ mascotVisible, reducedMotion: value });
  }
  function setOptIn(value: boolean) {
    setOptInState(value);
    memory.setOptIn(value);
  }
  function setInput(value: string) {
    setInputState(value);
    if (value) dispatchEmotion({ type: "input-change" });
  }
  function openPanel() {
    if (open) dispatchEmotion({ type: "panel-close" });
    else {
      setOpen(true);
      dispatchEmotion({ type: "panel-open" });
    }
  }
  function stop() {
    abort.current?.abort();
    dispatch({ type: "stop" });
    dispatchEmotion({ type: "stream-abort" });
  }
  function txEmotion(event: TransactionEmotionEvent) {
    dispatchEmotion(emotionForTransactionEvent(event));
  }

  async function send(message: string) {
    if (!message) return;
    setInputState("");
    dispatch({ type: "start", message, createdAt: Date.now() });
    dispatchEmotion({ type: "send-start" });
    const memorySnapshot = memory.snapshot();
    const pageElements = collectPageElements();
    const proposedAction = proposePageAction(message, pageElements);
    setPendingAction(proposedAction);
    setActionNotice("");
    memory.append({ role: "user", content: message });
    const controller = new AbortController();
    abort.current = controller;
    let receivedFirstDelta = false;
    let assistantText = "";
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          model: state.model,
          context: { pathname, surface, locale: document.documentElement.lang || undefined, pageElements },
          ...(optIn ? memorySnapshot : {}),
          ...(isConnected && address && chainId === 196 ? { wallet: { address, chainId } } : {}),
        }),
      });
      if (!response.ok || !response.body) throw new Error("AI unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        for (;;) {
          const parsed = parseBlock(buffer);
          if (parsed.separator < 0) break;
          buffer = buffer.slice(parsed.separator + 2);
          const emotionEvent = emotionForSSEEvent(parsed.event, parsed.data, receivedFirstDelta);
          if (emotionEvent) dispatchEmotion(emotionEvent);
          if (parsed.event === "delta") {
            receivedFirstDelta = true;
            assistantText += typeof parsed.data.text === "string" ? parsed.data.text : "";
            dispatch({ type: "delta", text: parsed.data.text });
          }
          if (parsed.event === "tool") dispatch({ type: "tool", tool: parsed.data });
          if (parsed.event === "citation") dispatch({ type: "citation", citation: { ...parsed.data, sourcePath: parsed.data.sourcePath || "approved-project-doc" } });
          if (parsed.event === "error") throw new Error(parsed.data.code || "AI unavailable");
        }
      }
      if (assistantText.trim()) memory.append({ role: "assistant", content: assistantText });
      dispatch({ type: "stop" });
      dispatchEmotion({ type: "stream-done" });
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({ type: "stop" });
        dispatchEmotion({ type: "stream-abort" });
      } else {
        dispatch({ type: "error", message: error instanceof Error ? error.message : "AI unavailable" });
        dispatchEmotion({ type: "stream-error" });
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await send(input.trim());
  }
  function confirmPageAction() {
    if (!pendingAction) return;
    try {
      executePageAction(pendingAction);
      setActionNotice("Action completed on the approved page element ✅");
      dispatchEmotion({ type: pendingAction.risk === "transaction" ? "tx-warning" : "tx-success" });
      setPendingAction(null);
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "Page action failed");
      dispatchEmotion({ type: "tx-error" });
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(memory.export(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "banmao-ai-tab-memory.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  function clear() {
    memory.clear();
    dispatch({ type: "clear" });
    dispatchEmotion({ type: "clear" });
    setPendingAction(null);
    setActionNotice("");
  }
  function finishAnimation() {
    if (emotionState.closeAfterAnimation) setOpen(false);
    else dispatchEmotion({ type: "animation-complete" });
  }

  return <div className="banmao-ai-root">
    <AIChatLauncher open={open} emotion={open ? emotionState.emotion : "idle"} mascotVisible={mascotVisible} reducedMotion={reducedMotion} onClick={openPanel} />
    {open && <AIChatPanel
      state={state} surface={surface} emotion={emotionState.emotion} language={typeof document === "undefined" ? "en" : document.documentElement.lang}
      input={input} setInput={setInput} onInputFocus={() => dispatchEmotion({ type: "input-focus" })} submit={submit} stop={stop} close={openPanel}
      retry={() => { if (state.lastPrompt) { dispatchEmotion({ type: "retry" }); void send(state.lastPrompt); } }}
      optIn={optIn} setOptIn={setOptIn} mascotVisible={mascotVisible} setMascotVisible={setMascotVisible}
      reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} onAnimationComplete={finishAnimation}
      clear={clear} exportData={exportData} selectModel={(model: AIModel) => dispatch({ type: "select-model", model })}
      pendingAction={pendingAction} actionNotice={actionNotice} confirmAction={confirmPageAction} cancelAction={() => setPendingAction(null)} memoryTurns={memory.snapshot().history.length}
    >{txCopilotEnabled ? <TransactionCopilot onEmotion={txEmotion} /> : null}</AIChatPanel>}
  </div>;
}
