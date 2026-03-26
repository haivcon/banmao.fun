// app/game/banmaosnake/lib/constants.ts

// ========== CONTRACT ADDRESSES ==========
// TODO: Update these after deploying the smart contract
// old SNAKE_CONTRACT_ADDRESS = "0xce59d4Db7128C93EBb5Abeac6714A21797970AE3"
export const SNAKE_CONTRACT_ADDRESS = "0x986dE458302005890d708B3930ce57cD1E1E3BaF" as `0x${string}`;
// $BANMAO token address on X Layer Mainnet
export const BANMAO_TOKEN_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" as `0x${string}`;

// ========== CHAIN CONFIG ==========
export const XLAYER_CHAIN_ID = 196;

// ========== EIP-712 DOMAIN ==========
export const EIP712_DOMAIN = {
    name: "BanMaoSnake",
    version: "1.0",
    chainId: XLAYER_CHAIN_ID,
    verifyingContract: SNAKE_CONTRACT_ADDRESS,
};

// ========== GAME CONFIG ==========
export const REWARD_MULTIPLIER = 10; // 1 điểm = 10 $BANMAO
export const TOKEN_DECIMALS = 18;

// ========== API ENDPOINTS ==========
export const SNAKE_SIGN_ENDPOINT = "/api/snake-sign";
