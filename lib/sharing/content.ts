export const SHARE_ORIGIN = "https://banmao.fun";

export const sharingPages = {
  "/": { title: "BANMAO — Come explore", description: "Discover NFTs, games, and on-chain experiences on X Layer. Start with whatever sparks your curiosity." },
  "/collection": { title: "BANMAO Collection — Find your inspiration", description: "Explore the BANMAO media library, meet the community, and take a look at Banmao King." },
  "/collection/gallery": { title: "BANMAO Gallery — A little creativity to share", description: "Browse BANMAO images and 3D stickers, find a favorite, and share it with friends." },
  "/collection/banmaoking": { title: "Banmao King — Explore the collection", description: "Take a look at the fully on-chain Banmao King NFT collection. Explore the artwork and learn how it works." },
  "/defi": { title: "BANMAO DeFi — Explore on-chain tools", description: "Get to know BANMAO's DeFi tools on X Layer. Review each feature, its terms, and its risks before taking part." },
  "/defi/staking": { title: "BANMAO Staking — Get to know the pools", description: "Explore BANMAO staking on X Layer. Check the pool terms, lock periods, and risks before committing tokens." },
  "/defi/airdrop": { title: "BANMAO Airdrop — See what's happening", description: "Explore BANMAO airdrop events and check the participation requirements and eligibility details." },
  "/defi/burn": { title: "BANMAO Burns — Follow the community's contributions", description: "Explore BANMAO token burns, see community contributions, and learn how the burn portal works." },
  "/defi/box": { title: "BanmaoBox — Pack now, open later", description: "Pack ERC-20 tokens into a transferable, time-locked NFT on X Layer. Explore how ownership and opening times work." },
  "/gamefi": { title: "BANMAO GameFi — Find your next game", description: "Explore BANMAO games on X Layer, from Snake to Rock-Paper-Scissors. Read the rules and choose what interests you." },
  "/gamefi/banmaorps": { title: "BANMAO RPS — Rock, paper, scissors", description: "Discover BANMAO's take on Rock-Paper-Scissors on X Layer. Check the rules and token requirements before playing." },
  "/gamefi/banmaosnake": { title: "BANMAO Snake — A familiar game, a new setting", description: "Explore BANMAO Snake on X Layer. Learn the controls, game rules, and participation requirements before you start." },
  "/gamefi/banmaoslots": { title: "BANMAO Slots — Learn how it works", description: "Explore BANMAO Slots on X Layer. Review the rules, odds, and token risks before deciding whether to play." },
  "/gamefi/banmaofomo": { title: "BANMAO FOMO — Discover the game", description: "Take a look at BANMAO FOMO on X Layer. Understand the timer, game mechanics, and token risks before joining." },
} as const;

export type SharingPath = keyof typeof sharingPages;

export function getSharingPath(pathname: string): SharingPath | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(sharingPages, path) ? path as SharingPath : null;
}

export function getShareUrl(path: SharingPath): string {
  return new URL(path, SHARE_ORIGIN).href;
}

export function getShareIntroduction(path: SharingPath): string {
  const page = sharingPages[path];
  return `${page.title}\n${page.description}`;
}

export function formatShareText(introduction: string, url: string): string {
  return [introduction.trim(), url].filter(Boolean).join("\n\n");
}
