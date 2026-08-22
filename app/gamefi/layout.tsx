import type { Metadata } from "next";
import { createStandardViewport } from "../../lib/responsive/displayStandard";
import GameFiLayoutClient from "./GameFiLayoutClient";

export const viewport = createStandardViewport("#22d3ee");

export const metadata: Metadata = {
    title: "GameFi Zone | BANMAO",
    description: "Explore blockchain games on BANMAO ecosystem. Play Rock-Paper-Scissors, Snake and more crypto games on XLayer.",
    keywords: ["BANMAO", "GameFi", "Blockchain Games", "Crypto Gaming", "XLayer", "Web3 Games"],
    manifest: "/manifest-gamefi.json",
    icons: {
        icon: [
            { url: "/pwa/gamefi/gamefi-icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/pwa/gamefi/gamefi-icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
    },
    openGraph: {
        title: "GameFi Zone | BANMAO",
        description: "Explore blockchain games on BANMAO ecosystem. Play Rock-Paper-Scissors, Snake and more crypto games on XLayer.",
        images: ["/branding/gamefi-logo.jpg"],
    },
    twitter: {
        card: "summary_large_image",
        title: "GameFi Zone | BANMAO",
        description: "Explore blockchain games on BANMAO ecosystem. Play Rock-Paper-Scissors, Snake and more crypto games on XLayer.",
        images: ["/branding/gamefi-logo.jpg"],
    }
};

export default function GameFiLayout({ children }: { children: React.ReactNode }) {
    return <GameFiLayoutClient>{children}</GameFiLayoutClient>;
}
