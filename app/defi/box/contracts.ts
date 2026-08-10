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

export type BoxInfo = {
  amount: bigint;
  createdAt: bigint;
  unlockTime: bigint;
};

export type BoxEntry = BoxInfo & {
  tokenId: bigint;
  canOpen: boolean;
};
