import { createSharingMetadata } from "../../../lib/sharing/metadata";
/**
 * BanMaoFomo Layout
 */
import type { Metadata } from "next";
import { createStandardViewport } from "../../../lib/responsive/displayStandard";

export const metadata: Metadata = {
  ...createSharingMetadata("/gamefi/banmaofomo"),
    manifest: "/manifest-gamefi.json",
};

export const viewport = createStandardViewport("#000000");

export default function BanMaoFomoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
