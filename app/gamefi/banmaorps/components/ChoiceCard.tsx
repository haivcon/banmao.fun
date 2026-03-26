"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { AnimationEvent as ReactAnimationEvent } from "react";

export default function ChoiceCard({
  label,
  src,
  selected,
  onClick,
}: {
  label: string;
  src: string;
  selected: boolean;
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  
  const triggerAnimation = useCallback(() => {
    const node = cardRef.current;
    if (!node) return;
    node.classList.remove("rps-card--animate");
    // Force reflow so animation restarts even on rapid taps
    void node.offsetWidth;
    node.classList.add("rps-card--animate");
  }, []);

  const wasSelectedRef = useRef<boolean>(selected);

  useEffect(() => {
    if (selected && !wasSelectedRef.current) {
      triggerAnimation();
    }
    if (!selected) {
      const node = cardRef.current;
      if (node) {
        node.classList.remove("rps-card--animate");
      }
    }
    wasSelectedRef.current = selected;
  }, [selected, triggerAnimation]);

  const handleClick = useCallback(() => {
    triggerAnimation();
    onClick();
  }, [onClick, triggerAnimation]);

  const handleAnimationEnd = useCallback((event: ReactAnimationEvent<HTMLDivElement>) => {
    if (event.animationName === "rpsShake") {
      const node = cardRef.current;
      if (node) {
        node.classList.remove("rps-card--animate");
      }
    }
  }, []);

  return (
    <div className="rps-item" onClick={handleClick} role="button" aria-pressed={selected}>
      <div
        ref={cardRef}
        className={`rps-card${selected ? " active" : ""}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="rps-card__inner">
          <div className="rps-card__face rps-card__face--front">
            <Image
              src={src}
              alt={label}
              width={180}
              height={240}
              priority
              className="rps-card__image"
            />
          </div>
          <div className="rps-card__face rps-card__face--back" aria-hidden="true">
            <Image
              src={src}
              alt=""
              width={180}
              height={240}
              priority
              className="rps-card__image rps-card__image--back"
            />
          </div>
        </div>
      </div>
      {/* ⬇️ Caption nằm DƯỚI ảnh (không overlay) */}
      <div className={`rps-caption ${selected ? "active" : ""}`}>{label}</div>
    </div>
  );
}
