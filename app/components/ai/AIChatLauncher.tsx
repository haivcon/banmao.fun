"use client";

import { MessageCircleMore, Sparkles } from "lucide-react";
import type { BanmaoEmotion } from "../../../lib/ai/client/emotion";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

export default function AIChatLauncher({ open, emotion, mascotVisible, reducedMotion, onClick }: { open: boolean; emotion: BanmaoEmotion; mascotVisible: boolean; reducedMotion: boolean; onClick: () => void }) {
  return <button type="button" className={`banmao-ai-launcher${open ? " is-open" : ""}`} aria-expanded={open} aria-controls="banmao-ai-panel" aria-label={open ? "Close BANMAO AI" : "Open BANMAO AI"} onClick={onClick}>
    <span className="banmao-ai-launcher-glow" aria-hidden="true" />
    {mascotVisible ? <span className="banmao-ai-orb"><BanmaoAIMascot emotion={emotion} reducedMotion={reducedMotion} size="launcher" /><i aria-hidden="true" /></span> : <span className="banmao-ai-launcher-icon"><MessageCircleMore size={22} /></span>}
    <span className="banmao-ai-launcher-copy"><span><strong>BANMAO AI</strong><Sparkles size={12} aria-hidden="true" /></span><small>{open ? "Assistant is open" : "Online · Ask anything"}</small></span>
  </button>;
}
