// components/PWAInstallBanner.tsx - Main Website ($BANMAO)
// Backward-compatible wrapper for BasePWABanner
"use client";

import BasePWABanner, { initInstallPrompt } from "./pwa/BasePWABanner";
import { useEffect } from "react";

export { initInstallPrompt };

export default function PWAInstallBanner() {
    useEffect(() => {
        initInstallPrompt();
    }, []);

    return <BasePWABanner appId="main" />;
}
