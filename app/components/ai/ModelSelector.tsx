"use client";

import { Bot, ChevronDown } from "lucide-react";
import type { AIModel } from "../../../lib/ai/contracts";
import { aiText } from "../../../lib/ai/client/i18n";

export default function ModelSelector({ models, language, value, onChange, disabled }: { models: AIModel[]; language: string; value: AIModel; onChange: (model: AIModel) => void; disabled?: boolean }) {
  return <label className="banmao-ai-model">
    <Bot size={14} aria-hidden="true" />
    <span className="banmao-ai-sr-only">{aiText(language, "model")}</span>
    <select aria-label={aiText(language, "model")} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as AIModel)}>{models.map((model) => <option key={model}>{model}</option>)}</select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}
