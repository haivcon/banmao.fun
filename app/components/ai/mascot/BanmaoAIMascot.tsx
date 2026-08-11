"use client";

import { useEffect, useRef, useState } from "react";
import type { BanmaoEmotion } from "../../../../lib/ai/client/emotion";
import { getMascotAsset, shouldAnimateMascot } from "./mascotAssets";

type Props = {
  emotion: BanmaoEmotion;
  reducedMotion?: boolean;
  size?: "launcher" | "header";
  onAnimationComplete?: () => void;
};

export default function BanmaoAIMascot({ emotion, reducedMotion = false, size = "header", onAnimationComplete }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const completionRef = useRef(onAnimationComplete);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const asset = getMascotAsset(emotion);

  completionRef.current = onAnimationComplete;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setSystemReducedMotion(media.matches);
    const updateVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    updateMotion();
    updateVisibility();
    media.addEventListener?.("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener?.("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    let raf = 0;
    let frame = 0;
    let lastFrameAt = performance.now();
    let completed = false;
    const animate = shouldAnimateMascot({ userReducedMotion: reducedMotion, systemReducedMotion, documentVisible });

    image.src = animate ? asset.frames[0] : asset.poster;
    const preload = new window.Image();
    preload.src = animate ? asset.frames[1] ?? asset.poster : asset.poster;

    if (!animate) return;
    const startedAt = performance.now();
    const tick = (now: number) => {
      if (now - lastFrameAt >= asset.frameDurationMs) {
        frame = (frame + 1) % asset.frames.length;
        image.src = asset.frames[frame];
        lastFrameAt = now;
        const next = new window.Image();
        next.src = asset.frames[(frame + 1) % asset.frames.length];
      }
      if (!asset.loop && now - startedAt >= asset.durationMs) {
        image.src = asset.poster;
        if (!completed) {
          completed = true;
          completionRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [asset, emotion, reducedMotion, systemReducedMotion, documentVisible]);

  return (
    <span className={`banmao-ai-mascot banmao-ai-mascot--${size}`} data-emotion={emotion}>
      {/* Static, manifest-validated sources only. Status is announced separately. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={asset.poster} width={256} height={256} alt="" aria-hidden="true" draggable={false} decoding="async" loading={asset.eager ? "eager" : "lazy"} />
    </span>
  );
}
