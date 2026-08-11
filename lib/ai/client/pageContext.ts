export type AIPageElement = {
  id: string;
  type: "button" | "link" | "input" | "status" | "section";
  label: string;
  state?: string;
  action?: "navigate" | "focus" | "fill" | "activate";
  risk?: "none" | "reversible" | "transaction";
};

const SELECTOR = "[data-banmao-ai-id]";
const text = (element: Element) =>
  (element.getAttribute("data-banmao-ai-label") || element.getAttribute("aria-label") || element.textContent || "")
    .replace(/\s+/g, " ").trim().slice(0, 160);

export function collectPageElements(root: ParentNode = document): AIPageElement[] {
  if (typeof document === "undefined") return [];
  return Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter((element) => {
    const style = window.getComputedStyle(element);
    return !element.hidden && style.display !== "none" && style.visibility !== "hidden";
  }).slice(0, 40).map((element) => ({
    id: element.dataset.banmaoAiId!,
    type: (element.dataset.banmaoAiType || (element.tagName === "A" ? "link" : element.tagName === "BUTTON" ? "button" : element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" ? "input" : "section")) as AIPageElement["type"],
    label: text(element),
    ...(element.dataset.banmaoAiState ? { state: element.dataset.banmaoAiState.slice(0, 160) } : {}),
    ...(element.dataset.banmaoAiAction ? { action: element.dataset.banmaoAiAction as AIPageElement["action"] } : {}),
    risk: (element.dataset.banmaoAiRisk || "none") as AIPageElement["risk"],
  })).filter((element) => element.id && element.label);
}

export function findPageElement(id: string): HTMLElement | null {
  if (typeof document === "undefined" || !/^[a-zA-Z0-9._:-]{1,80}$/.test(id)) return null;
  return document.querySelector<HTMLElement>(`[data-banmao-ai-id="${CSS.escape(id)}"]`);
}

export function highlightPageElement(element: HTMLElement) {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("banmao-ai-target-highlight");
  window.setTimeout(() => element.classList.remove("banmao-ai-target-highlight"), 2200);
}
