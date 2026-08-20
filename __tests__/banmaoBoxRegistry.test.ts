import {
  CANONICAL_BANMAO_MAINNET_ADDRESS,
  XLAYER_MULTICALL3_ADDRESS,
  boxNftExplorerUrl,
  isVerifiedMainnetManifest,
  validDeploymentAddress,
  type BoxDeploymentManifest,
} from "../app/defi/box/address";
import mainnetManifest from "../deployments/banmaobox-xlayer-mainnet.json";
import testnetManifest from "../deployments/banmaobox-xlayer-testnet.json";

const address = (digit: string) => `0x${digit.repeat(40)}`;
const hash = (digit: string) => `0x${digit.repeat(64)}`;

function manifest(status = "deployed") {
  return {
    status,
    contracts: {
      token: CANONICAL_BANMAO_MAINNET_ADDRESS,
      factoryRenderer: address("1"),
      defaultRenderer: address("4"),
      boxRenderer: address("5"),
      factory: address("2"),
      box: address("3"),
    },
    runtime: {
      token: { bytes: 50, keccak256: hash("d") },
      factoryRenderer: { bytes: 100, keccak256: hash("a") },
      defaultRenderer: { bytes: 101, keccak256: hash("e") },
      boxRenderer: { bytes: 102, keccak256: hash("f") },
      factory: { bytes: 200, keccak256: hash("b") },
      box: { bytes: 300, keccak256: hash("c") },
    },
  };
}

describe("BanmaoBox chain registry", () => {
  test("keeps complete X Layer mainnet and testnet deployment manifests", () => {
    expect(mainnetManifest.chainId).toBe(196);
    expect(testnetManifest.chainId).toBe(1952);
    expect(testnetManifest.status).toBe("deployed");
    expect(XLAYER_MULTICALL3_ADDRESS).toBe(
      "0xcA11bde05977b3631167028862bE2a173976CA11",
    );
    expect(testnetManifest.contracts.renderer).toBe(
      "0x991e10eB9B88A08f60514A294255Fa1726c8Ae60",
    );
    expect(testnetManifest.contracts.factory).toBe(
      "0xa4649B62033AE50f338a79BA248DAF09C3A6729c",
    );
    expect(testnetManifest.contracts.box).toBe(
      "0x7b99b901CF411C32Aef1D80783B1a6599f3Cb516",
    );
    for (const contractAddress of Object.values(testnetManifest.contracts)) {
      expect(validDeploymentAddress(contractAddress)).toBe(contractAddress);
    }
  });

  test("builds per-NFT explorer links for mainnet and testnet", () => {
    expect(
      boxNftExplorerUrl(
        "https://www.okx.com/web3/explorer/xlayer/",
        mainnetManifest.contracts.box,
        BigInt(42),
      ),
    ).toBe(
      `https://www.okx.com/web3/explorer/xlayer/assets/${mainnetManifest.contracts.box.toLowerCase()}/42`,
    );
    expect(
      boxNftExplorerUrl(
        "https://www.okx.com/web3/explorer/xlayer-test",
        testnetManifest.contracts.box,
        BigInt(7),
      ),
    ).toBe(
      `https://www.okx.com/web3/explorer/xlayer-test/assets/${testnetManifest.contracts.box.toLowerCase()}/7`,
    );
    expect(
      boxNftExplorerUrl(
        "https://web3.okx.com/explorer/x-layer/evm",
        "0xE8247C96787119A8F7E8F8C81F58BeC5BEFC999f",
        BigInt(3),
      ),
    ).toBe(
      "https://web3.okx.com/explorer/x-layer/evm/assets/0xe8247c96787119a8f7e8f8c81f58bec5befc999f/3",
    );
    expect(
      boxNftExplorerUrl("https://example.com", undefined, BigInt(1)),
    ).toBeUndefined();
  });

  describe("mainnet registry gates", () => {
    test("accepts the verified replacement deployment in the production manifest", () => {
      expect(
        isVerifiedMainnetManifest(mainnetManifest as BoxDeploymentManifest),
      ).toBe(true);
      expect(mainnetManifest.contracts.factoryRenderer).toBe(
        "0xE19c875dBfa80171819E443e46Fc7839a9290769",
      );
      expect(mainnetManifest.contracts.defaultRenderer).toBe(
        "0x479365c028A1FA633b16BBef95e8691D4f37B21F",
      );
      expect(mainnetManifest.contracts.boxRenderer).toBe(
        "0x479365c028A1FA633b16BBef95e8691D4f37B21F",
      );
      expect(mainnetManifest.contracts.factory).toBe(
        "0x01E03F6eb085f4934A3A7946545b00341B95d9E9",
      );
      expect(mainnetManifest.contracts.previousFactory).toBe(
        "0x0000000000000000000000000000000000000000",
      );
      expect(mainnetManifest.contracts.box).toBe(
        "0xE8247C96787119A8F7E8F8C81F58BeC5BEFC999f",
      );
    });

    test("accepts only non-zero EVM deployment addresses", () => {
      expect(validDeploymentAddress(address("1"))).toBe(address("1"));
      expect(
        validDeploymentAddress(
          "0x0000000000000000000000000000000000000000",
        ),
      ).toBeUndefined();
      expect(validDeploymentAddress("not-an-address")).toBeUndefined();
    });

    test("requires deployed status, all contracts, and all runtime fingerprints", () => {
      expect(isVerifiedMainnetManifest(manifest())).toBe(true);
      expect(isVerifiedMainnetManifest(manifest("not-deployed"))).toBe(false);

      const candidate = manifest("release-candidate");
      expect(isVerifiedMainnetManifest(candidate)).toBe(false);

      const wrongToken = manifest();
      wrongToken.contracts.token = address("9");
      expect(isVerifiedMainnetManifest(wrongToken)).toBe(false);

      for (const contract of ["factoryRenderer", "defaultRenderer", "boxRenderer", "factory", "box"] as const) {
        const invalidDeployment = manifest();
        invalidDeployment.contracts[contract] =
          "0x0000000000000000000000000000000000000000";
        expect(isVerifiedMainnetManifest(invalidDeployment)).toBe(false);
      }

      const missingRuntime = manifest();
      delete missingRuntime.runtime.box;
      expect(isVerifiedMainnetManifest(missingRuntime)).toBe(false);

      const invalidHash = manifest();
      invalidHash.runtime.factory.keccak256 = "0x1234";
      expect(isVerifiedMainnetManifest(invalidHash)).toBe(false);
    });
  });
});
