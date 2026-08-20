"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { parseUnits } from "viem";
import type { TransactionEmotionEvent } from "../../../lib/ai/client/emotion";
import { aiText } from "../../../lib/ai/client/i18n";
import ActionConfirmation from "./ActionConfirmation";

type Draft = {
  actionId: string;
  actionType: string;
  chainId: number;
  to: string;
  value: string;
  data: string;
  humanSummary: string;
  risks: string[];
  expiresAt: string;
  draftHash: string;
};

export default function TransactionCopilot({ language, onEmotion }: { language: string; onEmotion?: (event: TransactionEmotionEvent) => void }) {
  const [amount, setAmount] = useState("");
  const [lockOptionId, setLockOptionId] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);

  async function authenticate() {
    try {
      if (!address || !isConnected || chainId !== 196) throw new Error(t("connectWallet"));
      onEmotion?.("siwe-nonce");
      const nonceResponse = await fetch("/api/ai/auth/nonce", { method: "POST" });
      const nonceData = await nonceResponse.json().catch(() => ({}));
      if (!nonceResponse.ok) throw new Error(nonceData.error || t("walletProofUnavailable"));
      const issuedAt = new Date();
      const expirationTime = new Date(issuedAt.getTime() + 5 * 60_000);
      const message = `${window.location.host} wants you to sign in with your Ethereum account:\n${address}\n\nAuthorize BANMAO AI prepare/simulate only. No transaction will be sent.\n\nURI: ${window.location.origin}\nVersion: 1\nChain ID: 196\nNonce: ${nonceData.nonce}\nIssued At: ${issuedAt.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
      onEmotion?.("siwe-signing");
      const signature = await signMessageAsync({ account: address, message });
      const verifyResponse = await fetch("/api/ai/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      const verified = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verified.error || t("walletProofFailed"));
      onEmotion?.("siwe-verified");
    } catch (error) {
      onEmotion?.("siwe-error");
      throw error;
    }
  }

  async function prepare() {
    setBusy(true);
    setResult("");
    try {
      await authenticate();
      onEmotion?.("tx-prepare");
      const response = await fetch("/api/ai/transactions/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "stake", amount: parseUnits(amount, 18).toString(), lockOptionId, chainId: 196 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.reason || t("draftUnavailable"));
      setDraft(data);
      onEmotion?.("tx-warning");
    } catch (error) {
      setDraft(null);
      setResult(error instanceof Error ? error.message : t("draftUnavailable"));
      onEmotion?.("tx-error");
    } finally { setBusy(false); }
  }

  async function simulate(confirmed: Draft) {
    setBusy(true);
    setResult("");
    try {
      onEmotion?.("tx-simulate");
      const response = await fetch("/api/ai/transactions/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actionId: confirmed.actionId, draftHash: confirmed.draftHash }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.reason || t("simulationUnavailable"));
      setResult(JSON.stringify(data, null, 2));
      setDraft(null);
      onEmotion?.("tx-simulate-success");
    } catch (error) {
      setResult(error instanceof Error ? error.message : t("simulationUnavailable"));
      onEmotion?.("tx-error");
    } finally { setBusy(false); }
  }

  return <details className="banmao-ai-transaction">
    <summary>{t("transactionDraft")}</summary>
    <p>{t("transactionPrivacy")}</p>
    <label htmlFor="banmao-ai-stake-amount">{t("stakeAmount")}</label>
    <input id="banmao-ai-stake-amount" inputMode="decimal" pattern="[0-9]+([.][0-9]{0,18})?" value={amount} onChange={(event) => setAmount(event.target.value)} />
    <label htmlFor="banmao-ai-lock-option">{t("lockOption")}</label>
    <select id="banmao-ai-lock-option" value={lockOptionId} onChange={(event) => setLockOptionId(Number(event.target.value))}>
      <option value={0}>{t("flexible")}</option><option value={1}>{t("days30")}</option><option value={2}>{t("days90")}</option><option value={3}>{t("days180")}</option>
    </select>
    <button type="button" disabled={busy || !isConnected || chainId !== 196 || !/^\d+(\.\d{0,18})?$/.test(amount) || Number(amount) <= 0} onClick={prepare}>{t("authenticatePrepare")}</button>
    {draft && <ActionConfirmation draft={draft} language={language} onReview={simulate} />}
    {result && <pre aria-live="polite">{result}</pre>}
  </details>;
}
