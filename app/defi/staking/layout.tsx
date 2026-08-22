import type { Metadata } from "next";
import { createStandardViewport } from "../../../lib/responsive/displayStandard";
import StakingLayoutClient from "./StakingLayoutClient";

export const viewport = createStandardViewport("#00d4ff");

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
