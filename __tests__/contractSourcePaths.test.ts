import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import solc from "solc";

const {
  BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES,
  BANMAOBOX_RELEASE_SOURCE_NAMES,
  artifactFingerprint,
  createBanmaoBoxCompilerInput,
} = require("../scripts/banmaobox-runtime.cjs");

const targetContracts = [
  "contracts/BanmaoAirdrop/BanmaoAirdrop.sol",
  "contracts/BanmaoHub/BanmaoHub.sol",
  "contracts/BanMaoFomo/BanMaoFomo.sol",
  "contracts/BanMaoSnake/BanMaoSnake.sol",
  "contracts/BanMaoPK/BanMaoPK.sol",
  "contracts/BanmaoStaking/BanmaoStaking.sol",
  "contracts/BanmaoSlotsMultiPool/BanmaoSlotsMultiPool.sol",
  "contracts/BanmaoSlotsMultiPoolV2/BanmaoSlotsMultiPoolV2.sol",
  "contracts/BanmaoRPS/BanmaoRPS.sol",
  "contracts/BanmaoBox/Box/BanmaoBox.sol",
  "contracts/BanmaoBox/Factory/BanmaoBoxFactory.sol",
  "contracts/BanmaoBox/Renderer/BanmaoBoxRenderer.sol",
  "contracts/BanmaoBox/Mock/MockBanmao.sol",
  "contracts/Launchpad/Core/BanmaoLaunchpad.sol",
  "contracts/Launchpad/Hook/LaunchpadHook.sol",
  "contracts/Launchpad/Hook/ILaunchpadHook.sol",
  "contracts/Launchpad/Locker/LiquidityLocker.sol",
  "contracts/Launchpad/Token/MemeToken.sol",
] as const;

const oldPhysicalContracts = [
  "contracts/BanmaoAirdrop.sol",
  "contracts/BanmaoHub.sol",
  "contracts/BanMaoFomo.sol",
  "contracts/BanMaoSnake.sol",
  "contracts/BanMaoPK.sol",
  "contracts/BanmaoStaking.sol",
  "contracts/BanmaoSlotsMultiPool.sol",
  "contracts/BanmaoSlotsMultiPoolV2.sol",
  "contracts/banmaorps.sol",
  "contracts/banmaobox/BanmaoBox.sol",
  "contracts/banmaobox/BanmaoBoxFactory.sol",
  "contracts/banmaobox/BanmaoBoxRenderer.sol",
  "contracts/banmaobox/MockBanmao.sol",
  "contracts/launchpad/BanmaoLaunchpad.sol",
  "contracts/launchpad/LaunchpadHook.sol",
  "contracts/launchpad/ILaunchpadHook.sol",
  "contracts/launchpad/LiquidityLocker.sol",
  "contracts/launchpad/MemeToken.sol",
] as const;

const release = JSON.parse(readFileSync(join(process.cwd(), "deployments", "banmaobox-release-artifacts.json"), "utf8"));

describe("contract source directory and BanmaoBox provenance", () => {
  test("keeps every primary contract at exactly its standardized physical path", () => {
    for (const source of targetContracts) expect(existsSync(join(process.cwd(), source))).toBe(true);
    for (const source of oldPhysicalContracts) expect(existsSync(join(process.cwd(), source))).toBe(false);

    const contractRoot = join(process.cwd(), "contracts");
    const actualContracts = readdirSync(contractRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sol"))
      .map((entry) => relative(process.cwd(), join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
      .sort();
    expect(actualContracts).toEqual([...targetContracts].sort());
  });

  test("resolves every relative Solidity import from its physical source", () => {
    for (const source of targetContracts) {
      const physicalSource = join(process.cwd(), source);
      const content = readFileSync(physicalSource, "utf8");
      for (const match of content.matchAll(/import\s+(?:[^"']*?from\s+)?["']([^"']+)["']\s*;/g)) {
        if (match[1].startsWith(".")) {
          expect(existsSync(join(dirname(physicalSource), match[1]))).toBe(true);
        }
      }
    }
  });

  test("maps physical BanmaoBox sources to their legacy virtual source names", () => {
    expect(BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES).toEqual({
      "contracts/BanmaoBox/Renderer/BanmaoBoxRenderer.sol": "contracts/banmaobox/BanmaoBoxRenderer.sol",
      "contracts/BanmaoBox/Box/BanmaoBox.sol": "contracts/banmaobox/BanmaoBox.sol",
      "contracts/BanmaoBox/Factory/BanmaoBoxFactory.sol": "contracts/banmaobox/BanmaoBoxFactory.sol",
      "contracts/BanmaoBox/Mock/MockBanmao.sol": "contracts/banmaobox/MockBanmao.sol",
    });
    expect(BANMAOBOX_RELEASE_SOURCE_NAMES).toEqual([
      "contracts/banmaobox/BanmaoBoxRenderer.sol",
      "contracts/banmaobox/BanmaoBox.sol",
      "contracts/banmaobox/BanmaoBoxFactory.sol",
    ]);
  });

  test("reproduces the immutable compiler input and runtime fingerprints", () => {
    const input = createBanmaoBoxCompilerInput({
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } },
    });
    const standardInput = JSON.stringify(input);
    const crypto = require("node:crypto");
    expect(`0x${crypto.createHash("sha256").update(standardInput).digest("hex")}`).toBe(
      "0x22aad5bfec33af537e970ff3f2cca2f43d7ebfe63d1c537712d9ecb8728ebc8d",
    );

    const output = JSON.parse(solc.compile(standardInput));
    const errors = (output.errors ?? []).filter((item: { severity: string }) => item.severity === "error");
    expect(errors).toEqual([]);
    const artifact = (file: string, name: string) => output.contracts[`contracts/banmaobox/${file}`][name];
    expect(artifactFingerprint(artifact("BanmaoBoxRenderer.sol", "BanmaoBoxRenderer"))).toEqual(release.runtime.renderer);
    expect(artifactFingerprint(artifact("BanmaoBoxFactory.sol", "BanmaoBoxFactory"))).toEqual(release.runtime.factory);
    expect(artifactFingerprint(artifact("BanmaoBox.sol", "BanmaoBox"))).toEqual(release.runtime.box);
  });
});
