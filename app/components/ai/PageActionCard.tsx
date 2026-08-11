"use client";

import { Bot, Check, ShieldAlert, X } from "lucide-react";
import type { AIPageAction } from "../../../lib/ai/client/actionBridge";

export default function PageActionCard({ action, onConfirm, onCancel }: { action: AIPageAction; onConfirm: () => void; onCancel: () => void }) {
  const sensitive = action.risk === "transaction";
  return <section className={`banmao-ai-page-action${sensitive ? " is-sensitive" : ""}`} aria-label="BANMAO proposed page action">
    <header><Bot size={17} /><div><strong>Banmao can do this for you 🐱🍌</strong><small>Review the exact UI action before continuing</small></div></header>
    <p>{action.label}{action.value ? <> with value <code>{action.value}</code></> : null}</p>
    <div className="banmao-ai-page-action-risk"><ShieldAlert size={14} /><span>{sensitive ? "This may open a wallet transaction. You must review and sign it in your wallet." : "Only the allowlisted page element shown above will be used."}</span></div>
    <div><button type="button" onClick={onCancel}><X size={14} /> Cancel</button><button type="button" className="is-primary" onClick={onConfirm}><Check size={14} /> Confirm</button></div>
  </section>;
}
