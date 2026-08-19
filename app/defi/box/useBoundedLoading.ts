"use client";

import { useCallback, useEffect, useState } from "react";

export const BOX_LOADING_TIMEOUT_MS = 12_000;

export function useBoundedLoading(
  loading: boolean,
  timeoutMs = BOX_LOADING_TIMEOUT_MS,
) {
  const [timedOutAttempt, setTimedOutAttempt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loading) return;

    const timer = window.setTimeout(() => setTimedOutAttempt(attempt), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [attempt, loading, timeoutMs]);

  const resetTimeout = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { timedOut: loading && timedOutAttempt === attempt, resetTimeout };
}
