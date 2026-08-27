const { readFileSync } = require("node:fs");

export {};

describe("BanmaoBox renderer-only workflow", () => {
  test("deploys and links only the full renderer with resumable validation", () => {
    const source = readFileSync("scripts/deploy-banmaobox-renderer-mainnet.cjs", "utf8");
    expect(source).toContain("BANMAOBOX_RENDERER_MAINNET_CONFIRM");
    expect(source).toContain("assertArtifactRuntime");
    expect(source).toContain("setDefaultRenderer(rendererAddress)");
    expect(source).toContain("setRenderer(rendererAddress)");
    expect(source).not.toMatch(/createTokenBox|new BanmaoBoxFactory|MockBanmao/);
  });
});
