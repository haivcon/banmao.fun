import {
  AI_LANGUAGE_CHANGE_EVENT,
  AI_LANGUAGE_STORAGE_KEY,
  createAILanguageSubscriber,
} from "../../lib/ai/client/locale";
import { AI_LOCALES, AI_TEXT_KEYS, aiText } from "../../lib/ai/client/i18n";

class Events {
  listeners = new Map<string, Set<(event: Event) => void>>();
  addEventListener(type: string, listener: EventListener) { const values = this.listeners.get(type) || new Set(); values.add(listener); this.listeners.set(type, values); }
  removeEventListener(type: string, listener: EventListener) { this.listeners.get(type)?.delete(listener); }
  emit(type: string, event = new Event(type)) { this.listeners.get(type)?.forEach((listener) => listener(event)); }
}

test("AI i18n has exact key parity for all six locales", () => {
  for (const locale of AI_LOCALES) for (const key of AI_TEXT_KEYS) expect(aiText(locale, key)).toBeTruthy();
});

test("language subscriber reacts immediately to custom and storage changes and cleans up", () => {
  const events = new Events();
  let stored = "en";
  const seen: string[] = [];
  const unsubscribe = createAILanguageSubscriber({
    events,
    read: () => stored,
    onChange: (locale) => seen.push(locale),
  });
  stored = "vi";
  events.emit(AI_LANGUAGE_CHANGE_EVENT, new CustomEvent(AI_LANGUAGE_CHANGE_EVENT, { detail: "vi" }));
  stored = "zh";
  events.emit("storage", { key: AI_LANGUAGE_STORAGE_KEY } as StorageEvent);
  expect(seen).toEqual(["en", "vi", "zh"]);
  unsubscribe();
  stored = "ko";
  events.emit(AI_LANGUAGE_CHANGE_EVENT);
  expect(seen).toEqual(["en", "vi", "zh"]);
});
