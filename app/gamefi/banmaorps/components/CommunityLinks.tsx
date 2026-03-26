/**
 * CommunityLinks Component
 * Links to community resources (Docs, Telegram, X/Twitter)
 */

"use client";

import React from "react";
import { IconDocs, IconTelegram, IconX } from "./Icons";

// Use any type for t to avoid strict type checking issues
export interface CommunityLinksProps {
    t: any;
    docsUrl: string;
    telegramUrl: string;
    xUrl: string;
    className?: string;
}

export default function CommunityLinks({
    t,
    docsUrl,
    telegramUrl,
    xUrl,
    className = "",
}: CommunityLinksProps) {
    const docsLabel = t?.communityLinkDocsLabel ?? t?.communityLinkDocs ?? "Docs";
    const telegramLabel = t?.communityLinkTelegramLabel ?? t?.communityLinkTelegram ?? "Telegram";
    const xLabel = t?.communityLinkXLabel ?? t?.communityLinkX ?? "X";

    return (
        <div className={`community-links ${className}`}>
            <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="community-link community-link--docs"
                title={docsLabel}
            >
                <IconDocs width={18} height={18} />
                <span>{docsLabel}</span>
            </a>
            <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="community-link community-link--telegram"
                title={telegramLabel}
            >
                <IconTelegram width={18} height={18} />
                <span>{telegramLabel}</span>
            </a>
            <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="community-link community-link--x"
                title={xLabel}
            >
                <IconX width={18} height={18} />
                <span>{xLabel}</span>
            </a>
        </div>
    );
}
