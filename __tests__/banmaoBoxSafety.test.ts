jest.mock("../app/defi/box/registry", () => ({}));

import {
  isCanonicalBoxCollection,
  normalizeTokenDecimals,
  normalizeTokenSymbol,
  parseStoredCollection,
  sameAddress,
  svgImageDataUri,
} from "../app/defi/box/safety";
import { classifyRendererAdminAccess } from "../app/defi/box/rendererAdminPolicy";
import {
  MAX_LOCK_DURATION_SECONDS,
  addAddressHistoryEntry,
  durationPartsToSeconds,
  normalizeBoxAssets,
  parseAddressHistory,
} from "../app/defi/box/contracts";

const address = (digit: string) => `0x${digit.repeat(40)}` as `0x${string}`;

describe("BanmaoBox frontend safety helpers", () => {
  test("distinguishes the manifest collection from factory-created collections", () => {
    expect(isCanonicalBoxCollection(address("1"), address("2"), address("1"), address("2"))).toBe(true);
    expect(isCanonicalBoxCollection(address("1"), address("3"), address("1"), address("2"))).toBe(false);
    expect(sameAddress(address("a"), address("A"))).toBe(true);
  });

  test("fails closed unless wallet, chain, Factory admin, and Collection admin all match", () => {
    const admin = address("a");
    expect(classifyRendererAdminAccess(undefined, 196, 196, admin, admin)).toBe("disconnected");
    expect(classifyRendererAdminAccess(admin, 195, 196, admin, admin)).toBe("wrong-network");
    expect(classifyRendererAdminAccess(admin, 196, 196, undefined, admin)).toBe("unavailable");
    expect(classifyRendererAdminAccess(admin, 196, 196, admin, address("b"))).toBe("role-mismatch");
    expect(classifyRendererAdminAccess(address("b"), 196, 196, admin, admin)).toBe("unauthorized");
    expect(classifyRendererAdminAccess(address("A"), 196, 196, admin, admin)).toBe("authorized");
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
    const legacy = decodeURIComponent(svgImageDataUri('\uFEFF<?xml version="1.0"?>\n<!-- legacy renderer -->\n<svg viewBox="0 0 800 800"><rect width="800" height="800"/></svg>'));
    expect(legacy).toContain('<svg viewBox="0 0 800 800">');
    expect(legacy).not.toContain("Artwork unavailable");
    const fallback = decodeURIComponent(svgImageDataUri("not svg"));
    expect(fallback).toContain("Artwork unavailable");
    expect(fallback).toContain('width="600" height="600" viewBox="0 0 600 600"');
  });

  test("converts exact mixed integer duration fields and enforces bounds", () => {
    expect(durationPartsToSeconds({ days: "0", hours: "0", minutes: "0", seconds: "0" })).toBe(0n);
    expect(durationPartsToSeconds({ days: "0", hours: "0", minutes: "0", seconds: "1" })).toBe(1n);
    expect(durationPartsToSeconds({ days: "36500", hours: "0", minutes: "0", seconds: "0" })).toBe(MAX_LOCK_DURATION_SECONDS);
    expect(durationPartsToSeconds({ days: "36500", hours: "0", minutes: "0", seconds: "1" })).toBe(MAX_LOCK_DURATION_SECONDS + 1n);
    expect(durationPartsToSeconds({ days: "2", hours: "3", minutes: "4", seconds: "5" })).toBe(183_845n);
    expect(durationPartsToSeconds({ days: "1.5", hours: "0", minutes: "0", seconds: "0" })).toBeNull();
    expect(durationPartsToSeconds({ days: "", hours: "", minutes: "", seconds: "" })).toBe(0n);
  });

  test("parses, checksums, deduplicates, caps, and tolerates malformed address history", () => {
    expect(parseAddressHistory("not json")).toEqual([]);
    expect(parseAddressHistory(JSON.stringify([address("1"), "bad", 7, address("1").toUpperCase()]))).toEqual([address("1")]);

    let history: `0x${string}`[] = [];
    for (let digit = 1; digit <= 11; digit += 1) {
      history = addAddressHistoryEntry(history, `0x${digit.toString(16).padStart(40, "0")}`);
    }
    expect(history).toHaveLength(10);
    expect(history[0]).toBe("0x000000000000000000000000000000000000000b");
    expect(addAddressHistoryEntry(history, history[5])[0]).toBe(history[5]);
  });

  test("normalizes every old and new asset tuple without relying on the primary token", () => {
    const primary = address("1");
    const secondary = address("2");
    const oldTuple = [primary, 0n] as const;
    const newTuple = Object.assign([secondary, 1_234_567n, 6, "USDC"], {
      token: secondary,
      amount: 1_234_567n,
      decimals: 6,
      symbol: "USDC",
    });
    expect(normalizeBoxAssets([oldTuple, newTuple])).toEqual([
      { token: primary, amount: 0n },
      { token: secondary, amount: 1_234_567n, decimals: 6, symbol: "USDC" },
    ]);
    expect(normalizeBoxAssets([])).toEqual([]);
    expect(normalizeBoxAssets([["bad", 1n], [secondary, "bad"]])).toEqual([]);
  });
});
