"use client";

import Image from "next/image";
import ThemeToggle from '../components/theme/ThemeToggle';
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    onLanguageChange?: (lang: Language) => void;
    onSwitchTo3D?: () => void;
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
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

const SOCIAL_LINKS = [
    { href: "https://x.com/banmao_x", icon: "twitter", label: "X / Twitter" },
    { href: "https://t.me/banmaofun", icon: "telegram", label: "Telegram" },
];

const CONTRACT_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";

function isExternalHref(href: string) {
    return href.startsWith("http");
}

function getLanguage(code: Language) {
    return LANGUAGE_OPTIONS.find((language) => language.code === code) ?? LANGUAGE_OPTIONS[0];
}

/* ─── EcosystemCard ─── */
const EcosystemCard = memo(function EcosystemCard({
    card,
    featured = false,
    compact = false,
}: {
    card: Web2DFallbackCard;
    featured?: boolean;
    compact?: boolean;
}) {
    const external = isExternalHref(card.href);
    const unavailable = card.statusType === "soon";
    const className = [
        "web2d-card",
        featured ? "web2d-card--featured" : "",
        compact ? "web2d-card--compact" : "",
        unavailable ? "web2d-card--soon" : "",
    ].filter(Boolean).join(" ");

    const content = (
        <>
            <span className="web2d-card__icon" aria-hidden="true">
                <Web2DIcon name={card.icon} />
            </span>
            <span className="web2d-card__body">
                <span className="web2d-card__topline">
                    <span className={`web2d-card__status web2d-card__status--${card.statusType}`}>
                        <i aria-hidden="true" />
                        {card.status}
                    </span>
                    {card.meta && <span className="web2d-card__meta">{card.meta}</span>}
                </span>
                <strong>{card.label}</strong>
                {!compact && <small>{card.desc}</small>}
            </span>
            {!unavailable && <span className="web2d-card__arrow" aria-hidden="true">{external ? "↗" : "→"}</span>}
        </>
    );

    if (unavailable) {
        return <article className={className} aria-label={`${card.label}: ${card.status}`}>{content}</article>;
    }

    if (external) {
        return <a className={className} href={card.href} target="_blank" rel="noopener noreferrer" aria-label={`${card.label} — ${card.desc}`}>{content}</a>;
    }

    return <Link className={className} href={card.href} aria-label={`${card.label} — ${card.desc}`}>{content}</Link>;
});


/* ─── Main Component ─── */
export function Web2DLanding({
    reason,
    manual = false,
    lang = "en",
    onLanguageChange,
    onSwitchTo3D,
}: Web2DLandingProps) {
    const [activeTab, setActiveTab] = useState<Web2DTabKey>("overview");
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const [scrolled, setScrolled] = useState(false);

    const copy = web2dFallbackCopies[lang] ?? web2dFallbackCopies.en;
    const currentLang = getLanguage(lang);

    // Scroll-based header background
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Close language dropdown on outside click
    useEffect(() => {
        if (!langOpen) return;
        const handler = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [langOpen]);

    // Scroll reveal observer
    useEffect(() => {
        const els = document.querySelectorAll(".web2d-reveal");
        if (!els.length) return;
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
            { threshold: 0.12 }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [activeTab]);

    const selectTab = useCallback((tab: Web2DTabKey) => {
        setActiveTab(tab);
        document.getElementById("web2d-explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const subtitle = manual ? copy.subtitleManual : copy.subtitleAuto;

    const cards = useMemo(() => copy.cards[activeTab] ?? [], [copy, activeTab]);
    const featuredCards = useMemo(() => {
        const all = Object.values(copy.cards).flat();
        return all.filter((c) => c.statusType === "live").slice(0, 3);
    }, [copy]);
    const utilityCards = useMemo(() => {
        return [
            ...(copy.cards.gamefi?.filter((c) => c.statusType === "live").slice(0, 2) ?? []),
            ...(copy.cards.defi?.filter((c) => c.statusType === "live").slice(0, 2) ?? []),
        ];
    }, [copy]);


    return (
        <div className="web2d" aria-label={copy.ariaLabels.experience}>
            {/* ── HEADER ── */}
            <header className={`web2d-header${scrolled ? " is-scrolled" : ""}`} ref={headerRef}>
                <div className="web2d-header__inner web2d-container">
                    <Link className="web2d-brand" href="/" aria-label={copy.ariaLabels.home}>
                        <span className="web2d-brand__mark">
                            <Image src="/branding/banmao_logo.png" alt="" width={38} height={38} />
                        </span>
                        <span className="web2d-brand__copy">
                            <strong>BANMAO</strong>
                            <small>{copy.logoSubtitle ?? "NEBULA"}</small>
                        </span>
                    </Link>

                    <nav className="web2d-header__nav" aria-label={copy.ariaLabels.featureTabs}>
                        {HEADER_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                className={activeTab === tab ? "is-active" : ""}
                                onClick={() => selectTab(tab)}
                            >
                                {copy.tabs[tab]}
                            </button>
                        ))}
                    </nav>

                    <ThemeToggle vi={lang === 'vi'} />

                    <div className="web2d-language" ref={langRef}>
                        <button
                            type="button"
                            className="web2d-language__trigger"
                            onClick={() => setLangOpen((o) => !o)}
                            aria-expanded={langOpen}
                            aria-label={copy.ariaLabels.selectLanguage}
                        >
                            <Image src={currentLang.flag} alt="" width={18} height={18} />
                            {currentLang.nativeName}
                            <Web2DIcon name="chevron-down" />
                        </button>
                        {langOpen && (
                            <div className="web2d-language__menu" role="listbox" aria-label={copy.ariaLabels.selectLanguage}>
                                {LANGUAGE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.code}
                                        type="button"
                                        role="option"
                                        aria-selected={lang === opt.code}
                                        className={lang === opt.code ? "is-active" : ""}
                                        onClick={() => { onLanguageChange?.(opt.code); setLangOpen(false); }}
                                    >
                                        <Image src={opt.flag} alt="" width={18} height={18} />
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>


            {/* ── MAIN ── */}
            <main>
                {/* ── HERO ── */}
                <section className="web2d-hero web2d-container">
                    <div className="web2d-hero__content">
                        <span className="web2d-eyebrow"><i aria-hidden="true" />{copy.eyebrow}</span>
                        <h1>
                            {copy.title.split(" ").map((word, i) => (
                                <span key={i}>
                                    {i === 0 ? <span className="web2d-gradient-text">{word}</span> : ` ${word}`}
                                </span>
                            ))}
                        </h1>
                        <p className="web2d-hero__lead">{subtitle}</p>

                        {reason && (
                            <p className="web2d-hero__notice">
                                <Web2DIcon name="bolt" />
                                {copy.reasonPrefix} {reason}
                            </p>
                        )}

                        {/* Stats Bar */}
                        <div className="web2d-hero__stats">
                            {copy.stats.map((stat) => (
                                <div className="web2d-hero__stat" key={stat.label}>
                                    <strong>{stat.value}</strong>
                                    <small>{stat.tone}</small>
                                </div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="web2d-hero__actions">
                            <Link href="/gamefi" className="web2d-button web2d-button--primary">
                                <Web2DIcon name="gamepad" />
                                {copy.launchApp}
                            </Link>
                            {onSwitchTo3D && (
                                <button type="button" className="web2d-button web2d-button--secondary" onClick={onSwitchTo3D}>
                                    <Web2DIcon name="sparkles" />
                                    3D Mode
                                </button>
                            )}
                            <Link href="/defi/staking" className="web2d-button web2d-button--ghost">
                                <Web2DIcon name="diamond" />
                                Staking
                            </Link>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="web2d-hero__visual">
                        <Image
                            src="/branding/banmao-hero.jpg"
                            alt="Banmao Universe"
                            fill
                            priority
                            sizes="(max-width: 860px) 100vw, 50vw"
                        />
                        <div className="web2d-hero__mascot">
                            <Image
                                src="/branding/animated-icon.gif"
                                alt="Banmao Mascot"
                                width={80}
                                height={80}
                                unoptimized
                            />
                        </div>
                    </div>
                </section>


                {/* ── FEATURED ── */}
                <section className="web2d-featured web2d-container web2d-reveal" aria-label={copy.ariaLabels.quickLinks}>
                    <div className="web2d-section-head web2d-section-head--compact">
                        <div><span className="web2d-eyebrow"><i aria-hidden="true" />{copy.tabs.overview}</span><h2>{copy.sectionTitles.overview}</h2></div>
                        <p>{copy.sectionDesc.overview}</p>
                    </div>
                    <div className="web2d-featured__grid">
                        {featuredCards.map((card) => <EcosystemCard key={card.href} card={card} featured />)}
                    </div>
                    <div className="web2d-utilities" aria-label={copy.ariaLabels.quickLinks}>
                        {utilityCards.map((card) => <EcosystemCard key={`${card.href}-${card.label}`} card={card} compact />)}
                    </div>
                </section>

                {/* ── EXPLORE / TABS ── */}
                <section className="web2d-explore web2d-container web2d-reveal" id="web2d-explore" aria-label={copy.ariaLabels.hierarchicalNavigation}>
                    <div className="web2d-section-head">
                        <div><span className="web2d-eyebrow"><i aria-hidden="true" />{copy.tabs[activeTab]}</span><h2>{copy.sectionTitles[activeTab]}</h2></div>
                        <p>{copy.sectionDesc[activeTab]}</p>
                    </div>
                    <div className="web2d-tabs" role="tablist" aria-label={copy.ariaLabels.featureTabs}>
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
                                <Web2DIcon name={TAB_ICONS[tab]} /><span>{copy.tabs[tab]}</span>
                            </button>
                        ))}
                    </div>
                    <div className={`web2d-card-grid web2d-card-grid--${activeTab}`} id="web2d-tab-panel" role="tabpanel" aria-labelledby={`web2d-tab-${activeTab}`}>
                        {cards.map((card) => <EcosystemCard key={`${activeTab}-${card.href}-${card.label}`} card={card} />)}
                    </div>
                </section>

                {/* ── VALUES / HIGHLIGHTS ── */}
                <section className="web2d-values web2d-container web2d-reveal" aria-label={copy.ariaLabels.informationPanels}>
                    {copy.highlights.map((highlight) => (
                        <article key={highlight.title}>
                            <span className="web2d-values__icon"><Web2DIcon name={highlight.icon} /></span>
                            <span><strong>{highlight.title}</strong><small>{highlight.desc}</small></span>
                        </article>
                    ))}
                </section>
            </main>


            {/* ── MEGA FOOTER ── */}
            <footer className="web2d-footer">
                <div className="web2d-container web2d-footer__inner">
                    <div className="web2d-footer__brand">
                        <strong>BANMAO</strong>
                        <p>{copy.footer}</p>
                        <div className="web2d-footer__social">
                            {SOCIAL_LINKS.map((link) => (
                                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                                    <Web2DIcon name={link.icon} />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="web2d-footer__col">
                        <h4>Ecosystem</h4>
                        <Link href="/gamefi">{copy.tabs.gamefi}</Link>
                        <Link href="/defi">{copy.tabs.defi}</Link>
                        <Link href="/collection">{copy.tabs.collection}</Link>
                        <Link href="/defi/staking">Staking</Link>
                    </div>

                    <div className="web2d-footer__col">
                        <h4>Community</h4>
                        <a href="https://x.com/banmao_x" target="_blank" rel="noopener noreferrer">X / Twitter</a>
                        <a href="https://t.me/banmaofun" target="_blank" rel="noopener noreferrer">Telegram</a>
                    </div>

                    <div className="web2d-footer__contract">
                        <h4>Contract</h4>
                        <code>{CONTRACT_ADDRESS}</code>
                    </div>

                    <div className="web2d-footer__bottom">
                        <span>© {new Date().getFullYear()} BANMAO · X LAYER</span>
                        <nav aria-label={copy.ariaLabels.footerLinks}>
                            <Link href="/gamefi">{copy.tabs.gamefi}</Link>
                            <Link href="/defi">{copy.tabs.defi}</Link>
                            <Link href="/collection">{copy.tabs.collection}</Link>
                        </nav>
                    </div>
                </div>
            </footer>

        </div>
    );
}

