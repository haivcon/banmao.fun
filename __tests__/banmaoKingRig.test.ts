import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { actionPoseSvg, bodySvg } from "../app/collection/banmaoking/artwork";
import { animatedExpressionSvg } from "../app/collection/banmaoking/motion";

const read = (p: string) => (readFileSync(join(process.cwd(), p), "utf8") + (p.endsWith('/BanmaoKingBodyLib.sol') ? readFileSync(join(process.cwd(), 'contracts/BanmaoKing/Lib/BanmaoKingAnatomyPart.sol'), 'utf8') : '')).replace(/\\"/g, '"').replace(/ id="smil-[^"]+"/g, "");

describe("Banmao King compact rig", () => {
  test.each([0, 1, 2, 3, 4, 5])("preserves all moving silhouettes and markings for pose %i", (pose) => {
    const svg = actionPoseSvg(pose);
    expect(svg).toContain('<g class="king-tail-position" transform="translate(0 10)"><g class="king-tail">');
    for (const part of ["arm-left", "arm-right", "leg-left", "leg-right", "tail"]) {
      expect(svg).toContain(`class="king-${part}"`);
    }
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol");
    // Body stores neutral geometry; renderer motion data supplies the timelines.
    const neutral = svg.replace(/<animate(?:Transform)?[^>]*\/>/g, '');
    for (const tag of neutral.match(/<[^>]+>/g) || []) expect(solidity).toContain(tag);
    expect((svg.match(/<g\b/g) || []).length).toBe((svg.match(/<\/g>/g) || []).length);
  });

  test.each([0, 1, 2, 3, 4, 5])("keeps thin tail stripes inside the silhouette for pose %i", async (pose) => {
    const svg = actionPoseSvg(pose);
    const silhouette = svg.match(/<path\b[^>]*class="king-tail-silhouette"[^>]+>/)![0].replace(/>$/, '/>');
    const stripes = svg.match(/<path\b[^>]*class="king-tail-stripes"[^>]+>/)![0].replace(/>$/, '/>');
    const rotation = svg.match(/<g transform="(rotate\([^"]+\))">/)![1];
    expect(stripes).toContain('stroke-width="3"');
    const raster = (content: string) => sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512"><g transform="${rotation}">${content}</g></svg>`,
    )).ensureAlpha().raw().toBuffer();
    const [mask, markings] = await Promise.all([
      raster(silhouette.replace('fill="url(#bk-fur)"', 'fill="#fff"').replace('stroke="#80643a"', 'stroke="none"')),
      raster(stripes),
    ]);
    let outsidePixels = 0;
    let stripePixels = 0;
    for (let i = 3; i < markings.length; i += 4) {
      if (markings[i] > 16) {
        stripePixels++;
        if (mask[i] < 250) outsidePixels++;
      }
    }
    expect(stripePixels).toBeGreaterThan(100);
    expect(outsidePixels).toBe(0);
  });

  test("keeps ear pivots fixed with the larger compact ear scale", () => {
    const svg = bodySvg("#ffe53b", "#d9ad14");
    expect(svg.match(/class="king-ear-shape"/g)).toHaveLength(2);
    for (const x of [205, 307]) {
      expect(svg).toContain(`translate(${x} 153) scale(.85 .82) translate(-${x} -153)`);
    }
  });

  test("does not paint the golden face rim across either ear", async () => {
    const body = bodySvg("#ffe53b", "#d9ad14");
    expect(body.indexOf('id="face-rim"')).toBeLessThan(body.indexOf('id="cat"'));
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol");
    expect(solidity).toContain('_bananaShell(shade), _faceRim(), _cat()');
    expect(solidity).toContain(body.match(/<g id="face-rim">.*?<\/g>/)![0]);
    const withoutRim = body.replace(/<g id="face-rim">.*?<\/g>/, "");
    expect(withoutRim).not.toBe(body);
    const raster = async (content: string) => sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${content}</svg>`,
    )).ensureAlpha().raw().toBuffer();
    const [actual, reference] = await Promise.all([raster(body), raster(withoutRim)]);
    // These patches lie inside the ears where the oval used to cross them.
    for (const center of [200, 312]) {
      for (let x = center - 2; x <= center + 2; x++) {
        for (let y = 144; y <= 149; y++) {
          const offset = (y * 512 + x) * 4;
          expect(actual.subarray(offset, offset + 4)).toEqual(reference.subarray(offset, offset + 4));
        }
      }
    }
  });

  test.each([6, 7])("does not blink brows or tears for expression %i", (id) => {
    const svg = animatedExpressionSvg(id);
    const eyes = svg.match(/<g class="king-eyes-open">(.*?)<\/g>/)?.[1];
    expect(eyes).toBeTruthy();
    expect(eyes).not.toContain("king-tears");
    expect(eyes).not.toContain("M198 191");
    expect(svg).toContain('class="king-mouth"');
    expect(svg).toContain('class="king-whiskers"');
    if (id === 7) expect(svg).toContain('class="king-tears"');
  });

  test.each(Array.from({ length: 12 }, (_, id) => id))("rasterizes complete animated expression %i", async (id) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bodySvg("#ffe53b", "#d9ad14", id % 6)}${animatedExpressionSvg(id)}</svg>`;
    const { info } = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(256);
    expect(info.height).toBe(256);
  });
});
