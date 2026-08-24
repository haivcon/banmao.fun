import * as fs from "node:fs";
import * as path from "node:path";
import type { Address, Hex } from "viem";
import { buildCollectionVerification, normalizeBanmaoBoxRuntime } from "../app/defi/box/explorer/verification";
import deployedRelease from "../lib/banmaobox/verification-releases/39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143.json";

const address = (suffix: string) => `0x${suffix.padStart(40, "0")}` as Address;

describe("BanmaoBox collection verification", () => {
  it("pins Explorer runtime checks to the immutable mainnet deployment release", () => {
    const fingerprint = require("../deployments/banmaobox-releases/39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143.json");
    expect(deployedRelease.compilerInputHash).toBe("0x39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143");
    expect(deployedRelease.box.runtime.bytes).toBe(fingerprint.runtime.box.bytes);
    expect(deployedRelease.box.runtime.normalizedKeccak256).toBe(fingerprint.runtime.box.normalizedKeccak256);
    const source = require("node:fs").readFileSync(
      require("node:path").join(process.cwd(), "app/defi/box/explorer/verification.ts"),
      "utf8",
    );
    expect(source).toContain("lib/banmaobox/verification-releases/39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143.json");
    expect(source).not.toContain('from "../../../../lib/banmaobox/verification-release.json"');
  });

  it("durably seeds the known XDOG collection creation outside the cold-start scan window", () => {
    const seeds = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/banmaobox/collection-seeds.json"), "utf8"));
    expect(seeds["196"]).toContain("0xef0a49a76aefd34c5ae6a99b328ff51e519e6933aba1c8d870e1c519b9dadc1d");
    const server = fs.readFileSync(path.join(process.cwd(), "lib/banmaobox/collectionExplorerServer.ts"), "utf8");
    expect(server).toContain("collectionSeeds");
    expect(server).toContain("receiptCreations(client, hash, lineage)");
  });

  it("exposes idempotent source verification from collection details using the canonical creation transaction", () => {
    const detail = fs.readFileSync(path.join(process.cwd(), "app/defi/box/explorer/CollectionDetailClient.tsx"), "utf8");
    expect(detail).toContain("requestBanmaoBoxVerification(item.transactionHash");
    expect(detail).toContain("classifyBanmaoBoxVerification(update)");
    expect(detail).toContain("copy.verifySource");
  });

  it("reads recent NFT activity beyond the collection discovery scan window", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "lib/banmaobox/collectionExplorerServer.ts"), "utf8");
    const activityReader = server.slice(server.indexOf("async function recentTokenIds"));
    expect(activityReader).toContain('functionName: "tokenByIndex"');
    expect(activityReader).toContain('functionName: "boxDetails"');
    expect(activityReader).toContain("firstBlockAtTimestamp");
    expect(activityReader).toContain("event: boxCreatedEvent");
    expect(activityReader).not.toContain("latestBlock - INITIAL_SCAN_BLOCKS");
  });

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
