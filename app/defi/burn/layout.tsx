import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Burn Contributions | BANMAO DeFi",
    description: "Track and contribute to $BANMAO token burns. View the leaderboard of top burners.",
    keywords: ["BANMAO", "burn", "token burn", "DeFi", "contribution"],

    openGraph: {
        title: "Burn Portal | BANMAO",
        description: "Burn XBot Node Keys to receive $BANMAO Airdrop Points.",
        images: ["/images/burn-3d/burn-torch.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "Burn Portal | BANMAO",
        description: "Burn XBot Node Keys to receive $BANMAO Airdrop Points.",
        images: ["/images/burn-3d/burn-torch.png"],
    },
};


export default function BurnLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // NOTE: Don't wrap with providers - parent DeFiLayoutClient already provides them
    return <>{children}</>;
}
