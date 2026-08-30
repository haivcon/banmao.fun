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

  test("uses a synchronized SVG-only chibi banana cat", () => {
    const client = read("app/collection/banmaoking/BanmaoKingClient.tsx");
    const artwork = read("app/collection/banmaoking/artwork.ts");
    const body = read("contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol");
    const expression = read("contracts/BanmaoKing/Lib/BanmaoKingExpressionLib.sol");
    const renderer = read("contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol");
    const bodySignatures = [
      "M72 390c35-31 59-75 76-128",
      "M178 210c13-36 42-55 80-56",
      "M158 305c-22 13-32 38-22 58",
      "M337 397c28 37 64 42 83 19",
      "M145 328l37 11M143 346l36 10",
      "M77 398c42 44 106 64 168 53",
      'cx="220" cy="216" rx="20" ry="24"',
      'cx="292" cy="216" rx="20" ry="24"',
      "M256 240l-9 7 9 8 9-8z",
    ];

    expect(client).toContain('from "./artwork"');
    expect(client).toContain("bodySvg(color, shade)");
    expect(client).toContain("expressionSvg(id)");
    for (const signature of bodySignatures.slice(0, 6)) {
      expect(artwork).toContain(signature);
      expect(body).toContain(signature);
    }
    for (const signature of bodySignatures.slice(6)) {
      expect(artwork).toContain(signature);
      expect(expression).toContain(signature);
    }
    for (const source of [artwork, body]) {
      expect(source).toContain('id="cat-behind"');
      expect(source).toContain('id="banana-shell"');
      expect(source).toContain('id="cat" transform="rotate(5 256 235)"');
      expect(source).toContain('transform="rotate(-4 256 440)"');
      expect(source).toContain('id="costume-details"');
      expect(source).not.toContain("M185 207l9-52 43 31");
      expect(source.indexOf('id="cat-behind"')).toBeLessThan(source.indexOf('id="banana-shell"'));
      expect(source.indexOf('id="banana-shell"')).toBeLessThan(source.indexOf('id="cat"'));
      expect(source.indexOf('id="cat"')).toBeLessThan(source.indexOf('id="costume-details"'));
    }
    for (const source of [artwork, body]) {
      expect(source).toContain('linearGradient id="bk-peel"');
      expect(source).toContain('fill="url(#bk-fur)"');
      expect(source).not.toContain('opacity=".78"');
      expect(source).toContain('stroke="#6b5320" stroke-width="4"');
      expect(source).not.toContain('stroke="#6b5320" stroke-width="7"');
    }
    for (const source of [artwork, body, expression]) {
      expect(source).not.toMatch(/<image|data:image|https?:\/\/|@font-face|<use\b/);
    }
    expect(client).toContain('transform="rotate(5 256 235)"');
    expect(renderer).toContain("'<g transform=\"rotate(5 256 235)\">'");
    expect(renderer).toContain("expressionLib.render(traits_.expression)");
    expect(renderer).toContain("accessoryLib.render(traits_.accessory)");
    expect(client).toContain('cx="220" cy="212" r="25"');
    expect(client).toContain('cx="292" cy="212" r="25"');
    expect(client).not.toMatch(/[♥★]/);
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
    expect(css).toMatch(
      /body:has\(\.king-page\)[\s\S]*overflow-y: auto !important/,
    );
  });
});
