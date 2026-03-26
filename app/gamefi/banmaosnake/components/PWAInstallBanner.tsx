// components/PWAInstallBanner.tsx - Banmao Snake
// Wrapper for BasePWABanner with Snake config
"use client";

import BasePWABanner, { initInstallPrompt } from "../../../../components/pwa/BasePWABanner";
import { useEffect } from "react";

export { initInstallPrompt };

interface PWABannerProps {
    lang?: string;
}

export default function PWAInstallBanner({ lang }: PWABannerProps) {
    useEffect(() => {
        initInstallPrompt();
    }, []);

    return <BasePWABanner appId="snake" lang={lang} showDelay={1000} />;
}
