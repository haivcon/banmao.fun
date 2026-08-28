import { getAddress, isAddress, type Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const OKX_EVM_PREFIX_PATTERN = /^XKO([a-fA-F0-9]{40})$/i;

/** Converts OKX's XKO-prefixed EVM display format into a standard EVM address. */
export function normalizeEvmWalletInput(value: string): string {
  const input = value.trim();
  const okxMatch = OKX_EVM_PREFIX_PATTERN.exec(input);
  // XKO is a display format rather than an EIP-55 checksum. Lowercase its
  // payload so arbitrary display casing can be converted to a checksum below.
  return okxMatch ? `0x${okxMatch[1].toLowerCase()}` : input;
}

/** Parses a nonzero recipient in either standard 0x or OKX's XKO form. */
export function parseEvmWalletAddress(value: string): Address | undefined {
  const normalized = normalizeEvmWalletInput(value);
  if (!isAddress(normalized) || normalized.toLowerCase() === ZERO_ADDRESS) return undefined;
  return getAddress(normalized);
}

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
export const XLAYER_MULTICALL3_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

export function boxNftExplorerUrl(
  explorerBaseUrl: string,
  collectionAddress: string | null | undefined,
  tokenId: bigint,
): string | undefined {
  const collection = validDeploymentAddress(collectionAddress);
  if (!collection || tokenId < 0n) return undefined;
  return `${explorerBaseUrl.replace(/\/+$/, "")}/assets/${collection.toLowerCase()}/${tokenId.toString()}`;
}

function hasCanonicalMainnetToken(
  contracts: Record<string, string | null | undefined>,
) {
  return (
    contracts.token?.toLowerCase() ===
    CANONICAL_BANMAO_MAINNET_ADDRESS.toLowerCase()
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
      hasCanonicalMainnetToken(manifest.contracts) &&
      validDeploymentAddress(manifest.contracts.factoryRenderer) &&
      validDeploymentAddress(manifest.contracts.defaultRenderer) &&
      validDeploymentAddress(manifest.contracts.boxRenderer) &&
      validDeploymentAddress(manifest.contracts.factory) &&
      validDeploymentAddress(manifest.contracts.box) &&
      validRuntimeEntry(manifest.runtime?.token) &&
      validRuntimeEntry(manifest.runtime?.factoryRenderer) &&
      validRuntimeEntry(manifest.runtime?.defaultRenderer) &&
      validRuntimeEntry(manifest.runtime?.boxRenderer) &&
      validRuntimeEntry(manifest.runtime?.factory) &&
      validRuntimeEntry(manifest.runtime?.box),
  );
}
