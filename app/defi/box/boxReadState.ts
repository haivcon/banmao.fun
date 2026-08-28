export type RequiredBoxReadState = {
  detailsLoaded: boolean;
  assetsLoaded: boolean;
  canOpenLoaded: boolean;
};

/**
 * Keeps complete box reads and discards failed reads only when a newer owner
 * snapshot confirms that the token is no longer owned. A failed read for a
 * still-owned token remains an error instead of becoming an empty/locked box.
 */
export function reconcileOwnedBoxReadIndexes(
  tokenIds: readonly bigint[],
  states: readonly RequiredBoxReadState[],
  refreshedOwnedTokenIds?: readonly bigint[],
): number[] {
  if (states.length !== tokenIds.length) {
    throw new Error("Incomplete BanmaoBox read results");
  }

  const refreshedIds = refreshedOwnedTokenIds
    ? new Set(refreshedOwnedTokenIds.map((tokenId) => tokenId.toString()))
    : undefined;

  return tokenIds.flatMap((tokenId, index) => {
    const state = states[index];
    if (state.detailsLoaded && state.assetsLoaded && state.canOpenLoaded) return [index];
    if (refreshedIds && !refreshedIds.has(tokenId.toString())) return [];
    throw new Error("Unable to load BanmaoBox details");
  });
}
