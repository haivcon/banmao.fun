import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { ACCESSORY_SVGS, BACKGROUND_SVGS } from "../app/collection/banmaoking/scene";
import { bodySvg, expressionSvg } from "../app/collection/banmaoking/artwork";
import { BODY_TRAITS } from "../app/collection/banmaoking/traits";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("Banmao King polished SVG catalogue", () => {
  test("mirrors every complete accessory and background SVG, not just path signatures", () => {
    const accessory = read("contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol");
    const renderer = read("contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol");
    expect(ACCESSORY_SVGS).toHaveLength(12);
    expect(BACKGROUND_SVGS).toHaveLength(8);
    ACCESSORY_SVGS.forEach((svg, id) => expect(accessory).toContain(`if (id == ${id}) return '${svg}';`));
    BACKGROUND_SVGS.forEach((svg, id) => expect(renderer).toContain(`if (id == ${id}) return '${svg}';`));
  });

  test("raises paired ears consistently on-chain and places headphones above the eyes", () => {
    const svg = bodySvg(BODY_TRAITS[0].color, BODY_TRAITS[0].shade);
    const cat = svg.match(/<g id="cat">.*?<\/g>\n/)?.[0].trim();
    expect(cat).toBeTruthy();
    expect(read("contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol")).toContain(cat);
    expect(svg).toContain('193 94');
    expect(svg).toContain('319 94');
    expect(svg.match(/class="king-ear king-ear-/g)).toHaveLength(2);
    expect(ACCESSORY_SVGS[8]).toContain('rotate(12 182 155)');
    expect(ACCESSORY_SVGS[8]).toContain('rotate(-12 330 155)');
    expect(ACCESSORY_SVGS[8].match(/y="128"/g)).toHaveLength(2);
    expect(ACCESSORY_SVGS[8]).toContain('M180 155C180 76 332 76 332 155');
    expect(ACCESSORY_SVGS[8]).not.toContain('y="207"');
  });

  test("uses a fitted crown and a single centered bow with an anchored knot", () => {
    expect(ACCESSORY_SVGS[1].match(/class="king-crown-ruby"/g)).toHaveLength(1);
    expect(ACCESSORY_SVGS[1]).not.toContain('<circle');
    expect(ACCESSORY_SVGS[1]).toContain('class="king-crown-velvet"');
    expect(ACCESSORY_SVGS[1]).toContain('class="king-crown-side-gems"');
    expect(ACCESSORY_SVGS[1]).toContain('M256 115l11 10-11 13-11-13z');
    // The wider top does not move the base off the existing head attachment.
    expect(ACCESSORY_SVGS[1]).toContain('M214 125q42-13 84 0l-4 17q-38-10-76 0z');
    expect(ACCESSORY_SVGS[2].match(/class="king-bow-knot"/g)).toHaveLength(1);
    expect(ACCESSORY_SVGS[2]).toContain('x="246" y="291" width="20"');
    const css = read("app/collection/banmaoking/banmaoking.css");
    expect(css).toContain('[data-accessory="2"] .king-bow-tails');
    expect(css).not.toContain('[data-accessory="2"] #accessory');
  });

  test("fits oval scholar lenses and symmetric five-square pixel highlights", () => {
    expect(ACCESSORY_SVGS[3].match(/rx="27" ry="23"/g)).toHaveLength(2);
    expect(ACCESSORY_SVGS[3]).toContain('king-glasses-glint');
    const clusters = [...ACCESSORY_SVGS[4].matchAll(/<g class="king-pixel-cluster"[^>]*>(.*?)<\/g>/g)];
    expect(clusters).toHaveLength(2);
    clusters.forEach((cluster, side) => {
      const squares = [...cluster[1].matchAll(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
      expect(squares).toHaveLength(5);
      const center = side === 0 ? 220 : 292;
      expect(cluster[0]).toContain('fill-opacity=".65"');
      expect(squares.map(([, , , w]) => Number(w))).toEqual([7, 6, 6, 6, 6]);
      expect(squares.map(([, x, y, w, h]) => {
        expect(w).toBe(h);
        return [Number(x) + Number(w) / 2 - center, Number(y) + Number(h) / 2 - 211];
      })).toEqual([[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]]);
    });
  });

  test("keeps recessed opening and neutral rim lighting static and mirrored", () => {
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol");
    for (const body of BODY_TRAITS) {
      const svg = bodySvg(body.color, body.shade);
      const gradient = svg.match(/<radialGradient id="bk-opening".*?<\/radialGradient>/)?.[0];
      const rim = svg.match(/<g id="face-rim">.*?<\/g>/)?.[0];
      expect(gradient).toBeTruthy();
      expect(rim).toBeTruthy();
      expect(solidity).toContain(gradient);
      expect(solidity).toContain(rim);
      expect(svg).toContain('fill="url(#bk-opening)"');
      expect(rim).toContain('class="king-rim-light"');
      expect(svg.indexOf('id="face-rim"')).toBeLessThan(svg.indexOf('id="cat"'));
      expect(rim).not.toMatch(/animate|filter|style=/);
    }
  });

  test("gives all twelve expressions distinct static artwork", () => {
    const expressions = Array.from({ length: 12 }, (_, id) => expressionSvg(id));
    expect(new Set(expressions).size).toBe(12);
    expect(expressions[9]).toContain('stroke="#cce8ff"');
    expect(expressions[5]).toContain('ry="28"');
    expect(expressions[7]).toContain('stroke="#3c9dc9"');
  });

  test.each(Array.from({ length: 12 }, (_, id) => id))("rasterizes trait %i with mixed bodies, backgrounds and poses", async (id) => {
    const body = BODY_TRAITS[id % 8];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${BACKGROUND_SVGS[id % 8]}${bodySvg(body.color, body.shade, id % 6)}${expressionSvg(id)}${ACCESSORY_SVGS[id]}</svg>`;
    expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', "")).not.toMatch(/<script|foreignObject|https?:\/\/|undefined|NaN/);
    for (const size of [64, 128]) {
      const { info } = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(size);
      expect(info.height).toBe(size);
    }
  });
});
