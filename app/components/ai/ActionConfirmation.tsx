"use client";

import { aiText } from "../../../lib/ai/client/i18n";

type Draft = { actionType: string; chainId: number; to: string; value: string; data: string; humanSummary: string; risks: string[]; expiresAt: string; draftHash: string };

export default function ActionConfirmation({ draft, language, onReview }: { draft: Draft; language: string; onReview: (draft: Draft) => void }) {
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
  return <section aria-label={t("draftReview")} className="banmao-ai-action">
    <h3>{t("reviewOnly")}</h3>
    <dl><dt>{t("action")}</dt><dd>{draft.actionType}</dd><dt>{t("chain")}</dt><dd>{draft.chainId}</dd><dt>{t("contract")}</dt><dd>{draft.to}</dd><dt>{t("value")}</dt><dd>{draft.value}</dd><dt>{t("calldata")}</dt><dd><code>{draft.data}</code></dd><dt>{t("draftHash")}</dt><dd><code>{draft.draftHash}</code></dd><dt>{t("expires")}</dt><dd>{draft.expiresAt}</dd></dl>
    <ul>{draft.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
    <button type="button" onClick={() => onReview(draft)}>{t("confirmSimulation")}</button>
  </section>;
}
