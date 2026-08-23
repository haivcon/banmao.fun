import type { Metadata } from "next";
import { CollectionExplorerClient } from "./CollectionExplorerClient";

export const metadata: Metadata = {
  title: "BanmaoBox Collection Explorer | X Layer",
  description: "Discover and verify BanmaoBox NFT collections created by the canonical Factory on X Layer.",
};
export default function CollectionExplorerPage() { return <CollectionExplorerClient />; }
