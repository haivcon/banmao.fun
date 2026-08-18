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
import { requestBanmaoBoxVerification } from "../app/defi/box/requestVerification";

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
      "connectWalletError", "wrongNetworkError", "transactionFailed", "genericToken",
      "collectionVerificationRequest", "collectionVerificationPending",
      "collectionVerificationSuccess", "collectionVerificationFailure",
      "collectionLifecycleLabel", "collectionWalletRequest", "collectionSubmitted",
      "collectionReceiptConfirmed", "collectionBytecodeVerified", "collectionRegistryVerified",
      "collectionUnderlyingVerified", "collectionRendererVerified", "collectionIndexing",
      "collectionReady", "tokenAddressLabel", "collectionAddressLabel", "factoryAddressLabel",
      "rendererAddressLabel", "creatorTransactionLabel", "networkLabel", "chainIdLabel",
      "copyTokenAddress", "copyCollectionAddress", "copyFactoryAddress", "copyRendererAddress",
      "deploymentWarning",
    ] as const;
    for (const locale of BOX_LANGUAGES) {
      const copy = BOX_COPY[locale];
      for (const phase of phases) expect(copy.phase[phase]).toBeTruthy();
      for (const key of keys) expect(copy[key]).toBeTruthy();
      if (locale !== "en") expect(copy.transactionProgressLabel).not.toBe(BOX_COPY.en.transactionProgressLabel);
    }
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
    expect(page).toMatch(/update\.status === "transient-unavailable"[\s\S]*status: "indexing"/);
    expect(page.match(/requestBanmaoBoxVerification\(created\.txHash/g)).toHaveLength(1);
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

  test("rejects controls, bidi and overlong metadata with localized fallback", () => {
    expect(safeLiveTokenSymbol("BAD\u0001")).toBeUndefined();
    expect(safeLiveTokenSymbol("BAD\u202eTXT")).toBeUndefined();
    expect(safeLiveTokenSymbol("BAD\ud800")).toBeUndefined();
    expect(safeLiveTokenSymbol("X".repeat(65))).toBeUndefined();
    expect(resolveStoredAssetSymbol("TOKEN", undefined, token, "Token")).toBe(symbolFallback(token, "Token"));
    expect(resolveStoredAssetSymbol("TOKEN", "BAD\u0001", token, "代币")).toBe("代币 0x779Ded...3736");
  });

  test("source uses one resolver for stored Box assets", () => {
    const hook = fs.readFileSync(path.join(process.cwd(), "app/defi/box/useBox.ts"), "utf8");
    expect(hook).toContain("resolveStoredAssetSymbol");
    expect(hook).not.toContain("symbol: asset.symbol ?? fallback?.symbol");
    expect(hook).not.toContain("symbol: asset.symbol ?? fallback.symbol");
    expect(hook.match(/resolveStoredAssetSymbol\(asset\.symbol/g)).toHaveLength(2);
  });
});
