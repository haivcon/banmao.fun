"use client";

import { Check, Copy, UserRound } from "lucide-react";
import { useState } from "react";
import type { ClientMessage } from "../../../lib/ai/client/state";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingIndicator from "./TypingIndicator";

export default function AIMessage({ role, content, createdAt, streaming = false }: ClientMessage & { streaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const time = createdAt ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(createdAt) : "";
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard may be unavailable in non-secure contexts. */ }
  }
  return <article className={`banmao-ai-message ${role}${streaming ? " is-streaming" : ""}`}>
    <div className="banmao-ai-message-avatar" aria-hidden="true">
      {role === "assistant" ? <BanmaoAIMascot emotion={streaming ? "answering" : "idle"} reducedMotion size="launcher" /> : <UserRound size={16} />}
    </div>
    <div className="banmao-ai-message-wrap">
      <header><strong>{role === "user" ? "You" : "BANMAO AI"}</strong>{time && <time dateTime={new Date(createdAt).toISOString()}>{time}</time>}</header>
      <div className="banmao-ai-message-bubble">
        {!content && streaming ? <TypingIndicator /> : <MarkdownRenderer content={content} />}
        {streaming && content && <span className="banmao-ai-stream-caret" aria-hidden="true" />}
      </div>
      {role === "assistant" && content && !streaming && <button className="banmao-ai-copy" type="button" onClick={copy} aria-label={copied ? "Response copied" : "Copy response"}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>}
    </div>
  </article>;
}
