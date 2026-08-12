export const AI_CHAT_OPEN_EVENT = "banmao-ai-open";

export type AIChatOpenDetail = { input?: string };

type AIChatOpenEvents = Pick<EventTarget, "addEventListener" | "removeEventListener" | "dispatchEvent">;

const pendingRequests = new WeakMap<object, AIChatOpenDetail>();

function openEvent(detail: AIChatOpenDetail) {
  const event = new Event(AI_CHAT_OPEN_EVENT);
  Object.defineProperty(event, "detail", { value: detail });
  return event;
}

export function requestAIChatOpen(events: AIChatOpenEvents, detail: AIChatOpenDetail = {}) {
  pendingRequests.set(events, detail);
  events.dispatchEvent(openEvent(detail));
}

export function subscribeAIChatOpen(events: AIChatOpenEvents, onOpen: (detail: AIChatOpenDetail) => void) {
  const handleOpen = (event: Event) => {
    const detail = (event as CustomEvent<AIChatOpenDetail>).detail || {};
    pendingRequests.delete(events);
    onOpen(detail);
  };
  events.addEventListener(AI_CHAT_OPEN_EVENT, handleOpen);
  const pending = pendingRequests.get(events);
  if (pending) {
    pendingRequests.delete(events);
    onOpen(pending);
  }
  return () => events.removeEventListener(AI_CHAT_OPEN_EVENT, handleOpen);
}
