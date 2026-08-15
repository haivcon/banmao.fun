import {
  isCanonicalBoxCollection,
  normalizeTokenDecimals,
  normalizeTokenSymbol,
  parseStoredCollection,
  sameAddress,
  svgImageDataUri,
} from "../app/defi/box/safety";

const address = (digit: string) => `0x${digit.repeat(40)}` as `0x${string}`;

describe("BanmaoBox frontend safety helpers", () => {
  test("distinguishes the manifest collection from factory-created collections", () => {
    expect(isCanonicalBoxCollection(address("1"), address("2"), address("1"), address("2"))).toBe(true);
    expect(isCanonicalBoxCollection(address("1"), address("3"), address("1"), address("2"))).toBe(false);
    expect(sameAddress(address("a"), address("A"))).toBe(true);
  });

  test("normalizes untrusted ERC-20 display metadata", () => {
    expect(normalizeTokenDecimals(6)).toBe(6);
    expect(normalizeTokenDecimals(-1)).toBe(18);
    expect(normalizeTokenDecimals(70)).toBe(18);
    expect(normalizeTokenDecimals(1.5)).toBe(18);
    expect(normalizeTokenSymbol("USDT")).toBe("USDT");
    expect(normalizeTokenSymbol("<img onerror=alert(1)>")).toBe("TOKEN");
    expect(normalizeTokenSymbol(null)).toBe("TOKEN");
  });

  test("accepts only an exact non-zero token and box storage pair", () => {
    expect(parseStoredCollection(`${address("1")}:${address("2")}`)).toEqual({
      token: address("1"),
      box: address("2"),
    });
    expect(parseStoredCollection(`${address("1")}:${address("2")}:extra`)).toBeNull();
    expect(parseStoredCollection(`${address("0")}:${address("2")}`)).toBeNull();
    expect(parseStoredCollection("corrupt")).toBeNull();
  });

  test("encodes renderer SVG for image rendering instead of live DOM injection", () => {
    const uri = svgImageDataUri('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(uri).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(uri).not.toContain("<script>");
    expect(decodeURIComponent(svgImageDataUri("not svg"))).toContain("Artwork unavailable");
  });
});
