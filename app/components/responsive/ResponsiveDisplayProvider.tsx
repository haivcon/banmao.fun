"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  DISPLAY_SCALE_EVENT,
  DISPLAY_SCALE_STORAGE_KEY,
  displayProfileCssVariables,
  parseDisplayScale,
  resolveDisplayDensity,
  resolveDisplayProfile,
} from "../../../lib/responsive/displayStandard";

function activeViewportWidth(): number {
  if (typeof window === "undefined") return 1024;
  return Math.round(window.visualViewport?.width ?? document.documentElement.clientWidth ?? window.innerWidth);
}

/** Applies the registered route profile without wrapping or scaling application content. */
export default function ResponsiveDisplayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const profile = resolveDisplayProfile(pathname);
    const variables = displayProfileCssVariables(profile);
    delete variables["--bm-display-scale"];

    root.dataset.bmApp = profile.id;
    root.dataset.bmAppGroup = profile.group;
    body.dataset.bmApp = profile.id;
    body.dataset.bmAppGroup = profile.group;
    Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));

    const syncDensity = () => {
      const width = activeViewportWidth();
      const density = resolveDisplayDensity(width);
      root.dataset.bmDensity = density;
      body.dataset.bmDensity = density;
      root.style.setProperty("--bm-viewport-width", `${width}px`);
    };

    syncDensity();
    window.addEventListener("resize", syncDensity, { passive: true });
    window.visualViewport?.addEventListener("resize", syncDensity, { passive: true });

    return () => {
      window.removeEventListener("resize", syncDensity);
      window.visualViewport?.removeEventListener("resize", syncDensity);
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const syncScale = () => {
      let serialized: string | null = null;
      try { serialized = window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY); }
      catch { /* Keep the safe default when storage is unavailable. */ }
      const scale = parseDisplayScale(serialized);
      root.style.setProperty("--bm-display-scale", String(scale));
      root.dataset.bmDisplayScale = String(scale);
    };

    syncScale();
    window.addEventListener("storage", syncScale);
    window.addEventListener(DISPLAY_SCALE_EVENT, syncScale);
    return () => {
      window.removeEventListener("storage", syncScale);
      window.removeEventListener(DISPLAY_SCALE_EVENT, syncScale);
    };
  }, []);

  return children;
}
