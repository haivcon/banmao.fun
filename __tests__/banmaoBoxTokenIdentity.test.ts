import { getAddress } from "viem";
import { BOX_COPY, BOX_LANGUAGES, parameterizeBoxCopy } from "../app/defi/box/i18n";
import {
  buildTokenIdentity,
  normalizeLiveTokenSymbol,
  tokenExplorerUrl,
} from "../app/defi/box/tokenIdentity";

const canonical = getAddress("0x16d91d1615fc55b76d5f92365bd60c069b46ef78");
const custom = getAddress("0x87669801a1fad6dad9db70d27ac752f452989667");
const collection = getAddress("0xC6036DcBF494dd80323Ae152E6Dd266264832d89");

describe("BanmaoBox token identity", () => {
  test.each([
    ["USD₮0", "USD₮0"],
    ["Việt Nam", "Việt Nam"],
    ["中文", "中文"],
    ["한국", "한국"],
    ["Кириллица", "Кириллица"],
    ["📦💎", "📦💎"],
    ["Vie\u0323\u0302t", "Việt"],
  ])("preserves safe printable Unicode: %s", (input, expected) => {
    expect(normalizeLiveTokenSymbol(input)?.full).toBe(expected.normalize("NFC"));
  });

  test.each(["", "   ", "BAD\u0000", "BAD\u0085", "BAD\u202e", "BAD\u2066", "BAD\u200b"])(
    "rejects unsafe symbol %p",
    (input) => expect(normalizeLiveTokenSymbol(input)).toBeNull(),
  );

  test("rejects an unpaired surrogate", () => {
    const unsafe = String.fromCharCode(0xd800);
    expect(unsafe.charCodeAt(0)).toBe(0xd800);
    expect(() => encodeURIComponent(unsafe)).toThrow();
    expect(normalizeLiveTokenSymbol(unsafe)).toBeNull();
  });

  test("truncates a long safe symbol without discarding its full accessible value", () => {
    const value = normalizeLiveTokenSymbol("📦".repeat(40));
    expect(value).not.toBeNull();
    expect(value!.display.endsWith("…")).toBe(true);
    expect(value!.display.length).toBeLessThan(value!.full.length);
    expect(value!.full).toBe("📦".repeat(40));
  });

  test("builds one custom identity from live then stored metadata with unique fallback", () => {
    expect(buildTokenIdentity({ address: custom, collectionAddress: collection, canonicalAddress: canonical, liveSymbol: "中文", liveName: "Custom" }, "TOKEN")).toMatchObject({
      address: custom,
      collectionAddress: collection,
      symbol: "中文",
      displaySymbol: "中文",
      name: "Custom",
      isCanonicalBanmao: false,
    });
    expect(buildTokenIdentity({ address: custom, collectionAddress: collection, canonicalAddress: canonical, liveSymbol: "\u202e", storedSymbol: "USD₮0" }, "TOKEN").symbol).toBe("USD₮0");
    expect(buildTokenIdentity({ address: custom, collectionAddress: collection, canonicalAddress: canonical }, "TOKEN").displaySymbol).toMatch(/^TOKEN 0x876698…89667$/);
  });

  test("parameterizes token-specific copy in all six locales", () => {
    for (const locale of BOX_LANGUAGES) {
      const copy = parameterizeBoxCopy(BOX_COPY[locale], "中文", false);
      for (const key of ["title", "lockedMetric", "amount", "approvalNeeded", "howDescription", "stepApproveText", "stepGiftText", "stepOpenText", "insufficientBalance"] as const) {
        expect(copy[key]).not.toContain("BANMAO");
        if (BOX_COPY[locale][key].includes("BANMAO")) expect(copy[key]).toContain("中文");
      }
      expect(parameterizeBoxCopy(BOX_COPY[locale], "BANMAO", true).title).toBe(BOX_COPY[locale].title);
    }
  });

  test("generates the exact canonical OKX token URL", () => {
    expect(tokenExplorerUrl(canonical)).toBe("https://web3.okx.com/explorer/x-layer/evm/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78?address=0x16d91d1615fC55b76d5F92365BD60C069b46eF78");
    expect(tokenExplorerUrl(custom)).toContain(`/token/${custom.toLowerCase()}?address=${custom}`);
  });
});
