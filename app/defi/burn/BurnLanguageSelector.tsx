"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Language, LANGUAGES } from "./i18n";
import "./BurnLanguageSelector.css";

interface BurnLanguageSelectorProps {
    currentLang: Language;
    onChangeLang: (lang: Language) => void;
}

export function BurnLanguageSelector({ currentLang, onChangeLang }: BurnLanguageSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const currentLangInfo = LANGUAGES.find(l => l.code === currentLang);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                left: rect.left,
            });
        }
    }, [isOpen]);

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

    const dropdown = isOpen && mounted ? createPortal(
        <div
            className="burn-lang-dropdown"
            style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                zIndex: 2147483647,
            }}
        >
            {LANGUAGES.map((language) => (
                <button
                    key={language.code}
                    className={`burn-lang-option ${language.code === currentLang ? "active" : ""}`}
                    onClick={() => handleSelect(language.code)}
                >
                    <span className="burn-lang-option-flag">{language.flag}</span>
                    <span className="burn-lang-option-name">{language.name}</span>
                    {language.code === currentLang && (
                        <svg className="burn-lang-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className="burn-lang-selector">
            <button
                ref={buttonRef}
                className={`burn-lang-btn ${isOpen ? "open" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                aria-label="Select language"
                aria-expanded={isOpen}
            >
                <span className="burn-lang-flag">{currentLangInfo?.flag}</span>
                <span className="burn-lang-code">{currentLangInfo?.code.toUpperCase()}</span>
                <svg
                    className={`burn-lang-chevron ${isOpen ? "rotate" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {dropdown}
        </div>
    );
}

export default BurnLanguageSelector;
