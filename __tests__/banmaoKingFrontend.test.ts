import * as fs from "node:fs";
import { createHash } from "node:crypto";
import { bodySvg, expressionSvg } from "../app/collection/banmaoking/artwork";
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
  test("matches the approved refined body and Happy Smile artifact exactly", () => {
    const approved = read("__tests__/fixtures/banmaoking-smile-refined.svg");
    expect(createHash("sha256").update(approved).digest("hex")).toBe("bf50ab8b172697cac36b5189fbb9ba3d605cc5b14a836975b1c3989237360f8f");
    const body = bodySvg("#ffe53b", "#d9ad14").replace(/>\s+</g, "><");
    expect(approved).toContain(body);
    expect(approved).toContain(expressionSvg(0));
    expect(body).not.toContain("M181 185l17-43 35 34");
    expect(body).not.toContain("M198 149l10 28");
  });
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
      "M239 76c-9-18-10-38-5-56",
      "15 73 15 158-6 216",
      "22 10-51 11-76 4",
      "M181 122c-20 71-24 157-10 226",
      "M242 104c-14 91-12 181-2 253",
      "M322 115c25 71 31 155 21 226",
      "M171 198c9-39 40-63 85-64",
      "M318 382c29-2 39 25 61 30 22 5 41-8 42-27",
      "M178 418l-2 39c-16 6-24 19-19 29",
      "M171 301c-27 7-48 29-49 53-1 20 13 34 30 28",
      'cx="224" cy="211" rx="18.8" ry="22.56"',
      'cx="288" cy="211" rx="18.8" ry="22.56"',
      "M256 235l-8 6 8 7 8-7z",
      "M241 255q15 13 30 0",
      "M211 251q-24-10-46-6M211 258q-27 0-50 12M211 264q-23 9-40 24",
    ];

    expect(client).toContain('from "./artwork"');
    expect(client).toContain("bodySvg(color, shade)");
    expect(client).toContain("expressionSvg(id)");
    for (const signature of bodySignatures.slice(0, 10)) {
      expect(artwork).toContain(signature);
      expect(body).toContain(signature);
    }
    for (const signature of bodySignatures.slice(10)) {
      expect(artwork).toContain(signature);
      expect(expression).toContain(signature);
    }
    for (const source of [artwork, body]) {
      expect(source).toContain('id="cat-behind"');
      expect(source).toContain('id="banana-shell"');
      expect(source).toContain('<g id="cat">');
      expect(source).not.toContain('transform="rotate(5 256 235)"');
      expect(source).not.toContain('transform="rotate(-4 256 440)"');
      expect(source).toContain('id="costume-details"');
      expect(source).not.toContain("M185 207l9-52 43 31");
      expect(source.indexOf('id="cat-behind"')).toBeLessThan(source.indexOf('id="banana-shell"'));
      expect(source.indexOf('id="banana-shell"')).toBeLessThan(source.indexOf('id="cat"'));
      expect(source.indexOf('id="cat"')).toBeLessThan(source.indexOf('id="costume-details"'));
      expect(source).toContain('transform="translate(318 405) scale(1.07) translate(-318 -382)"');
      expect(source).toContain("M342 387q9 15 20 20M362 402q9 10 19 12M385 405q9 5 18 3");
      expect(source).toContain("M162 477q22-9 45 0M305 477q23-9 45 0");
      expect(source).toContain("M143 330q16 3 32 12M139 347q15 4 30 13");
      expect(source).toContain("M139 361q8 10 18 7M373 362q-8 10-18 7");
      expect(source).not.toContain('id="bk-tail-clip"');
      expect(source).not.toContain('id="tail"');
      expect(source).not.toContain('id="hind-legs"');
      expect(source).not.toContain('id="forelegs"');
    }
    for (const source of [artwork, body]) {
      expect(source).toContain('linearGradient id="bk-peel"');
      expect(source).toContain('fill="url(#bk-fur)"');
      expect(source).toContain('radialGradient id="bk-muzzle"');
      expect(source).toMatch(/d=\\?"[^\"]*[cq]/);
      expect(source).toContain('stroke="#80643a" stroke-width="2.8"');
      expect(source).toContain('stroke-width="1.8" stroke-linecap="round" opacity=".5"');
      expect(source).not.toContain('shape-rendering="crispEdges"');
      expect(source).not.toContain('fill="#080808"');
      expect(source).not.toContain('ellipse cx="258" cy="480"');
    }
    for (const source of [artwork, body, expression]) {
      expect(source).not.toMatch(/<image|data:image|https?:\/\/|@font-face|<use\b/);
      expect(source).not.toContain('shape-rendering="crispEdges"');
    }
    expect(client).not.toContain('shapeRendering="crispEdges"');
    expect(read("app/collection/banmaoking/banmaoking.css")).not.toContain("image-rendering: pixelated");
    expect(client).toContain("traits.background !== 0");
    expect(renderer).toContain("traits_.background == 0");
    expect(client).toContain("feDropShadow");
    expect(renderer).toContain("feDropShadow");
    expect(client).toContain('cx="256" cy="477" rx="101" ry="13" fill="#625b52" opacity=".18"');
    expect(renderer).toContain('cx=\"256\" cy=\"477\" rx=\"101\" ry=\"13\" fill=\"#625b52\" opacity=\".18\"');
    expect(client).not.toContain('transform="rotate(5 256 235)"');
    expect(renderer).not.toContain("'<g transform=\"rotate(5 256 235)\">'");
    expect(renderer).toContain("expressionLib.render(traits_.expression)");
    expect(renderer).toContain("accessoryLib.render(traits_.accessory)");
    expect(client).toContain("background: 0");
    expect(client).not.toContain(">BANMAO KING</text>");
    expect(renderer).not.toContain(">BANMAO KING</text>");
    expect(client).toContain('cx="220" cy="212" r="25"');
    expect(client).toContain('cx="292" cy="212" r="25"');
    expect(client).not.toMatch(/[♥★]/);
  });

  test("keeps background and accessory details aligned with Solidity", () => {
    const client = read("app/collection/banmaoking/BanmaoKingClient.tsx");
    const accessory = read("contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol");
    const renderer = read("contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol");
    expect(client).toContain('<g id="accessory">');
    expect(client).toContain('<AccessoryContent id={id} />');
    expect(client).toContain('d="M0 512L512 0v512z"');
    expect(renderer).toContain('d=\"M0 512L512 0v512z\"');

    const sharedSignatures = [
      'cx="430" cy="72" r="5" fill="#fff2a8"',
      'cx="425" cy="122" r="4" fill="white"',
      'cx="203" cy="81" r="7" fill="#ef5376"',
      'cx="256" cy="69" r="7" fill="#56c9ff"',
      'cx="309" cy="81" r="7" fill="#ef5376"',
      "M245 210h22M195 206l-18-6M317 206l18-6",
      "M247 203h18",
      "M221 116l70-30M238 78l44-19",
      "M250 334v23M263 334v23",
      "M332 338l40 9",
      "M197 137q59 18 119 0",
      'rx="67"',
      'ry="11"',
    ];

    for (const signature of sharedSignatures.slice(0, 2)) {
      expect(client).toContain(signature);
      expect(renderer).toContain(signature);
    }
    for (const signature of sharedSignatures.slice(2)) {
      expect(client).toContain(signature);
      expect(accessory).toContain(signature);
    }

    expect(client).toContain('stroke="#762a2a"');
    expect(accessory).toContain('stroke="#762a2a"');
    expect(client).toContain('stroke="#236b31"');
    expect(accessory).toContain('stroke="#236b31"');
    expect(client.match(/stroke="#33384f"/g)).toHaveLength(3);
    expect(accessory.match(/stroke="#33384f"/g)).toHaveLength(3);

    const backgroundSignatures = [
      ['stroke="#fff"', 'stroke="#fff"'],
      ['opacity=".16"', 'opacity=".16"'],
      ['opacity=".25"', 'opacity=".25"'],
      ['opacity=".18"', 'opacity=".18"'],
      ['opacity=".2"', 'opacity=".2"'],
    ] as const;
    for (const [frontendSignature, soliditySignature] of backgroundSignatures) {
      expect(client).toContain(frontendSignature);
      expect(renderer).toContain(soliditySignature);
    }
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
