import type { Metadata, Viewport } from "next";
import DeFiLayoutClient from "./DeFiLayoutClient";

// Use one native responsive viewport across every DeFi route. Individual
// modules adapt through CSS breakpoints, so navigating between tabs never
// changes the browser zoom level or the coordinate system used by portals.
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
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
