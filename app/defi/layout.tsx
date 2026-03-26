import type { Metadata, Viewport } from "next";
import DeFiLayoutClient from "./DeFiLayoutClient";

// Force desktop-like viewport on mobile for consistent dApp experience
export const viewport: Viewport = {
    width: 700,
    initialScale: 0.5,
    userScalable: true,
};

export const metadata: Metadata = {
    title: "DeFi Hub | BANMAO",
    description: "Explore DeFi services on BANMAO ecosystem. Staking, pools, and more on XLayer.",
    keywords: ["BANMAO", "DeFi", "Staking", "Token Lock", "XLayer", "Web3"],
    themeColor: "#00d4ff",
};

export default function DeFiLayout({ children }: { children: React.ReactNode }) {
    return <DeFiLayoutClient>{children}</DeFiLayoutClient>;
}
