import { createSharingMetadata } from "../../../lib/sharing/metadata";
import type { Metadata } from "next";
import { createDesktopViewport } from "../../../lib/responsive/displayStandard";

export const viewport = createDesktopViewport("#090b0d");

export const metadata: Metadata = {
  ...createSharingMetadata("/collection/banmaoking"),
  robots: { index: false, follow: false },
};

export default function BanmaoKingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
