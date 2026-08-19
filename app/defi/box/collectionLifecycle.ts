import type { Address, Hash } from "viem";
import type { BoxCopy } from "./i18n";

export type CollectionLifecycleStatus =
  | "wallet"
  | "submitted"
  | "confirmed"
  | "verifying"
  | "indexing"
  | "ready"
  | "failed";

export type CollectionFailureStage = "wallet" | "submission" | "receipt" | "validation" | "verification";
export type CollectionStepStatus = "pending" | "current" | "completed" | "failed" | "skipped";

export type CollectionLifecycleDetails = {
  status: CollectionLifecycleStatus;
  tokenAddress: Address;
  boxAddress?: Address;
  factoryAddress?: Address;
  rendererAddress?: Address;
  transactionHash?: Hash;
  failureStage?: CollectionFailureStage;
  failureReason?: string;
};

type LifecycleUpdate = Partial<Omit<CollectionLifecycleDetails, "tokenAddress">> & {
  status: CollectionLifecycleStatus;
};

type LifecycleStep = {
  id: "wallet" | "submission" | "receipt" | "validation" | "registry" | "underlying" | "renderer" | "indexing" | "ready";
  status: CollectionStepStatus;
  label: (copy: BoxCopy) => string;
};

const rank: Record<CollectionLifecycleStatus, number> = {
  wallet: 0,
  submitted: 1,
  confirmed: 2,
  verifying: 3,
  indexing: 4,
  ready: 5,
  failed: -1,
};

export function initialCollectionLifecycle(
  tokenAddress: Address,
  details: Partial<Omit<CollectionLifecycleDetails, "status" | "tokenAddress">> = {},
): CollectionLifecycleDetails {
  return { status: "wallet", tokenAddress, ...details };
}

export function transitionCollectionLifecycle(
  current: CollectionLifecycleDetails,
  update: LifecycleUpdate,
): CollectionLifecycleDetails {
  if (current.status === "ready") return current;
  if (current.status === "failed") {
    if (current.failureStage !== "verification" || update.status !== "verifying") return current;
    return { ...current, ...update };
  }
  if (
    update.status === "failed" &&
    update.failureStage !== "verification" &&
    rank[current.status] >= rank.verifying
  ) return current;
  if (update.status !== "failed" && rank[update.status] < rank[current.status]) return current;
  return { ...current, ...update };
}

const currentIndex: Record<Exclude<CollectionLifecycleStatus, "failed">, number> = {
  wallet: 0,
  submitted: 2,
  confirmed: 3,
  verifying: 3,
  indexing: 7,
  ready: 9,
};

const failureIndex: Record<CollectionFailureStage, number> = {
  wallet: 0,
  submission: 1,
  receipt: 2,
  validation: 3,
  verification: 7,
};

export function collectionLifecycleSteps(details: CollectionLifecycleDetails): LifecycleStep[] {
  const labels: LifecycleStep["label"][] = [
    (copy) => copy.collectionWalletRequest,
    (copy) => copy.collectionSubmitted,
    (copy) => copy.collectionReceiptConfirmed,
    (copy) => copy.collectionBytecodeVerified,
    (copy) => copy.collectionRegistryVerified,
    (copy) => copy.collectionUnderlyingVerified,
    (copy) => copy.collectionRendererVerified,
    (copy) => copy.collectionIndexing,
    (copy) => copy.collectionReady,
  ];
  const pendingLabels: LifecycleStep["label"][] = [
    (copy) => copy.collectionWalletPending,
    (copy) => copy.collectionSubmitPending,
    (copy) => copy.collectionReceiptPending,
    (copy) => copy.collectionValidationPending,
    (copy) => copy.collectionRegistryPending,
    (copy) => copy.collectionUnderlyingPending,
    (copy) => copy.collectionRendererPending,
    (copy) => copy.collectionIndexingPending,
    (copy) => copy.collectionReadyPending,
  ];
  const failedLabels: LifecycleStep["label"][] = [
    (copy) => copy.collectionWalletFailed,
    (copy) => copy.collectionSubmitFailed,
    (copy) => copy.collectionReceiptFailed,
    (copy) => copy.collectionValidationFailed,
    (copy) => copy.collectionValidationFailed,
    (copy) => copy.collectionValidationFailed,
    (copy) => copy.collectionValidationFailed,
    (copy) => copy.collectionIndexingFailed,
    (copy) => copy.collectionReadyPending,
  ];
  const skippedLabels: LifecycleStep["label"][] = [
    (copy) => copy.collectionWalletFailed,
    (copy) => copy.collectionSubmitSkipped,
    (copy) => copy.collectionReceiptSkipped,
    (copy) => copy.collectionValidationSkipped,
    (copy) => copy.collectionRegistrySkipped,
    (copy) => copy.collectionUnderlyingSkipped,
    (copy) => copy.collectionRendererSkipped,
    (copy) => copy.collectionIndexingSkipped,
    (copy) => copy.collectionReadySkipped,
  ];
  const ids: LifecycleStep["id"][] = [
    "wallet", "submission", "receipt", "validation", "registry", "underlying", "renderer", "indexing", "ready",
  ];

  if (details.status === "failed") {
    const failedAt = failureIndex[details.failureStage ?? (details.transactionHash ? "receipt" : "wallet")];
    return ids.map((id, index) => ({
      id,
      status: index < failedAt ? "completed" : index === failedAt ? "failed" : "skipped",
      label: index < failedAt ? labels[index] : index === failedAt ? failedLabels[index] : skippedLabels[index],
    }));
  }

  const activeAt = currentIndex[details.status];
  return ids.map((id, index) => ({
    id,
    status: activeAt === 9 || index < activeAt ? "completed" : index === activeAt ? "current" : "pending",
    label: activeAt === 9 || index < activeAt ? labels[index] : pendingLabels[index],
  }));
}

export function collectionLifecycleOwnsTransaction(details: CollectionLifecycleDetails | null): boolean {
  return details !== null;
}
