import type { Address, Hash } from "viem";

export type CollectionFactorySource = "current" | "predecessor";
export type CollectionVerificationStatus = "verified" | "warning" | "unverified";
export type CollectionSort = "newest" | "oldest" | "supply" | "locked";

export type FactoryLineageEntry = {
  address: Address;
  depth: number;
  source: CollectionFactorySource;
  rendererAdmin: Address;
  previousFactory?: Address;
};

export type CollectionVerification = {
  status: CollectionVerificationStatus;
  registered: boolean;
  canonicalForToken: boolean;
  underlyingMatchesEvent: boolean;
  rendererAdminMatchesFactory: boolean;
  runtimeMatchesRelease: boolean;
  factorySource: CollectionFactorySource;
  checks: Array<{ id: string; passed: boolean; label: string }>;
  warnings: string[];
};

export type BanmaoBoxCollection = {
  chainId: number;
  tokenAddress: Address;
  boxAddress: Address;
  creator: Address;
  factoryAddress: Address;
  factoryDepth: number;
  transactionHash: Hash;
  blockNumber: string;
  logIndex: number;
  createdAt: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalLocked: string;
  renderer: Address;
  rendererAdmin: Address;
  verification: CollectionVerification;
};

export type BanmaoBoxActivity = {
  tokenId: string;
  transactionHash: Hash;
  blockNumber: string;
  createdAt: string;
  to: Address;
};

export type CollectionExplorerResponse = {
  chainId: number;
  observedAt: string;
  latestBlock: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: { nfts: string; locked: string; verified: number };
  lineage: FactoryLineageEntry[];
  collections: BanmaoBoxCollection[];
};

export type CollectionDetailResponse = {
  observedAt: string;
  collection: BanmaoBoxCollection;
  activity: BanmaoBoxActivity[];
};
