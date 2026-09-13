export const BANMAO_KING_DEPLOYMENT = Object.freeze({
  status: "verified" as const,
  chainId: 196,
  contractAddress: "0xEcA5897DE2944ADa9b1048ECFBB8391261422957",
  rendererAddress: "0xC7cA38752E04e2C803d08A5c2Addc3D375D0123d",
  explorerUrl: "https://www.oklink.com/xlayer/address/0xEcA5897DE2944ADa9b1048ECFBB8391261422957",
  paymentToken: "0x16d91d1615fC55b76d5F92365BD60C069b46eF78",
  mintPrice: "6666000000000000000000",
  maxSupply: 9216,
  royaltyBps: 200,
  nativeMintEnabled: false,
  compilerInputHash: "0x0ac9ecab40e3714fe5d2679d02539d546a5377ac3bed8464d13c915f7da1ef97",
});

export const BANMAO_KING_MINT_ENABLED = true as const;

export function banmaoKingMintReady(): boolean {
  return (
    BANMAO_KING_MINT_ENABLED && BANMAO_KING_DEPLOYMENT.contractAddress !== null
  );
}
