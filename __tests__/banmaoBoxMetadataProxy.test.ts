import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BanmaoBox metadata proxy contract", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "app",
      "api",
      "banmaobox",
      "nft",
      "[tokenId]",
      "metadata",
      "route.ts",
    ),
    "utf8",
  );

  test("prefers canonical on-chain metadata and retains legacy collection compatibility", () => {
    expect(source).toContain('functionName: "onchainTokenURI"');
    expect(source).toContain('functionName: "tokenURI"');
    expect(source.indexOf('functionName: "onchainTokenURI"')).toBeLessThan(
      source.indexOf('functionName: "tokenURI"'),
    );
  });

  test("uses the fixed production HTTPS image origin instead of request headers", () => {
    expect(source).toContain(
      "https://www.banmao.fun/api/banmaobox/nft/${tokenId}/image.svg",
    );
    expect(source).not.toMatch(/headers\.get\(["'](?:host|x-forwarded-proto)["']\)/);
  });
});
