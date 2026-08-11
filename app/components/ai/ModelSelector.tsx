"use client";

import { Bot, ChevronDown } from "lucide-react";
import type { AIModel } from "../../../lib/ai/contracts";

export default function ModelSelector({ models, value, onChange, disabled }: { models: AIModel[]; value: AIModel; onChange: (model: AIModel) => void; disabled?: boolean }) {
  return <label className="banmao-ai-model">
    <Bot size={14} aria-hidden="true" />
    <span className="banmao-ai-sr-only">AI model</span>
    <select aria-label="AI model" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as AIModel)}>{models.map((model) => <option key={model}>{model}</option>)}</select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}
