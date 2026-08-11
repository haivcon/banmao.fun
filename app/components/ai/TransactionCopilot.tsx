"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import type { TransactionEmotionEvent } from "../../../lib/ai/client/emotion";
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

export default function TransactionCopilot({ onEmotion }: { onEmotion?: (event: TransactionEmotionEvent) => void }) {
  const [amount, setAmount] = useState("");
  const [lockOptionId, setLockOptionId] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  async function authenticate() {
    try {
      if (!address || !isConnected || chainId !== 196) throw new Error("Connect an X Layer wallet first");
      onEmotion?.("siwe-nonce");
      const nonceResponse = await fetch("/api/ai/auth/nonce", { method: "POST" });
      const nonceData = await nonceResponse.json().catch(() => ({}));
      if (!nonceResponse.ok) throw new Error(nonceData.error || "Proof-of-wallet unavailable");
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
      if (!verifyResponse.ok) throw new Error(verified.error || "Proof-of-wallet failed");
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
        body: JSON.stringify({ intent: "stake", amount, lockOptionId, chainId: 196 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.reason || "Draft preparation unavailable");
      setDraft(data);
      onEmotion?.("tx-warning");
    } catch (error) {
      setDraft(null);
      setResult(error instanceof Error ? error.message : "Draft preparation unavailable");
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
      if (!response.ok) throw new Error(data.error || data.reason || "Read-only simulation unavailable");
      setResult(JSON.stringify(data, null, 2));
      setDraft(null);
      onEmotion?.("tx-simulate-success");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Read-only simulation unavailable");
      onEmotion?.("tx-error");
    } finally { setBusy(false); }
  }

  return <details className="banmao-ai-transaction">
    <summary>Transaction draft (prepare/simulate only)</summary>
    <p>A wallet signature authenticates this session only. BANMAO AI never opens a transaction signature or submits a transaction.</p>
    <label htmlFor="banmao-ai-stake-amount">Stake amount in base units</label>
    <input id="banmao-ai-stake-amount" inputMode="numeric" pattern="[0-9]+" value={amount} onChange={(event) => setAmount(event.target.value)} />
    <label htmlFor="banmao-ai-lock-option">Lock option</label>
    <select id="banmao-ai-lock-option" value={lockOptionId} onChange={(event) => setLockOptionId(Number(event.target.value))}>
      <option value={0}>Flexible</option><option value={1}>30 days</option><option value={2}>90 days</option><option value={3}>180 days</option>
    </select>
    <button type="button" disabled={busy || !isConnected || chainId !== 196 || !/^\d+$/.test(amount)} onClick={prepare}>Authenticate and prepare draft</button>
    {draft && <ActionConfirmation draft={draft} onReview={simulate} />}
    {result && <pre aria-live="polite">{result}</pre>}
  </details>;
}
