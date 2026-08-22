"use client";

import { ArrowDown, ArrowUp, CircleAlert, Compass, ShieldCheck, Sparkles, Square, TrendingUp, X } from "lucide-react";
import { type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ClientState } from "../../../lib/ai/client/state";
import { aiPrompts, aiReliabilityError, aiText } from "../../../lib/ai/client/i18n";
import { getStatusPhrase, type BanmaoEmotion } from "../../../lib/ai/client/emotion";
import type { AIPageAction } from "../../../lib/ai/client/actionBridge";
import type { AISurface } from "../../../lib/ai/contracts";
import AIMessage from "./AIMessage";
import CitationCard from "./CitationCard";
import CollectionResultCards from "./CollectionResultCards";
import CollectionDisplayControls from "./CollectionDisplayControls";
import ModelSelector from "./ModelSelector";
import PageActionCard from "./PageActionCard";
import PrivacyControls from "./PrivacyControls";
import SessionManager from "./SessionManager";
import ToolCard from "./ToolCard";
import WebsiteDisplayControls from "./WebsiteDisplayControls";
import { getFloatingPanelPosition, type FloatingPanelPosition, type FloatingRect } from "./floatingPosition";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

type Props = {
  launcherRect?: FloatingRect;
  state: ClientState; surface: AISurface; emotion: BanmaoEmotion; language: string; input: string;
  setInput: (value: string) => void; onInputFocus: () => void; submit: (event: FormEvent) => void;
  stop: () => void; close: () => void; retry: () => void; optIn: boolean; setOptIn: (value: boolean) => void;
  crossSessionMemory: boolean; setCrossSessionMemory: (value: boolean) => void; usedMemorySessions: Array<{ id: string; title: string }>; dismissMemorySession: (id: string) => void;
  mascotVisible: boolean; setMascotVisible: (value: boolean) => void; reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void; onAnimationComplete: () => void; clear: () => void;
  exportData: () => void; children?: ReactNode;
  pendingAction: AIPageAction | null; actionNotice: string; confirmAction: () => void; cancelAction: () => void; memoryTurns: number;
  persistenceReady: boolean; persistenceError?: string; persistenceToggleDisabled: boolean;
};

const PROMPT_ICONS = [Sparkles, TrendingUp, ShieldCheck];

export default function AIChatPanel(props: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const stayAtBottom = useRef(true);
  const dragStart = useRef<number | null>(null);
  const [showScroll, setShowScroll] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState<FloatingPanelPosition>();
  const streaming = props.state.status === "streaming";
  const phrase = getStatusPhrase(props.emotion, props.language);
  const t = (key: Parameters<typeof aiText>[1]) => aiText(props.language, key);
  const errorText = props.state.error === "SESSION_QUOTA_EXCEEDED" ? t("quotaExceeded") : props.state.error === "MODEL_UNAVAILABLE" ? t("modelUnavailable") : props.state.error ? aiReliabilityError(props.language, props.state.error) : undefined;
  const prompts = aiPrompts(props.language, props.surface);
  const surfaceLabel = props.surface === "landing" ? t("ecosystem") : props.surface === "collection" ? t("collections") : props.surface === "defi" ? "DeFi" : "GameFi";

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !props.launcherRect) return;
    const update = () => {
      const visual = window.visualViewport;
      const bodyStyles = getComputedStyle(document.body);
      const bottomNav = Number.parseFloat(bodyStyles.getPropertyValue("--defi-bottom-nav-height")) || 0;
      setFloatingPosition(getFloatingPanelPosition(
        props.launcherRect!,
        { width: panel.offsetWidth, height: panel.offsetHeight },
        {
          width: visual?.width || window.innerWidth,
          height: visual?.height || window.innerHeight,
          offsetLeft: visual?.offsetLeft || 0,
          offsetTop: visual?.offsetTop || 0,
          inset: 12,
          topReserved: 76,
          bottomReserved: Math.max(20, bottomNav + 14),
          gap: 12,
        },
        window.innerWidth <= 640,
      ));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [props.launcherRect]);

  useEffect(() => { const previous=document.activeElement as HTMLElement|null;const panel=document.getElementById("banmao-ai-panel");const root=document.getElementById("__next")||document.querySelector("main");if(root&&!root.contains(panel))root.setAttribute("inert","");inputRef.current?.focus();return()=>{root?.removeAttribute("inert");previous?.focus();}; }, []);
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
  }, [props.state.messages, props.state.tools, props.state.citations, props.state.collectionResults, props.state.error, props.reducedMotion]);

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


  const panelStyle = floatingPosition ? ({ position: "fixed", left: floatingPosition.left, top: floatingPosition.top, right: "auto", bottom: "auto" } as CSSProperties) : undefined;
  return <section ref={panelRef} style={panelStyle} id="banmao-ai-panel" data-surface={props.surface} data-emotion={props.emotion} role="dialog" aria-modal="true" aria-label="BANMAO AI" className="banmao-ai-panel" onKeyDown={(event) => { if (event.key === "Escape") props.close(); if(event.key==="Tab"){const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'));if(!items.length)return;const first=items[0],last=items.at(-1)!;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}} }}>
    <header className="banmao-ai-header" onPointerDown={startDrag} onPointerUp={endDrag} onPointerCancel={() => { dragStart.current = null; }}>
      <span className="banmao-ai-drag-handle" aria-hidden="true" />
      <div className="banmao-ai-brand">
        {props.mascotVisible && <div className="banmao-ai-header-mascot"><BanmaoAIMascot emotion={props.emotion} reducedMotion={props.reducedMotion} onAnimationComplete={props.onAnimationComplete} /></div>}
        <div className="banmao-ai-heading"><span><h2>BANMAO AI</h2><i className="banmao-ai-live" aria-label={t("online")} /></span><p>{phrase}</p></div>
      </div>
      <div className="banmao-ai-header-actions"><SessionManager language={props.language} /><span className="banmao-ai-context">{surfaceLabel}</span><button className="banmao-ai-icon-button" type="button" aria-label={t("close")} onClick={props.close}><X size={18} /></button></div>
    </header>
    <span className="banmao-ai-sr-status" role="status" aria-live="polite">{phrase}</span>

    <div className="banmao-ai-conversation" ref={messagesRef} onScroll={onMessageScroll} aria-live="polite">
      {!props.state.messages.length && <div className="banmao-ai-welcome">
        <div className="banmao-ai-welcome-icon"><Compass size={24} aria-hidden="true" /></div>
        <span className="banmao-ai-eyebrow">{t("copilot")}</span>
        <h3>{t("explore")}</h3>
        <p>{t("welcome")}</p>
        <div className="banmao-ai-prompt-grid" aria-label={t("suggested")}>{prompts.map((prompt, index) => { const Icon = PROMPT_ICONS[index % PROMPT_ICONS.length]; return <button type="button" key={prompt} onClick={() => choosePrompt(prompt)}><Icon size={16} aria-hidden="true" /><span>{prompt}</span><ArrowUp size={14} aria-hidden="true" /></button>; })}</div>
      </div>}
      {props.state.messages.map((message, index) => <AIMessage key={`${message.role}-${message.createdAt}-${index}`} {...message} streaming={streaming && index === props.state.messages.length - 1 && message.role === "assistant"} language={props.language} />)}
      {!!props.state.tools.length && <section className="banmao-ai-activity" aria-label={t("activity")}><h3><Sparkles size={14} /> {t("activityTitle")}</h3>{props.state.tools.map((tool) => <ToolCard tool={tool} language={props.language} key={tool.callId} />)}</section>}
      {props.state.collectionResults && <CollectionResultCards payload={props.state.collectionResults} language={props.language} />}
      {!!props.state.citations.length && <aside className="banmao-ai-citations"><h3>{t("sources")} <span>{props.state.citations.length}</span></h3><div>{props.state.citations.map((citation, index) => <CitationCard citation={citation} index={index} language={props.language} key={`${citation.sourcePath}:${citation.version || ""}`} />)}</div></aside>}
      {props.pendingAction && <PageActionCard action={props.pendingAction} language={props.language} onConfirm={props.confirmAction} onCancel={props.cancelAction} />}
      {props.actionNotice && <p className="banmao-ai-action-notice" role="status">{props.actionNotice}</p>}
      {props.state.ragStatus==="degraded"&&<div className="banmao-ai-error" role="status"><span><CircleAlert size={18}/></span><div><p>{t("ragDegraded")}</p></div></div>}{props.state.notice&&<div className="banmao-ai-error" role="status"><span><CircleAlert size={18}/></span><div><p>{t("modelMigrated")}</p></div></div>}{errorText && <div className="banmao-ai-error" role="alert"><span><CircleAlert size={18} /></span><div><strong>{t("interrupted")}</strong><p>{errorText}</p>{props.state.lastPrompt && <button type="button" onClick={props.retry}>{t("again")}</button>}</div></div>}
    </div>

    {showScroll && <button className="banmao-ai-scroll-bottom" type="button" onClick={scrollToBottom} aria-label={t("latest")}><ArrowDown size={17} /></button>}

    <footer className="banmao-ai-footer">
      <WebsiteDisplayControls language={props.language} />
      {props.surface === "collection" && <CollectionDisplayControls language={props.language} />}
      <form className="banmao-ai-composer" onSubmit={props.submit}>
        <label htmlFor="banmao-ai-input" className="banmao-ai-sr-only">{t("message")}</label>
        <textarea ref={inputRef} id="banmao-ai-input" maxLength={8000} rows={1} required value={props.input} disabled={streaming} placeholder={streaming ? t("responding") : t("ask")} onFocus={props.onInputFocus} onKeyDown={onKeyDown} onChange={(event) => props.setInput(event.target.value)} />
        <div className="banmao-ai-composer-bar">{props.state.model&&<ModelSelector language={props.language} />}{props.input.length > 7000 && <span className="banmao-ai-count">{props.input.length}/8000</span>}<span className="banmao-ai-composer-hint">{t("sendHint")}</span>{streaming ? <button className="banmao-ai-stop" type="button" onClick={props.stop} aria-label={t("stop")}><Square size={13} fill="currentColor" /></button> : <button className="banmao-ai-send" disabled={!props.input.trim()} aria-label={t("send")}><ArrowUp size={17} /></button>}</div>
      </form>
      <p className="banmao-ai-disclaimer"><ShieldCheck size={12} /> {t("localHistory")}: {props.optIn ? `${props.memoryTurns} ${t("storedMessages")} · ${t("persistenceOn")}` : t("persistenceOff")} · {t("review")}</p>
      {!!props.usedMemorySessions.length && <p className="banmao-ai-disclaimer" role="status"><Sparkles size={12} /> {props.language.toLowerCase().startsWith("vi") ? "Đã dùng trí nhớ từ" : "Memory used from"}: {props.usedMemorySessions.map((source) => <span key={source.id}>{source.title} <button type="button" onClick={() => props.dismissMemorySession(source.id)} aria-label={`Remove memory from ${source.title}`}>×</button></span>)}</p>}
      {props.persistenceError && <p className="banmao-ai-disclaimer" role="status"><CircleAlert size={12} /> {t("persistenceWarning")}</p>}
      <PrivacyControls language={props.language} optIn={props.optIn} onOptIn={props.setOptIn} crossSessionMemory={props.crossSessionMemory} onCrossSessionMemory={props.setCrossSessionMemory} optInDisabled={props.persistenceToggleDisabled} dataActionsDisabled={props.persistenceToggleDisabled} mascotVisible={props.mascotVisible} onMascotVisible={props.setMascotVisible} reducedMotion={props.reducedMotion} onReducedMotion={props.setReducedMotion} onClear={props.clear} onExport={props.exportData} />
      {props.children}
    </footer>
  </section>;
}
