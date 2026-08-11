"use client";

import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { SUGGESTED_PROMPTS, type ClientState } from "../../../lib/ai/client/state";
import { getStatusPhrase, type BanmaoEmotion } from "../../../lib/ai/client/emotion";
import type { AISurface } from "../../../lib/ai/contracts";
import AIMessage from "./AIMessage";
import ModelSelector from "./ModelSelector";
import PrivacyControls from "./PrivacyControls";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

type Props = {
  state: ClientState;
  surface: AISurface;
  emotion: BanmaoEmotion;
  language: string;
  input: string;
  setInput: (value: string) => void;
  onInputFocus: () => void;
  submit: (event: FormEvent) => void;
  stop: () => void;
  close: () => void;
  retry: () => void;
  optIn: boolean;
  setOptIn: (value: boolean) => void;
  mascotVisible: boolean;
  setMascotVisible: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  onAnimationComplete: () => void;
  clear: () => void;
  exportData: () => void;
  selectModel: (model: ClientState["model"]) => void;
  children?: ReactNode;
};

export default function AIChatPanel(props: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") props.close();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
  const phrase = getStatusPhrase(props.emotion, props.language);
  return (
    <section id="banmao-ai-panel" data-surface={props.surface} role="dialog" aria-modal="false" aria-label="BANMAO AI assistant" className="banmao-ai-panel" onKeyDown={(event) => { if (event.key === "Escape") props.close(); }}>
      <header className="banmao-ai-header">
        {props.mascotVisible && <BanmaoAIMascot emotion={props.emotion} reducedMotion={props.reducedMotion} onAnimationComplete={props.onAnimationComplete} />}
        <div className="banmao-ai-heading"><span className="banmao-ai-context">{props.surface}</span><h2>BANMAO AI</h2><p className="banmao-ai-speech">{phrase}</p><small>Read-only · {props.state.model}</small></div>
        <button type="button" aria-label="Close AI assistant" onClick={props.close}>×</button>
      </header>
      <span className="banmao-ai-sr-status" role="status" aria-live="polite">{phrase}</span>
      <ModelSelector models={props.state.models} value={props.state.model} onChange={props.selectModel} disabled={props.state.status === "streaming"} />
      <div className="banmao-ai-messages" aria-live="polite">
        {!props.state.messages.length && <div className="banmao-ai-welcome"><h3>How can I help?</h3><p>Ask for cited, read-only BANMAO product context. Retrieved content is treated as untrusted evidence.</p></div>}
        {props.state.messages.map((message, index) => <AIMessage key={`${message.role}-${index}`} {...message} />)}
        {props.state.tools.map((tool) => <article className="banmao-ai-tool" key={tool.callId}><strong>{tool.name}</strong><span>{tool.status}</span><p>{tool.summary}</p><small>{tool.source}</small></article>)}
        {!!props.state.citations.length && <aside className="banmao-ai-citations"><h3>Sources</h3><ol>{props.state.citations.map((citation) => <li key={`${citation.sourcePath}:${citation.version || ""}`}><code>{citation.sourcePath}</code>{citation.excerpt && <p>{citation.excerpt}</p>}</li>)}</ol></aside>}
      </div>
      <div className="banmao-ai-suggestions" aria-label="Suggested prompts">{SUGGESTED_PROMPTS[props.surface].map((prompt) => <button type="button" key={prompt} onClick={() => { props.setInput(prompt); inputRef.current?.focus(); }}>{prompt}</button>)}</div>
      {props.state.error && <div className="banmao-ai-error" role="alert"><p>{props.state.error}</p>{props.state.lastPrompt && <button type="button" onClick={props.retry}>Retry last prompt</button>}</div>}
      <form onSubmit={props.submit}>
        <label htmlFor="banmao-ai-input">Message</label>
        <textarea ref={inputRef} id="banmao-ai-input" maxLength={8000} required value={props.input} onFocus={props.onInputFocus} onKeyDown={onKeyDown} onChange={(event) => props.setInput(event.target.value)} />
        <div><button disabled={props.state.status === "streaming"}>Send</button>{props.state.status === "streaming" && <button type="button" onClick={props.stop}>Stop</button>}</div>
      </form>
      <p className="banmao-ai-disclaimer">AI output is informational, read-only, and not financial advice. Verify contract state and risks independently.</p>
      <PrivacyControls optIn={props.optIn} onOptIn={props.setOptIn} mascotVisible={props.mascotVisible} onMascotVisible={props.setMascotVisible} reducedMotion={props.reducedMotion} onReducedMotion={props.setReducedMotion} onClear={props.clear} onExport={props.exportData} />
      {props.children}
    </section>
  );
}
