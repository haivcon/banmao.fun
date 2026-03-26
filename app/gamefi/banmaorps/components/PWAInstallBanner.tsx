// components/PWAInstallBanner.tsx - BANMAO RPS
// Wrapper for BasePWABanner with RPS config
"use client";

import BasePWABanner, { initInstallPrompt } from "../../../../components/pwa/BasePWABanner";
import { useEffect } from "react";

export { initInstallPrompt };

export default function PWAInstallBanner() {
    useEffect(() => {
        initInstallPrompt();
    }, []);

    return <BasePWABanner appId="rps" />;
}
