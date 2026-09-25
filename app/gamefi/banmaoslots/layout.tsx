import { createSharingMetadata } from "../../../lib/sharing/metadata";
import type { Metadata } from "next";
import { createDesktopViewport } from "../../../lib/responsive/displayStandard";
// NOTE: We don't wrap with SharedProviders here because the parent
// GameFiLayoutClient already provides it. This prevents duplicate WalletConnect initialization.

export const dynamic = 'force-dynamic';

export const viewport = createDesktopViewport("#0a0a1a");

export const metadata: Metadata = {
  ...createSharingMetadata("/gamefi/banmaoslots"),
    keywords: ["slots", "slot machine", "crypto casino", "BANMAO", "GameFi", "Web3 gaming"],
};


export default function BanmaoSlotsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
