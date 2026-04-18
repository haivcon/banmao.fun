// app/layout.tsx
import "./landing.css";
import type { Metadata } from "next";
import { Noto_Sans, Orbitron, Rajdhani, Share_Tech_Mono, Space_Mono } from "next/font/google";

export const metadata: Metadata = {
  metadataBase: new URL("https://banmao.fun"),
  title: "BANMAO — XLayer Gaming Ecosystem",
  description: "Experience the future of blockchain gaming on XLayer. Play Rock-Paper-Scissors, stake $BANMAO tokens, and compete for rewards in our immersive 3D ecosystem.",
  keywords: ["BANMAO", "XLayer", "Blockchain Gaming", "Web3", "Crypto Game", "NFT", "DeFi Gaming"],
  authors: [{ name: "BANMAO Team" }],
  creator: "BANMAO",

  // Note: manifest is set by each sub-app layout for proper PWA install

    openGraph: {
        type: "website",
        locale: "en_US",
        alternateLocale: ["vi_VN", "ko_KR", "zh_CN", "ru_RU", "id_ID"],
        url: "https://banmao.fun",
        siteName: "BANMAO Gaming",
        title: "BANMAO — XLayer Gaming Ecosystem",
        description: "Experience the future of blockchain gaming on XLayer. Play, stake, and win in our immersive 3D ecosystem.",
        images: [
            {
                url: "/branding/banmao_logo.png",
                width: 512,
                height: 512,
                alt: "BANMAO Logo",
            },
        ],
    },

    // Twitter Cards
    twitter: {
        card: "summary_large_image",
        site: "@banmao_X",
        creator: "@banmao_X",
        title: "BANMAO — XLayer Gaming Ecosystem",
        description: "Experience the future of blockchain gaming on XLayer. Play, stake, and win in our immersive 3D ecosystem.",
        images: ["/branding/banmao_logo.png"],
    },

  // App metadata
  applicationName: "BANMAO",
  category: "Game",

  // Icons - Enhanced for PWA
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/pwa/main/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/main/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/pwa/main/icon-maskable-512x512.png", color: "#a855f7" },
    ],
  },

  // Apple PWA specific
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BANMAO",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
  },

  // Additional PWA meta
  other: {
    "mobile-web-app-capable": "yes",
    "theme-color": "#a855f7",
    "msapplication-TileColor": "#000000",
    "msapplication-TileImage": "/pwa/main/icon-144x144.png",
  },
};

const noto = Noto_Sans({
  subsets: ["latin", "latin-ext", "vietnamese", "cyrillic"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});
const shareTech = Share_Tech_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-share-tech",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${noto.variable} ${orbitron.variable} ${rajdhani.variable} ${shareTech.variable} ${spaceMono.variable}`}>
      <head>
        {/* Viewport for mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        {/* Early PWA: inject manifest and capture install prompt BEFORE browser checks */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 1. Detect current path and inject correct manifest
              (function() {
                var path = window.location.pathname;
                var manifest = '/manifest.json'; // default
                
                if (path.indexOf('/gamefi/banmaorps') === 0) {
                  manifest = '/manifest-game.json';
                } else if (path.indexOf('/gamefi/banmaosnake') === 0) {
                  manifest = '/manifest-snake.json';
                } else if (path.indexOf('/gamefi') === 0) {
                  manifest = '/manifest-gamefi.json';
                } else if (path.indexOf('/collection') === 0) {
                  manifest = '/manifest-collection.json';
                }
                
                // Create manifest link if not exists
                var existing = document.querySelector('link[rel="manifest"]');
                if (!existing) {
                  var link = document.createElement('link');
                  link.rel = 'manifest';
                  link.href = manifest;
                  document.head.appendChild(link);
                }
                console.log('[PWA] Manifest set to:', manifest);
              })();
              
              // 2. Capture install prompt
              window.__pwaInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaInstallPrompt = e;
                console.log('[PWA] Install prompt captured!');
                // Dispatch custom event so React can listen
                window.dispatchEvent(new Event('pwaPromptReady'));
              });
            `,
          }}
        />
      </head>
      <body className={spaceMono.className}>{children}</body>
    </html>
  );
}
