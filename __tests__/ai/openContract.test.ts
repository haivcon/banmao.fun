import { requestAIChatOpen, subscribeAIChatOpen } from "../../lib/ai/client/openContract";

class TestEvents {
  private listeners = new Set<(event: Event) => void>();
  addEventListener(_type: string, listener: EventListener) { this.listeners.add(listener); }
  removeEventListener(_type: string, listener: EventListener) { this.listeners.delete(listener); }
  dispatchEvent(event: Event) { this.listeners.forEach((listener) => listener(event)); return true; }
}

test("replays a Collection AI-open request made before the lazy provider subscribes", () => {
  const events = new TestEvents();
  const gallery = { loaded: 96, page: 2, sort: "random", search: "" };
  const before = { ...gallery };

  requestAIChatOpen(events, { input: "Search collection: " });
  const opened: string[] = [];
  const unsubscribe = subscribeAIChatOpen(events, (detail) => opened.push(detail.input || ""));

  expect(opened).toEqual(["Search collection: "]);
  expect(gallery).toEqual(before);
  unsubscribe();
});

test("delivers mounted-provider requests once without leaving a stale replay", () => {
  const events = new TestEvents();
  const opened: string[] = [];
  const unsubscribe = subscribeAIChatOpen(events, (detail) => opened.push(detail.input || ""));

  requestAIChatOpen(events, { input: "Tìm trong bộ sưu tập: " });
  unsubscribe();
  const unsubscribeAgain = subscribeAIChatOpen(events, (detail) => opened.push(detail.input || ""));

  expect(opened).toEqual(["Tìm trong bộ sưu tập: "]);
  unsubscribeAgain();
});
