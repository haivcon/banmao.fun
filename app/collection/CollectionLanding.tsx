"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useHubStore } from "./stores/useHubStore";
import { saveCollectionTheme } from "./CollectionPreferences";
import { ArrowUpRight, Crown, Images, MessageCircle, Heart, Sparkles, Sun, Moon } from "lucide-react";
import CollectionLanguageSelector from "./CollectionLanguageSelector";
import CollectionNavigation from "./CollectionNavigation";
import { landingCopy, landingDetails } from "./landingCopy";
import { T } from "./i18n";
import "./collection-landing.css";

function CardAction({ label, opening }: { label: string; opening: string }) {
    const { pending } = useLinkStatus();
    return <span className="collection-entry__cta" data-pending={pending}>
        <span role="status" aria-live="polite">{pending ? opening : label}</span>
        {pending ? <span className="collection-entry__spinner" aria-hidden="true" /> : <ArrowUpRight size={20} aria-hidden="true" />}
    </span>;
}

export default function CollectionLanding() {
    const lang = useHubStore(state => state.lang);
    const theme = useHubStore(state => state.theme);
    const light = theme === "light";
    useEffect(() => {
        if (window.location.hash.startsWith("#share=")) {
            window.location.replace(`/collection/gallery${window.location.hash}`);
            return;
        }

    }, []);
    const copy = landingCopy[lang];
    const details = landingDetails[lang];
    const cards = [
        { id: "gallery", title: copy.images, description: copy.imagesDesc, label: "MEDIA LIBRARY", Icon: Images },
        { id: "hub", title: "Hub", description: copy.hubDesc, label: "COMMUNITY", Icon: MessageCircle },
        { id: "banmaoking", title: "BanmaoKing", description: copy.kingDesc, label: "NFT STUDIO", Icon: Crown },
    ] as const;
    return <main className={`collection-landing${light ? " collection-landing--light" : ""}`} lang={lang}>
        <div className="collection-landing__shell">
            <header className="collection-landing__header">
                <div className="collection-landing__navigation">
                    <Link href="/" className="collection-landing__brand"><Sparkles aria-hidden="true" /> BANMAO</Link>
                    <CollectionNavigation />
                </div>
                <div className="collection-landing__settings">
                    <CollectionLanguageSelector />
                    <button type="button" aria-label={light ? "Dark theme" : "Light theme"} onClick={() => {
                        saveCollectionTheme(light ? "dark" : "light");
                    }}>{light ? <Moon size={20} /> : <Sun size={20} />}</button>
                </div>
            </header>
            <section className="collection-landing__intro">
                <span className="collection-landing__eyebrow">BANMAO · CREATIVE UNIVERSE</span>
                <h1>{copy.title}</h1><p>{copy.subtitle}</p>
            </section>
            <div className="collection-landing__grid">
                {cards.map(({ id, title, description, label, Icon }, index) => <Link prefetch={false} href={`/collection/${id}`} key={id} className={`collection-entry collection-entry--${id}`}>
                    <div className="collection-entry__art" aria-hidden="true">
                        <span className="collection-entry__number">0{index + 1} / {label}</span>
                        {id === "gallery" ? <div className="collection-entry__photos"><Image src="/branding/banmao-hero.jpg" width={120} height={132} alt="" /><Image src="/branding/banmao_logo.png" width={120} height={132} alt="" /><Image src="/branding/gamefi-logo.jpg" width={120} height={132} alt="" /></div>
                            : id === "hub" ? <div className="collection-entry__community"><span><MessageCircle size={32} /></span><Image src="/branding/banmao_logo.png" width={100} height={100} alt="" /><span><Heart size={28} /></span></div>
                                : <div className="collection-entry__crown"><Crown size={96} strokeWidth={1.1} /><span>BANMAO KING</span><small>THEME LAB · X LAYER</small></div>}
                    </div>
                    <div className="collection-entry__content">
                        <h2><Icon size={23} aria-hidden="true" />{title}</h2>
                        <p>{description} {details[id].note}</p>
                        <ul className="collection-entry__tags">{details[id].tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
                        <CardAction label={details[id].action} opening={details.opening} />
                    </div>
                </Link>)}
            </div>
            <footer className="collection-landing__footer"><Link href="/">← {T[lang].home}</Link><span>banmao.fun</span><Link href="/gamefi">GameFi ↗</Link></footer>
        </div>
    </main>;
}
