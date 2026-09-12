import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expressionSvg } from "../app/collection/banmaoking/artwork";
import { animatedExpressionSvg } from "../app/collection/banmaoking/motion";
import { ACCESSORY_SVGS } from "../app/collection/banmaoking/scene";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("Banmao King preview motion", () => {
  test("keeps the shadow outside pose transforms and retains static particle geometry", () => {
    const client = read("app/collection/banmaoking/BanmaoKingClient.tsx");
    expect(client).toMatch(/<g filter=\{traits.background === 0 \? undefined : "url\(#king-shadow\)"\}>\s*<g\s+transform=\{actionTransform\(tokenId\)\}/);
    expect(client).not.toMatch(/animated && \(\s*<g className="king-particles"/);
    expect(client).not.toContain('<span className="king-art-glint"');
    expect(read("app/collection/banmaoking/banmaoking.css")).toContain('.king-art[data-animated="false"] .king-particles { display: none; }');
  });
  test.each([[0, "Happy"], [1, "Joy"], [5, "Surprise"], [6, "Determined"], [7, "Teary"], [8, "Silly"], [9, "Cool"]] as const)("assigns distinct eye motion to expression %i", (id, mood) => {
    const css = read("app/collection/banmaoking/banmaoking.css");
    expect(css).toContain(`.king-art[data-expression="${id}"] .king-eyes-blink { --eye-motion: king${mood}Eyes; }`);
    expect(css).toContain(`@keyframes king${mood}Eyes`);
    expect(animatedExpressionSvg(id)).toContain('class="king-eyes-blink"');
  });

  test.each(["Happy", "Joy", "Wink", "Love", "Sleepy", "Surprise", "Determined", "Teary", "Silly", "Cool", "Star", "Zen"])("defines a dedicated %s tail rhythm", (mood) => {
    const moods = ["Happy", "Joy", "Wink", "Love", "Sleepy", "Surprise", "Determined", "Teary", "Silly", "Cool", "Star", "Zen"];
    const css = read("app/collection/banmaoking/banmaoking.css");
    expect(css).toContain(`.king-art[data-expression="${moods.indexOf(mood)}"] .king-tail { --tail-motion: kingTail${mood}; --tail-speed:`);
    expect(css).toContain(`@keyframes kingTail${mood} {`);
    expect(css).toContain('.king-art[data-animated="true"] .king-tail { animation: var(--tail-motion) var(--tail-speed) ease-in-out infinite; }');
    expect(css).toContain('.king-page[data-motion-override="true"] .king-art[data-animated="true"] .king-tail { animation: var(--tail-motion) var(--tail-speed) ease-in-out infinite !important; }');
    expect(css).not.toContain('.king-tail-position { animation:');
  });

  test("uses three mirrored curves per cheek and mood-specific anchored motion", () => {
    const svg = expressionSvg(0);
    const left = svg.match(/class="king-whiskers-left" d="([^"]+)"/)![1];
    const right = svg.match(/class="king-whiskers-right" d="([^"]+)"/)![1];
    expect(left.match(/M/g)).toHaveLength(3);
    expect(right.match(/M/g)).toHaveLength(3);
    const coordinates = (d: string) => d.match(/\d+/g)!.map(Number);
    expect(coordinates(right)).toEqual(coordinates(left).map((n, i) => i % 2 === 0 ? 512 - n : n));
    const css = read("app/collection/banmaoking/banmaoking.css");
    for (let id = 0; id < 12; id++) {
      expect(css).toContain(`.king-art[data-expression="${id}"] .king-whiskers { --whisker-angle:`);
    }
    expect(css).toContain('transform-origin: 211px 260px');
    expect(css).toContain('transform-origin: 301px 260px');
    expect(css).toContain('.king-art[data-animated="true"] .king-whiskers > path { animation: var(--whisker-motion)');
    expect(css).toContain('.king-page[data-motion-override="true"] .king-art[data-animated="true"] .king-whiskers > path');
    expect(css).not.toContain('.king-whiskers { animation:');
  });

  test("keeps brown whiskers and the standard nose consistent in every expression", () => {
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingExpressionLib.sol");
    const standard = expressionSvg(1).match(/<g class="king-whiskers">(.*?)<\/g>/)![1];
    expect(standard).toContain('stroke="#784727"');
    expect(solidity).toContain(standard);
    for (let id = 0; id < 12; id++) {
      expect(expressionSvg(id)).toContain(`<g class="king-whiskers">${standard}</g>`);
      expect(expressionSvg(id)).toContain('M256 240l-9 7 9 8 9-8z');
      expect(expressionSvg(id)).not.toContain('M256 235');
    }
  });
  test.each([
    [3, "king-lens-trail", "kingLensTrail"],
    [4, "king-pixel-scan", "kingPixelScan"],
    [5, "king-confetti", "kingConfetti"],
    [6, "king-chain-shine", "kingChainShine"],
    [7, "king-leaf-breeze", "kingLeafBreeze"],
    [8, "king-sound-waves", "kingSoundWaves"],
    [9, "king-magic", "kingMagic"],
    [10, "king-halo-aura", "kingHaloAura"],
    [11, "king-cape-shimmer", "kingCapeShimmer"],
  ] as const)("gives accessory %i a synchronized, motion-gated accent", (id, cls, animation) => {
    const css = read("app/collection/banmaoking/banmaoking.css");
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol");
    expect(ACCESSORY_SVGS[id]).toContain(`class="king-detail ${cls}"`);
    expect(solidity).toContain(ACCESSORY_SVGS[id]);
    expect(css).toContain(`.king-art[data-animated="true"] #accessory .${cls} { animation: ${animation}`);
    expect(css).toContain(`.king-page[data-motion-override="true"] .king-art[data-animated="true"] #accessory .${cls}`);
    expect(css).toContain(`@keyframes ${animation}`);
  });

  test.each(Array.from({ length: 12 }, (_, id) => id))(
    "preserves every canonical expression path for trait %i",
    (id) => {
      const animated = animatedExpressionSvg(id);
      expect(animated.replace(/<g class="king-eyes-(?:blink|rest)">(.*?)<\/g>/, "$1"))
        .toBe(expressionSvg(id));
      const eyes = animated.match(/<g class="king-eyes-(?:blink|rest)">(.*?)<\/g>/)?.[1];
      expect(eyes).toBeTruthy();
      expect(eyes).not.toContain("M256 235");
      expect(eyes).not.toContain("M256 240");
      expect(eyes).not.toContain("M241 259");
      expect(animated).toContain(id === 4 || id === 11 ? "king-eyes-rest" : "king-eyes-blink");
    },
  );

  test("keeps pose transforms outside the shared character motion group", () => {
    const client = read("app/collection/banmaoking/BanmaoKingClient.tsx");
    expect(client).toMatch(/transform=\{actionTransform\(tokenId\)\}[\s\S]*?<g className="king-character-motion">\s*<g dangerouslySetInnerHTML=\{\{ __html: accessoryRearSvg\(traits.accessory\) \}\} \/>\s*<BananaCatBody[\s\S]*?<ExpressionLayer[\s\S]*?<AccessoryLayer/);
    expect(client).toContain("animated ? animatedExpressionSvg(id) : expressionSvg(id)");
    expect(client).toContain("aria-pressed={animated}");
    expect(client).toContain("setMotionOverride(!animated)");
    expect(client).toContain("motionOverride ?? !reducedMotion");
    expect(client).toContain("useSyncExternalStore(subscribeMotion");
  });

  test("keeps stronger motion synchronized with on-chain CSS", () => {
    const css = read("app/collection/banmaoking/banmaoking.css");
    const solidity = read("contracts/BanmaoKing/Lib/BanmaoKingMotionLib.sol");
    const start = css.indexOf(".king-particles {");
    const end = css.indexOf("@media (prefers-reduced-motion: reduce)", start);
    expect(solidity).toContain(css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "").trim().replace(/\s+/g, " ").replace(/\s*([{};,])\s*/g, "$1").replace(/:\s+/g, ":"));
    expect(solidity).toContain('.king-art[data-animated="true"] :is(.king-leg-left,.king-leg-right)');
    expect(solidity).not.toContain('.king-art[data-animated="true"]:is(.king-leg-left');
    expect(css).toContain("kingBreathe 2.8s");
    expect(css).toContain("kingGround 2.8s");
    expect(css).toContain("translateY(-10px) rotate(0deg) scale(1.015, .985)");
    expect(css).toContain("rotate(-1.5deg)");
    expect(css).toContain("translateY(-18px) scale(1.8)");
  });

  test("maps all expressions to ear motion with an explicit reduced-motion override", () => {
    const css = read("app/collection/banmaoking/banmaoking.css");
    for (let id = 0; id < 12; id++) {
      expect(css).toContain(`.king-art[data-expression="${id}"] .king-ear`);
    }
    expect(css).toContain('transform-origin: 205px 153px');
    expect(css).toContain('transform-origin: 307px 153px');
    expect(css).toContain('.king-art[data-accessory="8"] .king-ear { --ear-angle: 2deg; --ear-lift: 0px; }');
    expect(css).toContain('.king-art[data-animated="true"] .king-ear { animation: kingEar');
    expect(css).toContain('.king-page[data-motion-override="true"] .king-art[data-animated="true"] .king-ear');
  });

  test("gates animation and hides decorative particles for reduced motion", () => {
    const css = read("app/collection/banmaoking/banmaoking.css");
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain('.king-art[data-animated="true"] .king-character-motion');
    expect(css).toContain('.king-art[data-animated="false"] + .king-art-glint');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
    expect(css).not.toMatch(/@keyframes[^}]*actionTransform/);
  });
});
