import type { Address, Hex } from "viem";
import { buildCollectionVerification, normalizeBanmaoBoxRuntime } from "../app/defi/box/explorer/verification";

const address = (suffix: string) => `0x${suffix.padStart(40, "0")}` as Address;

describe("BanmaoBox collection verification", () => {
  it("normalizes every immutable range without changing other runtime bytes", () => {
    const code = "0x010203040506" as Hex;
    expect(normalizeBanmaoBoxRuntime(code, {
      runtime: { bytes: 6 },
      immutableReferences: { token: [{ start: 1, length: 2 }], admin: [{ start: 4, length: 1 }] },
    })).toBe("0x010000040006");
  });

  it("fails closed when either Factory registry direction is inconsistent", () => {
    const verification = buildCollectionVerification({
      emittedToken: address("1"), underlying: address("1"), emittedBox: address("2"), registryBox: address("3"),
      registered: true, rendererAdmin: address("4"), factoryRendererAdmin: address("4"), runtimeMatchesRelease: true, factorySource: "current",
    });
    expect(verification.status).toBe("unverified");
    expect(verification.canonicalForToken).toBe(false);
  });

  it("distinguishes a runtime warning from a failed provenance check", () => {
    const verification = buildCollectionVerification({
      emittedToken: address("1"), underlying: address("1"), emittedBox: address("2"), registryBox: address("2"),
      registered: true, rendererAdmin: address("4"), factoryRendererAdmin: address("4"), runtimeMatchesRelease: false, factorySource: "predecessor",
    });
    expect(verification.status).toBe("warning");
    expect(verification.factorySource).toBe("predecessor");
    expect(verification.warnings).toEqual(["Runtime matches reviewed release"]);
  });
});
