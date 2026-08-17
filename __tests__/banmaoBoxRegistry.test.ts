import {
  CANONICAL_BANMAO_MAINNET_ADDRESS,
  isVerifiedMainnetManifest,
  validDeploymentAddress,
  type BoxDeploymentManifest,
} from "../app/defi/box/address";
import mainnetManifest from "../deployments/banmaobox-xlayer-mainnet.json";

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

describe("BanmaoBox mainnet registry gates", () => {
  test("accepts the verified replacement deployment in the production manifest", () => {
    expect(isVerifiedMainnetManifest(mainnetManifest as BoxDeploymentManifest)).toBe(true);
    expect(mainnetManifest.contracts.renderer).toBe("0x29cf18F1AB3009303d023dbA6c4b4e0fC4312f60");
    expect(mainnetManifest.contracts.factory).toBe("0xD1552040a290e6AB8dfED12Dd5A7345d6b0FfB44");
    expect(mainnetManifest.contracts.box).toBe("0x6007479c7C7013C15bbfB46Fa1F0D0706b4e02Ce");
  });

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
