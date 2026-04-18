import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Airdrop | BANMAO",
    description: "Participate in the BANMAO ecosystem airdrop events.",
    openGraph: {
        title: "Airdrop | BANMAO",
        description: "Participate in the BANMAO ecosystem airdrop events.",
        images: ["/images/burn-3d/airdrop-gift.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "Airdrop | BANMAO",
        description: "Participate in the BANMAO ecosystem airdrop events.",
        images: ["/images/burn-3d/airdrop-gift.png"],
    }
};

export default function AirdropLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
