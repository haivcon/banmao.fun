import type { Metadata, Viewport } from "next";
import StakingLayoutClient from "./StakingLayoutClient";

// Match the shared DeFi density exactly so entering or leaving Staking never
// changes zoom. Small phones get a roughly 1000px-wide workspace at 0.375.
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 0.375,
    minimumScale: 0.375,
    userScalable: true,
    themeColor: "#00d4ff",
};

export const metadata: Metadata = {
    title: "Staking | BANMAO",
    description: "Lock your $BANMAO tokens to earn rewards. Flexible and fixed staking pools with up to 75% APY.",
    keywords: ["BANMAO", "Staking", "DeFi", "Crypto Staking", "XLayer", "Token Lock"],

    openGraph: {
        title: "Staking | BANMAO",
        description: "Stake your $BANMAO tokens and earn rewards.",
        images: ["/icons/icon_stake.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "Staking | BANMAO",
        description: "Stake your $BANMAO tokens and earn rewards.",
        images: ["/icons/icon_stake.png"],
    },
};


export default function StakingLayout({ children }: { children: React.ReactNode }) {
    return <StakingLayoutClient>{children}</StakingLayoutClient>;
}
