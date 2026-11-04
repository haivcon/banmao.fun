// components/SplashScreen.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface SplashScreenProps {
    /** Minimum display time in ms */
    minDisplayTime?: number;
    /** Callback when splash is dismissed */
    onComplete?: () => void;
}

export default function SplashScreen({
    minDisplayTime = 2200,
    onComplete,
}: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);
    const [progress, setProgress] = useState(0);
    const startTime = useRef(Date.now());

    useEffect(() => {
        // Check if splash was already shown this session
        const splashShown = sessionStorage.getItem("banmao_splash_shown");
        if (splashShown) {
            setIsVisible(false);
            onComplete?.();
            return;
        }

        // Animate progress bar
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime.current;
            const ratio = Math.min(elapsed / minDisplayTime, 0.95);
            // Ease-out curve for smoother feel
            setProgress(Math.round(ratio * 100));
        }, 50);

        // Wait for both minimum time AND window load
        let minTimePassed = false;
        let windowLoaded = document.readyState === "complete";

        const tryDismiss = () => {
            if (minTimePassed && windowLoaded) {
                setProgress(100);
                clearInterval(progressInterval);
                setTimeout(() => {
                    setIsFading(true);
                    setTimeout(() => {
                        setIsVisible(false);
                        sessionStorage.setItem("banmao_splash_shown", "1");
                        onComplete?.();
                    }, 600);
                }, 150);
            }
        };

        const timer = setTimeout(() => {
            minTimePassed = true;
            tryDismiss();
        }, minDisplayTime);

        const onLoad = () => {
            windowLoaded = true;
            tryDismiss();
        };
        window.addEventListener("load", onLoad);

        // Fallback: if already loaded
        if (document.readyState === "complete") {
            windowLoaded = true;
        }

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
            window.removeEventListener("load", onLoad);
        };
    }, [minDisplayTime, onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className={`splash-screen ${isFading ? "splash-screen--fading" : ""}`}
            role="presentation"
            aria-hidden="true"
        >
            <div className="splash-screen__content">
                {/* Neon ring wrapper */}
                <div className="splash-screen__ring">
                    <div className="splash-screen__icon">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/branding/animated-icon.gif"
                            alt="BANMAO"
                            width={180}
                            height={180}
                        />
                    </div>
                </div>
                <h1 className="splash-screen__title">$BANMAO 🐱🍌</h1>
                <div className="splash-screen__progress">
                    <div
                        className="splash-screen__progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="splash-screen__subtitle">Loading...</p>
            </div>
        </div>
    );
}
