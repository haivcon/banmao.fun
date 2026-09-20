export const BANMAO_KING_DEPLOYMENT = Object.freeze({
  "status": "verified",
  "chainId": 196,
  "supportsBatchMint": true,
  "contractAddress": "0x02559c97be39a895E9a9c6D54A30926cb3836666",
  "rendererAddress": "0xD8b9E88D12142bab2C234056Ebf8149F91046666",
  "explorerUrl": "https://web3.okx.com/explorer/x-layer/evm/token/0x02559c97be39a895e9a9c6d54a30926cb3836666",
  "paymentToken": "0x16d91d1615fC55b76d5F92365BD60C069b46eF78",
  "mintPrice": "6666000000000000000000",
  "maxSupply": 133875,
  "royaltyBps": 200,
  "nativeMintEnabled": false,
  "compilerInputHash": "0xf0e80addd2111517ba2bb4dd9e9b7af59464092e16f15470f0aaa44065158615"
});

export const BANMAO_KING_MINT_ENABLED = true as const;

export function banmaoKingMintReady(): boolean {
  return BANMAO_KING_MINT_ENABLED && BANMAO_KING_DEPLOYMENT.contractAddress !== null;
}
