import { createSharingMetadata } from "../../../lib/sharing/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...createSharingMetadata("/defi/burn"),
    keywords: ["BANMAO", "burn", "token burn", "DeFi", "contribution"],
};


export default function BurnLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // NOTE: Don't wrap with providers - parent DeFiLayoutClient already provides them
    return <>{children}</>;
}
