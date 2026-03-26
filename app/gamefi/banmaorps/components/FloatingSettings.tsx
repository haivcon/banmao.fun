// components/FloatingSettings.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useId } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  IconBell,
  IconDisplay,
  IconPalette,
  IconGlobe,
  IconHistory,
  IconHourglass,
  IconLink,
  IconTelegram,
  IconVibrate,
  IconX,
} from "./Icons";
import { langs } from "../lib/i18n";
import { THEME_OPTIONS, ThemeKey } from "../lib/themes";

type LangKey = keyof typeof langs;

export type UiScale = "xsmall" | "small" | "normal" | "large" | "desktop";

export type HistoryLookupResult = {
  id: number;
  creator: string;
  creatorFull: string;
  opponent: string;
  opponentFull: string;
  stakeFormatted: string;
  stateLabel: string;
  resultSummary: string;
  note?: string;
  hasOpponent: boolean;
};

export type HistoryLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: HistoryLookupResult };

type Props = {
  lang: LangKey;
  onLangChange: (lang: LangKey) => void;
  notificationsEnabled: boolean;
  onNotificationsToggle: (value: boolean) => void;
  vibrationMs: number;
  onVibrationChange: (value: number) => void;
  snoozeMinutes: number;
  onSnoozeChange: (value: number) => void;
  uiScale: UiScale;
  onUiScaleChange: (value: UiScale) => void;
  theme: ThemeKey;
  onThemeChange: (value: ThemeKey) => void;
  telegramHandle: string;
  xHandle: string;
  onInteract?: () => void;
  onScreenshot?: () => void | Promise<void>;
  onReset?: () => void;
  historyLookupId: string;
  onHistoryLookupIdChange: (value: string) => void;
  historyLookupState: HistoryLookupState;
  onHistoryLookup: () => void;
  onCopyAddress?: (address: string) => void | Promise<void>;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const CLICK_THRESHOLD = 5;
const UI_SCALE_ORDER: UiScale[] = ["xsmall", "small", "normal", "large", "desktop"];
const EDGE_PADDING = 16;
const UI_SCALE_FACTORS: Record<UiScale, number> = {
  xsmall: 0.8,
  small: 0.9,
  normal: 1,
  large: 1.1,
  desktop: 0.7,
};

const getScaleFactor = (scale: UiScale) => UI_SCALE_FACTORS[scale] ?? 1;

const DEFAULT_THEME_LABELS: Record<ThemeKey, string> = {
  gold: "Original Gold",
  white: "Luminous White",
  crimson: "Crimson Blaze",
  emerald: "Emerald Surge",
  pink: "Blossom Pink",
  orange: "Sunset Orange",
  purple: "Royal Purple",
  cyber: "Cyber Space",
};

export default function FloatingSettings({
  lang,
  onLangChange,
  notificationsEnabled,
  onNotificationsToggle,
  vibrationMs,
  onVibrationChange,
  snoozeMinutes,
  onSnoozeChange,
  uiScale,
  onUiScaleChange,
  theme,
  onThemeChange,
  telegramHandle,
  xHandle,
  onInteract,
  onScreenshot,
  onReset,
  historyLookupId,
  onHistoryLookupIdChange,
  historyLookupState,
  onHistoryLookup,
  onCopyAddress,
}: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [themeOpen, setThemeOpen] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const hasPlacedInitialPosition = useRef(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const themeListId = useId();
  const t = useMemo(() => langs[lang] ?? langs.en, [lang]);
  const uiScaleLabels =
    t.displaySizeOptions ??
    ({
      xsmall: "Mini",
      small: "Small",
      normal: "Default",
      large: "Large",
      desktop: "Desktop site",
    } as Record<UiScale, string>);
  const themeNames = useMemo(
    () => ({ ...DEFAULT_THEME_LABELS, ...(t.themeOptions as Record<ThemeKey, string> | undefined) }),
    [t.themeOptions]
  );
  const currentThemeLabel = themeNames[theme] ?? DEFAULT_THEME_LABELS[theme] ?? DEFAULT_THEME_LABELS.gold;
  const cycleUiScale = useCallback(() => {
    const currentIndex = UI_SCALE_ORDER.indexOf(uiScale);
    const nextValue = UI_SCALE_ORDER[(currentIndex + 1) % UI_SCALE_ORDER.length];
    onInteract?.();
    onUiScaleChange(nextValue);
  }, [uiScale, onInteract, onUiScaleChange]);
  const toggleThemeSection = useCallback(() => {
    setThemeOpen((prev) => !prev);
    onInteract?.();
  }, [onInteract]);
  const handleThemeSelect = useCallback(
    (value: ThemeKey) => {
      onInteract?.();
      onThemeChange(value);
      setThemeOpen(false);
    },
    [onInteract, onThemeChange]
  );

  const ensureWithinViewport = useCallback(() => {
    if (typeof window === "undefined") return;
    const element = panelRef.current;
    const rect = element?.getBoundingClientRect();
    // Use actual rendered dimensions instead of CSS dimensions divided by scale
    const width = rect?.width ?? 112;
    const height = rect?.height ?? 112;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minX = EDGE_PADDING;
    const minY = EDGE_PADDING;
    const maxX = Math.max(minX, viewportWidth - EDGE_PADDING - width);
    const maxY = Math.max(minY, viewportHeight - EDGE_PADDING - height);

    setPosition((prev) => {
      const nextX = clamp(prev.x, minX, maxX);
      const nextY = clamp(prev.y, minY, maxY);
      if (nextX === prev.x && nextY === prev.y) {
        return prev;
      }
      return { x: nextX, y: nextY };
    });
  }, []);

  const placeInCorner = useCallback(() => {
    if (typeof window === "undefined") return;
    const element = panelRef.current;
    const rect = element?.getBoundingClientRect();
    const width = rect?.width ?? 112;
    const height = rect?.height ?? 112;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxX = Math.max(EDGE_PADDING, viewportWidth - EDGE_PADDING - width);
    const maxY = Math.max(EDGE_PADDING, viewportHeight - EDGE_PADDING - height);

    setPosition({
      x: maxX,
      y: maxY,
    });
  }, []);

  useEffect(() => {
    if (hasPlacedInitialPosition.current) return;
    placeInCorner();
    hasPlacedInitialPosition.current = true;
  }, [placeInCorner]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      ensureWithinViewport();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [ensureWithinViewport]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startDrag = (event: ReactPointerEvent) => {
    if (typeof window === "undefined") return;
    // Use raw pointer coordinates - no scale division needed
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    dragging.current = true;
    startPosRef.current = { x: event.clientX, y: event.clientY };
    dragOffset.current = {
      x: pointerX - position.x,
      y: pointerY - position.y,
    };
    longPressTriggered.current = false;
    cancelLongPress();
    if (onScreenshot) {
      longPressTimer.current = window.setTimeout(async () => {
        longPressTriggered.current = true;
        cancelLongPress();
        try {
          await onScreenshot();
        } catch (err) {
          console.error(err);
        }
      }, 650);
    }
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", stopDrag, { once: true });
  };

  const onDrag = (event: PointerEvent) => {
    if (!dragging.current || typeof window === "undefined") return;
    const dx = event.clientX - startPosRef.current.x;
    const dy = event.clientY - startPosRef.current.y;
    const movedDistance = Math.sqrt(dx * dx + dy * dy);
    if (movedDistance > CLICK_THRESHOLD) cancelLongPress();
    const rect = panelRef.current?.getBoundingClientRect();
    // Use raw pointer coordinates and actual rendered dimensions
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    const width = rect?.width ?? 112;
    const height = rect?.height ?? 112;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minX = EDGE_PADDING;
    const minY = EDGE_PADDING;
    const maxX = Math.max(minX, viewportWidth - EDGE_PADDING - width);
    const maxY = Math.max(minY, viewportHeight - EDGE_PADDING - height);
    setPosition({
      x: clamp(pointerX - dragOffset.current.x, minX, maxX),
      y: clamp(pointerY - dragOffset.current.y, minY, maxY),
    });
  };

  const stopDrag = (event: PointerEvent) => {
    cancelLongPress();
    const endPos = { x: event.clientX, y: event.clientY };
    const startPos = startPosRef.current;
    const movedDistance = Math.sqrt(
      Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
    );

    if (!longPressTriggered.current && movedDistance < CLICK_THRESHOLD) {
      setOpen((prev) => !prev);
      onInteract?.();
    }

    longPressTriggered.current = false;
    dragging.current = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", onDrag);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pointermove", onDrag);
      }
      cancelLongPress();
    };
  }, [cancelLongPress]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      ensureWithinViewport();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, ensureWithinViewport]);

  useEffect(() => {
    if (!open) setThemeOpen(false);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      ensureWithinViewport();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [uiScale, ensureWithinViewport]);

  return (
    <div
      ref={panelRef}
      className={`floating-settings ${open ? "open" : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      <button
        className="floating-settings__toggle"
        onPointerDown={startDrag}
        aria-label="Settings"
        style={{ touchAction: "none" }}
      >
        <Image
          src="/branding/animated-icon.gif"
          alt="Settings"
          width={99}
          height={99}
          unoptimized
        />
      </button>

      {open && (
        <div className="floating-settings__panel">
          <h4>{t.settingsTitle}</h4>

          <label className="floating-settings__row floating-settings__row--toggle">
            <span className="floating-settings__row-label">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconBell />
              </span>
              <span>{t.notificationToggle}</span>
            </span>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => {
                onNotificationsToggle(e.target.checked);
              }}
            />
          </label>

          <label className="floating-settings__row">
            <span className="floating-settings__row-label">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconVibrate />
              </span>
              <span>{t.vibrationLabel}</span>
            </span>
            <div className="floating-settings__vibration">
              <input
                type="range"
                min={0}
                max={1000}
                step={10}
                value={vibrationMs}
                onChange={(e) => {
                  onVibrationChange(Number(e.target.value));
                }}
              />
              <span className="floating-settings__value">{vibrationMs} ms</span>
            </div>
          </label>

          <label className="floating-settings__row">
            <span className="floating-settings__row-label">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconHourglass />
              </span>
              <span>{t.notificationSnoozeLabel}</span>
            </span>
            <div className="floating-settings__vibration">
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={snoozeMinutes}
                onChange={(e) => {
                  onInteract?.();
                  onSnoozeChange(Number(e.target.value));
                }}
                onPointerDown={() => onInteract?.()}
              />
              <span className="floating-settings__value">
                {t.notificationSnoozeValue(snoozeMinutes)}
              </span>
            </div>
          </label>

          <div className="floating-settings__row floating-settings__row--language">
            <span className="floating-settings__row-label">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconGlobe />
              </span>
              <span>{t.languageLabel}</span>
            </span>
            <LanguageSwitcher onChange={onLangChange} value={lang} onInteract={onInteract} />
          </div>

          <div className="floating-settings__row floating-settings__row--button">
            <span className="floating-settings__row-label">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconDisplay />
              </span>
              <span>{t.displaySizeLabel}</span>
            </span>
            <button type="button" onClick={cycleUiScale}>
              {t.displaySizeButton
                ? t.displaySizeButton(uiScaleLabels[uiScale])
                : `${t.displaySizeLabel}: ${uiScaleLabels[uiScale]}`}
            </button>
          </div>

          <div className="floating-settings__row floating-settings__row--theme">
            <button
              type="button"
              className={`floating-settings__theme-toggle ${themeOpen ? "open" : ""}`}
              onClick={toggleThemeSection}
              aria-expanded={themeOpen}
              aria-controls={themeListId}
            >
              <span className="floating-settings__row-label">
                <span className="floating-settings__icon" aria-hidden="true">
                  <IconPalette />
                </span>
                <span>{t.themeLabel ?? "Theme"}</span>
              </span>
              <span className="floating-settings__theme-current">{currentThemeLabel}</span>
              <span className="floating-settings__theme-toggle-arrow" aria-hidden="true">
                ▾
              </span>
            </button>

            {themeOpen && (
              <div className="floating-settings__theme-options" id={themeListId}>
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="floating-settings__theme-option"
                    onClick={() => handleThemeSelect(option.key)}
                    data-active={option.key === theme ? "true" : undefined}
                  >
                    <span className="floating-settings__theme-option-icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="floating-settings__theme-option-label">
                      {themeNames[option.key] ?? option.key}
                    </span>
                    <span
                      className="floating-settings__theme-swatch"
                      aria-hidden="true"
                      style={{
                        backgroundImage: `linear-gradient(120deg, ${option.preview[0]}, ${option.preview[1]})`,
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="floating-settings__links">
            <span className="floating-settings__section-title">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconLink />
              </span>
              <span>{t.socialTitle}</span>
            </span>
            <a
              href={`https://t.me/${telegramHandle}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => onInteract?.()}
            >
              <span className="floating-settings__link-icon" aria-hidden="true">
                <IconTelegram />
              </span>
              <span>{t.telegram}</span>
            </a>
            <a
              href={`https://x.com/${xHandle}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => onInteract?.()}
            >
              <span className="floating-settings__link-icon" aria-hidden="true">
                <IconX />
              </span>
              <span>{t.x}</span>
            </a>
          </div>

          <div className="floating-settings__history">
            <span className="floating-settings__section-title floating-settings__history-title">
              <span className="floating-settings__icon" aria-hidden="true">
                <IconHistory />
              </span>
              <span>{t.historyLookupTitle}</span>
            </span>
            <div className="floating-settings__history-input">
              <input
                value={historyLookupId}
                onChange={(e) => {
                  onHistoryLookupIdChange(e.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onHistoryLookup();
                  }
                }}
                placeholder={t.historyLookupPlaceholder}
              />
              <button
                type="button"
                onClick={() => onHistoryLookup()}
                disabled={historyLookupId.trim().length === 0 || historyLookupState.status === "loading"}
              >
                {historyLookupState.status === "loading" ? t.historyLookupLoading : t.historyLookupButton}
              </button>
            </div>
            {historyLookupState.status === "idle" && (
              <p className="floating-settings__history-status">{t.historyLookupEmpty}</p>
            )}
            {historyLookupState.status === "error" && (
              <p className="floating-settings__history-status floating-settings__history-status--error">
                {historyLookupState.message}
              </p>
            )}
            {historyLookupState.status === "success" && (
              <div className="floating-settings__history-card">
                <div className="floating-settings__history-field">
                  <span>{t.historyLookupCreatorLabel}</span>
                  <div className="floating-settings__history-address" title={historyLookupState.data.creatorFull}>
                    <span>{historyLookupState.data.creator}</span>
                    <button
                      type="button"
                      className="floating-settings__copy-btn"
                      onClick={() => historyLookupState.data.creatorFull && onCopyAddress?.(historyLookupState.data.creatorFull)}
                    >
                      {t.historyLookupCopy}
                    </button>
                  </div>
                </div>
                <div className="floating-settings__history-field">
                  <span>{t.historyLookupOpponentLabel}</span>
                  {historyLookupState.data.hasOpponent ? (
                    <div className="floating-settings__history-address" title={historyLookupState.data.opponentFull}>
                      <span>{historyLookupState.data.opponent}</span>
                      <button
                        type="button"
                        className="floating-settings__copy-btn"
                        onClick={() => historyLookupState.data.opponentFull && onCopyAddress?.(historyLookupState.data.opponentFull)}
                      >
                        {t.historyLookupCopy}
                      </button>
                    </div>
                  ) : (
                    <span className="floating-settings__history-muted">{historyLookupState.data.opponent}</span>
                  )}
                </div>
                <div className="floating-settings__history-field">
                  <span>{t.historyLookupStakeLabel}</span>
                  <span>{historyLookupState.data.stakeFormatted}</span>
                </div>
                <div className="floating-settings__history-field">
                  <span>{t.historyLookupStateLabel}</span>
                  <span>{historyLookupState.data.stateLabel}</span>
                </div>
                <div className="floating-settings__history-field">
                  <span>{t.historyLookupResultLabel}</span>
                  <span className="floating-settings__history-result">{historyLookupState.data.resultSummary}</span>
                </div>
                {historyLookupState.data.note && (
                  <p className="floating-settings__history-note">{historyLookupState.data.note}</p>
                )}
              </div>
            )}
          </div>

          {onReset && (
            <button
              type="button"
              className="floating-settings__reset"
              onClick={() => {
                onInteract?.();
                onReset?.();
              }}
            >
              🧹 {t.resetSiteData}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
