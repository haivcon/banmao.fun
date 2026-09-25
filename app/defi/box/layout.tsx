import { createSharingMetadata } from "../../../lib/sharing/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createDesktopViewport } from "../../../lib/responsive/displayStandard";

export const metadata: Metadata = {
  ...createSharingMetadata("/defi/box"),
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
};

export const viewport = {
  ...createDesktopViewport("#07090f"),
  colorScheme: "dark" as const,
};

export default function BanmaoBoxLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}