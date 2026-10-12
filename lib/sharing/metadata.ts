import type { Metadata } from "next";
import { getShareUrl, sharingPages, type SharingPath } from "./content";

export const SHARING_IMAGE = {
  url: "https://banmao.fun/social/banmao-introduction-v1.png",
  width: 1200,
  height: 630,
  alt: "BANMAO — Come explore. NFTs, games and on-chain experiences on X Layer, with the banana-cat mascot.",
  type: "image/png",
};

function previewImage(name: string, subject: string): typeof SHARING_IMAGE {
  return { ...SHARING_IMAGE, url: `https://banmao.fun/social/${name}-v1.png`, alt: `BANMAO — ${subject}. Branded page preview on X Layer.` };
}

export const SHARING_IMAGES = {
  "/": SHARING_IMAGE,
  "/collection": previewImage("collection", "Collection"),
  "/collection/gallery": previewImage("gallery", "Gallery and stickers"),
  "/collection/banmaoking": previewImage("banmaoking", "Banmao King NFT collection"),
  "/collection/hub": previewImage("hub", "Community creations"),
  "/defi": previewImage("defi", "DeFi tools"),
  "/defi/staking": previewImage("staking", "Staking pools"),
  "/defi/airdrop": previewImage("airdrop", "Airdrop events"),
  "/defi/burn": previewImage("burn", "Community token burns"),
  "/defi/box": previewImage("box", "BanmaoBox time-locked NFTs"),
  "/defi/box/explorer": previewImage("explorer", "BanmaoBox collection explorer"),
  "/defi/launchpad": previewImage("launchpad", "Memecoin Launchpad"),
  "/gamefi": previewImage("gamefi", "GameFi"),
  "/gamefi/banmaorps": previewImage("rps", "Rock, paper, scissors"),
  "/gamefi/banmaosnake": previewImage("snake", "Snake"),
  "/gamefi/banmaoslots": previewImage("slots", "Slots"),
  "/gamefi/banmaofomo": previewImage("fomo", "FOMO"),
} satisfies Record<SharingPath, typeof SHARING_IMAGE> & Record<string, typeof SHARING_IMAGE>;

export function createPreviewMetadata(url: string, title: string, description: string, image = SHARING_IMAGE): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "BANMAO",
      url: new URL(url, "https://banmao.fun").href,
      title,
      description,
      images: [{ ...image }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@banmao_X",
      creator: "@banmao_X",
      title,
      description,
      images: [{ ...image }],
    },
  };
}

/** Route-specific artwork, independent of the share-control registry. */
export function createSharingMetadata(path: SharingPath): Metadata {
  const { title, description } = sharingPages[path];
  return createPreviewMetadata(getShareUrl(path), title, description, SHARING_IMAGES[path]);
}
