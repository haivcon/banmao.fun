/**
 * GameHeader Component
 * Navigation, language selector, and wallet connection
 */
"use client";

import React from "react";
import Link from "next/link";
import { ConnectButton } from "../../../components/wallet/WalletConnection";
import { LocaleStrings, LangKey, langs, flags, langNames } from "../lib/i18n";
import { SoundToggle, SettingsButton } from "./GameSettings";
import { ThemeToggle } from "./ThemeProvider";

interface GameHeaderProps {
    currentLang: LangKey;
    onChangeLang: (lang: LangKey) => void;
    t: LocaleStrings;
    onOpenSettings?: () => void;
    onOpenTour?: () => void;
}

export default function GameHeader({
    currentLang,
    onChangeLang,
    t,
    onOpenSettings,
    onOpenTour,
}: GameHeaderProps) {
    const [showLangMenu, setShowLangMenu] = React.useState(false);

    return (
        <header className="game-header">
            <div className="header-content">
                <div className="header-left">
                    <Link href="/gamefi" className="cyber-back-btn">
                        <span className="back-text">{t.backToHub}</span>
                    </Link>
                </div>

                <div className="header-center">
                    <h1 className="cyber-logo">
                        <span className="fire-icon">🔥</span>
                        <span className="logo-text">BANMAO FOMO</span>
                    </h1>
                </div>

                <div className="header-right">
                    {/* Controls Group */}
                    <div className="header-controls">
                        {onOpenTour && (
                            <div className="control-item">
                                <button
                                    onClick={onOpenTour}
                                    title={t.tourHelp || "Help"}
                                    style={{
                                        background: 'rgba(255, 215, 0, 0.1)',
                                        border: '1px solid rgba(255, 215, 0, 0.3)',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.25)';
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    ❓
                                </button>
                            </div>
                        )}
                        {onOpenSettings && (
                            <div className="control-item settings-control">
                                <SettingsButton onClick={onOpenSettings} />
                            </div>
                        )}

                        <div className="control-divider"></div>

                        {/* Language Selector */}
                        <div className="lang-selector" data-tour="fomo-lang">
                            <button
                                className={`lang-current ${showLangMenu ? "active" : ""}`}
                                onClick={() => setShowLangMenu(!showLangMenu)}
                            >
                                <span className="lang-flag">{flags[currentLang]}</span>
                                <span className="lang-code">{currentLang.toUpperCase()}</span>
                                <span className="lang-arrow">▾</span>
                            </button>

                            {showLangMenu && (
                                <div className="lang-dropdown">
                                    {(Object.keys(langs) as LangKey[]).map((lang) => (
                                        <button
                                            key={lang}
                                            className={`lang-option ${lang === currentLang ? "active" : ""}`}
                                            onClick={() => {
                                                onChangeLang(lang);
                                                setShowLangMenu(false);
                                            }}
                                        >
                                            <span className="lang-flag">{flags[lang]}</span>
                                            <span className="lang-name">{langNames[lang]}</span>
                                            {lang === currentLang && <span className="check-mark">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Connect Wallet */}
                    <div className="wallet-connect-wrapper btn-3d" data-tour="fomo-wallet">
                        <ConnectButton
                            chainStatus="icon"
                            accountStatus="avatar"
                            showBalance={false}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
