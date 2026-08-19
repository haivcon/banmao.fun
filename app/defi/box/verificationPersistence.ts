import { isAddress, isHash, type Address, type Hash } from "viem";
import type { BanmaoBoxVerificationStatus } from "./requestVerification";

const STORAGE_PREFIX = "banmaobox_pending_verification_v1_";
const MAX_STORED_LENGTH = 2048;

type VerificationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PendingVerification = {
  version: 1;
  chainId: number;
  tokenAddress: Address;
  boxAddress: Address;
  transactionHash: Hash;
  status: BanmaoBoxVerificationStatus;
  guid?: string;
  error?: string;
};

const key = (chainId: number) => `${STORAGE_PREFIX}${chainId}`;

export function savePendingVerification(storage: VerificationStorage, value: PendingVerification): void {
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_STORED_LENGTH) storage.setItem(key(value.chainId), serialized);
}

export function loadPendingVerification(storage: VerificationStorage, chainId: number): PendingVerification | null {
  const serialized = storage.getItem(key(chainId));
  if (!serialized || serialized.length > MAX_STORED_LENGTH) return null;
  try {
    const value = JSON.parse(serialized) as Partial<PendingVerification>;
    if (
      value.version !== 1 || value.chainId !== chainId ||
      !value.tokenAddress || !isAddress(value.tokenAddress) ||
      !value.boxAddress || !isAddress(value.boxAddress) ||
      !value.transactionHash || !isHash(value.transactionHash) ||
      typeof value.status !== "string"
    ) return null;
    return value as PendingVerification;
  } catch {
    return null;
  }
}

export function clearPendingVerification(storage: VerificationStorage, chainId: number): void {
  storage.removeItem(key(chainId));
}