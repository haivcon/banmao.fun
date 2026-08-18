"use client";

import { MessageCircleMore, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { aiText } from "../../../lib/ai/client/i18n";
import type { BanmaoEmotion } from "../../../lib/ai/client/emotion";
import {
  clampFloatingPosition,
  keyboardFloatingPosition,
  normalizeFloatingPosition,
  type FloatingBounds,
  type FloatingPoint,
  type NormalizedFloatingPoint,
} from "./floatingPosition";
import BanmaoAIMascot from "./mascot/BanmaoAIMascot";

const POSITION_KEY = "banmao-ai-floating-position-v1";
const DRAG_THRESHOLD = 6;
const MOVEMENT_COPY: Record<string, { open: string; move: string; keyboard: string }> = {
  en: { open: "Open BANMAO AI", move: "Drag to move the assistant", keyboard: "Use arrow keys to move; hold Shift for larger steps" },
  vi: { open: "Mở BANMAO AI", move: "Kéo để di chuyển trợ lý", keyboard: "Dùng phím mũi tên để di chuyển; giữ Shift để đi xa hơn" },
  zh: { open: "打开 BANMAO AI", move: "拖动以移动助手", keyboard: "使用方向键移动；按住 Shift 可增大步长" },
  ko: { open: "BANMAO AI 열기", move: "드래그하여 도우미 이동", keyboard: "방향키로 이동하고 Shift를 누르면 더 크게 이동합니다" },
  ru: { open: "Открыть BANMAO AI", move: "Перетащите помощника", keyboard: "Перемещайте стрелками; Shift увеличивает шаг" },
  id: { open: "Buka BANMAO AI", move: "Seret untuk memindahkan asisten", keyboard: "Gunakan tombol panah; tahan Shift untuk langkah lebih besar" },
};

type Props = {
  open: boolean;
  emotion: BanmaoEmotion;
  mascotVisible: boolean;
  reducedMotion: boolean;
  language?: string;
  onClick: () => void;
};

function getBounds(control: HTMLElement): FloatingBounds {
  const rect = control.getBoundingClientRect();
  const styles = getComputedStyle(document.body);
  const bottomNav = Number.parseFloat(styles.getPropertyValue("--defi-bottom-nav-height")) || 0;
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    controlWidth: rect.width,
    controlHeight: rect.height,
    inset: 12,
    topReserved: 76,
    bottomReserved: Math.max(20, bottomNav + 14),
  };
}

export default function AIChatLauncher({ open, emotion, mascotVisible, reducedMotion, language, onClick }: Props) {
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
  const movement = MOVEMENT_COPY[language || "en"] || MOVEMENT_COPY.en;
  const launcherRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef<FloatingPoint>({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: FloatingPoint; moved: boolean } | undefined>(undefined);
  const suppressClickRef = useRef(false);
  const [position, setPosition] = useState<FloatingPoint>();
  const [dragging, setDragging] = useState(false);

  const applyPosition = (next: FloatingPoint, persist = false) => {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const bounds = getBounds(launcher);
    const safe = clampFloatingPosition(next, bounds);
    positionRef.current = safe;
    setPosition(safe);
    if (persist) {
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(normalizeFloatingPosition(safe, bounds))); } catch { /* Position persistence is optional. */ }
    }
  };

  useEffect(() => {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const restore = () => {
      const bounds = getBounds(launcher);
      let saved: NormalizedFloatingPoint | undefined;
      try {
        const parsed = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
        if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) saved = parsed;
      } catch { /* Invalid storage falls back to the lower-right safe position. */ }
      const initial = saved
        ? clampFloatingPosition(saved, bounds, true)
        : clampFloatingPosition({ x: window.innerWidth, y: window.innerHeight }, bounds);
      positionRef.current = initial;
      setPosition(initial);
    };
    restore();
    const onResize = () => {
      const bounds = getBounds(launcher);
      let saved: NormalizedFloatingPoint | undefined;
      try { saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null") || undefined; } catch { /* Clamp the current point below. */ }
      const next = saved ? clampFloatingPosition(saved, bounds, true) : clampFloatingPosition(positionRef.current, bounds);
      positionRef.current = next;
      setPosition(next);
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: positionRef.current, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragging(true);
    applyPosition({ x: drag.origin.x + dx, y: drag.origin.y + dy });
  };
  const finishPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      suppressClickRef.current = true;
      applyPosition(positionRef.current, true);
    }
    dragRef.current = undefined;
    setDragging(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const launcher = launcherRef.current;
    if (!launcher) return;
    const next = keyboardFloatingPosition(positionRef.current, event.key, getBounds(launcher), event.shiftKey);
    applyPosition(next, true);
  };

  const rootStyle = position ? ({
    position: "fixed",
    left: position.x,
    top: position.y,
    right: "auto",
    bottom: "auto",
  } as CSSProperties) : undefined;

  return <>
    <span id="banmao-ai-drag-help" className="banmao-ai-sr-only">
      {movement.move}. {movement.keyboard}.
    </span>
    <button
      ref={launcherRef}
      type="button"
      className={`banmao-ai-launcher${open ? " is-open" : ""}${dragging ? " is-dragging" : ""}`}
      style={rootStyle}
      aria-expanded={open}
      aria-controls="banmao-ai-panel"
      aria-describedby="banmao-ai-drag-help"
      aria-label={open ? t("close") : movement.open}
      onClick={() => {
        if (suppressClickRef.current) { suppressClickRef.current = false; return; }
        onClick();
      }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <span className="banmao-ai-launcher-glow" aria-hidden="true" />
      {mascotVisible ? <span className="banmao-ai-orb"><BanmaoAIMascot emotion={emotion} reducedMotion={reducedMotion} size="launcher" /><i aria-hidden="true" /></span> : <span className="banmao-ai-launcher-icon"><MessageCircleMore size={22} /></span>}
      <span className="banmao-ai-launcher-copy"><span><strong>BANMAO AI</strong><Sparkles size={12} aria-hidden="true" /></span><small>{open ? t("copilot") : `${t("online")} · ${t("ask").replace(/…$/, "")}`}</small></span>
    </button>
  </>;
}
