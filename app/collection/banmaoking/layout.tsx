import type { Metadata } from "next";
import { createDesktopViewport } from "../../../lib/responsive/displayStandard";

export const viewport = createDesktopViewport("#090b0d");

export const metadata: Metadata = {
  title: "Banmao King — On-chain Collection Preview",
  description:
    "Development preview of the immutable, fully on-chain Banmao King NFT collection.",
  robots: { index: false, follow: false },
};

export default function BanmaoKingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
