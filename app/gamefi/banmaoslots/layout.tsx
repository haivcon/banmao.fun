import type { Metadata } from "next";
import { createStandardViewport } from "../../../lib/responsive/displayStandard";
// NOTE: We don't wrap with SharedProviders here because the parent
// GameFiLayoutClient already provides it. This prevents duplicate WalletConnect initialization.

export const dynamic = 'force-dynamic';

export const viewport = createStandardViewport("#0a0a1a");

export const metadata: Metadata = {
    title: "BANMAO SLOTS | GameFi",
    description: "Play the provably fair slot machine and win $BANMAO tokens! Progressive jackpot and instant payouts.",
    keywords: ["slots", "slot machine", "crypto casino", "BANMAO", "GameFi", "Web3 gaming"],

    openGraph: {
        title: "$banmao+slots",
        description: "Spin the reels and win $BANMAO tokens on XLayer",
        images: ["/games/slots/slots-icon.jpg"],
    },
    twitter: {
        card: "summary_large_image",
        title: "$banmao+slots",
        description: "Spin the reels and win $BANMAO tokens on XLayer",
        images: ["/games/slots/slots-icon.jpg"],
    },
};


export default function BanmaoSlotsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
