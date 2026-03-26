// components/SplashScreen.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface SplashScreenProps {
    /** Minimum display time in ms */
    minDisplayTime?: number;
    /** Callback when splash is dismissed */
    onComplete?: () => void;
}

export default function SplashScreen({
    minDisplayTime = 2000,
    onComplete,
}: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Check if this is a PWA launch (standalone mode)
        const isStandalone =
            typeof window !== "undefined" &&
            (window.matchMedia("(display-mode: standalone)").matches ||
                (navigator as any).standalone === true);

        // Only show splash for PWA launches, skip for browser
        if (!isStandalone) {
            setIsVisible(false);
            onComplete?.();
            return;
        }

        // Check if splash was already shown this session
        const splashShown = sessionStorage.getItem("banmao_splash_shown");
        if (splashShown) {
            setIsVisible(false);
            onComplete?.();
            return;
        }

        // Show splash for minimum time
        const timer = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                setIsVisible(false);
                sessionStorage.setItem("banmao_splash_shown", "1");
                onComplete?.();
            }, 500); // Fade out duration
        }, minDisplayTime);

        return () => clearTimeout(timer);
    }, [minDisplayTime, onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className={`splash-screen ${isFading ? "splash-screen--fading" : ""}`}
            role="presentation"
            aria-hidden="true"
        >
            <div className="splash-screen__content">
                <div className="splash-screen__icon">
                    <Image
                        src="/branding/animated-icon.gif"
                        alt="BANMAO"
                        width={200}
                        height={200}
                        priority
                        unoptimized // Required for GIF animation to work
                    />
                </div>
                <h1 className="splash-screen__title">$BANMAO 🐱🍌</h1>
                <p className="splash-screen__subtitle">Loading...</p>
            </div>
        </div>
    );
}
