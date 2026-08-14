export function isTransientStatus(status: number) { return status === 429 || status >= 500; }
export async function fetchWithOneRetry(input: RequestInfo | URL, init: RequestInit, options: { fetcher?: typeof fetch; sleep?: (ms: number) => Promise<void>; random?: () => number; baseDelayMs?: number } = {}) {
  const fetcher = options.fetcher || fetch; const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms))); const random = options.random || Math.random;
  let retries = 0;
  try {
    let response = await fetcher(input, init);
    if (isTransientStatus(response.status)) { retries = 1; const retryAfter = Number(response.headers.get("retry-after")); const delay = Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : Math.min(1500, (options.baseDelayMs || 250) * (1 + random())); await sleep(delay); response = await fetcher(input, init); }
    return { response, retries };
  } catch (error) {
    if ((init.signal as AbortSignal | undefined)?.aborted) throw error;
    retries = 1; await sleep(Math.min(1500, (options.baseDelayMs || 250) * (1 + random())));
    return { response: await fetcher(input, init), retries };
  }
}
