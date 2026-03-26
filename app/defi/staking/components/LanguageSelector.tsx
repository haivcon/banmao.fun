"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Language, LANGUAGES } from "../../../web3d/locals";

interface LanguageSelectorProps {
    currentLang: Language;
    onChangeLang: (lang: Language) => void;
}

export function LanguageSelector({ currentLang, onChangeLang }: LanguageSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const currentLangInfo = LANGUAGES.find(l => l.code === currentLang);

    // Mount check for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Update dropdown position when opened (desktop only)
    // On mobile, CSS handles centering via fixed + transform
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const isMobileView = window.innerWidth <= 768;
            if (!isMobileView) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right,
                });
            }
        }
    }, [isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen]);

    const handleSelect = (code: Language) => {
        onChangeLang(code);
        localStorage.setItem("banmao_language", code);
        setIsOpen(false);
    };

    // Dropdown portal - renders to body, bypasses all stacking contexts
    const dropdown = isOpen && mounted ? createPortal(
        <div
            className="defi-lang-dropdown"
            style={{
                position: "fixed",
                top: dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 2147483647,
            }}
        >
            <div className="defi-lang-dropdown__header">Select Language</div>
            {LANGUAGES.map((language) => (
                <button
                    key={language.code}
                    className={`defi-lang-option ${language.code === currentLang ? "active" : ""}`}
                    onClick={() => handleSelect(language.code)}
                >
                    <span className="defi-lang-flag">{language.flag}</span>
                    <span className="defi-lang-name">{language.name}</span>
                    {language.code === currentLang && <span className="defi-lang-check">✓</span>}
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className="defi-lang-selector">
            <button
                ref={buttonRef}
                className="defi-lang-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <span className="defi-lang-flag">{currentLangInfo?.flag}</span>
                <span className="defi-lang-arrow">{isOpen ? "▲" : "▼"}</span>
            </button>
            {dropdown}
        </div>
    );
}

export default LanguageSelector;
