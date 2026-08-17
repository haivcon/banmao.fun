"use client";

const MAX_POLLS = 20;

export type BanmaoBoxVerificationStatus =
  | "already-verified"
  | "verified"
  | "pending"
  | "waiting-for-indexer"
  | "failed";

export type BanmaoBoxVerificationUpdate = {
  status: BanmaoBoxVerificationStatus;
  boxAddress?: string;
  error?: string;
};

export async function requestBanmaoBoxVerification(
  txHash: `0x${string}`,
  onUpdate?: (update: BanmaoBoxVerificationUpdate) => void,
  attempt = 0,
): Promise<BanmaoBoxVerificationUpdate> {
  try {
    const response = await fetch("/api/banmaobox/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const failed = {
        status: "failed" as const,
        error: typeof result?.error === "string" ? result.error : "Explorer verification request failed",
      };
      onUpdate?.(failed);
      return failed;
    }

    const update: BanmaoBoxVerificationUpdate = {
      status: result?.status,
      boxAddress: typeof result?.boxAddress === "string" ? result.boxAddress : undefined,
    };
    onUpdate?.(update);
    if (
      attempt < MAX_POLLS &&
      (update.status === "waiting-for-indexer" || update.status === "pending")
    ) {
      const requestedDelay = Number(result.retryAfterMs);
      const delay = Number.isFinite(requestedDelay)
        ? Math.min(60_000, Math.max(5_000, requestedDelay))
        : 15_000;
      window.setTimeout(() => {
        void requestBanmaoBoxVerification(txHash, onUpdate, attempt + 1);
      }, delay);
    }
    return update;
  } catch (error) {
    const failed = {
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Explorer verification request failed",
    };
    onUpdate?.(failed);
    return failed;
  }
}
