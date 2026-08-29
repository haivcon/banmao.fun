import * as fs from "node:fs";
import * as path from "node:path";
import {
  ACCESSORY_TRAITS,
  BACKGROUND_TRAITS,
  BODY_TRAITS,
  EXPRESSION_TRAITS,
  TOTAL_COMBINATIONS,
} from "../app/collection/banmaoking/traits";
import {
  BANMAO_KING_DEPLOYMENT,
  BANMAO_KING_MINT_ENABLED,
  banmaoKingMintReady,
} from "../app/collection/banmaoking/deployment";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Banmao King development frontend", () => {
  test("mirrors the immutable Solidity trait catalogue", () => {
    const solidityNames = (file: string, functionStart: string) => {
      const catalogue = read(file).split(functionStart)[1].split("revert")[0];
      return [...catalogue.matchAll(/return "([^"]+)";/g)].map(
        (match) => match[1],
      );
    };

    expect(BODY_TRAITS.map(({ name }) => name)).toEqual(
      solidityNames(
        "contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol",
        "function traitName",
      ),
    );
    expect(EXPRESSION_TRAITS).toEqual(
      solidityNames(
        "contracts/BanmaoKing/Lib/BanmaoKingExpressionLib.sol",
        "function traitName",
      ),
    );
    expect(ACCESSORY_TRAITS).toEqual(
      solidityNames(
        "contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol",
        "function traitName",
      ),
    );
    expect(BACKGROUND_TRAITS.map(({ name }) => name)).toEqual(
      solidityNames(
        "contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol",
        "function _backgroundName",
      ),
    );
    expect(TOTAL_COMBINATIONS).toBe(9216);
  });

  test("fails closed until a reviewed deployment manifest exists", () => {
    expect(BANMAO_KING_DEPLOYMENT).toEqual({
      status: "preview",
      chainId: 196,
      contractAddress: null,
    });
    expect(BANMAO_KING_MINT_ENABLED).toBe(false);
    expect(banmaoKingMintReady()).toBe(false);
    const client = read("app/collection/banmaoking/BanmaoKingClient.tsx");
    expect(client).not.toMatch(
      /useWriteContract|writeContract|parseEther|parseUnits/,
    );
  });

  test("is excluded from indexing and production navigation", () => {
    expect(read("app/collection/banmaoking/layout.tsx")).toContain(
      "index: false",
    );
    expect(read("app/collection/banmaoking/layout.tsx")).toContain(
      "createStandardViewport",
    );
    expect(read("app/collection/CollectionClient.tsx")).not.toContain(
      "/collection/banmaoking",
    );
    expect(read("app/web2d/Web2DLanding.tsx")).not.toContain(
      "/collection/banmaoking",
    );
  });

  test("includes accessibility and responsive safeguards", () => {
    const client = read("app/collection/banmaoking/BanmaoKingClient.tsx");
    const css = read("app/collection/banmaoking/banmaoking.css");
    expect(client).toContain('aria-live="polite"');
    expect(client).toContain("aria-pressed");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/@media \(max-width:\s*760px\)/);
  });
});
