"use client";

import React, { useState } from "react";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { DexWindow3D } from "./DexWindow3D";
import { RoundedPlane } from "../components/RoundedPlane";
import { Language, getAvailableLanguages } from "../locals";

interface DexLanguagePanel3DProps {
    id: string;
    position: [number, number, number];
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string) => string;
}

export function DexLanguagePanel3D({
    id,
    position,
    lang,
    setLang,
    t,
}: DexLanguagePanel3DProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const panelWidth = 2.2;
    const baseHeight = 1.0;

    // Get available languages (English hidden if another language is selected)
    const availableLanguages = getAvailableLanguages(lang);
    const expandedHeight = 0.9 + availableLanguages.length * 0.38;
    const panelHeight = isOpen ? expandedHeight : baseHeight;

    const currentLang = availableLanguages.find(l => l.code === lang) ||
        { code: lang, name: lang, flag: "🌐" };

    return (
        <DexWindow3D
            id={id}
            position={position}
            title={t("language")}
            icon="🌐"
            titleColor="#22d3ee"
            width={panelWidth}
            height={panelHeight}
            soundType="language"
        >
            {/* Current Language Button */}
            <group position={[0, isOpen ? panelHeight / 2 - 0.4 : 0.05, 0.02]}>
                <RoundedPlane width={panelWidth - 0.3} height={0.4} radius={0.08}>
                    <meshBasicMaterial color={hoveredItem === 'main' ? '#2d3a4f' : '#1e293b'} />
                </RoundedPlane>
                {/* Border glow on hover */}
                {hoveredItem === 'main' && (
                    <RoundedPlane width={panelWidth - 0.2} height={0.5} radius={0.1} position={[0, 0, -0.01]}>
                        <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} />
                    </RoundedPlane>
                )}
                <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'none' }} distanceFactor={8}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '14px' }}>{currentLang.flag}</span>
                        <span style={{
                            fontSize: '12px',
                            color: hoveredItem === 'main' ? '#67e8f9' : '#22d3ee',
                            fontFamily: 'Space Mono, monospace',
                        }}>
                            {currentLang.name}
                        </span>
                    </div>
                </Html>
                <Html center distanceFactor={8}>
                    <button
                        onMouseEnter={() => setHoveredItem('main')}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => setIsOpen(!isOpen)}
                        style={{
                            width: '150px',
                            height: '36px',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '12px',
                            transition: 'transform 0.2s ease',
                            transform: hoveredItem === 'main' ? 'scale(1.03)' : 'scale(1)',
                        }}
                    />
                </Html>
            </group>

            {/* Language Options (when open) - excluding English if another language is selected */}
            {isOpen && availableLanguages.map((language, index) => {
                const isHovered = hoveredItem === language.code;
                const isSelected = lang === language.code;

                return (
                    <group key={language.code} position={[0, panelHeight / 2 - 0.9 - index * 0.38, 0.02]}>
                        <RoundedPlane width={panelWidth - 0.3} height={0.32} radius={0.06}>
                            <meshBasicMaterial
                                color={isSelected ? '#22d3ee' : (isHovered ? '#2d3a4f' : '#1e293b')}
                                transparent
                                opacity={isSelected ? 0.35 : 1}
                            />
                        </RoundedPlane>
                        {/* Hover glow effect */}
                        {isHovered && !isSelected && (
                            <RoundedPlane width={panelWidth - 0.2} height={0.4} radius={0.08} position={[0, 0, -0.01]}>
                                <meshBasicMaterial color="#22d3ee" transparent opacity={0.15} />
                            </RoundedPlane>
                        )}
                        <Html center position={[0, 0, 0.02]} style={{ pointerEvents: 'none' }} distanceFactor={8}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '14px' }}>{language.flag}</span>
                                <span style={{
                                    fontSize: '11px',
                                    color: isSelected ? '#22d3ee' : (isHovered ? '#67e8f9' : '#a1a1aa'),
                                    fontFamily: 'Space Mono, monospace',
                                }}>
                                    {language.name}
                                </span>
                            </div>
                        </Html>
                        <Html center distanceFactor={8}>
                            <button
                                onMouseEnter={() => setHoveredItem(language.code)}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => {
                                    setLang(language.code);
                                    setIsOpen(false);
                                }}
                                style={{
                                    width: '150px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '10px',
                                    transition: 'transform 0.2s ease',
                                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                }}
                            />
                        </Html>
                    </group>
                );
            })}
        </DexWindow3D>
    );
}
