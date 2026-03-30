"use client";

import React, { useState } from "react";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { DexWindow3D, useWindowScale } from "./DexWindow3D";
import { RoundedPlane } from "../components/RoundedPlane";
import { Language, getAvailableLanguages } from "../locals";
import { WEB3D_THEMES, getWeb3DTheme } from "../theme";
import { useWeb3DTheme } from "../contexts";
import { useSoundManager } from "../audio";
import { useViewportScale, useHtmlScale } from "../hooks";

interface DexSettingsPanel3DProps {
    id: string;
    position: [number, number, number];
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string) => string;
}

export function DexSettingsPanel3D({
    id,
    position,
    lang,
    setLang,
    t,
}: DexSettingsPanel3DProps) {
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const { theme: currentTheme, setTheme, primaryColor } = useWeb3DTheme();
    const { playClick } = useSoundManager();
    const viewportScale = useViewportScale();
    const htmlScale = useHtmlScale();

    // Get window scale for proper Html scaling
    const windowScale = useWindowScale();

    const handleThemeChange = (themeKey: typeof currentTheme) => {
        setTheme(themeKey);
        setIsThemeOpen(false);
        playClick();
    };

    const panelWidth = 2.0;
    const baseHeight = 1.6;

    const availableLanguages = getAvailableLanguages(lang);
    const languageListHeight = isLanguageOpen ? availableLanguages.length * 0.35 : 0;
    const themeListHeight = isThemeOpen ? WEB3D_THEMES.length * 0.35 : 0;
    const panelHeight = baseHeight + languageListHeight + themeListHeight;

    const currentLang = availableLanguages.find(l => l.code === lang) ||
        { code: lang, name: lang, flag: "🌐" };
    const themeConfig = getWeb3DTheme(currentTheme);
    const accentColor = primaryColor;

    // Button sizes based on viewport
    const btnW = viewportScale.btnWidth * 0.9;
    const btnH = viewportScale.btnHeight * 0.82;
    const smallBtnW = viewportScale.btnWidth * 0.82;
    const smallBtnH = viewportScale.btnHeight * 0.64;

    return (
        <DexWindow3D
            id={id}
            position={position}
            title={t("settings") || "Settings"}
            icon="⚙️"
            titleColor={accentColor}
            width={panelWidth}
            height={panelHeight}
            soundType="settings"
        >
            {/* LANGUAGE SECTION */}
            <group position={[0, panelHeight / 2 - 0.38, 0.01]}>
                <Html center position={[-panelWidth / 2 + 0.15, 0, 0.01]} style={{ pointerEvents: 'none' }} distanceFactor={8 / windowScale}>
                    <div style={{ transform: `scale(${htmlScale})`, transformOrigin: 'center' }}>
                        <span style={{ fontSize: `${12 * windowScale}px` }}>🌐</span>
                    </div>
                </Html>
                <Text position={[-panelWidth / 2 + 0.28, 0, 0]} fontSize={0.07} color={primaryColor} anchorX="left" anchorY="middle" outlineWidth={0.003} outlineColor="#000000">
                    {t("language") || "Language"}
                </Text>
            </group>

            <group position={[0, panelHeight / 2 - 0.62, 0.02]}>
                {/* Button background */}
                <RoundedPlane width={panelWidth - 0.25} height={0.32} radius={0.10}>
                    <meshBasicMaterial color="#1a2535" transparent opacity={hoveredItem === 'lang-main' ? 0.95 : 0.85} />
                </RoundedPlane>
                {/* Gold border glow on hover */}
                {hoveredItem === 'lang-main' && (
                    <RoundedPlane width={panelWidth - 0.25} height={0.45} radius={0.17} position={[0, 0, -0.01]}>
                        <meshBasicMaterial color={primaryColor} transparent opacity={0.3} />
                    </RoundedPlane>
                )}
                <Html center position={[0, 0, 0.02]} distanceFactor={8 / windowScale} style={{ pointerEvents: 'auto' }}>
                    <style>{`
                        .settings-btn {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            padding: 8px 16px;
                            background: transparent;
                            border: none;
                            cursor: pointer;
                            white-space: nowrap;
                        }
                        .settings-btn .flag {
                            font-size: 16px;
                            filter: drop-shadow(0 0 3px rgba(0,0,0,0.8));
                        }
                        .settings-btn .text {
                            font-size: 12px;
                            color: #00f2ff;
                            font-family: 'Space Mono', monospace;
                            font-weight: bold;
                            text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
                        }
                        .settings-btn:hover {
                            transform: scale(1.15);
                        }
                        .settings-btn:hover .flag {
                            font-size: 22px;
                        }
                        .settings-btn:hover .text {
                            font-size: 16px;
                            color: ${primaryColor};
                            text-shadow: 0 0 15px ${primaryColor}, 0 0 30px ${primaryColor}, 2px 2px 0 #000, -2px -2px 0 #000;
                        }
                    `}</style>
                    <div style={{ transform: `scale(${htmlScale})`, transformOrigin: 'center' }}>
                        <button
                            className="settings-btn"
                            onMouseEnter={() => setHoveredItem('lang-main')}
                            onMouseLeave={() => setHoveredItem(null)}
                            onClick={() => { setIsLanguageOpen(!isLanguageOpen); setIsThemeOpen(false); }}
                        >
                            <span className="flag">{currentLang.flag}</span>
                            <span className="text">{currentLang.name} ▼</span>
                        </button>
                    </div>
                </Html>
            </group>

            {isLanguageOpen && availableLanguages.map((language, index) => {
                const isHovered = hoveredItem === `lang-${language.code}`;
                const isSelected = lang === language.code;
                const yPos = panelHeight / 2 - 1.25 - index * 0.35;

                return (
                    <group key={language.code} position={[0, yPos, 0.02]}>
                        <RoundedPlane width={panelWidth - 0.4} height={0.32} radius={0.06}>
                            <meshBasicMaterial color={isSelected ? accentColor : (isHovered ? '#2d3a4f' : '#1e293b')} transparent opacity={isSelected ? 0.35 : 1} />
                        </RoundedPlane>
                        <Html center distanceFactor={8 / windowScale} style={{ pointerEvents: 'auto' }}>
                            <div style={{ transform: `scale(${htmlScale})`, transformOrigin: 'center' }}>
                                <button
                                    className={`lang-item-btn ${isSelected ? 'selected' : ''}`}
                                    onMouseEnter={() => setHoveredItem(`lang-${language.code}`)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    onClick={() => { setLang(language.code); setIsLanguageOpen(false); playClick(); }}
                                >
                                    <span className="flag">{language.flag}</span>
                                    <span className="text">{language.name}</span>
                                </button>
                            </div>
                            <style>{`
                                .lang-item-btn {
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    padding: 6px 14px;
                                    background: transparent;
                                    border: none;
                                    cursor: pointer;
                                    white-space: nowrap;
                                }
                                .lang-item-btn .flag { font-size: 14px; }
                                .lang-item-btn .text {
                                    font-size: 11px;
                                    color: #a1a1aa;
                                    font-family: 'Space Mono', monospace;
                                }
                                .lang-item-btn:hover { transform: scale(1.2); }
                                .lang-item-btn:hover .flag { font-size: 20px; }
                                .lang-item-btn:hover .text {
                                    font-size: 14px;
                                    color: #ffffff;
                                    font-weight: bold;
                                    text-shadow: 0 0 12px #67e8f9, 0 0 25px #67e8f9;
                                }
                                .lang-item-btn.selected .text { color: ${accentColor}; }
                            `}</style>
                        </Html>
                    </group>
                );
            })}

            {/* THEME SECTION */}
            <group position={[0, panelHeight / 2 - 1.0 - languageListHeight, 0.01]}>
                <Html center position={[-panelWidth / 2 + 0.15, 0, 0.01]} style={{ pointerEvents: 'none' }} distanceFactor={8 / windowScale}>
                    <div style={{ transform: `scale(${htmlScale})`, transformOrigin: 'center' }}>
                        <span style={{ fontSize: '12px', filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))' }}>🎨</span>
                    </div>
                </Html>
                <Text position={[-panelWidth / 2 + 0.28, 0, 0]} fontSize={0.07} color={primaryColor} anchorX="left" anchorY="middle" outlineWidth={0.003} outlineColor="#000000">
                    {t("theme") || "Theme"}
                </Text>
            </group>

            <group position={[0, panelHeight / 2 - 1.22 - languageListHeight, 0.02]}>
                {/* Button background */}
                <RoundedPlane width={panelWidth - 0.25} height={0.32} radius={0.10}>
                    <meshBasicMaterial color="#1a2535" transparent opacity={hoveredItem === 'theme-main' ? 0.95 : 0.85} />
                </RoundedPlane>
                {/* Gold border glow on hover */}
                {hoveredItem === 'theme-main' && (
                    <RoundedPlane width={panelWidth - 0.25} height={0.45} radius={0.17} position={[0, 0, -0.01]}>
                        <meshBasicMaterial color={primaryColor} transparent opacity={0.3} />
                    </RoundedPlane>
                )}
                <Html center position={[0, 0, 0.02]} distanceFactor={8 / windowScale} style={{ pointerEvents: 'auto' }}>
                    <style>{`
                        .theme-main-btn {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            padding: 8px 16px;
                            background: transparent;
                            border: none;
                            cursor: pointer;
                            white-space: nowrap;
                            font-size: 12px;
                            color: #00f2ff;
                            font-family: 'Space Mono', monospace;
                            font-weight: bold;
                            text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
                        }
                        .theme-main-btn:hover {
                            transform: scale(1.15);
                            font-size: 16px;
                            color: ${primaryColor};
                            text-shadow: 0 0 15px ${primaryColor}, 0 0 30px ${primaryColor}, 2px 2px 0 #000, -2px -2px 0 #000;
                        }
                    `}</style>
                    <div style={{ transform: `scale(${htmlScale})`, transformOrigin: 'center' }}>
                        <button
                            className="theme-main-btn"
                            onMouseEnter={() => setHoveredItem('theme-main')}
                            onMouseLeave={() => setHoveredItem(null)}
                            onClick={() => { setIsThemeOpen(!isThemeOpen); setIsLanguageOpen(false); playClick(); }}
                        >
                            {themeConfig.icon} {themeConfig.name} ▼
                        </button>
                    </div>
                </Html>
            </group>

            {isThemeOpen && WEB3D_THEMES.map((theme, index) => {
                const isHovered = hoveredItem === `theme-${theme.key}`;
                const isSelected = currentTheme === theme.key;
                const yPos = panelHeight / 2 - 2.05 - languageListHeight - index * 0.35;

                return (
                    <group key={theme.key} position={[0, yPos, 0.02]}>
                        <RoundedPlane width={panelWidth - 0.4} height={0.32} radius={0.06}>
                            <meshBasicMaterial color={isSelected ? theme.primary : (isHovered ? '#2d3a4f' : '#1e293b')} transparent opacity={isSelected ? 0.35 : 1} />
                        </RoundedPlane>
                        <mesh position={[-panelWidth / 2 + 0.35, 0, 0.02]}>
                            <circleGeometry args={[0.08, 16]} />
                            <meshBasicMaterial color={theme.primary} side={THREE.DoubleSide} />
                        </mesh>
                        <Html center position={[0.1, 0, 0.02]} distanceFactor={8 / windowScale} style={{ pointerEvents: 'auto' }}>
                            <div style={{ transform: `scale(${htmlScale})`, transformOrigin: 'center' }}>
                                <button
                                    className={`theme-item-btn ${isSelected ? 'selected' : ''}`}
                                    onMouseEnter={() => setHoveredItem(`theme-${theme.key}`)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    onClick={() => handleThemeChange(theme.key)}
                                >
                                    {theme.icon} {theme.name}
                                </button>
                            </div>
                            <style>{`
                                .theme-item-btn {
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 6px 12px;
                                    background: transparent;
                                    border: none;
                                    cursor: pointer;
                                    white-space: nowrap;
                                    font-size: 11px;
                                    color: #a1a1aa;
                                    font-family: 'Space Mono', monospace;
                                }
                                .theme-item-btn:hover {
                                    transform: scale(1.2);
                                    font-size: 14px;
                                    color: #ffffff;
                                    font-weight: bold;
                                    text-shadow: 0 0 12px ${theme.primary}, 0 0 25px ${theme.primary};
                                }
                                .theme-item-btn.selected { color: ${theme.primary}; }
                            `}</style>
                            <button
                                className={`theme-item-btn ${isSelected ? 'selected' : ''}`}
                                onMouseEnter={() => setHoveredItem(`theme-${theme.key}`)}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => handleThemeChange(theme.key)}
                            >
                                {theme.icon} {theme.name}
                            </button>
                        </Html>
                    </group>
                );
            })}
        </DexWindow3D>
    );
}
