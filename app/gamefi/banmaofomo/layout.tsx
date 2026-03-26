/**
 * BanMaoFomo Layout
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "BANMAO FOMO - Last Attacker Wins!",
    description: "FOMO3D-style game on XLayer. Attack to win the jackpot!",
    manifest: "/manifest-gamefi.json",
    openGraph: {
        title: "BANMAO FOMO - Last Attacker Wins!",
        description: "FOMO3D-style game on XLayer. Attack to win the jackpot!",
        type: "website",
    },
};

export const viewport = {
    themeColor: "#000000",
};

export default function BanMaoFomoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
