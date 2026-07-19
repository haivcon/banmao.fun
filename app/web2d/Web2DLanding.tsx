"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Web2DIcon } from "./icons";
import {
    web2dFallbackCopies,
    type Language,
    type Web2DFallbackCard,
    type Web2DTabKey,
} from "./locals";

export type Web2DLandingProps = {
    reason?: string;
    manual?: boolean;
    lang?: Language;
};

const TAB_ORDER: Web2DTabKey[] = [
    "overview",
    "gamefi",
    "defi",
    "collection",
    "community",
    "token",
];

const TAB_ICONS: Record<Web2DTabKey, string> = {
    overview: "compass",
    gamefi: "gamepad",
    defi: "diamond",
    collection: "gallery",
    community: "chat",
    token: "chart-bar",
};

const LANGUAGE_OPTIONS: Array<{
    code: Language;
    name: string;
    nativeName: string;
    flag: string;
}> = [
    { code: "en", name: "English", nativeName: "EN", flag: "/flags/en.png" },
    { code: "vi", name: "Tiếng Việt", nativeName: "VI", flag: "/flags/vi.png" },
    { code: "zh", name: "中文", nativeName: "ZH", flag: "/flags/zh.png" },
    { code: "ko", name: "한국어", nativeName: "KO", flag: "/flags/ko.png" },
    { code: "ru", name: "Русский", nativeName: "RU", flag: "/flags/ru.png" },
    { code: "id", name: "Indonesia", nativeName: "ID", flag: "/flags/id.png" },
];

const HEADER_TABS: Web2DTabKey[] = ["gamefi", "defi", "collection"];

const MOBILE_TABS: Web2DTabKey[] = [
    "overview",
    "gamefi",
    "defi",
    "community",
    "token",
];

function isExternalHref(href: string) {
    return href.startsWith("http");
}

function getLanguage(code: Language) {
    return (
        LANGUAGE_OPTIONS.find((language) => language.code === code) ??
        LANGUAGE_OPTIONS[0]
    );
}

const EcosystemCard = memo(function EcosystemCard({
    card,
    featured = false,
}: {
    card: Web2DFallbackCard;
    featured?: boolean;
}) {
    const external = isExternalHref(card.href);
    const unavailable = card.statusType === "soon";
    const className = [
        "web2d-card",
        featured ? "web2d-card--featured" : "",
        unavailable ? "web2d-card--soon" : "",
    ]
        .filter(Boolean)
        .join(" ");

    const content = (
        <>
            <span className="web2d-card__icon" aria-hidden="true">
                <Web2DIcon name={card.icon} />
            </span>

            <span className="web2d-card__body">
                <span className="web2d-card__topline">
                    <span
                        className={`web2d-card__status web2d-card__status--${card.statusType}`}
                    >
                        <i aria-hidden="true" />
                        {card.status}
                    </span>
                    {card.meta && (
                        <span className="web2d-card__meta">{card.meta}</span>
                    )}
                </span>
                <strong>{card.label}</strong>
                <small>{card.desc}</small>
            </span>

            {!unavailable && (
                <span className="web2d-card__arrow" aria-hidden="true">
                    {external ? "↗" : "→"}
                </span>
            )}
        </>
    );

    if (unavailable) {
        return (
            <article
                className={className}
                aria-label={`${card.label}: ${card.status}`}
            >
                {content}
            </article>
        );
    }

    if (external) {
        return (
            <a
                className={className}
                href={card.href}
                target="_blank"
                rel="noreferrer"
            >
                {content}
            </a>
        );
    }

    return (
        <Link className={className} href={card.href}>
            {content}
        </Link>
    );
});

export function Web2DLanding({
    reason,
    manual = false,
    lang = "en",
}: Web2DLandingProps) {
    const [currentLang, setCurrentLang] = useState<Language>(lang);
    const [languageOpen, setLanguageOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Web2DTabKey>("overview");
    const languageMenuRef = useRef<HTMLDivElement>(null);

    const copy = web2dFallbackCopies[currentLang] ?? web2dFallbackCopies.en;
    const activeLanguage = getLanguage(currentLang);
    const cards = useMemo(
        () => copy.cards[activeTab] ?? copy.cards.overview,
        [activeTab, copy],
    );

    useEffect(() => {
        setCurrentLang(lang);
    }, [lang]);

    useEffect(() => {
        if (!languageOpen) return;

        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!languageMenuRef.current?.contains(event.target as Node)) {
                setLanguageOpen(false);
            }
        };

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setLanguageOpen(false);
            }
        };

        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [languageOpen]);

    const selectTab = (tab: Web2DTabKey, scroll = false) => {
        setActiveTab(tab);

        if (scroll) {
            requestAnimationFrame(() => {
                document
                    .getElementById("web2d-explore")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }
    };

    return (
        <div
            className="web2d"
            role="region"
            aria-label={copy.ariaLabels.experience}
        >
            <header className="web2d-header">
                <div className="web2d-container web2d-header__inner">
                    <Link
                        href="/"
                        className="web2d-brand"
                        aria-label={copy.ariaLabels.home}
                    >
                        <span className="web2d-brand__mark">
                            <Image
                                src="/branding/animated-icon.gif"
                                alt=""
                                width={38}
                                height={38}
                                unoptimized
                            />
                        </span>
                        <span className="web2d-brand__copy">
                            <strong>BANMAO</strong>
                            <small>{copy.logoSubtitle}</small>
                        </span>
                    </Link>

                    <nav
                        className="web2d-header__nav"
                        aria-label={copy.ariaLabels.quickLinks}
                    >
                        {HEADER_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                className={activeTab === tab ? "is-active" : ""}
                                onClick={() => selectTab(tab, true)}
                            >
                                {copy.tabs[tab]}
                            </button>
                        ))}
                    </nav>

                    <div
                        className="web2d-language"
                        ref={languageMenuRef}
                    >
                        <button
                            type="button"
                            className="web2d-language__trigger"
                            aria-expanded={languageOpen}
                            aria-haspopup="menu"
                            aria-controls="web2d-language-menu"
                            aria-label={copy.ariaLabels.selectLanguage}
                            onClick={() => setLanguageOpen((open) => !open)}
                        >
                            <Image
                                src={activeLanguage.flag}
                                alt=""
                                width={20}
                                height={20}
                            />
                            <span>{activeLanguage.nativeName}</span>
                            <Web2DIcon name="chevron-down" />
                        </button>

                        {languageOpen && (
                            <div
                                className="web2d-language__menu"
                                id="web2d-language-menu"
                                role="menu"
                            >
                                <span className="web2d-language__label">
                                    {copy.ariaLabels.selectLanguage}
                                </span>
                                {LANGUAGE_OPTIONS.map((option) => (
                                    <button
                                        key={option.code}
                                        type="button"
                                        className={
                                            option.code === currentLang
                                                ? "is-active"
                                                : ""
                                        }
                                        role="menuitem"
                                        onClick={() => {
                                            setCurrentLang(option.code);
                                            setLanguageOpen(false);
                                        }}
                                    >
                                        <Image
                                            src={option.flag}
                                            alt=""
                                            width={22}
                                            height={22}
                                        />
                                        <span>{option.name}</span>
                                        <small>{option.nativeName}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main>
                <section className="web2d-hero web2d-container">
                    <div className="web2d-hero__content">
                        <span className="web2d-eyebrow">
                            <i aria-hidden="true" />
                            {copy.eyebrow}
                        </span>

                        <h1>{copy.title}</h1>

                        <p className="web2d-hero__lead">
                            {manual ? copy.subtitleManual : copy.subtitleAuto}
                        </p>

                        {reason && (
                            <p className="web2d-hero__notice">
                                <Web2DIcon name="bolt" />
                                <span>
                                    <strong>{copy.reasonPrefix}</strong> {reason}
                                </span>
                            </p>
                        )}

                        <div className="web2d-hero__actions">
                            <Link
                                href="/gamefi"
                                className="web2d-button web2d-button--primary"
                            >
                                <Web2DIcon name="gamepad" />
                                <span>
                                    {copy.launchApp} {copy.tabs.gamefi}
                                </span>
                                <b aria-hidden="true">→</b>
                            </Link>
                            <Link
                                href="/defi"
                                className="web2d-button web2d-button--secondary"
                            >
                                <Web2DIcon name="diamond" />
                                <span>
                                    {copy.launchApp} {copy.tabs.defi}
                                </span>
                                <b aria-hidden="true">→</b>
                            </Link>
                        </div>

                        <div
                            className="web2d-hero__proof"
                            aria-label={copy.statsTitle}
                        >
                            {copy.highlights.map((highlight) => (
                                <span key={highlight.title}>
                                    <Web2DIcon name={highlight.icon} />
                                    {highlight.title}
                                </span>
                            ))}
                        </div>
                    </div>

                    <aside
                        className="web2d-hero__visual"
                        aria-label={copy.sectionTitles.overview}
                    >
                        <Image
                            src="/branding/banmao-hero.jpg"
                            alt=""
                            fill
                            sizes="(max-width: 820px) 100vw, 42vw"
                            priority
                        />
                        <div className="web2d-hero__visual-shade" />
                        <span className="web2d-hero__edition">2D / LITE</span>
                        <div className="web2d-hero__visual-copy">
                            <span>BANMAO</span>
                            <strong>X LAYER</strong>
                        </div>
                        <div className="web2d-hero__visual-metric">
                            <span>{copy.stats[1].label}</span>
                            <strong>{copy.stats[1].value}</strong>
                            <small>{copy.stats[1].tone}</small>
                        </div>
                    </aside>
                </section>

                <section
                    className="web2d-metrics web2d-container"
                    aria-label={copy.statsTitle}
                >
                    {copy.stats.map((stat, index) => (
                        <article key={stat.label}>
                            <span className="web2d-metrics__index">
                                0{index + 1}
                            </span>
                            <div>
                                <small>{stat.label}</small>
                                <strong>{stat.value}</strong>
                                <span>{stat.tone}</span>
                            </div>
                        </article>
                    ))}
                </section>

                <section
                    className="web2d-explore web2d-container"
                    id="web2d-explore"
                    aria-label={copy.ariaLabels.hierarchicalNavigation}
                >
                    <div className="web2d-section-head">
                        <div>
                            <span className="web2d-eyebrow">
                                <i aria-hidden="true" />
                                {copy.tabs[activeTab]}
                            </span>
                            <h2>{copy.sectionTitles[activeTab]}</h2>
                        </div>
                        <p>{copy.sectionDesc[activeTab]}</p>
                    </div>

                    <div
                        className="web2d-tabs"
                        role="tablist"
                        aria-label={copy.ariaLabels.featureTabs}
                    >
                        {TAB_ORDER.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                id={`web2d-tab-${tab}`}
                                className={activeTab === tab ? "is-active" : ""}
                                role="tab"
                                aria-selected={activeTab === tab}
                                aria-controls="web2d-tab-panel"
                                onClick={() => selectTab(tab)}
                            >
                                <Web2DIcon name={TAB_ICONS[tab]} />
                                <span>{copy.tabs[tab]}</span>
                            </button>
                        ))}
                    </div>

                    <div
                        className={`web2d-card-grid web2d-card-grid--${activeTab}`}
                        id="web2d-tab-panel"
                        role="tabpanel"
                        aria-labelledby={`web2d-tab-${activeTab}`}
                    >
                        {cards.map((card, index) => (
                            <EcosystemCard
                                key={`${activeTab}-${card.label}-${index}`}
                                card={card}
                                featured={activeTab === "overview" && index < 2}
                            />
                        ))}
                    </div>
                </section>

                <section
                    className="web2d-values web2d-container"
                    aria-label={copy.ariaLabels.informationPanels}
                >
                    {copy.highlights.map((highlight, index) => (
                        <article key={highlight.title}>
                            <span className="web2d-values__number">
                                0{index + 1}
                            </span>
                            <span className="web2d-values__icon">
                                <Web2DIcon name={highlight.icon} />
                            </span>
                            <strong>{highlight.title}</strong>
                            <p>{highlight.desc}</p>
                        </article>
                    ))}
                </section>
            </main>

            <footer className="web2d-footer">
                <div className="web2d-container web2d-footer__inner">
                    <div>
                        <strong>BANMAO</strong>
                        <p>{copy.footer}</p>
                    </div>
                    <nav aria-label={copy.ariaLabels.footerLinks}>
                        <Link href="/gamefi">{copy.tabs.gamefi}</Link>
                        <Link href="/defi">{copy.tabs.defi}</Link>
                        <Link href="/collection">{copy.tabs.collection}</Link>
                    </nav>
                    <span>© {new Date().getFullYear()} · X LAYER</span>
                </div>
            </footer>

            <nav
                className="web2d-mobile-nav"
                aria-label={copy.ariaLabels.quickLinks}
            >
                {MOBILE_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={activeTab === tab ? "is-active" : ""}
                        aria-label={copy.tabs[tab]}
                        onClick={() => selectTab(tab, true)}
                    >
                        <Web2DIcon name={TAB_ICONS[tab]} />
                        <span>{copy.tabs[tab]}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}