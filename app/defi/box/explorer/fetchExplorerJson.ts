const RETRY_DELAY_MS = 250;

function isTransientResponse(response: Response): boolean {
  return response.status === 429 || response.status >= 500;
}

function waitForRetry(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Request aborted", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, RETRY_DELAY_MS);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchExplorerJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
      lastError = error;
      if (attempt === 1) throw error;
      await waitForRetry(signal);
      continue;
    }
    if (response.ok) return await response.json() as T;
    const responseError = new Error(`Explorer request failed (${response.status})`);
    if (!isTransientResponse(response) || attempt === 1) throw responseError;
    lastError = responseError;
    await waitForRetry(signal);
  }
  throw lastError ?? new Error("Explorer request failed");
}
