import {
  CANONICAL_BANMAO_BOX_ADDRESS,
  CANONICAL_BANMAO_BOX_FACTORY_ADDRESS,
  CANONICAL_BANMAO_BOX_RENDERER_ADDRESS,
  CANONICAL_BANMAO_MAINNET_ADDRESS,
  isVerifiedMainnetManifest,
  validDeploymentAddress,
} from "../app/defi/box/address";

const address = (digit: string) => `0x${digit.repeat(40)}`;
const hash = (digit: string) => `0x${digit.repeat(64)}`;

function manifest(status = "deployed") {
  return {
    status,
    contracts: {
      token: CANONICAL_BANMAO_MAINNET_ADDRESS,
      renderer: CANONICAL_BANMAO_BOX_RENDERER_ADDRESS,
      factory: CANONICAL_BANMAO_BOX_FACTORY_ADDRESS,
      box: CANONICAL_BANMAO_BOX_ADDRESS,
    },
    runtime: {
      token: { bytes: 50, keccak256: hash("d") },
      renderer: { bytes: 100, keccak256: hash("a") },
      factory: { bytes: 200, keccak256: hash("b") },
      box: { bytes: 300, keccak256: hash("c") },
    },
  };
}

describe("BanmaoBox mainnet registry gates", () => {
  test("accepts only non-zero EVM deployment addresses", () => {
    expect(validDeploymentAddress(address("1"))).toBe(address("1"));
    expect(validDeploymentAddress("0x0000000000000000000000000000000000000000")).toBeUndefined();
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
      const retiredDeployment = manifest();
      retiredDeployment.contracts[contract] = address("9");
      expect(isVerifiedMainnetManifest(retiredDeployment)).toBe(false);
    }

    const missingRuntime = manifest();
    delete missingRuntime.runtime.box;
    expect(isVerifiedMainnetManifest(missingRuntime)).toBe(false);

    const invalidHash = manifest();
    invalidHash.runtime.factory.keccak256 = "0x1234";
    expect(isVerifiedMainnetManifest(invalidHash)).toBe(false);
  });
});
