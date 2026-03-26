// components/pwa/ManifestSelector.tsx
"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MANIFEST_MAP: Record<string, string> = {
    "/gamefi/banmaorps": "/manifest-game.json",
    "/gamefi/banmaosnake": "/manifest-snake.json",
    "/gamefi/banmaoslots": "/manifest-slots.json",
    "/gamefi": "/manifest-gamefi.json",
    "/": "/manifest.json",
};

export default function ManifestSelector() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;

        // Find the most specific matching manifest
        let manifestPath = "/manifest.json"; // default
        for (const [route, manifest] of Object.entries(MANIFEST_MAP)) {
            if (pathname.startsWith(route) && route !== "/") {
                manifestPath = manifest;
                break;
            }
        }

        // Update manifest link
        let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (!manifestLink) {
            manifestLink = document.createElement("link");
            manifestLink.rel = "manifest";
            document.head.appendChild(manifestLink);
        }

        if (manifestLink.href !== manifestPath) {
            manifestLink.href = manifestPath;
            console.log("[PWA] Manifest set to:", manifestPath);
        }
    }, [pathname]);

    return null;
}
