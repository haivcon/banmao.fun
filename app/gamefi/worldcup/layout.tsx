import type { Metadata } from "next";
import ScrollEnabler from "./components/ScrollEnabler";

export const metadata: Metadata = {
    title: "World Cup Yield Wars | BANMAO",
    description: "Stake $BANMAO on your favorite World Cup team. Dynamic APY based on match results. Earn more when your team wins!",
    keywords: ["World Cup", "Yield Farming", "GameFi", "DeFi", "BANMAO", "Staking", "XLayer"],
    openGraph: {
        title: "⚽ World Cup Yield Wars | BANMAO",
        description: "32 team pools. Dynamic APY. Stake on winners. Earn big.",
        images: ["/branding/gamefi-logo.jpg"],
    },
    twitter: {
        card: "summary_large_image",
        title: "⚽ World Cup Yield Wars | BANMAO",
        description: "32 team pools. Dynamic APY. Stake on winners. Earn big.",
        images: ["/branding/gamefi-logo.jpg"],
    },
};

export default function WorldCupLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ScrollEnabler />
            {children}
        </>
    );
}
