// app/gamefi/banmaorps/layout.tsx
// Server layout with proper manifest metadata for PWA install

import type { Metadata } from "next";
import { createDesktopViewport } from "../../../lib/responsive/displayStandard";
import GameLayoutClient from "./GameLayoutClient";

export const viewport = createDesktopViewport("#FFD700");

export const metadata: Metadata = {
    title: "BANMAO RPS",
    description: "Play Rock–Paper–Scissors using $BANMAO on XLayer",
    manifest: "/manifest-game.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "BANMAO RPS",
    },
    icons: {
        icon: [
            { url: "/games/rps/rps-icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/games/rps/rps-icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
            { url: "/games/rps/rps-icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
    },

    openGraph: {
        title: "$banmao+RPS",
        description: "Play Rock-Paper-Scissors and collect $BANMAO tokens on XLayer",
        images: ["/games/rps/rps-icon-512x512.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "$banmao+RPS",
        description: "Play Rock-Paper-Scissors and collect $BANMAO tokens on XLayer",
        images: ["/games/rps/rps-icon-512x512.png"],
    },
};


export default function GameLayout({ children }: { children: React.ReactNode }) {
    return <GameLayoutClient>{children}</GameLayoutClient>;
}
