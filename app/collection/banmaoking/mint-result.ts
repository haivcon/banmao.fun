export type MintPhase = 'idle' | 'checking' | 'signing' | 'confirmed' | 'failed';
export type MintOperation = 'approve' | 'reset' | 'mint';
export type MintFailure = 'cancelled' | 'reverted' | 'error';
export type MintResultState = 'checking' | 'signing' | 'pending' | 'uncertain' | 'success' | 'approved' | 'reset' | 'unresolved' | 'cancelled' | 'reverted' | 'error';
export type MintedKing = { to: string; id: bigint };

export function mintResultState(phase: MintPhase, pending: boolean, uncertain: boolean, operation: MintOperation | undefined, count: number, failure: MintFailure): MintResultState {
  if (pending) return uncertain ? 'uncertain' : 'pending';
  if (phase === 'checking' || phase === 'signing') return phase;
  if (phase === 'failed') return failure;
  if (phase === 'confirmed') {
    if (count > 0) return 'success';
    if (operation === 'approve') return 'approved';
    if (operation === 'reset') return 'reset';
    return 'unresolved';
  }
  return 'error';
}

/** Receipt events, never the editable recipient form, are the result source. */
export function groupMintResults(items: readonly MintedKing[]) {
  const groups = new Map<string, { to: string; ids: bigint[] }>();
  for (const item of items) {
    const key = item.to.toLowerCase();
    const group = groups.get(key) ?? { to: item.to, ids: [] };
    if (!group.ids.includes(item.id)) group.ids.push(item.id);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function isMintSignatureRejected(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const value = current as { code?: number; name?: string; message?: string; cause?: unknown };
    if (value.code === 4001 || value.name === 'UserRejectedRequestError' || /user rejected|user denied/i.test(value.message ?? '')) return true;
    current = value.cause;
  }
  return false;
}
