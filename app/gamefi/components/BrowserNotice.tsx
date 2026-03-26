"use client";

import React, { useState, useEffect } from "react";
import type { LandingTranslations } from "../../web3d/locals";

interface BrowserNoticeProps {
    t: (key: keyof LandingTranslations) => string;
}

// Chrome download links
const CHROME_LINKS = {
    pc: "https://www.google.com/chrome/",
    android: "https://play.google.com/store/apps/details?id=com.android.chrome",
    ios: "https://apps.apple.com/app/google-chrome/id535886823",
};

export function BrowserNotice({ t }: BrowserNoticeProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isChrome, setIsChrome] = useState(false);

    useEffect(() => {
        // Check if user has dismissed the notice in the last 24 hours
        const dismissedAt = localStorage.getItem("banmao_browser_notice_dismissed_at");
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const now = Date.now();
            const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in ms

            // If less than 24 hours have passed, keep hidden
            if (now - dismissedTime < twentyFourHours) {
                setIsVisible(false);
            } else {
                // 24 hours passed, show again
                setIsVisible(true);
                localStorage.removeItem("banmao_browser_notice_dismissed_at");
            }
        } else {
            setIsVisible(true);
        }

        // Detect mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);

        // Detect Chrome browser
        const userAgent = navigator.userAgent;
        const isChromeBrowser = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor || '');
        setIsChrome(isChromeBrowser);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        // Store timestamp instead of boolean
        localStorage.setItem("banmao_browser_notice_dismissed_at", Date.now().toString());
    };

    const handleToggleZoom = () => {
        setIsZoomed(!isZoomed);
    };

    const getMobileLink = () => {
        if (typeof navigator !== "undefined") {
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                return CHROME_LINKS.ios;
            }
        }
        return CHROME_LINKS.android;
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Zoom overlay backdrop */}
            {isZoomed && (
                <div
                    className="browser-notice__overlay"
                    onClick={handleToggleZoom}
                />
            )}

            <div
                className={`browser-notice ${isZoomed ? "browser-notice--zoomed" : ""}`}
                onClick={handleToggleZoom}
            >
                {/* Chrome Icon */}
                <div className="browser-notice__icon">
                    <svg viewBox="0 0 24 24" width="32" height="32">
                        <circle cx="12" cy="12" r="10" fill="#4285F4" />
                        <circle cx="12" cy="12" r="4" fill="#fff" />
                        <path fill="#EA4335" d="M12 6.5a5.5 5.5 0 0 0-4.76 2.75L3.5 12 7.24 5.5A10 10 0 0 1 12 4.5z" />
                        <path fill="#FBBC05" d="M6.5 12a5.5 5.5 0 0 0 2.75 4.76L12 20.5l-6.5-3.74A10 10 0 0 1 3.5 12z" />
                        <path fill="#34A853" d="M12 17.5a5.5 5.5 0 0 0 4.76-2.75L20.5 12l-3.74 6.5A10 10 0 0 1 12 19.5z" />
                    </svg>
                </div>

                {/* Content */}
                <div className="browser-notice__content">
                    <h3 className="browser-notice__title">{t("browserNoticeTitle")}</h3>
                    <p className="browser-notice__desc">{t("browserNoticeDesc")}</p>

                    {/* Tips */}
                    <div className="browser-notice__tips">
                        <div className="browser-notice__tip browser-notice__tip--mobile">
                            {t("browserNoticeMobile")}
                        </div>
                        <div className="browser-notice__tip browser-notice__tip--desktop">
                            {t("browserNoticeDesktop")}
                        </div>
                    </div>

                    {/* Download Links */}
                    <div className="browser-notice__links">
                        {isChrome ? (
                            <span className="browser-notice__installed">
                                ✅ {t("browserNoticeInstalled")}
                            </span>
                        ) : (
                            <a
                                href={isMobile ? getMobileLink() : CHROME_LINKS.pc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="browser-notice__download"
                                onClick={(e) => e.stopPropagation()}
                            >
                                ⬇️ {t("browserNoticeDownload")}
                            </a>
                        )}
                        <button
                            className="browser-notice__close"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss();
                            }}
                        >
                            ✓ {t("browserNoticeClose")}
                        </button>
                    </div>
                </div>

                {/* Zoom hint */}
                <div className="browser-notice__hint">
                    {isZoomed ? "👆 Click to close" : "👆 Click to zoom"}
                </div>
            </div>
        </>
    );
}

export default BrowserNotice;
