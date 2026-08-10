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
};

export type InspectedBox = BoxEntry & {
  owner: `0x${string}`;
  svg: string;
};
