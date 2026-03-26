// components/PWAInstallBanner.tsx - BANMAO SLOTS
// Wrapper for BasePWABanner with Slots config
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

    return <BasePWABanner appId="slots" lang={lang} showDelay={1000} />;
}
