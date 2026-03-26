import type { Metadata, Viewport } from "next";
import StakingLayoutClient from "./StakingLayoutClient";

// True responsive viewport - adapts to device screen size
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    userScalable: true,
};

export const metadata: Metadata = {
    title: "Staking | BANMAO",
    description: "Lock your $BANMAO tokens to earn rewards. Flexible and fixed staking pools with up to 75% APY.",
    keywords: ["BANMAO", "Staking", "DeFi", "Crypto Staking", "XLayer", "Token Lock"],
    themeColor: "#00d4ff",
};

export default function StakingLayout({ children }: { children: React.ReactNode }) {
    return <StakingLayoutClient>{children}</StakingLayoutClient>;
}
