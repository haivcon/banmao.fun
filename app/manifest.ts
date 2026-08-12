import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "BANMAO — XLayer Gaming Ecosystem",
        short_name: "BANMAO",
        description: "Play, stake, and explore the BANMAO gaming ecosystem on XLayer.",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#a855f7",
        icons: [
            {
                src: "/pwa/main/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/pwa/main/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/pwa/main/icon-maskable-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
