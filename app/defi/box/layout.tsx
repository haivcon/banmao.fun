import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createStandardViewport } from "../../../lib/responsive/displayStandard";

export const metadata: Metadata = {
  title: "BanmaoBox | Transferable Time-Locked Token Vault",
  description:
    "Pack one or more ERC-20 tokens into a transferable, time-locked NFT on X Layer. Ownership of the assets follows the NFT until its opening time.",
  keywords: [
    "BanmaoBox",
    "ERC-20 vault",
    "NFT vault",
    "time-locked NFT",
    "token gift",
    "multi-token NFT",
    "X Layer",
    "DeFi",
  ],
  openGraph: {
    title: "BanmaoBox | Pack assets. Transfer ownership. Open on time.",
    description:
      "Pack one or more ERC-20 tokens into a transferable, time-locked NFT on X Layer.",
    type: "website",
    siteName: "BANMAO",
  },
  twitter: {
    card: "summary_large_image",
    title: "BanmaoBox | Transferable Time-Locked Token Vault",
    description:
      "Pack one or more ERC-20 tokens into a transferable, time-locked NFT on X Layer.",
  },
};

export const viewport = {
  ...createStandardViewport("#07090f"),
  colorScheme: "dark" as const,
};

export default function BanmaoBoxLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}