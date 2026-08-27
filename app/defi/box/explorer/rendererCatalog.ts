import type { Address } from "viem";

export type RendererSchema = "current" | "compact" | "legacy";
export type RendererGenerationKey = "genCurrent" | "genTreasury" | "genFactory" | "genV4" | "genV3" | "genV2" | "genOriginal";

export type RendererCatalogEntry = {
  address: Address;
  introducedAt: string;
  runtimeHash: `0x${string}`;
  runtimeBytes: number;
  fallbackArtwork: string;
  generationKey: RendererGenerationKey;
  schema: RendererSchema;
};

export const MAINNET_RENDERER_CATALOG: readonly RendererCatalogEntry[] = [
  { address: "0x5d424134B0A4bAF0893BB29a75B7901D35C0aD13", introducedAt: "2026-08-27", runtimeHash: "0x218dd8a9b1404e8624ab53f60354b45385673554f050c1de63f0d604f0e9509e", runtimeBytes: 24084, fallbackArtwork: "/defi/banmaobox-renderer-current.svg", generationKey: "genCurrent", schema: "current" },
  { address: "0x479365c028A1FA633b16BBef95e8691D4f37B21F", introducedAt: "2026-08-18", runtimeHash: "0xd69507283765b914480cf8aa8a8f37f4bbd351b0620ede3b0bbd5e3ca390f703", runtimeBytes: 19214, fallbackArtwork: "/defi/banmao_box.webp", generationKey: "genTreasury", schema: "current" },
  { address: "0xE19c875dBfa80171819E443e46Fc7839a9290769", introducedAt: "2026-08-18", runtimeHash: "0xc8a762b855958d1d0c0c91159bdd9178ef2e88157f188f02fd7293af8112f6af", runtimeBytes: 16175, fallbackArtwork: "/defi/banmao_box.webp", generationKey: "genFactory", schema: "current" },
  { address: "0xE880e364f4a71be047cF49767313381715d57db0", introducedAt: "2026-08-17", runtimeHash: "0xc66b482d9ef781d179c79ebcec20a19c141e611cedcb07a3c6a2a7cfa3b8d3e5", runtimeBytes: 16647, fallbackArtwork: "/defi/banmao_box.webp", generationKey: "genV4", schema: "current" },
  { address: "0x29cf18F1AB3009303d023dbA6c4b4e0fC4312f60", introducedAt: "2026-08-17", runtimeHash: "0xe8e8ca280a9a0e398972c8c12eaecfb5d0315c1bc951c11e2e4d8b175fa8528c", runtimeBytes: 16718, fallbackArtwork: "/defi/banmao_box.webp", generationKey: "genV3", schema: "current" },
  { address: "0x0Eb6aDdD176Fe51112f6ad26340278c540CAbeb6", introducedAt: "2026-08-16", runtimeHash: "0x462dc6b36d4c720520022b9530a163e29c616c06a782b9bcb261f95ce5bfcf4f", runtimeBytes: 19153, fallbackArtwork: "/defi/banmao_box.webp", generationKey: "genV2", schema: "compact" },
  { address: "0x361E1a166fC2b6AafD7D6a8dF759Df1e28430F0A", introducedAt: "2026-08-14", runtimeHash: "0xb5d4ee0bb7092a9207bbe87567d685bf5df76c551ac69645dc04a6c1931b06cf", runtimeBytes: 13761, fallbackArtwork: "/defi/banmao_box.webp", generationKey: "genOriginal", schema: "legacy" },
] as const;
