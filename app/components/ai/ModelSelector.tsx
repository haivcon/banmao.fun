"use client";

import { Bot } from "lucide-react";
import { aiText } from "../../../lib/ai/client/i18n";

export default function ModelSelector({ language }: { language: string }) {
  return <span className="banmao-ai-model" aria-label={`${aiText(language, "model")}: banmao.fun`}>
    <Bot size={14} aria-hidden="true" />
    <span>banmao.fun</span>
  </span>;
}
