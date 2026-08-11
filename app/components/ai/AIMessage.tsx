"use client";

import { Check, Copy, UserRound } from "lucide-react";
import { useState } from "react";
import { aiText } from "../../../lib/ai/client/i18n";
import type { ClientMessage } from "../../../lib/ai/client/state";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";
import MarkdownRenderer from "./MarkdownRenderer";
import TypingIndicator from "./TypingIndicator";

export default function AIMessage({ role, content, createdAt, streaming = false, language }: ClientMessage & { streaming?: boolean; language?: string }) {
  const [copied, setCopied] = useState(false);
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
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
      <header><strong>{role === "user" ? t("you") : "BANMAO AI"}</strong>{time && <time dateTime={new Date(createdAt).toISOString()}>{time}</time>}</header>
      <div className="banmao-ai-message-bubble">
        {!content && streaming ? <>
          <TypingIndicator language={language} />
          <span className="banmao-ai-skeleton" aria-hidden="true"><i /><i /><i /></span>
        </> : <MarkdownRenderer content={content} />}
        {streaming && content && <span className="banmao-ai-stream-caret" aria-hidden="true" />}
      </div>
      {role === "assistant" && content && !streaming && <button className="banmao-ai-copy" type="button" onClick={copy} aria-label={copied ? t("responseCopied") : t("copyResponse")}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? t("copied") : t("copy")}</button>}
    </div>
  </article>;
}
