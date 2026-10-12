import type { Metadata } from "next";
import { createPreviewMetadata, SHARING_IMAGES } from "../../../../../lib/sharing/metadata";
import { CollectionDetailClient } from "../CollectionDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  return createPreviewMetadata(
    `/defi/box/explorer/${encodeURIComponent(address)}`,
    "Collection details | BanmaoBox Explorer",
    "Discover and verify BanmaoBox NFT collections created by the canonical Factory on X Layer.",
    SHARING_IMAGES["/defi/box/explorer"],
  );
}
export default async function CollectionDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <CollectionDetailClient address={address} />;
}
