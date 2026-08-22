import type { Metadata } from "next";
import { createDesktopViewport } from "../../lib/responsive/displayStandard";
import DeFiLayoutClient from "./DeFiLayoutClient";

export const viewport = createDesktopViewport("#05070d");

export const metadata: Metadata = {
    title: "DeFi Hub | BANMAO",
    description: "Explore DeFi services on BANMAO ecosystem. Staking, pools, and more on XLayer.",
    keywords: ["BANMAO", "DeFi", "Staking", "Token Lock", "XLayer", "Web3"],

    openGraph: {
        title: "DeFi Hub | BANMAO",
        description: "Explore DeFi services on BANMAO ecosystem. Staking, pools, and more on XLayer.",
        images: ["/icons/icon_stats.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "DeFi Hub | BANMAO",
        description: "Explore DeFi services on BANMAO ecosystem. Staking, pools, and more on XLayer.",
        images: ["/icons/icon_stats.png"],
    },
};


export default function DeFiLayout({ children }: { children: React.ReactNode }) {
    return <DeFiLayoutClient>{children}</DeFiLayoutClient>;
}
