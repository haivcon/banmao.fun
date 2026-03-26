// components/SplashScreen.tsx
// PWA Splash Screen for BANMAO SLOTS with video intro
"use client";

import { useState, useEffect, useRef } from "react";

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const minDisplayTime = 3000;

    useEffect(() => {
        // Check if this is a PWA launch (standalone mode)
        const isStandalone =
            typeof window !== "undefined" &&
            (window.matchMedia("(display-mode: standalone)").matches ||
                (navigator as any).standalone === true);

        // Only show splash for PWA launches, skip for browser
        if (!isStandalone) {
            setIsVisible(false);
            return;
        }

        // Check if splash was already shown this session
        const splashShown = sessionStorage.getItem("banmao_slots_splash_shown");
        if (splashShown) {
            setIsVisible(false);
            return;
        }

        // Try to play video
        if (videoRef.current) {
            videoRef.current.play().catch(() => {
                // Video autoplay failed, continue anyway
            });
        }

        // Show splash for minimum time
        const timer = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                setIsVisible(false);
                sessionStorage.setItem("banmao_slots_splash_shown", "1");
            }, 500); // Fade out duration
        }, minDisplayTime);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`slots-splash-screen ${isFading ? "slots-splash-screen--fading" : ""}`}
            role="presentation"
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
                background: 'linear-gradient(180deg, #0a1520 0%, #051015 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isFading ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
            }}
        >
            <div className="slots-splash-screen__content" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
            }}>
                {/* Video Intro - Electric Blue/Cyan border */}
                <div className="slots-splash-screen__video" style={{
                    width: 280,
                    height: 280,
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: '0 0 60px rgba(0, 191, 255, 0.6), 0 0 120px rgba(0, 191, 255, 0.3), 0 0 180px rgba(0, 255, 255, 0.2)',
                    border: '3px solid rgba(0, 255, 255, 0.8)',
                    animation: 'electric-pulse 2s ease-in-out infinite',
                }}>
                    <video
                        ref={videoRef}
                        src="/games/slots/slots-preview.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </div>

                {/* Title - Electric Blue glow */}
                <h1 className="slots-splash-screen__title" style={{
                    margin: 0,
                    fontSize: 32,
                    fontWeight: 900,
                    color: '#fff',
                    textShadow: '0 0 20px rgba(0, 191, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 191, 255, 0.3)',
                    letterSpacing: 4,
                    fontFamily: "'Space Mono', monospace",
                }}>
                    BANMAO SLOTS
                </h1>

                {/* Loading indicator - Cyan dots */}
                <div className="slots-splash-screen__loader" style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 10,
                }}>
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #00ffff, #00bfff)',
                                boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
                                animation: `splash-dots 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                        />
                    ))}
                </div>

                {/* Loading text */}
                <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'rgba(0, 255, 255, 0.8)',
                    fontFamily: "'Space Mono', monospace",
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                }}>
                    Loading the reels...
                </p>
            </div>

            {/* CSS animations */}
            <style jsx>{`
                @keyframes splash-dots {
                    0%, 80%, 100% {
                        transform: scale(0.6);
                        opacity: 0.4;
                    }
                    40% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                @keyframes electric-pulse {
                    0%, 100% {
                        box-shadow: 0 0 60px rgba(0, 191, 255, 0.6), 0 0 120px rgba(0, 191, 255, 0.3), 0 0 180px rgba(0, 255, 255, 0.2);
                        border-color: rgba(0, 255, 255, 0.8);
                    }
                    50% {
                        box-shadow: 0 0 80px rgba(0, 255, 255, 0.8), 0 0 150px rgba(0, 191, 255, 0.5), 0 0 220px rgba(0, 255, 255, 0.3);
                        border-color: rgba(0, 255, 255, 1);
                    }
                }
            `}</style>
        </div>
    );
}
