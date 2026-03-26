// components/PWAInstallBanner.tsx - GameFi Hub
// Wrapper for BasePWABanner with GameFi config
"use client";

import BasePWABanner, { initInstallPrompt } from "../../../components/pwa/BasePWABanner";
import { useEffect } from "react";

export { initInstallPrompt };

export default function PWAInstallBanner() {
    useEffect(() => {
        initInstallPrompt();
    }, []);

    return <BasePWABanner appId="gamefi" />;
}
