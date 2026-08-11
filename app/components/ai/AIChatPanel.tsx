"use client";

import { ArrowDown, ArrowUp, CircleAlert, Compass, ShieldCheck, Sparkles, Square, TrendingUp, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { SUGGESTED_PROMPTS, type ClientState } from "../../../lib/ai/client/state";
import { getStatusPhrase, type BanmaoEmotion } from "../../../lib/ai/client/emotion";
import type { AIPageAction } from "../../../lib/ai/client/actionBridge";
import type { AISurface } from "../../../lib/ai/contracts";
import AIMessage from "./AIMessage";
import CitationCard from "./CitationCard";
import ModelSelector from "./ModelSelector";
import PageActionCard from "./PageActionCard";
import PrivacyControls from "./PrivacyControls";
import ToolCard from "./ToolCard";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

type Props = {
  state: ClientState; surface: AISurface; emotion: BanmaoEmotion; language: string; input: string;
  setInput: (value: string) => void; onInputFocus: () => void; submit: (event: FormEvent) => void;
  stop: () => void; close: () => void; retry: () => void; optIn: boolean; setOptIn: (value: boolean) => void;
  mascotVisible: boolean; setMascotVisible: (value: boolean) => void; reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void; onAnimationComplete: () => void; clear: () => void;
  exportData: () => void; selectModel: (model: ClientState["model"]) => void; children?: ReactNode;
  pendingAction: AIPageAction | null; actionNotice: string; confirmAction: () => void; cancelAction: () => void; memoryTurns: number;
};

const SURFACE_LABEL: Record<AISurface, string> = { landing: "Ecosystem", defi: "DeFi", gamefi: "GameFi", collection: "Collections" };
const PROMPT_ICONS = [Sparkles, TrendingUp, ShieldCheck];

export default function AIChatPanel(props: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const stayAtBottom = useRef(true);
  const dragStart = useRef<number | null>(null);
  const [showScroll, setShowScroll] = useState(false);
  const streaming = props.state.status === "streaming";
  const phrase = getStatusPhrase(props.emotion, props.language);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => document.documentElement.style.setProperty("--banmao-ai-viewport-height", `${viewport.height}px`);
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
      document.documentElement.style.removeProperty("--banmao-ai-viewport-height");
    };
  }, []);
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [props.input]);
  useEffect(() => {
    const container = messagesRef.current;
    if (!container || !stayAtBottom.current) return;
    container.scrollTo({ top: container.scrollHeight, behavior: props.reducedMotion ? "auto" : "smooth" });
  }, [props.state.messages, props.state.tools, props.state.citations, props.state.error, props.reducedMotion]);

  function choosePrompt(prompt: string) { props.setInput(prompt); inputRef.current?.focus(); }
  function onMessageScroll() {
    const container = messagesRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 72;
    stayAtBottom.current = nearBottom;
    setShowScroll(!nearBottom);
  }
  function scrollToBottom() {
    const container = messagesRef.current;
    if (!container) return;
    stayAtBottom.current = true;
    setShowScroll(false);
    container.scrollTo({ top: container.scrollHeight, behavior: props.reducedMotion ? "auto" : "smooth" });
  }
  function startDrag(event: PointerEvent<HTMLElement>) { dragStart.current = event.clientY; }
  function endDrag(event: PointerEvent<HTMLElement>) {
    if (dragStart.current !== null && event.clientY - dragStart.current > 72) props.close();
    dragStart.current = null;
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") props.close();
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (props.input.trim() && !streaming) event.currentTarget.form?.requestSubmit();
    }
  }


  return <section id="banmao-ai-panel" data-surface={props.surface} data-emotion={props.emotion} role="dialog" aria-modal="false" aria-label="BANMAO AI assistant" className="banmao-ai-panel" onKeyDown={(event) => { if (event.key === "Escape") props.close(); }}>
    <header className="banmao-ai-header" onPointerDown={startDrag} onPointerUp={endDrag} onPointerCancel={() => { dragStart.current = null; }}>
      <span className="banmao-ai-drag-handle" aria-hidden="true" />
      <div className="banmao-ai-brand">
        {props.mascotVisible && <div className="banmao-ai-header-mascot"><BanmaoAIMascot emotion={props.emotion} reducedMotion={props.reducedMotion} onAnimationComplete={props.onAnimationComplete} /></div>}
        <div className="banmao-ai-heading"><span><h2>BANMAO AI</h2><i className="banmao-ai-live" aria-label="Online" /></span><p>{phrase}</p></div>
      </div>
      <div className="banmao-ai-header-actions"><span className="banmao-ai-context">{SURFACE_LABEL[props.surface]}</span><button className="banmao-ai-icon-button" type="button" aria-label="Close AI assistant" onClick={props.close}><X size={18} /></button></div>
    </header>
    <span className="banmao-ai-sr-status" role="status" aria-live="polite">{phrase}</span>

    <div className="banmao-ai-conversation" ref={messagesRef} onScroll={onMessageScroll} aria-live="polite">
      {!props.state.messages.length && <div className="banmao-ai-welcome">
        <div className="banmao-ai-welcome-icon"><Compass size={24} aria-hidden="true" /></div>
        <span className="banmao-ai-eyebrow">Your BANMAO copilot</span>
        <h3>What would you like to explore?</h3>
        <p>Get clear, cited answers and reviewable help with registered page controls. Wallet transactions always require your signature.</p>
        <div className="banmao-ai-prompt-grid" aria-label="Suggested prompts">{SUGGESTED_PROMPTS[props.surface].map((prompt, index) => { const Icon = PROMPT_ICONS[index % PROMPT_ICONS.length]; return <button type="button" key={prompt} onClick={() => choosePrompt(prompt)}><Icon size={16} aria-hidden="true" /><span>{prompt}</span><ArrowUp size={14} aria-hidden="true" /></button>; })}</div>
      </div>}
      {props.state.messages.map((message, index) => <AIMessage key={`${message.role}-${message.createdAt}-${index}`} {...message} streaming={streaming && index === props.state.messages.length - 1 && message.role === "assistant"} />)}
      {!!props.state.tools.length && <section className="banmao-ai-activity" aria-label="Assistant activity"><h3><Sparkles size={14} /> Activity</h3>{props.state.tools.map((tool) => <ToolCard tool={tool} key={tool.callId} />)}</section>}
      {!!props.state.citations.length && <aside className="banmao-ai-citations"><h3>Sources <span>{props.state.citations.length}</span></h3><div>{props.state.citations.map((citation, index) => <CitationCard citation={citation} index={index} key={`${citation.sourcePath}:${citation.version || ""}`} />)}</div></aside>}
      {props.pendingAction && <PageActionCard action={props.pendingAction} onConfirm={props.confirmAction} onCancel={props.cancelAction} />}
      {props.actionNotice && <p className="banmao-ai-action-notice" role="status">{props.actionNotice}</p>}
      {props.state.error && <div className="banmao-ai-error" role="alert"><span><CircleAlert size={18} /></span><div><strong>Response interrupted</strong><p>{props.state.error}</p>{props.state.lastPrompt && <button type="button" onClick={props.retry}>Try again</button>}</div></div>}
    </div>

    {showScroll && <button className="banmao-ai-scroll-bottom" type="button" onClick={scrollToBottom} aria-label="Scroll to latest message"><ArrowDown size={17} /></button>}
    {!!props.state.messages.length && <div className="banmao-ai-suggestions" aria-label="Suggested prompts">{SUGGESTED_PROMPTS[props.surface].map((prompt) => <button type="button" key={prompt} onClick={() => choosePrompt(prompt)}>{prompt}</button>)}</div>}

    <footer className="banmao-ai-footer">
      <form className="banmao-ai-composer" onSubmit={props.submit}>
        <label htmlFor="banmao-ai-input" className="banmao-ai-sr-only">Message BANMAO AI</label>
        <textarea ref={inputRef} id="banmao-ai-input" maxLength={8000} rows={1} required value={props.input} disabled={streaming} placeholder={streaming ? "BANMAO AI is responding…" : "Ask BANMAO AI…"} onFocus={props.onInputFocus} onKeyDown={onKeyDown} onChange={(event) => props.setInput(event.target.value)} />
        <div className="banmao-ai-composer-bar"><ModelSelector models={props.state.models} value={props.state.model} onChange={props.selectModel} disabled={streaming} />{props.input.length > 7000 && <span className="banmao-ai-count">{props.input.length}/8000</span>}<span className="banmao-ai-composer-hint">Enter to send</span>{streaming ? <button className="banmao-ai-stop" type="button" onClick={props.stop} aria-label="Stop response"><Square size={13} fill="currentColor" /></button> : <button className="banmao-ai-send" disabled={!props.input.trim()} aria-label="Send message"><ArrowUp size={17} /></button>}</div>
      </form>
      <p className="banmao-ai-disclaimer"><ShieldCheck size={12} /> Context: {props.optIn ? `${props.memoryTurns} recent turns` : "off"} · Actions require review</p>
      <PrivacyControls optIn={props.optIn} onOptIn={props.setOptIn} mascotVisible={props.mascotVisible} onMascotVisible={props.setMascotVisible} reducedMotion={props.reducedMotion} onReducedMotion={props.setReducedMotion} onClear={props.clear} onExport={props.exportData} />
      {props.children}
    </footer>
  </section>;
}
