import { findPageElement, highlightPageElement, type AIPageElement } from "./pageContext";

export type AIPageAction = {
  id: string;
  elementId: string;
  kind: "navigate" | "focus" | "fill" | "activate";
  label: string;
  value?: string;
  risk: "none" | "reversible" | "transaction";
};

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function proposePageAction(message: string, elements: AIPageElement[]): AIPageAction | null {
  const query = normalize(message);
  const verbs = /\b(open|go|navigate|focus|fill|select|click|press|start|join|play|search|filter|stake|swap|claim|mo|den|toi|chon|dien|nhap|bam|tham gia|choi|tim|loc|nhan)\b/i;
  if (!verbs.test(query)) return null;
  const ranked = elements.filter((element) => element.action).map((element) => {
    const words = normalize(`${element.label} ${element.id}`).split(/[^a-z0-9]+/).filter((word) => word.length > 2);
    return { element, score: words.filter((word) => query.includes(word)).length };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
  const target = ranked[0]?.element;
  if (!target?.action) return null;
  const explicitValue = message.match(/(?:fill|enter|nhập|điền|stake|swap|search|tìm)\s+(?:for\s+)?["']?([^"']+?)["']?(?:\s+(?:in|into|vào|trong)\b|$)/i)?.[1]?.trim();
  const amount = message.match(/(?:fill|enter|nhập|điền|stake|swap)\s+([0-9]+(?:[.,][0-9]+)?)/i)?.[1]?.replace(",", ".");
  const value = target.action === "fill" ? amount || explicitValue : undefined;
  return {
    id: `page-${Date.now()}`,
    elementId: target.id,
    kind: target.action,
    label: `${target.action === "activate" ? "Activate" : target.action === "fill" ? "Fill" : target.action === "focus" ? "Focus" : "Open"}: ${target.label}`,
    ...(value ? { value: value.slice(0, 200) } : {}),
    risk: target.risk || "none",
  };
}

export function executePageAction(action: AIPageAction) {
  const element = findPageElement(action.elementId);
  if (!element) throw new Error("The page element is no longer available");
  if ((element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) && element.disabled) throw new Error("The approved page control is currently disabled");
  highlightPageElement(element);
  if (action.kind === "navigate") {
    const href = element instanceof HTMLAnchorElement ? element.href : element.dataset.banmaoAiHref;
    if (!href) throw new Error("This navigation target has no approved URL");
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error("External navigation is not allowed");
    window.location.assign(url.href);
    return;
  }
  if (action.kind === "focus") { element.focus(); return; }
  if (action.kind === "fill") {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) throw new Error("The approved target is not a form field");
    if (!action.value) throw new Error("No value was provided");
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
    setter?.call(element, action.value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.focus();
    return;
  }
  element.click();
}
