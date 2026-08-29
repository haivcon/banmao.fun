export const BANMAO_KING_DEPLOYMENT = Object.freeze({
  status: "preview" as const,
  chainId: 196,
  contractAddress: null,
});

export const BANMAO_KING_MINT_ENABLED = false as const;

export function banmaoKingMintReady(): boolean {
  return (
    BANMAO_KING_MINT_ENABLED && BANMAO_KING_DEPLOYMENT.contractAddress !== null
  );
}
