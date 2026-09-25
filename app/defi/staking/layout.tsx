import { createSharingMetadata } from "../../../lib/sharing/metadata";
import type { Metadata } from "next";
import { createStandardViewport } from "../../../lib/responsive/displayStandard";
import StakingLayoutClient from "./StakingLayoutClient";

export const viewport = createStandardViewport("#00d4ff");

export const metadata: Metadata = {
  ...createSharingMetadata("/defi/staking"),
    keywords: ["BANMAO", "Staking", "DeFi", "Crypto Staking", "XLayer", "Token Lock"],
};


export default function StakingLayout({ children }: { children: React.ReactNode }) {
    return <StakingLayoutClient>{children}</StakingLayoutClient>;
}
