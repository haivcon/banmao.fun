import { Suspense } from "react";
import type { Metadata } from "next";
import { createPreviewMetadata, SHARING_IMAGES } from "../../../lib/sharing/metadata";
import CollectionClient from "../CollectionClient";

export const metadata: Metadata = createPreviewMetadata(
  "/collection/hub",
  "BanmaoHub | Collection",
  "Share and discover Banmao community creations.",
  SHARING_IMAGES["/collection/hub"],
);

export default function HubPage() {
    return <Suspense fallback={null}><CollectionClient initialViewMode="hub" /></Suspense>;
}
