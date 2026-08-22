import * as fs from "node:fs";
import * as path from "node:path";
import { BOX_COPY, BOX_LANGUAGES } from "../app/defi/box/i18n";
import {
  COLLECTION_LIFECYCLE_FIXTURE,
  getCollectionLifecycleFixture,
  collectionLifecycleFixtureEnabled,
} from "../app/defi/box/collectionLifecycleFixture";
import {
  clampFloatingPosition,
  keyboardFloatingPosition,
  normalizeFloatingPosition,
  type FloatingBounds,
} from "../app/components/ai/floatingPosition";
import {
  classifyTransactionError,
  resolveStoredAssetSymbol,
  safeLiveTokenSymbol,
  symbolFallback,
  transactionProgressIndex,
} from "../app/defi/box/transactionPresentation";
import {
  classifyBanmaoBoxVerification,
  requestBanmaoBoxVerification,
} from "../app/defi/box/requestVerification";
import { rendererDisplayAmount } from "../app/defi/box/RendererArtworkPreview";
import {
  clearPendingVerification,
  loadPendingVerification,
  savePendingVerification,
} from "../app/defi/box/verificationPersistence";

const TX_HASH = `0x${"a".repeat(64)}` as const;
const bounds: FloatingBounds = {
  viewportWidth: 320,
  viewportHeight: 568,
  controlWidth: 58,
  controlHeight: 58,
  inset: 12,
  topReserved: 76,
  bottomReserved: 84,
};

describe("BanmaoAI floating control geometry", () => {
  test("clamps pointer placement inside safe viewport and reserved UI", () => {
    expect(clampFloatingPosition({ x: -40, y: -20 }, bounds)).toEqual({ x: 12, y: 76 });
    expect(clampFloatingPosition({ x: 999, y: 999 }, bounds)).toEqual({ x: 250, y: 426 });
  });

  test("restores responsive normalized positions without preserving stale pixels", () => {
    const saved = normalizeFloatingPosition({ x: 250, y: 426 }, bounds);
    expect(saved).toEqual({ x: 1, y: 1 });
    expect(clampFloatingPosition(saved, { ...bounds, viewportWidth: 768 }, true)).toEqual({ x: 698, y: 426 });
  });

  test("keyboard movement supports arrows and large modified steps", () => {
    expect(keyboardFloatingPosition({ x: 100, y: 100 }, "ArrowLeft", bounds)).toEqual({ x: 88, y: 100 });
    expect(keyboardFloatingPosition({ x: 100, y: 100 }, "ArrowDown", bounds, true)).toEqual({ x: 100, y: 148 });
    expect(keyboardFloatingPosition({ x: 12, y: 76 }, "Home", bounds)).toEqual({ x: 12, y: 76 });
    expect(keyboardFloatingPosition({ x: 12, y: 76 }, "End", bounds)).toEqual({ x: 250, y: 426 });
  });

  test("launcher reads the DeFi bottom-navigation reservation from the body scope", () => {
    const launcher = fs.readFileSync(path.join(process.cwd(), "app/components/ai/AIChatLauncher.tsx"), "utf8");
    expect(launcher).toContain("getComputedStyle(document.body)");
  });
});

describe("BanmaoBox transaction UX contract", () => {
  test("every locale explicitly covers transaction, verification and fallback copy", () => {
    const phases = ["idle", "switching-chain", "approving", "creating", "opening", "refreshing-metadata", "transferring", "confirming", "success", "error"];
    const keys = [
      "transactionProgressLabel", "dismissNotification", "copyTransactionHash",
      "connectWalletError", "wrongNetworkError", "transactionFailed",
      "approvalConfirmedCreateIncomplete", "approvalTransactionLabel", "genericToken",
      "collectionVerificationRequest", "collectionVerificationPending",
      "collectionVerificationSuccess", "collectionVerificationFailure",
      "collectionLifecycleLabel", "collectionWalletRequest", "collectionSubmitted",
      "collectionReceiptConfirmed", "collectionBytecodeVerified", "collectionRegistryVerified",
      "collectionUnderlyingVerified", "collectionRendererVerified", "collectionIndexing",
      "collectionReady", "tokenAddressLabel", "collectionAddressLabel", "factoryAddressLabel",
      "rendererAddressLabel", "creatorTransactionLabel", "networkLabel", "chainIdLabel",
      "copyTokenAddress", "copyCollectionAddress", "copyFactoryAddress", "copyRendererAddress",
      "deploymentWarning", "modeGuideTitle", "modeSingleGuide", "modeBatchGuide",
      "modeBasketGuide", "quickAmount", "quickAmountHint",
    ] as const;
    for (const locale of BOX_LANGUAGES) {
      const copy = BOX_COPY[locale];
      for (const phase of phases) expect(copy.phase[phase]).toBeTruthy();
      for (const key of keys) expect(copy[key]).toBeTruthy();
      if (locale !== "en") expect(copy.transactionProgressLabel).not.toBe(BOX_COPY.en.transactionProgressLabel);
    }
  });

  test("creation modes explain their behavior and amount controls preserve canonical values", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    expect(page).toContain('className="box-mode-guide"');
    expect(page).toContain("copy.modeSingleGuide");
    expect(page).toContain("copy.modeBatchGuide");
    expect(page).toContain("copy.modeBasketGuide");
    expect(page).toContain("formatTokenAmountInput(amount, language)");
    expect(page).toContain("normalizeTokenAmountInput(event.target.value, language, tokenDecimals)");
    expect(page).toContain("tokenBalancePercentage(tokenBalance, percentage, tokenDecimals)");
    expect(page).toContain("[25, 50, 75, 100]");
  });

  test("BanmaoBox uses the canonical toast system without a legacy fixed transaction card", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    expect(page).toContain("showTransactionToast");
    expect(page).not.toMatch(/className={`box-transaction/);
    expect(page).not.toContain('toast.loading("Creating collection on-chain…"');
    expect(page).toContain("copy.transactionProgressLabel");
    expect(page).toContain("copy.dismissNotification");
    expect(page).toContain("showVerificationToast");
  });

  test("verification polling follows Retry-After, is bounded, and keeps transient states nonterminal", () => {
    const requester = fs.readFileSync(path.join(process.cwd(), "app/defi/box/requestVerification.ts"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    expect(requester).toContain('response.headers.get("retry-after")');
    expect(requester).toContain("const MAX_POLLS = 20");
    expect(requester).toContain('update.status === "transient-unavailable"');
    expect(page).toContain('outcome === "progress" ? "indexing"');
    expect(page).toContain('outcome === "failed" ? "error" : "warning"');
    expect(page.match(/requestBanmaoBoxVerification\(created\.txHash/g)).toHaveLength(1);
  });

  test("pending followed by already-verified is successful", async () => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    const originalFetch = global.fetch;
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "pending", guid: "guid-1", boxAddress: "0x2222222222222222222222222222222222222222" }), { status: 202, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "already-verified", guid: "guid-1", boxAddress: "0x2222222222222222222222222222222222222222" }), { status: 200 }));
    try {
      const request = requestBanmaoBoxVerification(TX_HASH);
      await jest.runAllTimersAsync();
      await expect(request.promise).resolves.toMatchObject({ status: "already-verified", guid: "guid-1" });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
      jest.useRealTimers();
    }
  });

  test("a first 503 continues through pending to verified", async () => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    const originalFetch = global.fetch;
    const updates: string[] = [];
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "transient-unavailable", error: "busy" }), { status: 503, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "pending", guid: "guid-2" }), { status: 202, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "verified", guid: "guid-2" }), { status: 200 }));
    try {
      const request = requestBanmaoBoxVerification(TX_HASH, (update) => updates.push(update.status));
      await jest.runAllTimersAsync();
      await expect(request.promise).resolves.toMatchObject({ status: "verified", guid: "guid-2" });
      expect(updates).toEqual(["transient-unavailable", "pending", "verified"]);
    } finally {
      global.fetch = originalFetch;
      jest.useRealTimers();
    }
  });

  test("a thrown network error remains transient and polling continues", async () => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    const originalFetch = global.fetch;
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "verified", boxAddress: "0x2222222222222222222222222222222222222222" }), { status: 200 }));
    try {
      const request = requestBanmaoBoxVerification(TX_HASH);
      await jest.runAllTimersAsync();
      await expect(request.promise).resolves.toMatchObject({ status: "verified" });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
      jest.useRealTimers();
    }
  });

  test("verification polling emits retry-exhausted exactly at the bounded limit", async () => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    const originalFetch = global.fetch;
    const updates: string[] = [];
    global.fetch = jest.fn(async () => new Response(
      JSON.stringify({ status: "pending" }),
      { status: 202, headers: { "retry-after": "0" } },
    ));
    try {
      const request = requestBanmaoBoxVerification(TX_HASH, (update) => updates.push(update.status));
      await jest.runAllTimersAsync();
      await expect(request.promise).resolves.toMatchObject({ status: "retry-exhausted" });
      expect(global.fetch).toHaveBeenCalledTimes(20);
      expect(updates.at(-1)).toBe("retry-exhausted");
    } finally {
      global.fetch = originalFetch;
      jest.useRealTimers();
    }
  });

  test.each([
    ["already-verified", "success"],
    ["verified", "success"],
    ["pending", "progress"],
    ["waiting-for-indexer", "progress"],
    ["transient-unavailable", "degraded"],
    ["retry-exhausted", "degraded"],
    ["manual-reconciliation", "manual"],
    ["failed", "failed"],
  ] as const)("classifies %s as %s", (status, outcome) => {
    expect(classifyBanmaoBoxVerification({ status })).toBe(outcome);
  });

  test("reload persistence is versioned, bounded, resumable, and explicitly clearable", () => {
    const storage = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };
    const pending = {
      version: 1 as const,
      chainId: 196,
      tokenAddress: "0x1111111111111111111111111111111111111111" as const,
      boxAddress: "0x2222222222222222222222222222222222222222" as const,
      transactionHash: TX_HASH,
      status: "retry-exhausted" as const,
      guid: "38eb82ea4ba449d4aa466c25e63fbf9c",
      error: "indexing",
    };
    savePendingVerification(localStorage, pending);
    expect(loadPendingVerification(localStorage, 196)).toEqual(pending);
    expect(loadPendingVerification(localStorage, 195)).toBeNull();
    expect(Array.from(storage.values())[0].length).toBeLessThan(2048);
    clearPendingVerification(localStorage, 196);
    expect(loadPendingVerification(localStorage, 196)).toBeNull();
  });

  test("cancellation stops scheduled polling and suppresses later updates", async () => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    const originalFetch = global.fetch;
    const updates: string[] = [];
    global.fetch = jest.fn(async () => new Response(
      JSON.stringify({ status: "pending" }),
      { status: 202, headers: { "retry-after": "5" } },
    ));
    try {
      const request = requestBanmaoBoxVerification(TX_HASH, (update) => updates.push(update.status));
      await Promise.resolve();
      await Promise.resolve();
      request.cancel();
      await jest.runAllTimersAsync();
      await request.promise;
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(updates).toEqual([]);
    } finally {
      global.fetch = originalFetch;
      jest.useRealTimers();
    }
  });

  test("collection lifecycle uses reusable full explorer rows without unsafe shortening", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const component = fs.readFileSync(path.join(process.cwd(), "app/defi/box/ExplorerValueRow.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    const lifecycle = page.slice(page.indexOf("showVerificationToast"), page.indexOf("const durationSeconds"));
    const selected = page.slice(page.indexOf("box-collection-manager"), page.indexOf("box-tabs"));
    const footer = page.slice(page.indexOf("box-contract-footer"), page.indexOf("box-celebration"));

    expect(component).toContain("value: Address | Hash");
    expect(component).toContain("target=\"_blank\"");
    expect(component).toContain("rel=\"noreferrer\"");
    expect(component).toContain("navigator.clipboard.writeText(value)");
    expect(component).toContain("{value}");
    expect(component).not.toMatch(/slice\(|ellipsis|shortAddress|truncate/i);
    expect(lifecycle).toContain("ExplorerValueRow");
    expect(selected).toContain("ExplorerValueRow");
    expect(footer).toContain("ExplorerValueRow");
    expect(`${lifecycle}\n${selected}\n${footer}`).not.toMatch(/\.slice\(|ellipsis|shortAddress|truncate/i);
    expect(css).toMatch(/\.box-explorer-value__link[\s\S]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.box-explorer-value__link[\s\S]*word-break:\s*break-word/);
  });

  test("deterministic collection success fixture preserves exact explorer hrefs and full values", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const fixture = fs.readFileSync(path.join(process.cwd(), "app/defi/box/collectionLifecycleFixture.ts"), "utf8");
    expect(fixture).toContain("0x1111111111111111111111111111111111111111");
    expect(fixture).toContain("0x2222222222222222222222222222222222222222");
    expect(fixture).toContain("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(fixture).not.toMatch(/slice\(|ellipsis|shortAddress|truncate/i);
    expect(collectionLifecycleFixtureEnabled("?banmaoboxFixture=collection-success")).toBe(true);
    expect(collectionLifecycleFixtureEnabled("?collectionFixture=success")).toBe(false);
    expect(getCollectionLifecycleFixture("?banmaoboxFixture=collection-success")).toEqual({
      status: "ready",
      ...COLLECTION_LIFECYCLE_FIXTURE,
    });
    expect(getCollectionLifecycleFixture("?collectionFixture=success")).toBeNull();
    expect(getCollectionLifecycleFixture("?banmaoboxFixture=collection-progress")).toMatchObject({ status: "indexing" });
    expect(getCollectionLifecycleFixture("?banmaoboxFixture=collection-degraded")).toMatchObject({ status: "degraded" });
    expect(getCollectionLifecycleFixture("?banmaoboxFixture=collection-manual")).toMatchObject({ status: "manual" });
    expect(getCollectionLifecycleFixture("?banmaoboxFixture=collection-actual-failed")).toMatchObject({
      status: "failed",
      failureStage: "verification",
    });
    expect(page).toContain("if (getCollectionLifecycleFixture(window.location.search)) return;");
    expect(COLLECTION_LIFECYCLE_FIXTURE.transactionHash).toHaveLength(66);
  });

  test("collection history and contract footer do not clip full values", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    const historyRule = css.match(/\.box-address-history__entry button:first-child\s*\{([^}]*)\}/)?.[1] ?? "";
    const footerRule = css.match(/\.box-contract-footer__grid code\s*\{([^}]*)\}/)?.[1] ?? "";

    for (const rule of [historyRule, footerRule]) {
      expect(rule).toMatch(/overflow-wrap:\s*anywhere/);
      expect(rule).toMatch(/word-break:\s*break-word/);
      expect(rule).not.toMatch(/text-overflow:\s*ellipsis|white-space:\s*nowrap|max-width:\s*240px/);
    }
  });

  test("admin deployment registry presents full linked copyable values", () => {
    const admin = fs.readFileSync(path.join(process.cwd(), "app/defi/box/admin/page.tsx"), "utf8");
    const registry = admin.slice(admin.indexOf("ops-addresses"), admin.indexOf("ops-panel", admin.indexOf("ops-addresses") + 1));
    expect(registry).toContain("ExplorerValueRow");
    expect(registry).not.toMatch(/short\(|slice\(|ellipsis|truncate/i);
  });

  test("success and admin creation details retain full linked copyable values", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const admin = fs.readFileSync(path.join(process.cwd(), "app/defi/box/admin/page.tsx"), "utf8");
    const celebrationStart = page.indexOf('{transactionHash ? (', page.indexOf('className="box-celebration__actions"') - 200);
    const celebration = page.slice(celebrationStart, page.indexOf("</section>", celebrationStart));
    const created = admin.slice(admin.indexOf("displayedCollection && explorer"));
    expect(celebration).toContain("ExplorerValueRow");
    expect(celebration).toContain("value={transactionHash}");
    expect(celebration).not.toMatch(/slice\(|ellipsis|truncate/i);
    for (const value of ["displayedCollection.token", "displayedCollection.box", "displayedCollection.txHash", "displayedCollection.factory", "displayedCollection.renderer"]) {
      expect(created).toContain(value);
    }
    expect(created.match(/ExplorerValueRow/g)).toHaveLength(5);
    expect(created).not.toMatch(/slice\(|ellipsis|truncate/i);
  });

  test("deterministic admin creation fixture exposes all immutable identities without writes", () => {
    const fixtureModule = require("../app/defi/box/adminCreationFixture") as typeof import("../app/defi/box/adminCreationFixture");
    const admin = fs.readFileSync(path.join(process.cwd(), "app/defi/box/admin/page.tsx"), "utf8");
    const fixture = fixtureModule.getAdminCreationFixture("?banmaoboxFixture=admin-creation-success");

    expect(fixture).toEqual(fixtureModule.ADMIN_CREATION_FIXTURE);
    expect(fixtureModule.getAdminCreationFixture("?banmaoboxFixture=collection-success")).toBeNull();
    expect(fixture?.txHash).toHaveLength(66);
    expect(admin).toContain("getAdminCreationFixture(window.location.search)");
    expect(admin).toContain("setCreatedCollection(fixture)");
    expect(admin).toContain("const displayedCollection = createdCollection;");
    expect(admin).not.toContain('typeof window === "undefined" ? null : getAdminCreationFixture');
    expect(admin).not.toMatch(/getAdminCreationFixture[\s\S]{0,300}(createCollection|writeContract|sendTransaction)\(/);
  });

  test("collection success fixture renders its exact full hash in the persistent success detail", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const detail = page.slice(page.indexOf('className="box-collection-details"'), page.indexOf("box-tabs"));
    expect(detail).toContain("value={collectionLifecycle.transactionHash}");
    expect(detail).toContain("ExplorerValueRow");
    expect(detail).not.toMatch(/slice\(|ellipsis|truncate/i);
    expect(COLLECTION_LIFECYCLE_FIXTURE.transactionHash).toHaveLength(66);
  });

  test("global toaster reserves safe areas and remains above the assistant", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "app/defi/DeFiLayoutClient.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    expect(layout).toContain('containerClassName="banmao-toast-region"');
    expect(layout).toContain("env(safe-area-inset-top)");
    expect(layout).toContain('"aria-live": "polite"');
    expect(css).toMatch(/\.box-toast\s*\{[\s\S]*max-height:\s*calc\(100dvh\s*-\s*112px\)/);
    expect(css).toMatch(/\.box-toast\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(css).toMatch(/@media \(max-width: 420px\)[\s\S]*body:has\(\.box-toast\) \.banmao-ai-launcher[\s\S]*display:\s*none/);
  });

  test("Phase 1 exposes keyboard tabs, truthful identity, staged creation and progressive disclosure", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");

    expect(page).toContain("handleTabKeyDown");
    expect(page).toContain('aria-controls="box-panel-create"');
    expect(page).toContain('id="box-panel-create"');
    expect(page).toContain('className="box-identity-chip"');
    expect(page).toContain("tokenIdentity.displaySymbol");
    expect(page).toContain('className="box-create-stages"');
    expect(page).toContain('className="box-create-workspace"');
    expect(page).toContain('className="box-live-summary"');
    expect(page).toContain('box-create-progress box-create-progress--${phase}');
    expect(page).toContain('className="box-create-progress__steps"');
    expect(page).toContain("<RendererArtworkPreview");
    expect(page).toContain('className="box-nft-preview__badges"');
    expect(page).toContain('className="box-live-summary__essentials"');
    expect(page).toContain("data-create-step={createStep}");
    expect(page).toContain("setCreateStep(4)");
    expect(page).toContain('form="box-create-form"');
    expect(page).toContain('className="box-card-details"');
    expect(page).toContain('<details className="box-contract-footer"');
    expect(page).toContain("formatDuration");
    expect(page).toContain("resolvedOptions().timeZone");
    expect(css).toContain("--box-bottom-action-height");
    expect(css).toMatch(/box-ready-ripple[^}]*3/);
  });

  test("centers the lower information area and provides accessible interaction motion", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");

    expect(css).toMatch(/\.box-how\s*\{[^}]*width:\s*min\(1120px,[^}]*text-align:\s*center/);
    expect(css).toMatch(/\.box-how__heading\s*\{[^}]*margin:\s*0 auto 42px/);
    expect(css).toMatch(/\.box-steps article\s*\{[^}]*align-items:\s*center[^}]*text-align:\s*center[^}]*transition:/);
    expect(css).toMatch(/\.box-steps article:hover\s*\{[^}]*transform:\s*translateY\(-7px\)/);
    expect(css).toMatch(/\.box-contract-footer\s*\{[^}]*width:\s*min\(1120px/);
    expect(css).toMatch(/\.box-contract-footer__heading\s*\{[^}]*grid-template-columns:\s*1fr auto 1fr[^}]*text-align:\s*center/);
    expect(css).toMatch(/\.box-contract-footer__grid\s*\{[^}]*repeat\(auto-fit,\s*minmax\(190px,\s*1fr\)\)/);
    expect(css).toMatch(/\.box-contract-footer__grid a:active\s*\{[^}]*scale\(\.985\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.box-steps article/);
  });

  test("confirms metadata gas transactions before opening the wallet", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    expect(page).toContain("METADATA_CONFIRM_COPY");
    expect(page).toContain("metadataRefreshTokenId !== null");
    expect(page).toContain("setMetadataRefreshTokenId(tokenId)");
    expect(page).toContain("void refreshMetadata(tokenId)");
    expect(page).toContain('src="/defi/banmao_box.webp"');
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  test("creation wizard supports recipient clipboard actions, expanded locks and a collectible preview", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");

    expect(page).toContain("navigator.clipboard.readText()");
    expect(page).toContain("const pasteAddress = async");
    expect(page).toContain("setRecipient(\"\")");
    expect(page).toContain("setCollectionToken(\"\")");
    expect(page).toContain("setNewAssetToken(\"\")");
    expect(page).toContain("setTransferRecipient(\"\")");
    expect(page).toContain("previousWalletAddressRef.current = address");
    expect(page).not.toContain("if (address && !recipient) setRecipient(address)");
    expect(page).toContain("ClipboardPaste");
    expect(page).toContain("Trash2");
    expect(page).toContain("[1, 3, 7, 14, 30, 60, 90, 180, 365, 730]");
    expect(page).toContain('className="box-nft-preview__frame"');
    expect(page).toContain("<RendererArtworkPreview");
    expect(page).toContain('batchPosition={createMode === "batch" ? `1 / ${previewBoxCount}` : undefined}');
    expect(page).toContain('className="box-nft-preview__badges"');
    expect(page).toContain("artworkPreviewOpen");
    expect(page).toContain('className="box-preview-dialog box-artwork-viewer"');
    expect(page).toContain('className="box-dialog-backdrop box-preview-backdrop box-artwork-viewer-backdrop"');
    expect(css).toMatch(/\.box-preview-backdrop\s*\{[^}]*inset:\s*var\(--defi-shell-header-height,\s*68px\)\s+0\s+0/);
    expect(css).toMatch(/\.box-preview-dialog\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*var\(--defi-shell-header-height,\s*68px\)\s*-\s*36px\)/);
    expect(page).toContain('/address/${recipient}`');
    expect(page).toContain('aria-label={`${copy.viewExplorer}: ${recipient}`}');
    expect(page).toContain('className="box-live-summary__recipient-row"');
    expect(css).toMatch(/\.box-live-summary__essentials\s*>\s*\.box-live-summary__recipient-row\s*\{[^}]*grid-template-columns:\s*minmax\(90px,.75fr\)\s+minmax\(0,1.25fr\)/);
    expect(css).toMatch(/\.box-live-summary__address\s*\{[^}]*font-size:\s*8px\s*!important[^}]*overflow-wrap:\s*normal[^}]*white-space:\s*nowrap/);
    expect(css).toMatch(/@media \(max-width:\s*420px\)[\s\S]*\.box-live-summary__essentials\s*>\s*\.box-live-summary__recipient-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/);
    expect(css).not.toMatch(/\.box-live-summary__address\s*\{[^}]*(?:text-overflow:\s*ellipsis|overflow-wrap:\s*anywhere)/);
    expect(css).toContain(".box-recipient-actions");
    expect(css).toContain(".box-nft-preview__frame");
    expect(css).toContain(".box-renderer-preview");
  });

  test("pre-mint artwork mirrors the on-chain sealed treasury renderer", () => {
    const preview = fs.readFileSync(path.join(process.cwd(), "app/defi/box/RendererArtworkPreview.tsx"), "utf8");
    expect(preview).toContain('viewBox="0 0 600 600"');
    expect(preview).toContain('transform="scale(0.75)"');
    expect(preview).toContain("SEALED TREASURY  /  SEALED");
    expect(preview).toContain("ASSET PORTFOLIO / {assets.length}");
    expect(preview).toContain("UNLOCK TIME");
    expect(preview).toContain("MINTED BY");
    expect(preview).toContain("ASSET LEDGER");
    expect(preview).toContain("#PENDING");
    expect(rendererDisplayAmount(123456789n, 6)).toBe("123.45");
    expect(rendererDisplayAmount(1n, 18)).toBe("<0.01");
    expect(rendererDisplayAmount(1000000000000000000000000000000000000n, 18)).toBe("1.0000e18");
  });

  test("uses ERC-20-neutral BanmaoBox branding and a dedicated product mark", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const layout = fs.readFileSync(path.join(process.cwd(), "app/defi/box/layout.tsx"), "utf8");
    const hub = fs.readFileSync(path.join(process.cwd(), "app/defi/page.tsx"), "utf8");
    const mark = fs.readFileSync(path.join(process.cwd(), "public/defi/banmaobox-mark.svg"), "utf8");

    const animatedMark = fs.readFileSync(path.join(process.cwd(), "app/defi/box/BanmaoBoxProductMark.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");

    expect(page).toContain("<BanmaoBoxProductMark />");
    expect(animatedMark).toContain('className="box-product-mark__motion"');
    expect(animatedMark).toContain('className="box-mark-orbit box-mark-orbit--mint"');
    expect(animatedMark).toContain('className="box-mark-lock__hands"');
    expect(animatedMark).toContain("onPointerMove={handlePointerMove}");
    expect(css).toContain("@keyframes box-mark-scene-float");
    expect(css).toMatch(/\.box-product-mark__motion\s*\{[^}]*animation:\s*box-mark-scene-float 3\.6s ease-in-out infinite/);
    expect(css).toMatch(/\.box-product-mark__svg\s*\{[^}]*display:\s*block[^}]*width:\s*100%/);
    expect(css).not.toMatch(/\.box-product-mark__svg\s*\{[^}]*animation:/);
    expect(css).toContain("@keyframes box-mark-orbit-forward");
    expect(css).toContain("@keyframes box-mark-lock-pulse");
    expect(css).toMatch(/\.box-mark-orbit\s*\{[^}]*transform-box:\s*view-box[^}]*transform-origin:\s*50%\s+50%/);
    expect(css).toMatch(/\.box-mark-vault__light\s*\{[^}]*transform-box:\s*fill-box[^}]*transform-origin:\s*center/);
    expect(css).not.toContain("translate3d(0,4px,18px)");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.box-mark-orbit/);
    expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*\.box-mark-orbit--blue[^}]*display:\s*none/);
    expect(page).toContain("1–5 ERC-20 · TIME LOCK");
    expect(layout).toContain("Pack one or more ERC-20 tokens");
    expect(layout).not.toContain("Time-Locked BANMAO NFT");
    expect(hub).toContain("Pack one or more ERC-20 tokens");
    expect(mark).toContain("BanmaoBox product mark");
    expect(mark).toContain("A time-locked cat box surrounded by token symbols");
  });

  test("Phase 1 mobile geometry keeps readable type and 44px controls", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*\.box-page\s*\{[\s\S]*font-size:\s*14px/);
    expect(css).toMatch(/\.box-hero\s*\{[\s\S]*min-height:\s*260px/);
    expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*\.box-hero\s*\{[\s\S]*min-height:\s*190px/);
    expect(css).toMatch(/\.box-submit[\s\S]*min-height:\s*56px/);
    expect(css).toMatch(/\.box-create-workspace\s*\{[\s\S]*grid-template-columns:/);
    expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*\.box-live-summary\s*\{[\s\S]*display:\s*block/);
    expect(css).toMatch(/\.box-live-summary:not\(\[data-create-step="4"\]\) \.box-nft-preview__frame\s*\{[^}]*width:\s*min\(100%,\s*420px\)[^}]*max-height:\s*none[^}]*margin-inline:\s*auto/);
    expect(css).toMatch(/\.box-live-summary:not\(\[data-create-step="4"\]\) \.box-nft-preview__frame \.box-renderer-preview\s*\{[^}]*transform:\s*none/);
    expect(css).not.toContain("transform: translateY(-8%)");
    expect(css).toMatch(/@media \(max-width: 820px\)[\s\S]*\.box-hero__art\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.box-create-stages\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.box-create-stages li button\s*\{[^}]*width:\s*100%[^}]*overflow-wrap:\s*anywhere[^}]*white-space:\s*normal/);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.box-wizard-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });

  test("centers the mobile collection manager above navigation without changing desktop inline layout", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width: 820px)", css.indexOf(".box-collection-layer")));

    expect(page).toContain('className="box-collection-layer is-open"');
    expect(page).toContain('role={isCollectionSheet ? "dialog" : undefined}');
    expect(page).toContain("aria-modal={isCollectionSheet ? true : undefined}");
    expect(page).toContain('aria-labelledby="box-collection-title"');
    expect(page).toContain('className="box-collection-sheet-close"');
    expect(page).toContain("collectionToggleRef.current?.focus()");
    expect(page).toContain('event.key === "Escape"');
    expect(page).toContain('event.key !== "Tab"');
    expect(page).toContain("document.body.style.overflow = \"hidden\"");
    expect(page).toContain("setCollectionOpen(false)");
    expect(page).toContain("setReviewOpen(false)");
    expect(page).toContain("setTransferEntry(null)");
    expect(page).toContain("setCelebrationOpen(false)");
    expect(page.match(/box-collection-controls/g)).toHaveLength(1);

    expect(css).toMatch(/\.box-collection-layer\s*\{\s*display:\s*contents/);
    expect(mobile).toMatch(/\.box-collection-layer\s*\{[\s\S]*position:\s*fixed[\s\S]*inset:\s*var\(--defi-shell-header-height,\s*60px\)\s+0\s+0[\s\S]*z-index:\s*1500[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center/);
    expect(mobile).toMatch(/\.box-collection-body\s*\{[\s\S]*width:\s*min\(720px,\s*100%\)[\s\S]*max-height:\s*calc\(100dvh\s*-\s*var\(--defi-shell-header-height,\s*60px\)\s*-\s*32px\)[\s\S]*overflow-y:\s*auto/);
    expect(mobile).toMatch(/padding-bottom:\s*calc\([^;]*env\(safe-area-inset-bottom\)/);
    expect(mobile).not.toMatch(/\.box-collection-layer\s*\{[^}]*align-items:\s*flex-end/);
    expect(mobile).toMatch(/\.box-collection-controls input\s*\{[\s\S]*font-size:\s*16px/);
    expect(mobile).toMatch(/\.box-collection-controls button[\s\S]*min-height:\s*44px/);
    expect(mobile).toMatch(/body:has\(\.box-collection-layer\.is-open\) \.banmao-ai-launcher[\s\S]*display:\s*none/);
    expect(mobile).toMatch(/\.box-page--collection-sheet-open \.box-submit[\s\S]*visibility:\s*hidden/);
  });

  test("centers equal-width tabs and assigns content-specific desktop dialog geometry", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    const tabsRule = css.match(/\.box-tabs\s*\{([^}]*)\}/)?.[1] ?? "";
    const tabButtonRule = css.match(/\.box-tabs button\s*\{([^}]*)\}/)?.[1] ?? "";
    const dialogRule = css.match(/\.box-dialog\s*\{([^}]*)\}/)?.[1] ?? "";
    const reviewRule = css.match(/\.box-review\s*\{([^}]*)\}/)?.[1] ?? "";
    const transferRule = css.match(/\.box-transfer-dialog\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(tabsRule).toMatch(/display:\s*grid/);
    expect(tabsRule).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(tabsRule).toMatch(/width:\s*min\((?:8[0-9]{2}|9[0-2][0-9])px,\s*calc\(100%\s*-\s*48px\)\)/);
    expect(tabsRule).toMatch(/margin:\s*0 auto/);
    expect(tabButtonRule).toMatch(/justify-content:\s*center/);
    expect(tabButtonRule).toMatch(/min-height:\s*(?:5[0-9]|6[0-9])px/);
    expect(dialogRule).toMatch(/width:\s*min\(520px,\s*calc\(100vw\s*-\s*48px\)\)/);
    expect(dialogRule).toMatch(/max-height:\s*calc\(100dvh\s*-\s*48px\)/);
    expect(dialogRule).toMatch(/overflow-y:\s*auto/);
    expect(reviewRule).toMatch(/width:\s*min\(900px,\s*calc\(100vw\s*-\s*64px\)\)/);

    expect(transferRule).toMatch(/width:\s*min\(700px,\s*calc\(100vw\s*-\s*48px\)\)/);
    expect(page).toContain('className="box-dialog box-transfer-dialog"');
    expect(css).toMatch(/\.box-dialog-backdrop\s*\{[^}]*z-index:\s*1500[^}]*inset:\s*var\(--defi-shell-header-height,\s*68px\)\s+0\s+0/);
    expect(css).toMatch(/\.box-preview-backdrop\s*\{[^}]*z-index:\s*1600/);
    expect(css).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.box-dialog-backdrop\s*\{[^}]*align-items:\s*center[^}]*padding:\s*16px/);
    expect(css).not.toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.box-dialog-backdrop\s*\{[^}]*align-items:\s*end/);
  });

  test("classifies mocked provider lifecycle failures without claiming submission", () => {
    expect(classifyTransactionError({ code: 4001 }, false)).toEqual({ kind: "rejected", submitted: false });
    expect(classifyTransactionError({ name: "UserRejectedRequestError" }, false)).toEqual({ kind: "rejected", submitted: false });
    expect(classifyTransactionError({ name: "TransactionReplacedError" }, true)).toEqual({ kind: "replaced", submitted: true });
    expect(classifyTransactionError({ name: "WaitForTransactionReceiptTimeoutError" }, true)).toEqual({ kind: "timeout", submitted: true });
    expect(classifyTransactionError(new Error("Connect your wallet first"), false)).toEqual({ kind: "disconnected", submitted: false });
    expect(classifyTransactionError(new Error("wallet chain mismatch"), false)).toEqual({ kind: "wrong-chain", submitted: false });
    expect(classifyTransactionError(new Error("execution reverted"), true)).toEqual({ kind: "failed", submitted: true });
  });

  test("models approval, broadcast and confirmation lifecycle deterministically", () => {
    expect(transactionProgressIndex("approving", false)).toBe(0);
    expect(transactionProgressIndex("creating", false)).toBe(0);
    expect(transactionProgressIndex("confirming", true)).toBe(1);
    expect(transactionProgressIndex("error", true)).toBe(1);
    expect(transactionProgressIndex("success", true)).toBe(2);
  });

  test("keeps confirmed approval distinct from the subsequent Box transaction", () => {
    const hook = fs.readFileSync(path.join(process.cwd(), "app/defi/box/useBox.ts"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");

    expect(hook).toContain("const [approvalHash, setApprovalHash]");
    expect(hook).toContain("const approveToken = useCallback(");
    expect(hook).toContain("await waitForApproval(approvalHash, client)");
    expect(page).toContain("onClick={() => void handleApproveToken()}");
    const registry = fs.readFileSync(path.join(process.cwd(), "app/defi/box/registry.ts"), "utf8");
    expect(registry).toContain("testDeployment.contracts.factoryRenderer ?? testDeployment.contracts.renderer");
    expect(registry).toContain("testDeployment.runtime?.factoryRenderer ?? testDeployment.runtime?.renderer");
    expect(hook).toContain("setApprovalHash(hash)");
    expect(hook).toContain("setTransactionHash(null)");
    expect(page).toContain("copy.approvalConfirmedCreateIncomplete");
    expect(page).toContain("value={approvalHash}");
  });

  test("read refresh failures cannot turn a confirmed write into a failed transaction", () => {
    const hook = fs.readFileSync(path.join(process.cwd(), "app/defi/box/useBox.ts"), "utf8");
    const refetch = hook.slice(hook.indexOf("const refetchAll"), hook.indexOf("const retryBoxes"));

    expect(refetch).toContain("Promise.allSettled");
    expect(refetch).not.toContain("Promise.all([");
  });
});

describe("BanmaoBox Renderer-consistent token symbols", () => {
  const token = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";

  test.each(["USD₮0", "Việt Nam", "中文", "한국", "Кириллица", "📦💎"])(
    "accepts safe Unicode symbol %s",
    (value) => expect(safeLiveTokenSymbol(value)).toBe(value),
  );

  test("preserves a non-generic snapshot and resolves NFT #5-equivalent TOKEN", () => {
    expect(resolveStoredAssetSymbol("BANMAO", "USD₮0", token, "TOKEN")).toBe("BANMAO");
    expect(resolveStoredAssetSymbol("TOKEN", "USD₮0", token, "TOKEN")).toBe("USD₮0");
    expect(resolveStoredAssetSymbol("", "USD₮0", token, "TOKEN")).toBe("USD₮0");
  });

  test("rejects controls and bidi while preserving long safe metadata for compact display", () => {
    expect(safeLiveTokenSymbol("BAD\u0001")).toBeUndefined();
    expect(safeLiveTokenSymbol("BAD\u202eTXT")).toBeUndefined();
    expect(safeLiveTokenSymbol("BAD\ud800")).toBeUndefined();
    expect(safeLiveTokenSymbol("X".repeat(65))).toBe("X".repeat(65));
    expect(resolveStoredAssetSymbol("TOKEN", undefined, token, "Token")).toBe(symbolFallback(token, "Token"));
    expect(resolveStoredAssetSymbol("TOKEN", "BAD\u0001", token, "代币")).toBe("代币 0x779Ded…13736");
  });

  test("source uses one resolver for stored Box assets", () => {
    const hook = fs.readFileSync(path.join(process.cwd(), "app/defi/box/useBox.ts"), "utf8");
    expect(hook).toContain("resolveStoredAssetSymbol");
    expect(hook).not.toContain("symbol: asset.symbol ?? fallback?.symbol");
    expect(hook).not.toContain("symbol: asset.symbol ?? fallback.symbol");
    expect(hook.match(/resolveStoredAssetSymbol\(asset\.symbol/g)).toHaveLength(2);
  });
});


describe("BanmaoBox portfolio dashboard", () => {
  test("provides localized portfolio controls for every supported locale", () => {
    const { BOX_DASHBOARD_COPY } = require("../app/defi/box/i18n") as typeof import("../app/defi/box/i18n");
    for (const locale of BOX_LANGUAGES) {
      expect(Object.values(BOX_DASHBOARD_COPY[locale]).every(Boolean)).toBe(true);
    }
  });

  test("prioritizes ready actions and replaces the disabled locked CTA with a countdown", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const card = page.slice(page.indexOf("function BoxCard"), page.indexOf("export default function"));
    expect(card).toContain('className="box-item__locked-callout"');
    expect(card).toContain('className="box-item__utilities"');
    expect(card).toContain("BOX_DASHBOARD_COPY[language].detailsAssets");
    expect(card).toMatch(/className="box-button box-button--primary box-item__primary"[\s\S]{0,100}disabled=\{busy\}/);
  });

  test("opens on-chain box artwork in an accessible large preview and exposes rich NFT asset details", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    expect(page).toContain('className="box-artwork-trigger"');
    expect(page).toContain('className="box-preview-dialog box-image-preview"');
    expect(page).toContain('className="box-dialog-backdrop box-preview-backdrop box-image-preview-backdrop"');
    expect(page).toContain('aria-modal="true"');
    expect(page).toContain('className="box-nft-facts"');
    expect(page).toContain('className="box-asset__explorer"');
    expect(page).toContain("onCopyAddress(asset.token)");
    expect(page).toContain("copyToClipboard(value, copy.tokenAddressLabel)");
    expect(css).toMatch(/\.box-preview-backdrop\s*\{[^}]*inset:\s*var\(--defi-shell-header-height,\s*68px\)\s+0\s+0/);
    expect(css).toMatch(/\.box-preview-dialog\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*var\(--defi-shell-header-height,\s*68px\)\s*-\s*36px\)/);
    expect(css).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.box-preview-dialog\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*var\(--defi-shell-header-height,\s*60px\)\s*-\s*24px\)/);
    expect(css).toMatch(/\.box-image-preview__canvas\s*\{[^}]*overflow:\s*auto/);
    expect(css).toMatch(/\.box-image-preview__image\s*\{[^}]*object-fit:\s*contain/);
    expect(css).toMatch(/\.box-item__svg\s*\{[\s\S]*object-fit:\s*contain/);
  });

  test("restricts the Operations link and dashboard to matching immutable on-chain admins", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const admin = fs.readFileSync(path.join(process.cwd(), "app/defi/box/admin/page.tsx"), "utf8");
    const access = fs.readFileSync(path.join(process.cwd(), "app/defi/box/rendererAdminAccess.ts"), "utf8");
    const policy = fs.readFileSync(path.join(process.cwd(), "app/defi/box/rendererAdminPolicy.ts"), "utf8");
    expect(access.match(/functionName: "rendererAdmin"/g)).toHaveLength(2);
    expect(policy).toContain('return "role-mismatch"');
    expect(policy).toContain('return sameAddress(wallet, factoryAdmin) ? "authorized" : "unauthorized"');
    expect(page).toContain("rendererAdminAccess.isAuthorized ? (");
    expect(admin).toContain("if (!rendererAdminAccess.isAuthorized)");
    expect(admin).toContain('functionName: "setDefaultRenderer"');
    expect(admin).toContain('functionName: "setRenderer"');
    expect(admin).toContain("simulateContract");
    expect(admin).toContain("waitForTransactionReceipt");
  });

  test("renders summary, filter, search and premium segmented sort controls with a responsive card grid", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/defi/box/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/defi/box/box.css"), "utf8");
    expect(page).toContain('className="box-portfolio-summary"');
    expect(page).toContain('className="box-filter-group"');
    expect(page).toContain('className="box-portfolio-search"');
    expect(page).toContain('className="box-portfolio-sort" role="group"');
    expect(page).not.toContain("<select value={boxSort}");
    expect(page).toContain("aria-pressed={boxSort === sort}");
    expect(css).toMatch(/\.box-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
    const mobile = css.slice(css.lastIndexOf("@media (max-width: 820px)"));
    expect(mobile).toMatch(/\.box-filter-group button\s*\{[^}]*min-height:\s*44px/);
    expect(mobile).toMatch(/\.box-portfolio-search input,[^{]+\{[^}]*font-size:\s*16px/);
    expect(mobile).toMatch(/\.box-item__utilities button,[^{]+\{[^}]*width:\s*44px;\s*height:\s*44px/);
  });
});
