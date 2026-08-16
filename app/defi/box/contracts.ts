import { getAddress, isAddress, type Address } from "viem";

// Compatibility entry point for the Box UI. Contract ABIs are compiler-generated.
export {
  BANMAO_BOX_ABI,
  BANMAO_BOX_FACTORY_ABI,
  BANMAO_BOX_RENDERER_ABI,
  BANMAO_ERC20_ABI,
} from "./generated/abis";
export {
  BANMAO_BOX_CONTRACT_ADDRESS,
  BOX_CHAIN_CONFIG,
  getBoxChainConfig,
  isBoxChainId,
  validDeploymentAddress,
  type BoxChainId,
} from "./registry";

export type BoxAsset = {
  token: `0x${string}`;
  amount: bigint;
  decimals?: number;
  symbol?: string;
};

export type BoxInfo = {
  amount: bigint;
  creator: `0x${string}`;
  createdAt: bigint;
  unlockTime: bigint;
  assets: BoxAsset[];
};

export interface BasketInput {
  token: `0x${string}`;
  amount: string;
  decimals: number;
}

export type BoxEntry = BoxInfo & {
  tokenId: bigint;
  canOpen: boolean;
  svg?: string;
};

export type InspectedBox = BoxEntry & {
  owner: `0x${string}`;
  svg: string;
};

export const MAX_LOCK_DURATION_SECONDS = 3_153_600_000n;
export const ADDRESS_HISTORY_LIMIT = 10;

export type DurationParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

export function durationPartsToSeconds(parts: DurationParts): bigint | null {
  const values = [parts.days, parts.hours, parts.minutes, parts.seconds];
  if (values.some((value) => value !== "" && !/^\d+$/.test(value))) return null;
  const [days, hours, minutes, seconds] = values.map((value) => BigInt(value || "0"));
  return days * 86_400n + hours * 3_600n + minutes * 60n + seconds;
}

export function parseAddressHistory(value: string | null): Address[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const addresses: Address[] = [];
    for (const candidate of parsed) {
      if (typeof candidate !== "string" || !isAddress(candidate)) continue;
      const address = getAddress(candidate);
      const key = address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      addresses.push(address);
      if (addresses.length === ADDRESS_HISTORY_LIMIT) break;
    }
    return addresses;
  } catch {
    return [];
  }
}

export function addAddressHistoryEntry(
  history: readonly Address[],
  value: Address | string,
): Address[] {
  if (!isAddress(value)) return [...history].slice(0, ADDRESS_HISTORY_LIMIT);
  const address = getAddress(value);
  return [
    address,
    ...history.filter((item) => item.toLowerCase() !== address.toLowerCase()),
  ].slice(0, ADDRESS_HISTORY_LIMIT);
}

function decodeBytes16Symbol(value: unknown): string | undefined {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{32}$/.test(value)) {
    const bytes = value.slice(2).match(/.{2}/g) ?? [];
    const text = bytes
      .map((byte) => Number.parseInt(byte, 16))
      .filter((byte) => byte !== 0)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return /^[A-Za-z0-9 ._-]{1,16}$/.test(text) ? text : undefined;
  }
  return typeof value === "string" && /^[A-Za-z0-9 ._-]{1,16}$/.test(value)
    ? value
    : undefined;
}

export function normalizeBoxAssets(value: unknown): BoxAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || (typeof raw !== "object" && !Array.isArray(raw))) return [];
    const tuple = raw as Record<string, unknown> & readonly unknown[];
    const token = tuple.token ?? tuple[0];
    const amount = tuple.amount ?? tuple[1];
    if (typeof token !== "string" || !isAddress(token) || typeof amount !== "bigint") {
      return [];
    }
    const rawDecimals = tuple.decimals ?? tuple[2];
    const decimals = Number(rawDecimals);
    const symbol = decodeBytes16Symbol(tuple.symbol ?? tuple[3]);
    return [{
      token: getAddress(token),
      amount,
      ...(Number.isInteger(decimals) && decimals >= 0 && decimals <= 69
        ? { decimals }
        : {}),
      ...(symbol ? { symbol } : {}),
    }];
  });
}
