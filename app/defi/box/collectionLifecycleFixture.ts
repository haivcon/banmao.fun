import type { Address, Hash } from "viem";

export type CollectionLifecycleFixture = {
  tokenAddress: Address;
  boxAddress: Address;
  factoryAddress: Address;
  rendererAddress: Address;
  transactionHash: Hash;
};

export type CollectionLifecycleFixtureDetails = CollectionLifecycleFixture & {
  status: "ready";
};

export const COLLECTION_LIFECYCLE_FIXTURE: CollectionLifecycleFixture = {
  tokenAddress: "0x1111111111111111111111111111111111111111",
  boxAddress: "0x2222222222222222222222222222222222222222",
  factoryAddress: "0x3333333333333333333333333333333333333333",
  rendererAddress: "0x4444444444444444444444444444444444444444",
  transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

export function collectionLifecycleFixtureEnabled(search: string): boolean {
  return new URLSearchParams(search).get("banmaoboxFixture") === "collection-success";
}

export function getCollectionLifecycleFixture(
  search: string,
): CollectionLifecycleFixtureDetails | null {
  return collectionLifecycleFixtureEnabled(search)
    ? { status: "ready", ...COLLECTION_LIFECYCLE_FIXTURE }
    : null;
}
