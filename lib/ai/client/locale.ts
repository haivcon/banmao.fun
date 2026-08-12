import { normalizeAILocale, type AILocale } from "./i18n";

export const AI_LANGUAGE_STORAGE_KEY = "banmao_language";
export const AI_LANGUAGE_CHANGE_EVENT = "banmao:language-change";

type EventSource = Pick<Window, "addEventListener" | "removeEventListener">;

export function readAILanguage(storage?: Pick<Storage, "getItem">, documentLanguage?: string, browserLanguage?: string): AILocale {
  let stored: string | null = null;
  try { stored = storage?.getItem(AI_LANGUAGE_STORAGE_KEY) || null; } catch { /* Storage can be unavailable in private mode. */ }
  return normalizeAILocale(stored || documentLanguage || browserLanguage);
}

export function createAILanguageSubscriber(input: {
  events: EventSource;
  read: () => string | null | undefined;
  onChange: (locale: AILocale) => void;
}) {
  let current: AILocale | undefined;
  const publish = (candidate?: unknown) => {
    const locale = normalizeAILocale(typeof candidate === "string" ? candidate : input.read() || undefined);
    if (locale !== current) { current = locale; input.onChange(locale); }
  };
  const onLanguageChange = (event: Event) => publish((event as CustomEvent<unknown>).detail);
  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key;
    if (key === null || key === AI_LANGUAGE_STORAGE_KEY) publish();
  };
  publish();
  input.events.addEventListener(AI_LANGUAGE_CHANGE_EVENT, onLanguageChange as EventListener);
  input.events.addEventListener("storage", onStorage as EventListener);
  return () => {
    input.events.removeEventListener(AI_LANGUAGE_CHANGE_EVENT, onLanguageChange as EventListener);
    input.events.removeEventListener("storage", onStorage as EventListener);
  };
}
