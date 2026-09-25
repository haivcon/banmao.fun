import { createSharingMetadata } from "../../lib/sharing/metadata";
import type { Metadata } from "next";
import { createDesktopViewport } from "../../lib/responsive/displayStandard";
import GameFiLayoutClient from "./GameFiLayoutClient";

export const viewport = createDesktopViewport("#22d3ee");

export const metadata: Metadata = {
  ...createSharingMetadata("/gamefi"),
    keywords: ["BANMAO", "GameFi", "Blockchain Games", "Crypto Gaming", "XLayer", "Web3 Games"],
    manifest: "/manifest-gamefi.json",
    icons: {
        icon: [
            { url: "/pwa/gamefi/gamefi-icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/pwa/gamefi/gamefi-icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
    },
};

export default function GameFiLayout({ children }: { children: React.ReactNode }) {
    return <GameFiLayoutClient>{children}</GameFiLayoutClient>;
}
