/**
 * GameSettings - Settings panel with sound, effects, notifications, and profile
 * Professional redesign with full i18n support
 */
"use client";

import React, { useState, useEffect, createContext, useContext, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fomoSounds } from "../lib/sounds";
import { getUnlockedAchievements, getPlayerStats, ACHIEVEMENTS, getRarityColor } from "../lib/achievements";
import { LocaleStrings } from "../lib/i18n/types";

// Settings context to share across components
interface GameSettingsState {
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
    musicEnabled: boolean;
    setMusicEnabled: (enabled: boolean) => void;
    particlesEnabled: boolean;
    setParticlesEnabled: (enabled: boolean) => void;
    animationsReduced: boolean;
    setAnimationsReduced: (reduced: boolean) => void;
}

const GameSettingsContext = createContext<GameSettingsState | null>(null);

export function useGameSettings() {
    const context = useContext(GameSettingsContext);
    if (!context) {
        return {
            soundEnabled: false,
            setSoundEnabled: () => { },
            musicEnabled: false,
            setMusicEnabled: () => { },
            particlesEnabled: true,
            setParticlesEnabled: () => { },
            animationsReduced: false,
            setAnimationsReduced: () => { },
        };
    }
    return context;
}

// Provider component
export function GameSettingsProvider({ children }: { children: React.ReactNode }) {
    const [soundEnabled, setSoundEnabledState] = useState(true);
    const [musicEnabled, setMusicEnabledState] = useState(true); // Default ON as requested
    const [particlesEnabled, setParticlesEnabledState] = useState(true);
    const [animationsReduced, setAnimationsReducedState] = useState(false);

    useEffect(() => {
        const savedSound = localStorage.getItem("fomo_sound");
        const savedMusic = localStorage.getItem("fomo_music");
        const savedParticles = localStorage.getItem("fomo_particles");
        const savedReduced = localStorage.getItem("fomo_reduced_motion");

        // If saved value exists, use it. Otherwise keep default (true).
        if (savedSound !== null) {
            setSoundEnabledState(savedSound === "true");
            fomoSounds.setMuted(savedSound !== "true");
        } else {
            // Default ON: Ensure sound manager is unmuted
            fomoSounds.setMuted(false);
        }

        if (savedMusic !== null) {
            setMusicEnabledState(savedMusic === "true");
            fomoSounds.setMusicMuted(savedMusic !== "true");
        } else {
            // Default ON: Ensure music is unmuted
            fomoSounds.setMusicMuted(false);
        }

        if (savedParticles !== null) setParticlesEnabledState(savedParticles === "true");
        if (savedReduced !== null) setAnimationsReducedState(savedReduced === "true");

        if (savedReduced === null) {
            const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (prefersReduced) setAnimationsReducedState(true);
        }
    }, []);

    const setSoundEnabled = (enabled: boolean) => {
        setSoundEnabledState(enabled);
        localStorage.setItem("fomo_sound", String(enabled));
        fomoSounds.setMuted(!enabled);
    };

    const setMusicEnabled = (enabled: boolean) => {
        setMusicEnabledState(enabled);
        localStorage.setItem("fomo_music", String(enabled));
        fomoSounds.setMusicMuted(!enabled); // mute = true means enabled = false
    };

    const setParticlesEnabled = (enabled: boolean) => {
        setParticlesEnabledState(enabled);
        localStorage.setItem("fomo_particles", String(enabled));
    };

    const setAnimationsReduced = (reduced: boolean) => {
        setAnimationsReducedState(reduced);
        localStorage.setItem("fomo_reduced_motion", String(reduced));
    };

    return (
        <GameSettingsContext.Provider value={{
            soundEnabled, setSoundEnabled,
            musicEnabled, setMusicEnabled,
            particlesEnabled, setParticlesEnabled,
            animationsReduced, setAnimationsReduced,
        }}>
            {children}
        </GameSettingsContext.Provider>
    );
}

// Sound Toggle Button (for header)
export function SoundToggle() {
    const { soundEnabled, setSoundEnabled } = useGameSettings();

    return (
        <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
            aria-pressed={soundEnabled}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                background: soundEnabled
                    ? "rgba(34, 197, 94, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${soundEnabled ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 215, 0, 0.2)"}`,
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "20px",
                transition: "all 0.2s ease",
            }}
            title={soundEnabled ? "Sound ON - Click to mute" : "Sound OFF - Click to enable"}
        >
            {soundEnabled ? "🔊" : "🔇"}
        </button>
    );
}

// Default notification thresholds
const DEFAULT_TIMER_THRESHOLD = 300;
const DEFAULT_JACKPOT_THRESHOLD = 100000;

// Settings Panel (expandable) — Professional Redesign with Notifications + i18n
interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    t: LocaleStrings;
    // Notification props (from page)
    hardTimeLeft?: number;
    softTimeLeft?: number;
    jackpotValue?: number;
    isEnded?: boolean;
}

export function SettingsPanel({ isOpen, onClose, t, hardTimeLeft = 0, softTimeLeft = 0, jackpotValue = 0, isEnded = false }: SettingsPanelProps) {
    const {
        soundEnabled, setSoundEnabled,
        musicEnabled, setMusicEnabled,
        particlesEnabled, setParticlesEnabled,
        animationsReduced, setAnimationsReduced,
    } = useGameSettings();

    // Notification state
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
    const [timerThreshold, setTimerThreshold] = useState(DEFAULT_TIMER_THRESHOLD);
    const [jackpotThreshold, setJackpotThreshold] = useState(DEFAULT_JACKPOT_THRESHOLD);
    const timerNotifiedRef = useRef(false);
    const jackpotNotifiedRef = useRef(false);

    // Load notification settings
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setNotifPermission(Notification.permission);
            const saved = localStorage.getItem("fomo-notification-settings");
            if (saved) {
                try {
                    const s = JSON.parse(saved);
                    setNotifEnabled(s.enabled ?? false);
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

    // Save notification settings
    const saveNotifSettings = useCallback(() => {
        localStorage.setItem("fomo-notification-settings", JSON.stringify({
            enabled: notifEnabled,
            timerThreshold,
            jackpotThreshold,
        }));
    }, [notifEnabled, timerThreshold, jackpotThreshold]);

    useEffect(() => { saveNotifSettings(); }, [saveNotifSettings]);

    // Send notification helper
    const sendNotification = useCallback((title: string, body: string) => {
        if (notifPermission !== "granted" || !notifEnabled) return;
        try {
            new Notification(title, {
                body,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: "banmaofomo-alert",
            });
        } catch { /* Notification API not available */ }
    }, [notifPermission, notifEnabled]);

    // Timer threshold check
    useEffect(() => {
        if (!notifEnabled || isEnded) return;
        if (hardTimeLeft > 0 && hardTimeLeft <= timerThreshold && !timerNotifiedRef.current) {
            timerNotifiedRef.current = true;
            const mins = Math.floor(hardTimeLeft / 60);
            sendNotification(
                "⚡ Kill Zone Alert!",
                `Hard Timer at ${mins}m ${hardTimeLeft % 60}s! Last attacker wins the jackpot!`,
            );
        }
        if (hardTimeLeft > timerThreshold) {
            timerNotifiedRef.current = false;
        }
    }, [hardTimeLeft, timerThreshold, notifEnabled, isEnded, sendNotification]);

    // Jackpot threshold check
    useEffect(() => {
        if (!notifEnabled || isEnded) return;
        if (jackpotValue >= jackpotThreshold && !jackpotNotifiedRef.current) {
            jackpotNotifiedRef.current = true;
            sendNotification(
                "🏆 Jackpot Milestone!",
                `Pool has reached ${jackpotValue.toLocaleString()} BANMAO! Don't miss your chance!`,
            );
        }
    }, [jackpotValue, jackpotThreshold, notifEnabled, isEnded, sendNotification]);

    const requestPermission = async () => {
        if ("Notification" in window) {
            const result = await Notification.requestPermission();
            setNotifPermission(result);
            if (result === "granted") {
                setNotifEnabled(true);
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0, 0, 0, 0.5)",
                            zIndex: 998,
                        }}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: "spring", damping: 25 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: "340px",
                            maxWidth: "92vw",
                            background: "linear-gradient(180deg, rgba(20, 20, 32, 0.99) 0%, rgba(12, 12, 20, 0.99) 100%)",
                            borderLeft: "1px solid rgba(255, 215, 0, 0.15)",
                            padding: "20px",
                            zIndex: 999,
                            overflowY: "auto",
                            backdropFilter: "blur(20px)",
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "24px",
                            paddingBottom: "16px",
                            borderBottom: "1px solid rgba(255, 215, 0, 0.1)",
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: "18px",
                                color: "#ffd700",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}>
                                ⚙️ {t.settingsTitle}
                            </h2>
                            <button
                                onClick={onClose}
                                aria-label="Close settings"
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "#888",
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    transition: "all 0.2s",
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Sound Settings */}
                        <SettingSection title={t.settingsSoundSection}>
                            <SettingToggle
                                label={t.settingsSoundToggle}
                                description={t.settingsSoundDesc}
                                enabled={soundEnabled}
                                onChange={setSoundEnabled}
                            />
                            <SettingToggle
                                label={t.settingsMusicToggle || "Nhạc nền (BGM)"}
                                description={t.settingsMusicDesc || "Bật nhạc nền thư giãn"}
                                enabled={musicEnabled}
                                onChange={setMusicEnabled}
                            />
                        </SettingSection>

                        {/* Visual Settings */}
                        <SettingSection title={t.settingsVisualSection}>
                            <SettingToggle
                                label={t.settingsParticleToggle}
                                description={t.settingsParticleDesc}
                                enabled={particlesEnabled}
                                onChange={setParticlesEnabled}
                            />
                            <SettingToggle
                                label={t.settingsReduceMotion}
                                description={t.settingsReduceMotionDesc}
                                enabled={animationsReduced}
                                onChange={setAnimationsReduced}
                            />
                        </SettingSection>

                        {/* Notification Settings */}
                        <SettingSection title={t.settingsNotifSection}>
                            {notifPermission === "default" && (
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
                                        fontSize: "13px",
                                        marginBottom: "8px",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    🔔 {t.settingsNotifEnable}
                                </button>
                            )}

                            {notifPermission === "denied" && (
                                <div style={{
                                    color: "#ef4444",
                                    fontSize: "12px",
                                    padding: "10px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    borderRadius: "8px",
                                    marginBottom: "8px",
                                }}>
                                    ❌ {t.settingsNotifBlocked}
                                </div>
                            )}

                            {notifPermission === "granted" && (
                                <>
                                    <SettingToggle
                                        label={t.settingsNotifToggle}
                                        description={t.settingsNotifDesc}
                                        enabled={notifEnabled}
                                        onChange={setNotifEnabled}
                                    />

                                    {notifEnabled && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
                                            {/* Timer Threshold Slider */}
                                            <div style={{
                                                padding: "10px 14px",
                                                background: "rgba(255, 255, 255, 0.03)",
                                                borderRadius: "10px",
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                                    <span style={{ color: "#a0a0b0", fontSize: "12px" }}>⏰ {t.settingsNotifTimerAlert}</span>
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

                                            {/* Jackpot Threshold Slider */}
                                            <div style={{
                                                padding: "10px 14px",
                                                background: "rgba(255, 255, 255, 0.03)",
                                                borderRadius: "10px",
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                                    <span style={{ color: "#a0a0b0", fontSize: "12px" }}>🏆 {t.settingsNotifJackpotAlert}</span>
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
                                        </div>
                                    )}
                                </>
                            )}
                        </SettingSection>

                        {/* Auto-save Info */}
                        <div style={{
                            marginTop: "24px",
                            padding: "12px 14px",
                            background: "rgba(255, 215, 0, 0.04)",
                            borderRadius: "10px",
                            border: "1px solid rgba(255, 215, 0, 0.08)",
                            fontSize: "11px",
                            color: "#666",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}>
                            <span>💡</span>
                            <span>{t.settingsAutoSave}</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Setting Section
function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: "20px" }}>
            <h3 style={{
                fontSize: "13px",
                color: "#888",
                marginBottom: "10px",
                fontWeight: 600,
                letterSpacing: "0.3px",
            }}>
                {title}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {children}
            </div>
        </div>
    );
}

// Setting Toggle
function SettingToggle({
    label,
    description,
    enabled,
    onChange
}: {
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: enabled ? "rgba(34, 197, 94, 0.05)" : "rgba(255, 255, 255, 0.02)",
                borderRadius: "10px",
                cursor: "pointer",
                border: `1px solid ${enabled ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)"}`,
                transition: "all 0.2s ease",
            }}
            onClick={() => onChange(!enabled)}
            role="switch"
            aria-checked={enabled}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(!enabled);
                }
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: "2px", fontSize: "13px", color: "#e0e0e0" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#555" }}>{description}</div>
            </div>
            <div style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background: enabled ? "#22c55e" : "rgba(255, 255, 255, 0.1)",
                position: "relative",
                transition: "background 0.2s ease",
                flexShrink: 0,
                marginLeft: "12px",
            }}>
                <motion.div
                    animate={{ x: enabled ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        top: "2px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                />
            </div>
        </div>
    );
}

// Settings Button (for header)
export function SettingsButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label="Open settings"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 215, 0, 0.2)",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "18px",
                transition: "all 0.2s ease",
            }}
            title="Settings"
        >
            ⚙️
        </button>
    );
}


