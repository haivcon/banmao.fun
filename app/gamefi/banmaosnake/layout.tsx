import { createSharingMetadata } from "../../../lib/sharing/metadata";
// app/gamefi/banmaosnake/layout.tsx
// Server layout with proper manifest metadata for PWA install

import type { Metadata } from "next";
import { createStandardViewport } from "../../../lib/responsive/displayStandard";
import SnakeLayoutClient from "./SnakeLayoutClient";

export const viewport = createStandardViewport("#22d3ee");

export const metadata: Metadata = {
  ...createSharingMetadata("/gamefi/banmaosnake"),
    manifest: "/manifest-snake.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "$banmao+snake",
    },
    icons: {
        icon: [
            { url: "/games/snake/snake-icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/games/snake/snake-icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
            { url: "/games/snake/snake-icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
    },
};

export default function SnakeLayout({ children }: { children: React.ReactNode }) {
    return <SnakeLayoutClient>{children}</SnakeLayoutClient>;
}
