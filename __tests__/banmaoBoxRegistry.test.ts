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
      renderer: address("1"),
      factory: address("2"),
      box: address("3"),
    },
    runtime: {
      token: { bytes: 50, keccak256: hash("d") },
      renderer: { bytes: 100, keccak256: hash("a") },
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
      "0x35459B8152ae379bEF1041fD501Bc4CE8C96d215",
    );
    expect(testnetManifest.contracts.factory).toBe(
      "0x0b39f8E7e0040AC144F89229c6b294f379Fa5856",
    );
    expect(testnetManifest.contracts.box).toBe(
      "0xCE6dAA64Fa861a02B405d8ac56ae4752e4dAB4eB",
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
        42n,
      ),
    ).toBe(
      `https://www.okx.com/web3/explorer/xlayer/token/${mainnetManifest.contracts.box}?a=42`,
    );
    expect(
      boxNftExplorerUrl(
        "https://www.okx.com/web3/explorer/xlayer-test",
        testnetManifest.contracts.box,
        7n,
      ),
    ).toBe(
      `https://www.okx.com/web3/explorer/xlayer-test/token/${testnetManifest.contracts.box}?a=7`,
    );
    expect(boxNftExplorerUrl("https://example.com", undefined, 1n)).toBeUndefined();
  });

  describe("mainnet registry gates", () => {
    test("accepts the verified replacement deployment in the production manifest", () => {
      expect(
        isVerifiedMainnetManifest(mainnetManifest as BoxDeploymentManifest),
      ).toBe(true);
      expect(mainnetManifest.contracts.renderer).toBe(
        "0xE19c875dBfa80171819E443e46Fc7839a9290769",
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

      for (const contract of ["renderer", "factory", "box"] as const) {
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
