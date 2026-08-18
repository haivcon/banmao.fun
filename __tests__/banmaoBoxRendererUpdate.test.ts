const { readFileSync } = require("node:fs");

export {};

describe("retired BanmaoBox renderer-only workflow", () => {
  test("cannot provide a parallel deployment path", () => {
    const source = readFileSync("scripts/deploy-banmaobox-renderer-mainnet.cjs", "utf8");
    expect(source).toContain("Retired: BanmaoBox supports only full-renderer");
    expect(source).not.toMatch(/setRenderer\(|metadataRenderer|DEPLOYER_PRIVATE_KEY|sendTransaction/);
  });
});
