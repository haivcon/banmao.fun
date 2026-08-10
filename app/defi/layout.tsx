import type { Metadata, Viewport } from "next";
import DeFiLayoutClient from "./DeFiLayoutClient";

// Use one ultra-dense viewport across every DeFi route. A 0.375 initial scale
// gives small phones a roughly 1000px-wide workspace while navigation, portals
// and module content continue to share one coordinate system.
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 0.375,
    minimumScale: 0.375,
    userScalable: true,
    themeColor: "#05070d",
};

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
