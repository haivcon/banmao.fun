// components/pwa/GameMenuInstallButton.tsx
// Compact install button for game menus
"use client";

import { useState, useEffect, useMemo } from "react";
import { FaDownload, FaCheck } from "react-icons/fa";
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
} from "../../lib/pwa/pwaUtils";
import { trackInstall } from "../../lib/pwa/pwaAnalytics";
import { promptInstall, canPromptInstall } from "./BasePWABanner";

export interface GameMenuInstallButtonProps {
    appId: AppId;
    lang?: string;
    variant?: "compact" | "full";
    className?: string;
}

export default function GameMenuInstallButton({
    appId,
    lang: propLang,
    variant = "compact",
    className = "",
}: GameMenuInstallButtonProps) {
    const [isInstalling, setIsInstalling] = useState(false);
    const [installed, setInstalledState] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [browserLang, setBrowserLang] = useState("en");
    const [canInstall, setCanInstall] = useState(false);

    const config = PWA_APPS[appId];
    const t = useMemo(
        () => getTranslation(appId, propLang || browserLang),
        [appId, propLang, browserLang]
    );

    useEffect(() => {
        setBrowserLang(getBrowserLanguage());
        setIsIOS(isIOSDevice());
        setInstalledState(checkInstalled(appId));

        // Check if install prompt is available
        const checkPrompt = () => {
            setCanInstall(canPromptInstall());
        };

        checkPrompt();

        // Re-check periodically (prompt may become available later)
        const interval = setInterval(checkPrompt, 1000);
        return () => clearInterval(interval);
    }, [appId]);

    // Hide button if running as standalone or if iOS (can't programmatically install)
    if (isStandalone()) return null;
    if (isIOS) return null;
    if (installed) return null;

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            const accepted = await promptInstall();
            if (accepted) {
                setInstalledState(true);
                setInstalled(appId);
                trackInstall(appId, propLang || browserLang);
            }
        } catch (error) {
            console.error(`[PWA ${appId}] Install failed:`, error);
        } finally {
            setIsInstalling(false);
        }
    };

    const styles = {
        button: {
            padding: variant === "compact" ? "6px 12px" : "10px 16px",
            background: `linear-gradient(135deg, ${config.themeColor}33, ${config.accentColor}22)`,
            border: `1px solid ${config.themeColor}66`,
            borderRadius: 12,
            color: config.themeColor,
            fontSize: variant === "compact" ? 11 : 13,
            fontWeight: 600,
            cursor: canInstall ? "pointer" : "not-allowed",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: canInstall ? 1 : 0.5,
        },
    };

    return (
        <button
            className={`game-menu-install-btn ${className}`}
            style={styles.button}
            onClick={handleInstall}
            disabled={isInstalling || !canInstall}
            title={canInstall ? t.installLabel : "Install prompt not available yet"}
        >
            {installed ? <FaCheck /> : <FaDownload />}
            <span>
                {isInstalling
                    ? "..."
                    : installed
                        ? t.installedLabel
                        : t.installLabel}
            </span>
        </button>
    );
}
