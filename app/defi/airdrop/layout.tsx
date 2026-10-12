import { createDesktopViewport } from "../../../lib/responsive/displayStandard";
export const viewport = createDesktopViewport("#05070d");
import { createSharingMetadata } from "../../../lib/sharing/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...createSharingMetadata("/defi/airdrop"),
};

export default function AirdropLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
