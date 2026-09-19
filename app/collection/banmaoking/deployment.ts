export const BANMAO_KING_DEPLOYMENT = Object.freeze({
  status: "verified" as const,
  chainId: 196,
  // Enable only after verifying a new deployment implementing mintBatchTo.
  supportsBatchMint: false as boolean,
  contractAddress: "0xc96f95cC3496b9fF2e45855c86BCd6340360eeee",
  rendererAddress: "0x6001081d2B3431feEfa5d2451057b8cf4918e520",
  explorerUrl: "https://www.oklink.com/xlayer/address/0xc96f95cC3496b9fF2e45855c86BCd6340360eeee",
  paymentToken: "0x16d91d1615fC55b76d5F92365BD60C069b46eF78",
  mintPrice: "6666000000000000000000",
  maxSupply: 9216,
  royaltyBps: 200,
  nativeMintEnabled: false,
  compilerInputHash: "0x32edd75ccc6d79a66736d20c530ca1bd36335a144fdde331466b2e5386af6772",
});

export const BANMAO_KING_MINT_ENABLED = true as const;

export function banmaoKingMintReady(): boolean {
  return (
    BANMAO_KING_MINT_ENABLED && BANMAO_KING_DEPLOYMENT.contractAddress !== null
  );
}
