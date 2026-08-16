import type { Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function validDeploymentAddress(
  value: string | null | undefined,
): Address | undefined {
  const address = value?.trim();
  return address && /^0x[a-fA-F0-9]{40}$/.test(address) && address !== ZERO_ADDRESS
    ? (address as Address)
    : undefined;
}

export const CANONICAL_BANMAO_MAINNET_ADDRESS =
  "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
export const CANONICAL_BANMAO_BOX_RENDERER_ADDRESS =
  "0x0eb6addd176fe51112f6ad26340278c540cabeb6";
export const CANONICAL_BANMAO_BOX_FACTORY_ADDRESS =
  "0xc2f6a3b6cde73348306787c46357fc3283db5419";
export const CANONICAL_BANMAO_BOX_ADDRESS =
  "0x4111ff37b0fbbb35c752ceb55c72799467f16aec";

const CANONICAL_MAINNET_CONTRACTS: Record<string, string> = {
  token: CANONICAL_BANMAO_MAINNET_ADDRESS,
  renderer: CANONICAL_BANMAO_BOX_RENDERER_ADDRESS,
  factory: CANONICAL_BANMAO_BOX_FACTORY_ADDRESS,
  box: CANONICAL_BANMAO_BOX_ADDRESS,
};

function hasCanonicalMainnetContracts(contracts: Record<string, string | null | undefined>) {
  return Object.entries(CANONICAL_MAINNET_CONTRACTS).every(
    ([name, expected]) => contracts[name]?.toLowerCase() === expected,
  );
}

type RuntimeEntry = { bytes?: number; keccak256?: string };
export type BoxDeploymentManifest = {
  status?: string;
  contracts: Record<string, string | null | undefined>;
  runtime?: Record<string, RuntimeEntry | undefined>;
};

function validRuntimeEntry(value: RuntimeEntry | undefined): boolean {
  return Boolean(
    value &&
      Number.isInteger(value.bytes) &&
      Number(value.bytes) > 0 &&
      /^0x[a-fA-F0-9]{64}$/.test(value.keccak256 ?? ""),
  );
}

export function isVerifiedMainnetManifest(
  manifest: BoxDeploymentManifest,
): boolean {
  return Boolean(
    manifest.status === "deployed" &&
      hasCanonicalMainnetContracts(manifest.contracts) &&
      validDeploymentAddress(manifest.contracts.renderer) &&
      validDeploymentAddress(manifest.contracts.factory) &&
      validDeploymentAddress(manifest.contracts.box) &&
      validRuntimeEntry(manifest.runtime?.token) &&
      validRuntimeEntry(manifest.runtime?.renderer) &&
      validRuntimeEntry(manifest.runtime?.factory) &&
      validRuntimeEntry(manifest.runtime?.box),
  );
}
