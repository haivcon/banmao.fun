import { BOX_COPY, BOX_LANGUAGES } from "../app/defi/box/i18n";
import {
  collectionLifecycleSteps,
  initialCollectionLifecycle,
  transitionCollectionLifecycle,
  type CollectionLifecycleDetails,
} from "../app/defi/box/collectionLifecycle";

const tokenAddress = "0x1111111111111111111111111111111111111111" as const;
const boxAddress = "0x2222222222222222222222222222222222222222" as const;
const transactionHash = `0x${"a".repeat(64)}` as const;

const start = (): CollectionLifecycleDetails => initialCollectionLifecycle(tokenAddress);

describe("BanmaoBox collection lifecycle", () => {
  test("failure before a transaction hash makes no submission or verification claims", () => {
    const failed = transitionCollectionLifecycle(start(), { status: "failed", failureStage: "wallet" });
    expect(collectionLifecycleSteps(failed).map((step) => step.status)).toEqual([
      "failed", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped",
    ]);
  });

  test("a reverted receipt completes submission, fails receipt, and stops verification", () => {
    const submitted = transitionCollectionLifecycle(start(), { status: "submitted", transactionHash });
    const failed = transitionCollectionLifecycle(submitted, { status: "failed", failureStage: "receipt" });
    expect(collectionLifecycleSteps(failed).map((step) => step.status)).toEqual([
      "completed", "completed", "failed", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped",
    ]);
  });

  test.each([
    "Factory did not register the new collection",
    "Receipt must contain exactly one TokenBoxCreated event",
  ])("registry/event validation failure stops before Explorer verification: %s", (failureReason) => {
    const submitted = transitionCollectionLifecycle(start(), { status: "submitted", transactionHash });
    const failed = transitionCollectionLifecycle(submitted, {
      status: "failed",
      failureStage: "validation",
      failureReason,
    });
    expect(failed.failureReason).toBe(failureReason);
    expect(collectionLifecycleSteps(failed).map((step) => step.status)).toEqual([
      "completed", "completed", "completed", "failed", "skipped", "skipped", "skipped", "skipped", "skipped",
    ]);
  });

  test("verification advances pending to ready and ignores a later stale transaction error", () => {
    const confirmed = transitionCollectionLifecycle(start(), { status: "confirmed", transactionHash, boxAddress });
    const verifying = transitionCollectionLifecycle(confirmed, { status: "verifying" });
    const staleBeforeReady = transitionCollectionLifecycle(verifying, { status: "failed", failureStage: "receipt" });
    const indexing = transitionCollectionLifecycle(staleBeforeReady, { status: "indexing" });
    const ready = transitionCollectionLifecycle(indexing, { status: "ready" });
    const stale = transitionCollectionLifecycle(ready, { status: "failed", failureStage: "receipt" });
    expect(indexing.status).toBe("indexing");
    expect(ready.status).toBe("ready");
    expect(stale).toBe(ready);
    expect(collectionLifecycleSteps(stale).map((step) => step.status)).toEqual(Array(9).fill("completed"));
  });

  test.each(["degraded", "manual"] as const)(
    "%s verification remains nonfatal after confirmed on-chain validation",
    (status) => {
      const confirmed = transitionCollectionLifecycle(start(), { status: "confirmed", transactionHash, boxAddress });
      const unresolved = transitionCollectionLifecycle(confirmed, { status });
      const steps = collectionLifecycleSteps(unresolved);
      expect(unresolved.failureStage).toBeUndefined();
      expect(steps.slice(0, 7).map((step) => step.status)).toEqual(Array(7).fill("completed"));
      expect(steps[7].status).toBe("warning");
      expect(steps[8].status).toBe("pending");
      expect(steps.every((step) => step.status !== "failed")).toBe(true);
    },
  );

  test("only an actual Explorer failure uses the failed lifecycle state", () => {
    const confirmed = transitionCollectionLifecycle(start(), { status: "confirmed", transactionHash, boxAddress });
    const failed = transitionCollectionLifecycle(confirmed, {
      status: "failed",
      failureStage: "verification",
      failureReason: "Explorer rejected the source verification",
    });
    const steps = collectionLifecycleSteps(failed);
    expect(steps[7].status).toBe("failed");
    expect(steps.filter((step) => step.status === "failed")).toHaveLength(1);
  });

  test("the reported failed-without-collection state cannot render future completed copy", () => {
    const failed = transitionCollectionLifecycle(start(), { status: "failed", failureStage: "wallet" });
    const steps = collectionLifecycleSteps(failed);
    expect(steps.slice(1).every((step) => step.status === "skipped")).toBe(true);
    for (const locale of BOX_LANGUAGES) {
      const copy = BOX_COPY[locale];
      expect(steps.map((step) => step.label(copy))).toEqual([
        copy.collectionWalletFailed,
        copy.collectionSubmitSkipped,
        copy.collectionReceiptSkipped,
        copy.collectionValidationSkipped,
        copy.collectionRegistrySkipped,
        copy.collectionUnderlyingSkipped,
        copy.collectionRendererSkipped,
        copy.collectionIndexingSkipped,
        copy.collectionReadySkipped,
      ]);
    }
  });

  test("the collection lifecycle suppresses the generic transaction presentation", () => {
    const page = require("node:fs").readFileSync(
      require("node:path").join(process.cwd(), "app/defi/box/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/activeAction === "Collection creation"[\s\S]*collectionLifecycleOwnsTransaction/);
    expect(page).toContain('toast.dismiss("banmaobox-transaction")');
  });

  test("all six locales provide distinct pending, completed, failed, and skipped lifecycle copy", () => {
    expect(BOX_LANGUAGES).toHaveLength(6);
    for (const locale of BOX_LANGUAGES) {
      const copy = BOX_COPY[locale];
      const values = [
        copy.collectionSubmitPending,
        copy.collectionSubmitted,
        copy.collectionSubmitFailed,
        copy.collectionSubmitSkipped,
        copy.collectionReceiptPending,
        copy.collectionReceiptConfirmed,
        copy.collectionReceiptFailed,
        copy.collectionReceiptSkipped,
        copy.collectionCreatedVerificationDegraded,
        copy.retryVerification,
      ];
      expect(values.every(Boolean)).toBe(true);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
