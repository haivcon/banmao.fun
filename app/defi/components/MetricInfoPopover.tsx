"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type MetricInfoPopoverProps = {
  label: string;
  description: string;
};

export function MetricInfoPopover({
  label,
  description,
}: MetricInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span ref={rootRef} className="defi-metric-info">
      <button
        type="button"
        className="defi-info-button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      <span
        id={popoverId}
        className="defi-metric-info__popover"
        role="tooltip"
        hidden={!isOpen}
      >
        {description}
      </span>
    </span>
  );
}