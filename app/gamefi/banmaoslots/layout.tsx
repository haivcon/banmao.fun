import type { Metadata, Viewport } from "next";
// NOTE: We don't wrap with SharedProviders here because the parent
// GameFiLayoutClient already provides it. This prevents duplicate WalletConnect initialization.

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 0.45,
    minimumScale: 0.3,
    maximumScale: 3.0,
    userScalable: true,
    themeColor: '#0a0a1a',
};

export const metadata: Metadata = {
    title: "BANMAO SLOTS | GameFi",
    description: "Play the provably fair slot machine and win $BANMAO tokens! Progressive jackpot and instant payouts.",
    keywords: ["slots", "slot machine", "crypto casino", "BANMAO", "GameFi", "Web3 gaming"],
};

export default function BanmaoSlotsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
