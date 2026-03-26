import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Burn Contributions | BANMAO DeFi",
    description: "Track and contribute to $BANMAO token burns. View the leaderboard of top burners.",
    keywords: ["BANMAO", "burn", "token burn", "DeFi", "contribution"],
};

export default function BurnLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // NOTE: Don't wrap with providers - parent DeFiLayoutClient already provides them
    return <>{children}</>;
}
