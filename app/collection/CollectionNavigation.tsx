"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Crown, Images, MessageCircle } from "lucide-react";
import { useHubStore } from "./stores/useHubStore";
import "./collection-navigation.css";

export default function CollectionNavigation() {
    const pathname = usePathname();
    // Route changes remount the disclosure, including browser back/forward.
    return <SectionMenu key={pathname} pathname={pathname} />;
}

function SectionMenu({ pathname }: { pathname: string }) {
    const theme = useHubStore(state => state.theme);
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const id = useId();
    const links = [
        { href: "/collection/gallery", label: "Gallery", Icon: Images },
        { href: "/collection/hub", label: "Hub", Icon: MessageCircle },
        { href: "/collection/banmaoking", label: "BanmaoKing", Icon: Crown },
    ];
    const isOverview = pathname === "/collection";
    const current = links.find(link => pathname === link.href) || { label: "Collection", Icon: Images };
    const Icon = current.Icon;

    useEffect(() => {
        const header = root.current?.closest<HTMLElement>(".collection-compact-header");
        const page = header?.parentElement;
        if (!header || !page) return;
        const measure = () => page.style.setProperty("--collection-header-height", `${header.getBoundingClientRect().height}px`);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(header);
        return () => { observer.disconnect(); page.style.removeProperty("--collection-header-height"); };
    }, []);

    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [open]);

    return <nav ref={root} className="collection-switcher" data-theme={theme} aria-label="Collection"
        onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }} onKeyDown={event => {
            if (event.key === "Escape" && open) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                trigger.current?.focus();
            }
        }}>
        {!isOverview && <Link href="/collection" prefetch={false} className="collection-switcher__back" aria-label="Collection" title="Collection"><ArrowLeft size={18} aria-hidden="true" /></Link>}
        <button ref={trigger} type="button" className="collection-switcher__trigger"
            aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
            <Icon size={16} aria-hidden="true" /><span>{current.label}</span><ChevronDown size={14} aria-hidden="true" />
        </button>
        {open && <div id={id} className="collection-switcher__panel">
            {links.map(({ href, label, Icon: ItemIcon }) => <Link key={href} href={href} prefetch={false}
                aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>
                <ItemIcon size={16} aria-hidden="true" /><span>{label}</span>
                {pathname === href && <Check size={15} className="collection-switcher__check" aria-hidden="true" />}
            </Link>)}
            <Link href="/collection" prefetch={false} className="collection-switcher__overview" onClick={() => setOpen(false)}><ArrowLeft size={16} aria-hidden="true" /><span>Collection</span></Link>
        </div>}
    </nav>;
}
