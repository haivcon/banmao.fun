import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { encodeAbiParameters, keccak256 } from "viem";
import release from "../lib/banmaobox/verification-release.json";
import deployedRelease from "../lib/banmaobox/verification-releases/39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143.json";
import candidate from "../deployments/banmaobox-release-artifacts.json";
import manifest from "../deployments/banmaobox-xlayer-mainnet.json";

const solc = require("solc");

describe("BanmaoBox verification release", () => {
  it("is self-contained Standard JSON that reproduces the approved runtime", () => {
    const input = JSON.parse(release.standardInput);
    expect(input.language).toBe("Solidity");
    expect(input.settings.optimizer).toEqual({ enabled: true, runs: 200 });
    expect(input.settings.evmVersion).toBe("shanghai");
    expect(Object.keys(input.sources)).toEqual(
      expect.arrayContaining([
        "contracts/banmaobox/BanmaoBoxRenderer.sol",
        "contracts/banmaobox/BanmaoBox.sol",
        "contracts/banmaobox/BanmaoBoxFactory.sol",
      ]),
    );
    expect(Object.keys(input.sources).some((name) => name.startsWith("@openzeppelin/"))).toBe(true);

    const output = JSON.parse(solc.compile(release.standardInput));
    const errors = (output.errors ?? []).filter((item: { severity: string }) => item.severity === "error");
    expect(errors).toEqual([]);
    const artifact = output.contracts["contracts/banmaobox/BanmaoBox.sol"].BanmaoBox;
    const bytes = Buffer.from(artifact.evm.deployedBytecode.object, "hex");
    for (const references of Object.values(artifact.evm.deployedBytecode.immutableReferences) as Array<Array<{ start: number; length: number }>>) {
      for (const { start, length } of references) bytes.fill(0, start, start + length);
    }
    expect(bytes.length).toBe(release.box.runtime.bytes);
    expect(keccak256(`0x${bytes.toString("hex")}`)).toBe(release.box.runtime.normalizedKeccak256);
  });

  it("matches the candidate and immutable hash-versioned release", () => {
    const inputHash = `0x${createHash("sha256").update(release.standardInput).digest("hex")}`;
    expect(inputHash).toBe(release.compilerInputHash);
    expect(candidate.compilerInputHash).toBe(inputHash);
    const versioned = JSON.parse(readFileSync(
      `deployments/banmaobox-releases/${inputHash.slice(2)}.json`,
      "utf8",
    ));
    expect(versioned).toEqual(candidate);
  });

  it("keeps the deployed factory and its immutable verification payload compatible", () => {
    const inputHash = `0x${createHash("sha256").update(deployedRelease.standardInput).digest("hex")}`;
    expect(inputHash).toBe(manifest.compilerInputHash);
    expect(inputHash).toBe(deployedRelease.compilerInputHash);
    expect(deployedRelease.contractName).toBe("contracts/banmaobox/BanmaoBox.sol:BanmaoBox");
    expect(deployedRelease.compiler).toBe(manifest.compiler);
    expect(deployedRelease.box.runtime.bytes).toBe(manifest.runtime.box.bytes);
    expect(deployedRelease.box.runtime.normalizedKeccak256).toBe(manifest.runtime.box.normalizedKeccak256);

    const output = JSON.parse(solc.compile(deployedRelease.standardInput));
    const errors = (output.errors ?? []).filter((item: { severity: string }) => item.severity === "error");
    expect(errors).toEqual([]);
    const artifact = output.contracts["contracts/banmaobox/BanmaoBox.sol"].BanmaoBox;
    expect(artifact.abi.find((item: { type: string }) => item.type === "constructor")?.inputs)
      .toEqual([
        expect.objectContaining({ type: "address" }),
        expect.objectContaining({ type: "address" }),
        expect.objectContaining({ type: "address" }),
      ]);
    const bytes = Buffer.from(artifact.evm.deployedBytecode.object, "hex");
    for (const references of Object.values(artifact.evm.deployedBytecode.immutableReferences) as Array<Array<{ start: number; length: number }>>) {
      for (const { start, length } of references) bytes.fill(0, start, start + length);
    }
    expect(bytes.length).toBe(manifest.runtime.box.bytes);
    expect(keccak256(`0x${bytes.toString("hex")}`)).toBe(manifest.runtime.box.normalizedKeccak256);
  });

  it("encodes constructor arguments without the 0x prefix expected by explorers", () => {
    const encoded = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "address" }],
      [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
      ],
    ).slice(2);
    expect(encoded).toHaveLength(192);
    expect(encoded.startsWith("0x")).toBe(false);
  });
});
