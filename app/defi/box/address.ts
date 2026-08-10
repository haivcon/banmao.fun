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
