import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expressionSvg } from "../app/collection/banmaoking/artwork";
import { animatedExpressionSvg } from "../app/collection/banmaoking/motion";
import { ACCESSORY_SVGS } from "../app/collection/banmaoking/scene";

const read = (file: string) => readFileSync(join(process.cwd(), file.replace('BanmaoKingExpressionLib.sol', 'BanmaoKingExpressionParts.sol')), "utf8").replace(/\\"/g, '"').replace(/ id="smil-[^"]+"/g, "");

describe("Banmao King expression geometry (motion coverage in banmaoKingSmil.test.ts)", () => {
  test("keeps brown whiskers and the standard nose consistent in every expression", () => {
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingExpressionLib.sol");
    const standard = expressionSvg(1).match(/<g class="king-whiskers">(.*?)<\/g>/)![1];
    expect(standard).toContain('stroke="#784727"');
    // Repeated tags are interned into separate Solidity helper functions.
    for (const tag of standard.match(/<[^>]+>/g) || []) expect(solidity).toContain(tag);
    for (let id = 0; id < 12; id++) {
      expect(expressionSvg(id)).toContain(`<g class="king-whiskers">${standard}</g>`);
      expect(expressionSvg(id)).toContain('M256 240l-9 7 9 8 9-8z');
      expect(expressionSvg(id)).not.toContain('M256 235');
    }
  });
  test.each(Array.from({ length: 12 }, (_, id) => id))(
    "preserves every canonical expression path for trait %i",
    (id) => {
      const animated = animatedExpressionSvg(id);
      // SMIL adds lids and morph children; every authored neutral shape remains intact.
      for (const tag of expressionSvg(id).matchAll(/<(path|ellipse|circle)\b([^>]*?)\/>/g)) {
        const attributes = [...tag[2].matchAll(/([\w-]+)="([^"]*)"/g)];
        const candidates = [...animated.matchAll(new RegExp(`<${tag[1]}\\b[^>]*>`, 'g'))];
        expect(candidates.some(([candidate]) => attributes.every(([, key, value]) => candidate.includes(`${key}="${value}"`)))).toBe(true);
      }
      const eyes = animated.match(/<g class="king-eyes-(?:open|rest|symbolic)"[^>]*>(.*?)<\/g>/)?.[1];
      expect(eyes).toBeTruthy();
      expect(eyes).not.toContain("M256 235");
      expect(eyes).not.toContain("M256 240");
      expect(eyes).not.toContain("M241 259");
      expect(animated).toContain(id === 4 || id === 11 ? "king-eyes-rest" : id === 3 || id === 10 ? "king-eyes-symbolic" : "king-eyes-open");
    },
  );

});
