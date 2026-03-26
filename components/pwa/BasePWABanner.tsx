// components/pwa/BasePWABanner.tsx
// Unified PWA Install Banner with config props
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FaDownload, FaTimes, FaCheck, FaSync } from "react-icons/fa";
import {
    AppId,
    PWA_APPS,
    getTranslation,
    getBrowserLanguage,
} from "../../lib/pwa/pwaConfig";
import {
    isStandalone,
    isIOSDevice,
    checkInstalled,
    setInstalled,
    checkForUpdate,
    updateVersion,
    wasDismissed,
    setDismissed,
    getAppVersion,
    cleanupLocalStorage,
} from "../../lib/pwa/pwaUtils";
import {
    trackInstall,
    trackUpdate,
    trackDismiss,
    trackBannerShown,
} from "../../lib/pwa/pwaAnalytics";

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_DISMISS_MS = 15 * 1000; // 15 seconds

export interface PWABannerConfig {
    appId: AppId;
    lang?: string;
    position?: "bottom" | "top";
    showDelay?: number; // ms delay before showing banner
    onInstall?: () => void;
    onDismiss?: () => void;
}

// Deferred prompt handling
let deferredPrompt: any = null;
let isPromptInitialized = false;
let promptAvailableCallbacks: Array<() => void> = [];

// Get prompt from early capture or local variable
function getPrompt(): any {
    if (typeof window !== "undefined" && (window as any).__pwaInstallPrompt) {
        return (window as any).__pwaInstallPrompt;
    }
    return deferredPrompt;
}

export function initInstallPrompt(): void {
    if (typeof window === "undefined") return;

    // Check if prompt was already captured by early script
    if ((window as any).__pwaInstallPrompt) {
        deferredPrompt = (window as any).__pwaInstallPrompt;
        console.log("[PWA] Using early-captured install prompt");
        promptAvailableCallbacks.forEach(cb => cb());
    }

    // Prevent duplicate event listeners
    if (isPromptInitialized) return;
    isPromptInitialized = true;

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        (window as any).__pwaInstallPrompt = e;
        console.log("[PWA] Install prompt captured");
        promptAvailableCallbacks.forEach(cb => cb());
    });

    window.addEventListener("appinstalled", () => {
        console.log("[PWA] App installed successfully");
        deferredPrompt = null;
        (window as any).__pwaInstallPrompt = null;
    });
}

export function onPromptAvailable(callback: () => void): () => void {
    promptAvailableCallbacks.push(callback);
    // If already available (from early capture or later), call immediately
    if (getPrompt()) {
        callback();
    }
    return () => {
        promptAvailableCallbacks = promptAvailableCallbacks.filter(cb => cb !== callback);
    };
}

export async function promptInstall(): Promise<boolean> {
    const prompt = getPrompt();
    if (!prompt) {
        console.log("[PWA] Install prompt not available");
        return false;
    }

    try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        console.log("[PWA] Install prompt outcome:", outcome);
        deferredPrompt = null;
        (window as any).__pwaInstallPrompt = null;
        return outcome === "accepted";
    } catch (error) {
        console.error("[PWA] Install prompt error:", error);
        return false;
    }
}

export function canPromptInstall(): boolean {
    return getPrompt() !== null;
}

export default function BasePWABanner({
    appId,
    lang: propLang,
    position = "bottom",
    showDelay = 500,
    onInstall,
    onDismiss,
}: PWABannerConfig) {
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [installed, setInstalledState] = useState(false);
    const [hasUpdate, setHasUpdate] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [browserLang, setBrowserLang] = useState("en");
    const [countdown, setCountdown] = useState(15);
    const [canInstall, setCanInstall] = useState(false);
    const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const config = PWA_APPS[appId];
    const t = useMemo(
        () => getTranslation(appId, propLang || browserLang),
        [appId, propLang, browserLang]
    );

    // Initialize install prompt listener and track availability
    useEffect(() => {
        initInstallPrompt();
        setCanInstall(canPromptInstall());

        // Subscribe to prompt availability from component callbacks
        const cleanup = onPromptAvailable(() => {
            setCanInstall(true);
        });

        // Also listen for the custom pwaPromptReady event from early script in layout.tsx
        const handlePromptReady = () => {
            console.log("[PWA] pwaPromptReady event received");
            setCanInstall(canPromptInstall());
        };
        window.addEventListener("pwaPromptReady", handlePromptReady);

        // Re-check after a short delay (prompt may become available after initial render)
        const checkTimer = setTimeout(() => {
            const promptAvailable = canPromptInstall();
            if (promptAvailable && !canInstall) {
                setCanInstall(true);
                console.log("[PWA] Prompt became available after delay check");
            }
        }, 2000);

        return () => {
            cleanup();
            window.removeEventListener("pwaPromptReady", handlePromptReady);
            clearTimeout(checkTimer);
        };
    }, [canInstall]);

    const clearTimers = useCallback(() => {
        if (autoDismissTimerRef.current) {
            clearTimeout(autoDismissTimerRef.current);
            autoDismissTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    const startAutoDismissTimer = useCallback(() => {
        clearTimers();
        setCountdown(15);

        countdownIntervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);

        autoDismissTimerRef.current = setTimeout(() => {
            setShowBanner(false);
            clearTimers();
        }, AUTO_DISMISS_MS);
    }, [clearTimers]);

    useEffect(() => {
        setBrowserLang(getBrowserLanguage());
        setIsIOS(isIOSDevice());

        // Check if already installed
        const isInstalledNow = checkInstalled(appId);
        setInstalledState(isInstalledNow);

        // Check if running as standalone PWA
        if (isStandalone()) {
            // Update version when running as PWA
            updateVersion(appId);

            // Check for updates if installed
            const updateAvailable = checkForUpdate(appId);
            if (updateAvailable && !wasDismissed(appId)) {
                setHasUpdate(true);
                setShowBanner(true);
                startAutoDismissTimer();
                trackBannerShown(appId, propLang || getBrowserLanguage());
            }
            return;
        }

        // If dismissed recently (24h), don't show
        if (wasDismissed(appId)) {
            return;
        }

        // If previously installed but not in standalone (user in browser)
        // Still show banner but with update option if available
        if (isInstalledNow) {
            const updateAvailable = checkForUpdate(appId);
            if (updateAvailable) {
                setHasUpdate(true);
            }
            setShowBanner(true);
            startAutoDismissTimer();
            trackBannerShown(appId, propLang || getBrowserLanguage());
            return;
        }

        // Show banner for fresh users
        const timer = setTimeout(() => {
            setShowBanner(true);
            startAutoDismissTimer();
            trackBannerShown(appId, propLang || getBrowserLanguage());
        }, showDelay);

        const handleAppInstalled = () => {
            console.log(`[PWA ${appId}] App installed event received`);
            setInstalledState(true);
            setShowBanner(false);
            setInstalled(appId);
            clearTimers();
            trackInstall(appId, propLang || browserLang);

            // Clean up old localStorage on reinstall
            cleanupLocalStorage(appId);
            setInstalled(appId);

            onInstall?.();
        };

        window.addEventListener("appinstalled", handleAppInstalled);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("appinstalled", handleAppInstalled);
            clearTimers();
        };
    }, [appId, propLang, showDelay, startAutoDismissTimer, clearTimers, browserLang, onInstall]);

    const handleMouseEnter = () => clearTimers();
    const handleMouseLeave = () => {
        if (showBanner) startAutoDismissTimer();
    };

    const handleInstall = async () => {
        // If already installed, handle as update
        if (installed && hasUpdate) {
            const oldVersion = getAppVersion(appId);
            updateVersion(appId);
            setHasUpdate(false);
            setShowBanner(false);
            clearTimers();
            trackUpdate(appId, oldVersion || "unknown", config.version);
            // Reload to get new version
            window.location.reload();
            return;
        }

        if (installed) {
            setShowBanner(false);
            clearTimers();
            return;
        }

        // If no native prompt available, dismiss banner silently
        // User will need to use browser menu manually, but we don't show any message
        if (!canInstall) {
            setShowBanner(false);
            clearTimers();
            return;
        }

        setIsInstalling(true);
        try {
            const accepted = await promptInstall();
            if (accepted) {
                setInstalledState(true);
                setShowBanner(false);
                setInstalled(appId);
                clearTimers();
                trackInstall(appId, propLang || browserLang);
                onInstall?.();
            }
        } catch (error) {
            console.error(`[PWA ${appId}] Install failed:`, error);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setDismissed(appId);
        clearTimers();
        trackDismiss(appId, propLang || browserLang);
        onDismiss?.();
    };

    if (!showBanner) return null;

    // Styles based on app config - responsive for all screen sizes, content never overflows
    const styles = {
        banner: {
            position: "fixed" as const,
            bottom: position === "bottom" ? "max(8px, env(safe-area-inset-bottom, 8px))" : "auto",
            top: position === "top" ? "max(8px, env(safe-area-inset-top, 8px))" : "auto",
            right: "max(8px, env(safe-area-inset-right, 8px))",
            left: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "nowrap" as const,
            gap: "clamp(2px, 0.8vw, 5px)",
            padding: "clamp(4px, 0.8vw, 6px) clamp(6px, 1.5vw, 10px)",
            background: "rgba(10, 10, 30, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${config.themeColor}66`,
            borderRadius: "clamp(10px, 2vw, 16px)",
            boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${config.themeColor}22`,
            zIndex: 9999,
            maxWidth: "min(calc(100vw - 16px), 320px)",
            width: "auto",
            overflow: "hidden",
            animation: "pwa-slide-in 0.3s ease-out",
        },
        icon: {
            width: "clamp(16px, 3.5vw, 20px)",
            height: "clamp(16px, 3.5vw, 20px)",
            borderRadius: 3,
            flexShrink: 0,
            objectFit: "cover" as const,
        },
        title: {
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "clamp(8px, 1.8vw, 10px)",
            fontWeight: 600,
            color: config.accentColor,
            flexShrink: 1,
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "clamp(50px, 15vw, 80px)",
        },
        desc: {
            fontSize: "clamp(7px, 1.5vw, 9px)",
            color: "#94a3b8",
            flexShrink: 1,
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "clamp(50px, 20vw, 100px)",
            display: "none", // Hide description on small screens to save space
        },
        buttonContainer: {
            display: "flex",
            gap: "clamp(2px, 0.4vw, 3px)",
            flexShrink: 0,
        },
        installBtn: {
            padding: "clamp(2px, 0.6vw, 4px) clamp(5px, 1vw, 8px)",
            background: `linear-gradient(135deg, ${config.themeColor}4D, ${config.accentColor}33)`,
            border: `1px solid ${config.themeColor}99`,
            borderRadius: "clamp(6px, 1.5vw, 10px)",
            color: config.themeColor,
            fontSize: "clamp(7px, 1.5vw, 9px)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap" as const,
            display: "flex",
            alignItems: "center",
            gap: "clamp(1px, 0.3vw, 2px)",
            minHeight: "clamp(18px, 4vw, 24px)",
            touchAction: "manipulation" as const,
        },
        installedBtn: {
            padding: "clamp(2px, 0.6vw, 4px) clamp(5px, 1vw, 8px)",
            background: "rgba(34, 197, 94, 0.2)",
            border: "1px solid rgba(34, 197, 94, 0.6)",
            borderRadius: "clamp(6px, 1.5vw, 10px)",
            color: "#4ade80",
            fontSize: "clamp(7px, 1.5vw, 9px)",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap" as const,
            display: "flex",
            alignItems: "center",
            gap: "clamp(1px, 0.3vw, 2px)",
            minHeight: "clamp(18px, 4vw, 24px)",
            touchAction: "manipulation" as const,
        },
        dismissBtn: {
            padding: "clamp(2px, 0.6vw, 4px) clamp(4px, 0.8vw, 6px)",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "clamp(6px, 1.5vw, 10px)",
            color: "#94a3b8",
            fontSize: "clamp(6px, 1.3vw, 8px)",
            cursor: "pointer",
            whiteSpace: "nowrap" as const,
            display: "flex",
            alignItems: "center",
            gap: "clamp(1px, 0.2vw, 2px)",
            minHeight: "clamp(18px, 4vw, 24px)",
            touchAction: "manipulation" as const,
        },
    };

    return (
        <div
            className="pwa-install-banner"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={styles.banner}
        >
            <style>{`
                @keyframes pwa-slide-in {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>

            {/* Icon - supports both emoji (format: 'emoji:🎮') and image paths */}
            {config.icon.startsWith('emoji:') ? (
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>
                    {config.icon.replace('emoji:', '')}
                </div>
            ) : (
                <img src={config.icon} alt={config.name} style={styles.icon} />
            )}

            {/* Title */}
            <div style={styles.title}>{t.title}</div>

            {/* Description */}
            <div style={styles.desc}>
                {hasUpdate
                    ? t.updateAvailable
                    : installed
                        ? t.installedLabel
                        : isIOS
                            ? t.iosHint
                            : t.description}
            </div>

            {/* Buttons */}
            <div style={styles.buttonContainer}>
                {/* Show update button if update available */}
                {hasUpdate && (
                    <button style={styles.installBtn} onClick={handleInstall}>
                        <FaSync />
                        <span>{t.updateLabel}</span>
                    </button>
                )}

                {/* Show install button if not installed and not iOS */}
                {!isIOS && !installed && !hasUpdate && (
                    <button
                        style={styles.installBtn}
                        onClick={handleInstall}
                        disabled={isInstalling}
                        title={t.installLabel}
                    >
                        <FaDownload />
                        <span>{isInstalling ? "..." : t.installLabel}</span>
                    </button>
                )}

                {/* Show installed indicator */}
                {installed && !hasUpdate && (
                    <button style={styles.installedBtn} onClick={handleDismiss}>
                        <FaCheck />
                        <span>{t.installedLabel}</span>
                    </button>
                )}

                {/* Dismiss button with countdown */}
                <button
                    style={styles.dismissBtn}
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                >
                    <FaTimes />
                    <span>
                        {t.dismissLabel} {countdown > 0 ? `(${countdown}s)` : ""}
                    </span>
                </button>
            </div>
        </div>
    );
}
