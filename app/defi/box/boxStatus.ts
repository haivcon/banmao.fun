export type BoxReadyState = {
  canOpen: boolean;
  unlockTime: bigint;
};

/** Uses the on-chain result when available and the unlock timestamp between RPC refreshes. */
export function isBoxReady(entry: BoxReadyState, nowMs: number): boolean {
  return entry.canOpen || entry.unlockTime <= BigInt(Math.floor(nowMs / 1000));
}
