"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COLLECTION_DISPLAY_EVENT,
  COLLECTION_DISPLAY_STORAGE_KEY,
  DEFAULT_COLLECTION_DISPLAY_SETTINGS,
  normalizeCollectionDisplaySettings,
  parseCollectionDisplaySettings,
  type CollectionDisplaySettings,
} from "./collectionDisplaySettings";

function readSettings(): CollectionDisplaySettings {
  if (typeof window === "undefined") return { ...DEFAULT_COLLECTION_DISPLAY_SETTINGS };
  try { return parseCollectionDisplaySettings(window.localStorage.getItem(COLLECTION_DISPLAY_STORAGE_KEY)); }
  catch { return { ...DEFAULT_COLLECTION_DISPLAY_SETTINGS }; }
}

export function useCollectionDisplaySettings() {
  const [settings, setSettingsState] = useState<CollectionDisplaySettings>(DEFAULT_COLLECTION_DISPLAY_SETTINGS);

  useEffect(() => {
    const sync = () => setSettingsState(readSettings());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(COLLECTION_DISPLAY_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(COLLECTION_DISPLAY_EVENT, sync);
    };
  }, []);

  const setSettings = useCallback((next: CollectionDisplaySettings | ((current: CollectionDisplaySettings) => CollectionDisplaySettings)) => {
    setSettingsState(current => {
      const normalized = normalizeCollectionDisplaySettings(typeof next === "function" ? next(current) : next);
      try { window.localStorage.setItem(COLLECTION_DISPLAY_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* Browser-local persistence is optional. */ }
      window.queueMicrotask(() => window.dispatchEvent(new CustomEvent(COLLECTION_DISPLAY_EVENT)));
      return normalized;
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof CollectionDisplaySettings>(key: K, value: CollectionDisplaySettings[K]) => {
    setSettings(current => ({ ...current, [key]: value }));
  }, [setSettings]);

  const resetSettings = useCallback(() => setSettings({ ...DEFAULT_COLLECTION_DISPLAY_SETTINGS }), [setSettings]);
  return { settings, updateSetting, resetSettings };
}
