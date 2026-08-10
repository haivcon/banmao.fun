import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BanmaoBox | Time-Locked BANMAO NFT",
  description:
    "Lock BANMAO in a transferable ERC-721 gift box on X Layer. Gift the NFT and let its current owner open it after the selected unlock time.",
  keywords: [
    "BANMAO",
    "BanmaoBox",
    "NFT vault",
    "time-locked NFT",
    "token gift",
    "X Layer",
    "DeFi",
  ],
  openGraph: {
    title: "BanmaoBox | A gift that waits",
    description:
      "Pack BANMAO into a transferable time-locked NFT gift box on X Layer.",
    type: "website",
    siteName: "BANMAO",
  },
  twitter: {
    card: "summary_large_image",
    title: "BanmaoBox | A gift that waits",
    description:
      "Pack BANMAO into a transferable time-locked NFT gift box on X Layer.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07090f",
  colorScheme: "dark",
};

export default function BanmaoBoxLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}