import type { Metadata } from "next";
import { CollectionDetailClient } from "../CollectionDetailClient";

export const metadata: Metadata = { title: "Collection details | BanmaoBox Explorer" };
export default async function CollectionDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <CollectionDetailClient address={address} />;
}
