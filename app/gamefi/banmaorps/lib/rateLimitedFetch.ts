const ABORT_ERROR_NAME = "AbortError";

export type RateLimiterOptions = {
  requestsPerInterval: number;
  intervalMs: number;
};

type QueueItem = {
  input: RequestInfo | URL;
  init?: RequestInit;
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
  cleanup?: () => void;
  aborted: boolean;
};

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", ABORT_ERROR_NAME);
}

export function createRateLimitedFetch({
  requestsPerInterval,
  intervalMs,
}: RateLimiterOptions) {
  const globalFetch: typeof fetch = (...args) => fetch(...(args as Parameters<typeof fetch>));
  if (!Number.isFinite(requestsPerInterval) || requestsPerInterval <= 0) {
    return globalFetch;
  }

  const effectiveInterval = Math.max(0, intervalMs);
  if (effectiveInterval === 0) {
    return globalFetch;
  }

  const maxRequests = Math.max(1, Math.floor(requestsPerInterval));
  const queue: QueueItem[] = [];
  const startTimestamps: number[] = [];
  let cooldownUntil = 0;
  let activeCount = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const prune = (now: number) => {
    while (startTimestamps.length > 0 && now - startTimestamps[0] >= effectiveInterval) {
      startTimestamps.shift();
    }
  };

  const schedule = (delay: number) => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      tryStart();
    }, delay);
  };

  const markCooldown = (ms: number) => {
    if (!Number.isFinite(ms) || ms <= 0) return;
    cooldownUntil = Math.max(cooldownUntil, Date.now() + ms);
  };

  const looksLikeRateLimit = (error: unknown) => {
    if (!error) return false;
    if (typeof error === "object") {
      const status = (error as any)?.status;
      if (status === 429) return true;
      const message = String((error as any)?.message ?? "").toLowerCase();
      if (message.includes("429") || message.includes("rate limit")) {
        return true;
      }
    } else if (typeof error === "string") {
      const lower = error.toLowerCase();
      if (lower.includes("429") || lower.includes("rate limit")) {
        return true;
      }
    }
    return false;
  };

  const tryStart = () => {
    if (queue.length === 0) {
      return;
    }

    const now = Date.now();
    prune(now);

    if (activeCount >= maxRequests) {
      schedule(1);
      return;
    }

    const quotaWait =
      startTimestamps.length >= maxRequests
        ? Math.max(0, effectiveInterval - (now - startTimestamps[0]))
        : 0;
    const cooldownWait = Math.max(0, cooldownUntil - now);
    const wait = Math.max(quotaWait, cooldownWait);

    if (wait > 0) {
      schedule(wait);
      return;
    }

    const job = queue.shift()!;
    job.cleanup?.();

    if (job.aborted) {
      tryStart();
      return;
    }

    activeCount++;
    const start = Date.now();
    startTimestamps.push(start);
    prune(start);

    Promise.resolve(globalFetch(job.input, job.init))
      .then((response) => {
        if (response?.status === 429) {
          markCooldown(effectiveInterval);
        }
        job.resolve(response);
      })
      .catch((error) => {
        if (looksLikeRateLimit(error)) {
          markCooldown(effectiveInterval);
        }
        job.reject(error);
      })
      .finally(() => {
        activeCount = Math.max(0, activeCount - 1);
        const later = Date.now();
        prune(later);
        tryStart();
      });

    // Attempt to dispatch additional queued requests if capacity allows
    tryStart();
  };

  return function rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit) {
    return new Promise<Response>((resolve, reject) => {
      const job: QueueItem = { input, init, resolve, reject, aborted: false };

      const signal = init?.signal;
      if (signal) {
        if (signal.aborted) {
          reject(createAbortError());
          return;
        }
        const onAbort = () => {
          job.aborted = true;
          job.cleanup?.();
          const idx = queue.indexOf(job);
          if (idx >= 0) {
            queue.splice(idx, 1);
          }
          reject(createAbortError());
        };
        signal.addEventListener("abort", onAbort, { once: true });
        job.cleanup = () => {
          signal.removeEventListener("abort", onAbort);
        };
      }

      queue.push(job);
      tryStart();
    });
  };
}