/**
 * NotificationManager - Push Notification / Alarm System
 * Requests browser notification permissions and sends alerts
 * when timer or jackpot hit user-configured thresholds
 */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationManagerProps {
    hardTimeLeft: number;
    softTimeLeft: number;
    jackpotValue: number;
    isEnded: boolean;
}

// Default thresholds
const DEFAULT_TIMER_THRESHOLD = 300; // 5 minutes
const DEFAULT_JACKPOT_THRESHOLD = 100000; // 100K tokens

export default function NotificationManager({
    hardTimeLeft,
    softTimeLeft,
    jackpotValue,
    isEnded,
}: NotificationManagerProps) {
    const [isEnabled, setIsEnabled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [showSettings, setShowSettings] = useState(false);
    const [timerThreshold, setTimerThreshold] = useState(DEFAULT_TIMER_THRESHOLD);
    const [jackpotThreshold, setJackpotThreshold] = useState(DEFAULT_JACKPOT_THRESHOLD);

    // Track whether notifications have been sent for current round
    const timerNotifiedRef = useRef(false);
    const jackpotNotifiedRef = useRef(false);

    // Load saved settings
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermission(Notification.permission);
            const saved = localStorage.getItem("fomo-notification-settings");
            if (saved) {
                try {
                    const s = JSON.parse(saved);
                    setIsEnabled(s.enabled ?? false);
                    setTimerThreshold(s.timerThreshold ?? DEFAULT_TIMER_THRESHOLD);
                    setJackpotThreshold(s.jackpotThreshold ?? DEFAULT_JACKPOT_THRESHOLD);
                } catch { /* ignore */ }
            }
        }
    }, []);

    // Reset notification flags when round ends
    useEffect(() => {
        if (isEnded) {
            timerNotifiedRef.current = false;
            jackpotNotifiedRef.current = false;
        }
    }, [isEnded]);

    // Save settings
    const saveSettings = useCallback(() => {
        localStorage.setItem("fomo-notification-settings", JSON.stringify({
            enabled: isEnabled,
            timerThreshold,
            jackpotThreshold,
        }));
    }, [isEnabled, timerThreshold, jackpotThreshold]);

    useEffect(() => { saveSettings(); }, [saveSettings]);

    // Request permission
    const requestPermission = async () => {
        if ("Notification" in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === "granted") {
                setIsEnabled(true);
            }
        }
    };

    // Send notification
    const sendNotification = useCallback((title: string, body: string, icon?: string) => {
        if (permission !== "granted" || !isEnabled) return;

        try {
            new Notification(title, {
                body,
                icon: icon || "/favicon.ico",
                badge: "/favicon.ico",
                tag: "banmaofomo-alert",
            });
        } catch {
            // Notification API not available in some contexts
        }
    }, [permission, isEnabled]);

    // Timer threshold check
    useEffect(() => {
        if (!isEnabled || isEnded) return;
        if (hardTimeLeft > 0 && hardTimeLeft <= timerThreshold && !timerNotifiedRef.current) {
            timerNotifiedRef.current = true;
            const mins = Math.floor(hardTimeLeft / 60);
            sendNotification(
                "⚡ Kill Zone Alert!",
                `Hard Timer at ${mins}m ${hardTimeLeft % 60}s! Last attacker wins the jackpot!`,
            );
        }
        // Reset if timer goes back above threshold (new round)
        if (hardTimeLeft > timerThreshold) {
            timerNotifiedRef.current = false;
        }
    }, [hardTimeLeft, timerThreshold, isEnabled, isEnded, sendNotification]);

    // Jackpot threshold check
    useEffect(() => {
        if (!isEnabled || isEnded) return;
        if (jackpotValue >= jackpotThreshold && !jackpotNotifiedRef.current) {
            jackpotNotifiedRef.current = true;
            sendNotification(
                "🏆 Jackpot Milestone!",
                `Pool has reached ${jackpotValue.toLocaleString()} BANMAO! Don't miss your chance!`,
            );
        }
    }, [jackpotValue, jackpotThreshold, isEnabled, isEnded, sendNotification]);

    return (
        <>
            {/* Notification Bell Button */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                    background: isEnabled ? "rgba(255, 215, 0, 0.15)" : "rgba(255,255,255,0.05)",
                    border: isEnabled ? "1px solid rgba(255, 215, 0, 0.3)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: isEnabled ? "#ffd700" : "#666",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                }}
                title="Notification Settings"
            >
                🔔
                {isEnabled && (
                    <span style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: "#22c55e",
                    }} />
                )}
            </button>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "8px",
                            background: "linear-gradient(180deg, #1a1a25 0%, #14141e 100%)",
                            border: "1px solid rgba(255, 215, 0, 0.15)",
                            borderRadius: "16px",
                            padding: "16px",
                            width: "280px",
                            zIndex: 100,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        }}
                    >
                        <h4 style={{ color: "#ffd700", margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>
                            🔔 Notification Settings
                        </h4>

                        {permission === "default" && (
                            <button
                                onClick={requestPermission}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(255, 215, 0, 0.3)",
                                    background: "rgba(255, 215, 0, 0.1)",
                                    color: "#ffd700",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    marginBottom: "12px",
                                }}
                            >
                                Enable Notifications
                            </button>
                        )}

                        {permission === "denied" && (
                            <p style={{ color: "#ef4444", fontSize: "12px", margin: "0 0 12px" }}>
                                ❌ Notifications blocked. Enable in browser settings.
                            </p>
                        )}

                        {permission === "granted" && (
                            <>
                                {/* Enable/Disable Toggle */}
                                <label style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    marginBottom: "14px", cursor: "pointer",
                                }}>
                                    <span style={{ color: "#a0a0b0", fontSize: "13px" }}>Active</span>
                                    <div
                                        onClick={() => setIsEnabled(!isEnabled)}
                                        style={{
                                            width: "40px", height: "22px", borderRadius: "11px",
                                            background: isEnabled ? "#22c55e" : "rgba(255,255,255,0.15)",
                                            position: "relative", transition: "background 0.2s", cursor: "pointer",
                                        }}
                                    >
                                        <div style={{
                                            width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
                                            position: "absolute", top: "2px",
                                            left: isEnabled ? "20px" : "2px",
                                            transition: "left 0.2s",
                                        }} />
                                    </div>
                                </label>

                                {/* Timer Threshold */}
                                <div style={{ marginBottom: "12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ color: "#a0a0b0", fontSize: "12px" }}>⏰ Timer Alert</span>
                                        <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>
                                            {Math.floor(timerThreshold / 60)}m
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={60}
                                        max={1800}
                                        step={60}
                                        value={timerThreshold}
                                        onChange={(e) => setTimerThreshold(Number(e.target.value))}
                                        style={{ width: "100%", accentColor: "#ffd700" }}
                                    />
                                </div>

                                {/* Jackpot Threshold */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ color: "#a0a0b0", fontSize: "12px" }}>🏆 Jackpot Alert</span>
                                        <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>
                                            {(jackpotThreshold / 1000).toFixed(0)}K
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={10000}
                                        max={1000000}
                                        step={10000}
                                        value={jackpotThreshold}
                                        onChange={(e) => setJackpotThreshold(Number(e.target.value))}
                                        style={{ width: "100%", accentColor: "#ffd700" }}
                                    />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
