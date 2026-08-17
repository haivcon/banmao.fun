const { readFileSync } = require("node:fs");
const { ethers } = require("ethers");
const {
  assertAggregateFeeCap,
  assertNormalizedSvg,
  journalComplete,
  selectRefreshAction,
} = require("../scripts/deploy-banmaobox-renderer-mainnet.cjs");

const SCRIPT = "scripts/deploy-banmaobox-renderer-mainnet.cjs";

export {};

describe("BanmaoBox renderer-only mainnet update tooling", () => {
  test("has exactly the intended deploy + setRenderer transaction path", () => {
    const source = readFileSync(SCRIPT, "utf8");
    const main = source.slice(source.indexOf("async function main()"), source.indexOf("if (require.main === module)"));
    expect(main).toContain("deployRenderer(");
    expect(main).toContain("writableBox.setRenderer(renderer.address");
    expect(main).not.toMatch(/createTokenBox|deploy-banmaobox-mainnet|setDefaultRenderer/);
    expect(source).toContain("--preflight");
    expect(source).toContain("--write-release");
    expect(source).toContain("BANMAOBOX_RENDERER_MAX_FEE_OKB");
    expect(source).toContain("rendererUpdateSubmitted");
  });

  test("enforces one aggregate native fee cap before either broadcast and across resume", () => {
    const estimates = [ethers.BigNumber.from(100), ethers.BigNumber.from(50)];
    expect(assertAggregateFeeCap(estimates, ethers.BigNumber.from(2), "0.000000000000000376"))
      .toEqual(ethers.BigNumber.from(376));
    expect(() => assertAggregateFeeCap(estimates, ethers.BigNumber.from(2), "0.000000000000000375"))
      .toThrow("exceeds approved aggregate fee cap");
    expect(() => assertAggregateFeeCap(estimates, ethers.BigNumber.from(2), ""))
      .toThrow("BANMAOBOX_RENDERER_MAX_FEE_OKB");
    expect(assertAggregateFeeCap([50], ethers.BigNumber.from(2), "0.000000000000000376", 250))
      .toEqual(ethers.BigNumber.from(376));
    expect(() => assertAggregateFeeCap([50], ethers.BigNumber.from(2), "0.000000000000000375", 250))
      .toThrow("exceeds approved aggregate fee cap");
  });

  test("requires both transaction receipts for journal completion", () => {
    expect(journalComplete({ contracts: { renderer: "0xabc" }, transactions: { renderer: "0x1", setRenderer: "0x2" } })).toBe(true);
    expect(journalComplete({ transactions: { renderer: "0x1" } })).toBe(false);
  });

  test("recognizes only the normalized marketplace-simple SVG shape", () => {
    const valid = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="BanmaoBox sealed treasury"><g transform="scale(0.75)"><rect width="800" height="800"/></g></svg>';
    expect(assertNormalizedSvg(valid)).toBe(valid);
    for (const unsafe of [
      valid.replace('viewBox="0 0 600 600"', 'viewBox="0 0 800 800"'),
      valid.replace('aria-label="BanmaoBox sealed treasury"', 'aria-labelledby="title"'),
      valid.replace("<g ", "<title>x</title><g "),
      valid.replace("</g>", '<script/> </g>'),
      valid.replace("</g>", '<text textLength="20">x</text></g>'),
      valid.replace("</g>", '<image href="data:image/png;base64,x"/></g>'),
      valid.replace("</g>", '<rect fill="url(https://example.com/x)"/></g>'),
    ]) expect(() => assertNormalizedSvg(unsafe)).toThrow();
  });

  test("never adds a refresh transaction when setRenderer emitted ERC-4906 batch metadata", () => {
    expect(selectRefreshAction(true)).toBe("none");
    expect(() => selectRefreshAction(false)).toThrow("BatchMetadataUpdate");
  });
});
