"use client";

const MAX_POLLS = 20;

export async function requestBanmaoBoxVerification(txHash: `0x${string}`, attempt = 0): Promise<void> {
  try {
    const response = await fetch("/api/banmaobox/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    const result = await response.json().catch(() => null);
    if (
      attempt < MAX_POLLS &&
      (result?.status === "waiting-for-indexer" || result?.status === "pending")
    ) {
      const requestedDelay = Number(result.retryAfterMs);
      const delay = Number.isFinite(requestedDelay)
        ? Math.min(60_000, Math.max(5_000, requestedDelay))
        : 15_000;
      window.setTimeout(() => {
        void requestBanmaoBoxVerification(txHash, attempt + 1);
      }, delay);
    }
  } catch {
    // Explorer verification is best-effort and must never invalidate an on-chain creation.
  }
}
