"use client";

import { FileText } from "lucide-react";
import type { Citation } from "../../../lib/ai/client/state";

export default function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  const label = citation.sourcePath.split("/").filter(Boolean).at(-1) || citation.sourcePath;
  return <details className="banmao-ai-citation">
    <summary><span>{index + 1}</span><FileText size={14} aria-hidden="true" /><strong>{label}</strong></summary>
    <code>{citation.sourcePath}</code>
    {citation.version && <small>Version {citation.version}</small>}
    {citation.excerpt && <p>{citation.excerpt}</p>}
  </details>;
}
