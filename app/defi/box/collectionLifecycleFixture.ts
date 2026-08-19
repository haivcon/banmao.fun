import type { Address, Hash } from "viem";

export type CollectionLifecycleFixture = {
  tokenAddress: Address;
  boxAddress: Address;
  factoryAddress: Address;
  rendererAddress: Address;
  transactionHash: Hash;
};

export type CollectionLifecycleFixtureDetails = CollectionLifecycleFixture & {
  status: "ready" | "indexing" | "degraded" | "manual" | "failed";
  failureStage?: "verification";
  failureReason?: string;
};

const FIXTURE_STATUS = {
  "collection-success": "ready",
  "collection-progress": "indexing",
  "collection-degraded": "degraded",
  "collection-manual": "manual",
  "collection-actual-failed": "failed",
} as const;

export const COLLECTION_LIFECYCLE_FIXTURE: CollectionLifecycleFixture = {
  tokenAddress: "0x1111111111111111111111111111111111111111",
  boxAddress: "0x2222222222222222222222222222222222222222",
  factoryAddress: "0x3333333333333333333333333333333333333333",
  rendererAddress: "0x4444444444444444444444444444444444444444",
  transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

export function collectionLifecycleFixtureEnabled(search: string): boolean {
  const fixture = new URLSearchParams(search).get("banmaoboxFixture");
  return fixture !== null && fixture in FIXTURE_STATUS;
}

export function getCollectionLifecycleFixture(
  search: string,
): CollectionLifecycleFixtureDetails | null {
  const fixture = new URLSearchParams(search).get("banmaoboxFixture") as keyof typeof FIXTURE_STATUS | null;
  if (!fixture || !(fixture in FIXTURE_STATUS)) return null;
  const status = FIXTURE_STATUS[fixture];
  return {
    status,
    ...COLLECTION_LIFECYCLE_FIXTURE,
    ...(status === "failed" ? {
      failureStage: "verification" as const,
      failureReason: "Explorer rejected the source verification",
    } : {}),
  };
}
