// app/gamefi/banmaosnake/layout.tsx
// Server layout with proper manifest metadata for PWA install

import type { Metadata } from "next";
import SnakeLayoutClient from "./SnakeLayoutClient";

export const metadata: Metadata = {
    title: "$banmao+snake",
    description: "Play Snake game and collect $BANMAO tokens on XLayer",
    manifest: "/manifest-snake.json",
    themeColor: "#22d3ee",
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
