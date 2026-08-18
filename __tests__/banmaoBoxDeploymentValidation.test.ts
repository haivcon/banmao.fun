import {
  validateBanmaoBoxDeployment,
  type BanmaoBoxDeploymentObservation,
} from "../app/defi/box/deploymentValidation";

const address = (digit: string) => `0x${digit.repeat(40)}` as `0x${string}`;

const expected = {
  token: address("1"),
  factory: address("2"),
  box: address("3"),
  factoryRenderer: address("4"),
  defaultRenderer: address("5"),
  boxRenderer: address("5"),
};

function observation(
  overrides: Partial<BanmaoBoxDeploymentObservation> = {},
): BanmaoBoxDeploymentObservation {
  return {
    registryBox: expected.box,
    registered: true,
    underlying: expected.token,
    factoryRenderer: expected.factoryRenderer,
    defaultRenderer: expected.defaultRenderer,
    boxRenderer: expected.boxRenderer,
    ...overrides,
  };
}

describe("BanmaoBox role-aware deployment validation", () => {
  test("accepts live topology where Factory provenance differs from active Box renderer", () => {
    expect(validateBanmaoBoxDeployment(expected, observation())).toEqual({
      discoverySafe: true,
      transactionSafe: true,
      warnings: [],
    });
  });

  test("keeps owned-NFT discovery available while renderer verification is pending", () => {
    const result = validateBanmaoBoxDeployment(
      expected,
      observation({ boxRenderer: address("9") }),
    );
    expect(result.discoverySafe).toBe(true);
    expect(result.transactionSafe).toBe(false);
    expect(result.warnings).toEqual([
      "Canonical Box active renderer does not match the manifest",
    ]);
  });

  test.each([
    ["factoryRenderer", "Factory provenance renderer does not match the manifest"],
    ["defaultRenderer", "Factory default renderer does not match the manifest"],
    ["boxRenderer", "Canonical Box active renderer does not match the manifest"],
  ] as const)("reports a precise nonfatal %s mismatch", (field, warning) => {
    expect(validateBanmaoBoxDeployment(expected, observation({ [field]: address("9") }))).toEqual({
      discoverySafe: true,
      transactionSafe: false,
      warnings: [warning],
    });
  });

  test("keeps registry and underlying mismatches fatal for discovery", () => {
    expect(validateBanmaoBoxDeployment(expected, observation({ registered: false }))).toMatchObject({
      discoverySafe: false,
      transactionSafe: false,
      fatalError: "Factory registry does not match the selected Box",
    });
    expect(validateBanmaoBoxDeployment(expected, observation({ underlying: address("9") }))).toMatchObject({
      discoverySafe: false,
      transactionSafe: false,
      fatalError: "Box underlying token does not match the selected collection",
    });
  });
});