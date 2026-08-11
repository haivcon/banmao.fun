"use client";

import { MessageCircleMore, Sparkles } from "lucide-react";
import { aiText } from "../../../lib/ai/client/i18n";
import type { BanmaoEmotion } from "../../../lib/ai/client/emotion";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

export default function AIChatLauncher({ open, emotion, mascotVisible, reducedMotion, language, onClick }: { open: boolean; emotion: BanmaoEmotion; mascotVisible: boolean; reducedMotion: boolean; language?: string; onClick: () => void }) {
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
  return <button type="button" className={`banmao-ai-launcher${open ? " is-open" : ""}`} aria-expanded={open} aria-controls="banmao-ai-panel" aria-label={open ? t("close") : "BANMAO AI"} onClick={onClick}>
    <span className="banmao-ai-launcher-glow" aria-hidden="true" />
    {mascotVisible ? <span className="banmao-ai-orb"><BanmaoAIMascot emotion={emotion} reducedMotion={reducedMotion} size="launcher" /><i aria-hidden="true" /></span> : <span className="banmao-ai-launcher-icon"><MessageCircleMore size={22} /></span>}
    <span className="banmao-ai-launcher-copy"><span><strong>BANMAO AI</strong><Sparkles size={12} aria-hidden="true" /></span><small>{open ? t("copilot") : `${t("online")} · ${t("ask").replace(/…$/, "")}`}</small></span>
  </button>;
}
