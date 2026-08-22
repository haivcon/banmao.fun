"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DISPLAY_SCALE_EVENT,
  DISPLAY_SCALE_LIMITS,
  DISPLAY_SCALE_STORAGE_KEY,
  clampDisplayScale,
  parseDisplayScale,
} from "../../../lib/responsive/displayStandard";

function readScale(): number {
  if (typeof window === "undefined") return DISPLAY_SCALE_LIMITS.default;
  try { return parseDisplayScale(window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY)); }
  catch { return DISPLAY_SCALE_LIMITS.default; }
}

export function useSiteDisplaySettings() {
  const [scale, setScaleState] = useState<number>(DISPLAY_SCALE_LIMITS.default);

  useEffect(() => {
    const sync = () => setScaleState(readScale());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(DISPLAY_SCALE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(DISPLAY_SCALE_EVENT, sync);
    };
  }, []);

  const setScale = useCallback((next: number) => {
    const normalized = clampDisplayScale(next);
    setScaleState(normalized);
    try { window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, String(normalized)); }
    catch { /* Browser-local persistence is optional. */ }
    window.dispatchEvent(new CustomEvent(DISPLAY_SCALE_EVENT, { detail: { scale: normalized } }));
  }, []);

  const resetScale = useCallback(() => setScale(DISPLAY_SCALE_LIMITS.default), [setScale]);
  return { scale, setScale, resetScale };
}
