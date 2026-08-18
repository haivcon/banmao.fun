"use client";

const MAX_POLLS = 20;

export type BanmaoBoxVerificationStatus =
  | "already-verified"
  | "verified"
  | "pending"
  | "waiting-for-indexer"
  | "transient-unavailable"
  | "retry-exhausted"
  | "manual-reconciliation"
  | "failed";

export type BanmaoBoxVerificationUpdate = {
  status: BanmaoBoxVerificationStatus;
  boxAddress?: string;
  error?: string;
};

export type BanmaoBoxVerificationRequest = {
  promise: Promise<BanmaoBoxVerificationUpdate>;
  cancel: () => void;
};

const isTransient = (update: BanmaoBoxVerificationUpdate) =>
  update.status === "waiting-for-indexer" ||
  update.status === "pending" ||
  update.status === "transient-unavailable";

export function requestBanmaoBoxVerification(
  txHash: `0x${string}`,
  onUpdate?: (update: BanmaoBoxVerificationUpdate) => void,
): BanmaoBoxVerificationRequest {
  const controller = new AbortController();
  let timer: number | undefined;
  let cancelled = false;
  const emit = (update: BanmaoBoxVerificationUpdate) => {
    if (!cancelled) onUpdate?.(update);
    return update;
  };
  const wait = (delay: number) => new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, delay);
    controller.signal.addEventListener("abort", () => resolve(), { once: true });
  });

  const promise = (async () => {
    for (let attempt = 0; attempt < MAX_POLLS && !cancelled; attempt += 1) {
      try {
        const response = await fetch("/api/banmaobox/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash }),
          signal: controller.signal,
        });
        if (cancelled) break;
        const result = await response.json().catch(() => null);
        if (!response.ok && response.status !== 503) {
          return emit({
            status: "failed",
            error: typeof result?.error === "string" ? result.error : "Explorer verification request failed",
          });
        }
        const update = emit({
          status: result?.status,
          boxAddress: typeof result?.boxAddress === "string" ? result.boxAddress : undefined,
        });
        if (!isTransient(update)) return update;
        if (attempt + 1 >= MAX_POLLS) {
          return emit({ ...update, status: "retry-exhausted" });
        }
        const requestedDelay = Number(response.headers.get("retry-after")) * 1_000;
        await wait(Number.isFinite(requestedDelay)
          ? Math.min(60_000, Math.max(5_000, requestedDelay))
          : 15_000);
      } catch (error) {
        if (cancelled || controller.signal.aborted) break;
        return emit({
          status: "failed",
          error: error instanceof Error ? error.message : "Explorer verification request failed",
        });
      }
    }
    return { status: "retry-exhausted" as const };
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    },
  };
}
