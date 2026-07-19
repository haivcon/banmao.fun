import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./theme/ThemeContext";
import { I18nProvider } from "./i18n/I18nContext";

export const viewport: Viewport = {
    width: 700,
    initialScale: 0.5,
    userScalable: true,
    themeColor: "#f59e0b",
};

export const metadata: Metadata = {
    title: "Memecoin Launchpad | BANMAO",
    description: "Create and trade memecoins on XLayer. Bonding curve pricing with Uniswap V4 graduation. Powered by $BANMAO.",
    keywords: ["BANMAO", "Memecoin", "Launchpad", "XLayer", "Uniswap V4", "Bonding Curve", "DeFi"],
    openGraph: {
        title: "Memecoin Launchpad | BANMAO",
        description: "Create and trade memecoins on XLayer. Bonding curve pricing with Uniswap V4 graduation.",
        images: ["/icons/icon_stats.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "Memecoin Launchpad | BANMAO",
        description: "Create and trade memecoins on XLayer. Bonding curve pricing with Uniswap V4 graduation.",
        images: ["/icons/icon_stats.png"],
    },
};

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <I18nProvider>
                {children}
            </I18nProvider>
        </ThemeProvider>
    );
}
