"use client";

import type { BanmaoEmotion } from "../../../lib/ai/client/emotion";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

export default function AIChatLauncher({ open, emotion, mascotVisible, reducedMotion, onClick }: { open: boolean; emotion: BanmaoEmotion; mascotVisible: boolean; reducedMotion: boolean; onClick: () => void }) {
  return (
    <button type="button" className="banmao-ai-launcher" aria-expanded={open} aria-controls="banmao-ai-panel" aria-label={open ? "Close BANMAO AI" : "Open BANMAO AI"} onClick={onClick}>
      {mascotVisible && <span className="banmao-ai-orb"><BanmaoAIMascot emotion={emotion} reducedMotion={reducedMotion} size="launcher" /><i aria-hidden="true" /></span>}
      <span><strong>BANMAO AI</strong><small>{open ? "Assistant open" : "Online · Ask me"}</small></span>
    </button>
  );
}
