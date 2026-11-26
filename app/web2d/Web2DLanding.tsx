"use client";

import Image from "next/image";
import Link from "next/link";
import { Box, MessageCircleMore } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { HomeShare } from "../../components/sharing/ShareProject";
import { aiText } from "../../lib/ai/client/i18n";
import { requestAIChatOpen } from "../../lib/ai/client/openContract";
import ThemeToggle from "../components/theme/ThemeToggle";
import { KawaiiSprite, type SpriteName } from "./KawaiiSprite";
import { Web2DLanguageMenu } from "./Web2DLanguageMenu";
import { Web2DIcon } from "./icons";
import { web2dFallbackCopies, web2dSceneCopies, type Language, type Web2DFallbackCard, type Web2DTabKey } from "./locals";

export type Web2DLandingProps = {
    reason?: string;
    manual?: boolean;
    active?: boolean;
    lang?: Language;
    onLanguageChange?: (lang: Language) => void;
    onSwitchTo3D?: () => void;
};

const ZONES = {
    gamefi: { icon: "gamepad", sprite: "mini_gamefi", href: "/gamefi" },
    defi: { icon: "diamond", sprite: "mini_defi", href: "/defi" },
    collection: { icon: "gallery", sprite: "mini_collection", href: "/collection" },
} satisfies Record<string, { icon: string; sprite: SpriteName; href: string }>;

const ZONE_TABS = ["gamefi", "defi", "collection"] as const;
const OTHER_TABS = { overview: "compass", community: "chat", token: "chart-bar" } as const;
const OTHER_TAB_ORDER = ["overview", "community", "token"] as const;
const TAB_ORDER: readonly Web2DTabKey[] = [...ZONE_TABS, ...OTHER_TAB_ORDER];
const SPIRIT_SPRITES = ["spirit_humor", "spirit_unity", "spirit_create"] as const;

const SOCIAL_LINKS = [
    { href: "https://x.com/banmao_x", icon: "twitter", label: "X / Twitter" },
    { href: "https://t.me/banmaofun", icon: "telegram", label: "Telegram" },
];

const CONTRACT_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";

function isZone(tab: Web2DTabKey): tab is keyof typeof ZONES {
    return Object.hasOwn(ZONES, tab);
}

function RouteLink({ card }: { card: Web2DFallbackCard }) {
    const external = card.href.startsWith("http");
    const unavailable = card.statusType === "soon";
    const content = (
        <>
            <span className="web2d-route__icon" aria-hidden="true"><Web2DIcon name={card.icon} /></span>
            <span className="web2d-route__label">
                <strong>{card.label}</strong>
                {unavailable && <small>{card.status}</small>}
            </span>
            {!unavailable && <Web2DIcon name={external ? "external-link" : "arrow-right"} />}
        </>
    );

    if (unavailable) return <div className="web2d-route web2d-route--soon">{content}</div>;

    const label = `${card.label} — ${card.desc}`;
    return external ? (
        <a className="web2d-route" href={card.href} aria-label={label} target="_blank" rel="noopener noreferrer">{content}</a>
    ) : (
        <Link className="web2d-route" href={card.href} aria-label={label} prefetch={false}>{content}</Link>
    );
}

export function Web2DLanding({
    reason,
    active = true,
    lang = "en",
    onLanguageChange,
    onSwitchTo3D,
}: Web2DLandingProps) {
    const [activeTab, setActiveTab] = useState<Web2DTabKey>("overview");
    const tabRefs = useRef<Partial<Record<Web2DTabKey, HTMLButtonElement | null>>>({});
    const panelRef = useRef<HTMLDivElement>(null);

    const copy = web2dFallbackCopies[lang] ?? web2dFallbackCopies.en;
    const scene = web2dSceneCopies[lang] ?? web2dSceneCopies.en;
    const zone = isZone(activeTab) ? activeTab : undefined;

    function selectTab(tab: Web2DTabKey, initiatedByPointer: boolean) {
        setActiveTab(tab);

        const panel = panelRef.current;
        if (!initiatedByPointer || !panel || !window.matchMedia("(max-width: 640px)").matches) return;

        // Keep the user's place when the panel heading and first row are already visible.
        if (panel.getBoundingClientRect().top < window.innerHeight - 132) return;
        panel.scrollIntoView({
            block: "start",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
    }

    function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, tab: Web2DTabKey) {
        const index = TAB_ORDER.indexOf(tab);
        const last = TAB_ORDER.length - 1;
        let next = index;

        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % TAB_ORDER.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + last) % TAB_ORDER.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = last;
        else return;

        event.preventDefault();
        const nextTab = TAB_ORDER[next];
        setActiveTab(nextTab);
        tabRefs.current[nextTab]?.focus();
    }

    function renderTab(tab: Web2DTabKey, className: string, content: ReactNode) {
        return (
            <button
                key={tab}
                type="button"
                role="tab"
                id={`web2d-tab-${tab}`}
                className={className}
                data-zone={tab}
                aria-selected={activeTab === tab}
                aria-controls="web2d-zone-panel"
                tabIndex={activeTab === tab ? 0 : -1}
                ref={(element) => { tabRefs.current[tab] = element; }}
                onClick={(event) => selectTab(tab, event.detail > 0)}
                onKeyDown={(event) => handleTabKey(event, tab)}
            >
                {content}
            </button>
        );
    }

    return (
        <div className="web2d" lang={lang} aria-label={copy.ariaLabels.experience}>
            <header className="web2d-topbar">
                <div className="web2d-topbar__inner web2d-container">
                    <Link className="web2d-logo" href="/" aria-label={copy.ariaLabels.home}>
                        <Image src="/branding/banmao_logo.png" alt="" width={34} height={34} />
                        <strong>BANMAO</strong>
                    </Link>
                    <a className="web2d-topbar__explore" href="#web2d-explore">{scene.explore}</a>
                    <div className="web2d-topbar__settings">
                        {onSwitchTo3D && (
                            <button
                                type="button"
                                className="web2d-topbar__control web2d-topbar__mode"
                                onClick={onSwitchTo3D}
                                aria-label={scene.switchTo3D}
                                title={scene.switchTo3D}
                            >
                                <Box aria-hidden="true" /><span>3D</span>
                            </button>
                        )}
                        <ThemeToggle label={scene.appearance} />
                        {onLanguageChange && (
                            <Web2DLanguageMenu language={lang} label={copy.ariaLabels.selectLanguage} onChange={onLanguageChange} />
                        )}
                    </div>
                </div>
            </header>

            <main className="web2d-main web2d-container">
                <section className="web2d-world" aria-labelledby="web2d-world-title" data-active={active}>
                    <div className="web2d-world__floor" aria-hidden="true" />
                    <div className="web2d-world__art" aria-hidden="true">
                        <div className="web2d-world__orbit" />
                        <div className="web2d-world__spark web2d-world__spark--top" />
                        <div className="web2d-world__spark web2d-world__spark--bottom" />
                        <KawaiiSprite
                            name="hero_eastwest"
                            mobileName="hero_eastwest_1"
                            enabled={active}
                            className="web2d-world__mascot"
                            eager
                        />
                        <KawaiiSprite
                            name="buddy_greet"
                            enabled={active}
                            className="web2d-world__buddy"
                        />
                    </div>
                    <div className="web2d-world__title">
                        <h1 id="web2d-world-title">BANMAO</h1>
                        <p>{scene.tagline}</p>
                    </div>
                    <div className="web2d-world__actions">
                        <a className="web2d-action" href="#web2d-explore">
                            <Web2DIcon name="compass" />{scene.explore}<Web2DIcon name="arrow-right" />
                        </a>
                        {reason && <small className="web2d-world__notice">{reason}</small>}
                    </div>
                </section>

                <section className="web2d-explore" id="web2d-explore" aria-labelledby="web2d-explore-title">
                    <h2 id="web2d-explore-title">{scene.chooseZone}</h2>
                    <div className="web2d-selector" role="tablist" aria-labelledby="web2d-explore-title">
                        <div className="web2d-portals" role="presentation">
                            {ZONE_TABS.map((tab) => renderTab(tab, "web2d-portal", (
                                <>
                                    <span className="web2d-portal__art" aria-hidden="true">
                                        <KawaiiSprite
                                            name={ZONES[tab].sprite}
                                            enabled={active}
                                            className="web2d-portal__mascot"
                                        />
                                    </span>
                                    <span className="web2d-portal__caption">
                                        <Web2DIcon name={ZONES[tab].icon} />
                                        <span><strong>{copy.tabs[tab]}</strong><small>{scene.zones[tab]}</small></span>
                                        <Web2DIcon name="chevron-down" />
                                    </span>
                                </>
                            )))}
                        </div>
                        <div className="web2d-selector__extras" role="presentation">
                            {OTHER_TAB_ORDER.map((tab) => renderTab(tab, "web2d-selector__chip", (
                                <><Web2DIcon name={OTHER_TABS[tab]} />{copy.tabs[tab]}</>
                            )))}
                        </div>
                    </div>

                    <div
                        className="web2d-zone-panel"
                        data-zone={activeTab}
                        id="web2d-zone-panel"
                        ref={panelRef}
                        role="tabpanel"
                        aria-labelledby={`web2d-tab-${activeTab}`}
                    >
                        <div className="web2d-zone-panel__heading">
                            <h3><Web2DIcon name={isZone(activeTab) ? ZONES[activeTab].icon : OTHER_TABS[activeTab]} />{copy.tabs[activeTab]}</h3>
                            {zone && (
                                <Link href={ZONES[zone].href} className="web2d-zone-panel__open" prefetch={false}>
                                    {scene.openZone[zone]} <Web2DIcon name="arrow-right" />
                                </Link>
                            )}
                        </div>
                        <ul className="web2d-zone-panel__routes" key={activeTab}>
                            {copy.cards[activeTab].map((card) => (
                                <li key={`${card.href}-${card.label}`}><RouteLink card={card} /></li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="web2d-spirit" aria-labelledby="web2d-spirit-title">
                    <h2 id="web2d-spirit-title">{scene.valuesTitle}</h2>
                    <div className="web2d-spirit__grid">
                        {SPIRIT_SPRITES.map((sprite, index) => (
                            <figure className="web2d-spirit__item" key={sprite}>
                                <KawaiiSprite name={sprite} enabled={active} className="web2d-spirit__mascot" />
                                <figcaption>{scene.values[index]}</figcaption>
                            </figure>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="web2d-end">
                <div className="web2d-end__inner web2d-container">
                    <div className="web2d-end__brand">
                        <KawaiiSprite name="sleepy_footer" enabled={active} className="web2d-end__mascot" />
                        <span><strong>BANMAO</strong><small>© {new Date().getFullYear()} · X LAYER</small></span>
                    </div>
                    <nav className="web2d-end__social" aria-label={copy.tabs.community}>
                        {SOCIAL_LINKS.map((link) => (
                            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                                <Web2DIcon name={link.icon} />
                            </a>
                        ))}
                    </nav>
                    <div className="web2d-end__tools">
                        {active && <HomeShare language={lang} inline />}
                        <button
                            type="button"
                            className="web2d-end__assistant"
                            aria-haspopup="dialog"
                            aria-label={aiText(lang, "ask")}
                            onClick={() => requestAIChatOpen(window)}
                        >
                            <MessageCircleMore aria-hidden="true" /> BANMAO AI
                        </button>
                    </div>
                    <details className="web2d-end__contract">
                        <summary>{scene.contract}</summary>
                        <code>{CONTRACT_ADDRESS}</code>
                    </details>
                </div>
            </footer>
        </div>
    );
}
