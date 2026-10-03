import type { Metadata } from "next";
import { createPreviewMetadata, SHARING_IMAGES } from "../../../../lib/sharing/metadata";
import { CollectionExplorerClient } from "./CollectionExplorerClient";

export const metadata: Metadata = createPreviewMetadata(
  "/defi/box/explorer",
  "BanmaoBox Collection Explorer | X Layer",
  "Discover and verify BanmaoBox NFT collections created by the canonical Factory on X Layer.",
  SHARING_IMAGES["/defi/box/explorer"],
);
export default function CollectionExplorerPage() { return <CollectionExplorerClient />; }
