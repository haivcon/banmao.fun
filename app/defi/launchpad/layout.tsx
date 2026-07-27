import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
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
    robots: {
        index: false,
        follow: false,
        noarchive: true,
    },
};

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
    if (process.env.NODE_ENV !== "development") {
        notFound();
    }

    return (
        <ThemeProvider>
            <I18nProvider>
                <div
                    role="status"
                    style={{
                        position: "relative",
                        zIndex: 1160,
                        display: "flex",
                        minHeight: "34px",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 16px",
                        borderBottom: "1px solid rgba(245, 158, 11, 0.28)",
                        background: "rgba(120, 53, 15, 0.2)",
                        color: "#fcd34d",
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textAlign: "center",
                        textTransform: "uppercase",
                    }}
                >
                    🚧 Launchpad đang triển khai · Chỉ khả dụng trên môi trường local
                </div>
                {children}
            </I18nProvider>
        </ThemeProvider>
    );
}
