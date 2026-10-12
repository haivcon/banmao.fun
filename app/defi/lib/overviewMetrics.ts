import { formatUnits } from "viem";

// Annualized snapshot, not compounded or guaranteed. Inputs use token base units.
export function estimatedNetApr(rate: bigint, shares: bigint, bucket: bigint, fee: bigint, multipliers: readonly bigint[]): number | undefined {
  if (fee < 0n || fee > 10000n || multipliers.length === 0 || rate < 0n || bucket < 0n) return undefined;
  if (bucket === 0n || rate === 0n) return 0;
  if (shares <= 0n) return undefined;
  const max = multipliers.reduce((a, b) => a > b ? a : b, 0n);
  // Keep arithmetic exact until final display conversion (percentage, six decimals).
  return Number(rate * 31536000n * max * (10000n - fee) * 1000000n / (shares * 1000000n)) / 1000000;
}

export function formatAmount(value: bigint | undefined, locale: string, compact = false, digits = 4): string {
  if (value === undefined) return "—";
  const number = Number(formatUnits(value, 18));
  const precision = compact ? 2 : digits;
  if (value > 0n && number < 10 ** -precision) return `<${new Intl.NumberFormat(locale, { maximumFractionDigits: precision }).format(10 ** -precision)}`;
  return new Intl.NumberFormat(locale, { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 2 : digits }).format(number);
}

export function formatCount(value: number | undefined, locale: string, compact = false): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return "—";
  return new Intl.NumberFormat(locale, { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 2 : 0 }).format(value);
}

export function formatApiTokenAmount(value: number | undefined, locale: string): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return "—";
  if (value > 0 && value < 0.01) return `<${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(0.01)}`;
  return formatCount(value, locale, true);
}

export function oldestUpdate(timestamps: readonly number[]): number {
  return timestamps.length && timestamps.every(t => t > 0) ? Math.min(...timestamps) : 0;
}

export function supplyPercentage(burned: bigint | undefined, supply: bigint | undefined): number | undefined {
  return burned === undefined || supply === undefined || supply <= 0n ? undefined : Number(burned * 1000000n / supply) / 10000;
}
