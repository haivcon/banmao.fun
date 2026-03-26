// components/OfflineIndicator.tsx
"use client";

import { useEffect, useState } from "react";
import { FaWifi, FaExclamationTriangle } from "react-icons/fa";
import { useOnlineStatus } from "../lib/offlineUtils";

interface OfflineIndicatorProps {
    /** Position of the indicator */
    position?: "top" | "bottom";
    /** Labels for i18n */
    labels?: {
        offline?: string;
        backOnline?: string;
    };
}

// i18n translations
const MESSAGES: Record<string, { offline: string; backOnline: string }> = {
    en: {
        offline: "You're offline",
        backOnline: "Back online!",
    },
    vi: {
        offline: "Bạn đang offline",
        backOnline: "Đã có mạng!",
    },
    zh: {
        offline: "您已离线",
        backOnline: "已恢复连接！",
    },
    ko: {
        offline: "오프라인 상태입니다",
        backOnline: "온라인 복귀!",
    },
    id: {
        offline: "Anda sedang offline",
        backOnline: "Kembali online!",
    },
    ru: {
        offline: "Вы офлайн",
        backOnline: "Снова онлайн!",
    },
};

function getBrowserLanguage(): string {
    if (typeof navigator === "undefined") return "en";
    const lang = navigator.language?.split("-")[0].toLowerCase() || "en";
    return MESSAGES[lang] ? lang : "en";
}

export default function OfflineIndicator({
    position = "top",
    labels,
}: OfflineIndicatorProps) {
    const { isOnline, wasOffline } = useOnlineStatus();
    const [show, setShow] = useState(false);
    const [browserLang, setBrowserLang] = useState("en");

    useEffect(() => {
        setBrowserLang(getBrowserLanguage());
    }, []);

    useEffect(() => {
        if (!isOnline) {
            setShow(true);
        } else if (wasOffline) {
            // Show "back online" briefly
            setShow(true);
            const timer = setTimeout(() => setShow(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShow(false);
        }
    }, [isOnline, wasOffline]);

    if (!show) return null;

    const msg = MESSAGES[browserLang] || MESSAGES.en;
    const offlineText = labels?.offline || msg.offline;
    const onlineText = labels?.backOnline || msg.backOnline;

    return (
        <div
            className={`offline-indicator offline-indicator--${position} ${isOnline ? "offline-indicator--online" : "offline-indicator--offline"
                }`}
            role="alert"
            aria-live="polite"
        >
            <span className="offline-indicator__icon">
                {isOnline ? <FaWifi /> : <FaExclamationTriangle />}
            </span>
            <span className="offline-indicator__text">
                {isOnline ? onlineText : offlineText}
            </span>
        </div>
    );
}
