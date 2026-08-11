"use client";

import { Bot, Check, ShieldAlert, X } from "lucide-react";
import type { AIPageAction } from "../../../lib/ai/client/actionBridge";
import { aiText } from "../../../lib/ai/client/i18n";

export default function PageActionCard({ action, language, onConfirm, onCancel }: { action: AIPageAction; language: string; onConfirm: () => void; onCancel: () => void }) {
  const sensitive = action.risk === "transaction";
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
  return <section className={`banmao-ai-page-action${sensitive ? " is-sensitive" : ""}`} aria-label={t("proposed")}>
    <header><Bot size={17} /><div><strong>{t("canDo")}</strong><small>{t("exact")}</small></div></header>
    <p>{action.label}{action.value ? <> {t("withValue")} <code>{action.value}</code></> : null}</p>
    <div className="banmao-ai-page-action-risk"><ShieldAlert size={14} /><span>{sensitive ? t("txRisk") : t("safeRisk")}</span></div>
    <div><button type="button" onClick={onCancel}><X size={14} /> {t("cancel")}</button><button type="button" className="is-primary" onClick={onConfirm}><Check size={14} /> {t("confirm")}</button></div>
  </section>;
}
