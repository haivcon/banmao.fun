"use client";

import { CheckCircle2, CircleAlert, Database, LoaderCircle, Search } from "lucide-react";
import type { ToolActivity } from "../../../lib/ai/client/state";
import { aiText } from "../../../lib/ai/client/i18n";

export default function ToolCard({ tool, language }: { tool: ToolActivity; language: string }) {
  const normalized = tool.status.toLowerCase();
  const failed = /error|fail|unavailable|disabled/.test(normalized);
  const complete = /success|complete|available|done/.test(normalized) && !failed;
  const running = !failed && !complete;
  const retrieval = /rag|search|retriev|document|collection/.test(tool.name.toLowerCase());
  const Icon = failed ? CircleAlert : complete ? CheckCircle2 : running ? LoaderCircle : retrieval ? Search : Database;
  return <details className={`banmao-ai-tool ${failed ? "is-error" : complete ? "is-complete" : "is-running"}`} open={running}>
    <summary>
      <span className="banmao-ai-tool-icon"><Icon size={15} aria-hidden="true" /></span>
      <span><strong>{tool.name.replace(/[._-]+/g, " ")}</strong><small>{tool.source || aiText(language, "service")}</small></span>
      <span className="banmao-ai-tool-status">{running ? aiText(language, "working") : failed ? aiText(language, "attention") : aiText(language, "complete")}</span>
    </summary>
    {tool.summary && <p>{tool.summary}</p>}
    {running && <span className="banmao-ai-tool-progress" aria-hidden="true"><i /></span>}
  </details>;
}
