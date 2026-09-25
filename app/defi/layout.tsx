import { createSharingMetadata } from "../../lib/sharing/metadata";
import type { Metadata } from "next";
import { createDesktopViewport } from "../../lib/responsive/displayStandard";
import DeFiLayoutClient from "./DeFiLayoutClient";

export const viewport = createDesktopViewport("#05070d");

export const metadata: Metadata = {
  ...createSharingMetadata("/defi"),
    keywords: ["BANMAO", "DeFi", "Staking", "Token Lock", "XLayer", "Web3"],
};


export default function DeFiLayout({ children }: { children: React.ReactNode }) {
    return <DeFiLayoutClient>{children}</DeFiLayoutClient>;
}
