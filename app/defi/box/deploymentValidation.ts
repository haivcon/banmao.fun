import type { Address } from "viem";
import { sameAddress } from "./safety";

export type BanmaoBoxDeploymentExpectation = {
  token: Address;
  factory: Address;
  box: Address;
  factoryRenderer: Address;
  defaultRenderer: Address;
  boxRenderer: Address;
};

export type BanmaoBoxDeploymentObservation = {
  registryBox: Address;
  registered: boolean;
  underlying: Address;
  factoryRenderer: Address;
  defaultRenderer: Address;
  boxRenderer: Address;
};

export type BanmaoBoxDeploymentValidation = {
  discoverySafe: boolean;
  transactionSafe: boolean;
  warnings: string[];
  fatalError?: string;
};

export function validateBanmaoBoxDeployment(
  expected: BanmaoBoxDeploymentExpectation,
  observed: BanmaoBoxDeploymentObservation,
): BanmaoBoxDeploymentValidation {
  if (!observed.registered || !sameAddress(observed.registryBox, expected.box)) {
    return {
      discoverySafe: false,
      transactionSafe: false,
      warnings: [],
      fatalError: "Factory registry does not match the selected Box",
    };
  }
  if (!sameAddress(observed.underlying, expected.token)) {
    return {
      discoverySafe: false,
      transactionSafe: false,
      warnings: [],
      fatalError: "Box underlying token does not match the selected collection",
    };
  }

  const warnings: string[] = [];
  if (!sameAddress(observed.factoryRenderer, expected.factoryRenderer)) {
    warnings.push("Factory provenance renderer does not match the manifest");
  }
  if (!sameAddress(observed.defaultRenderer, expected.defaultRenderer)) {
    warnings.push("Factory default renderer does not match the manifest");
  }
  if (!sameAddress(observed.boxRenderer, expected.boxRenderer)) {
    warnings.push("Canonical Box active renderer does not match the manifest");
  }
  return {
    discoverySafe: true,
    transactionSafe: warnings.length === 0,
    warnings,
  };
}
