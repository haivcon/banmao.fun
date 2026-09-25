import type { Metadata } from "next";
import { getShareUrl, sharingPages, type SharingPath } from "./content";

/** Explicit empty image lists prevent generic parent images leaking into previews. */
export function createSharingMetadata(path: SharingPath): Metadata {
  const { title, description } = sharingPages[path];
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "BANMAO",
      url: getShareUrl(path),
      title,
      description,
      images: [],
    },
    twitter: {
      card: "summary",
      site: "@banmao_X",
      creator: "@banmao_X",
      title,
      description,
      images: [],
    },
  };
}
