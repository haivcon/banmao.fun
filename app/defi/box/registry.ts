import type { Address } from "viem";
import { validDeploymentAddress } from "./address";
import mainnetManifest from "../../../deployments/banmaobox-xlayer-mainnet.json";
import testnetManifest from "../../../deployments/banmaobox-xlayer-testnet.json";
import {
  XLAYER_CHAIN_ID,
  XLAYER_TESTNET_CHAIN_ID,
  xLayer,
  xLayerTestnet,
} from "../../lib/walletConfig";

export type BoxChainId =
  | typeof XLAYER_CHAIN_ID
  | typeof XLAYER_TESTNET_CHAIN_ID;

export { validDeploymentAddress } from "./address";

function deploymentAddress(
  override: string | undefined,
  manifestValue: string | null,
): Address | undefined {
  return validDeploymentAddress(override) ?? validDeploymentAddress(manifestValue);
}

export const BOX_CHAIN_CONFIG = {
  [XLAYER_CHAIN_ID]: {
    chain: xLayer,
    manifest: mainnetManifest,
    tokenAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_MAINNET_TOKEN_ADDRESS,
      mainnetManifest.contracts.token,
    )!,
    rendererAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_BOX_MAINNET_RENDERER_ADDRESS,
      mainnetManifest.contracts.renderer,
    ),
    factoryAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_BOX_MAINNET_FACTORY_ADDRESS,
      mainnetManifest.contracts.factory,
    ),
    boxAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_BOX_MAINNET_ADDRESS,
      mainnetManifest.contracts.box,
    ),
  },
  [XLAYER_TESTNET_CHAIN_ID]: {
    chain: xLayerTestnet,
    manifest: testnetManifest,
    tokenAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_TESTNET_TOKEN_ADDRESS,
      testnetManifest.contracts.mockBanmao,
    )!,
    rendererAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_BOX_TESTNET_RENDERER_ADDRESS,
      testnetManifest.contracts.renderer,
    ),
    factoryAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_BOX_TESTNET_FACTORY_ADDRESS,
      testnetManifest.contracts.factory,
    ),
    boxAddress: deploymentAddress(
      process.env.NEXT_PUBLIC_BANMAO_BOX_TESTNET_ADDRESS,
      testnetManifest.contracts.box,
    ),
  },
} as const;

export function isBoxChainId(chainId: number): chainId is BoxChainId {
  return chainId === XLAYER_CHAIN_ID || chainId === XLAYER_TESTNET_CHAIN_ID;
}

export function getBoxChainConfig(chainId: BoxChainId) {
  return BOX_CHAIN_CONFIG[chainId];
}

/** Mainnet Box address for the DeFi directory; undefined until deployment. */
export const BANMAO_BOX_CONTRACT_ADDRESS =
  BOX_CHAIN_CONFIG[XLAYER_CHAIN_ID].boxAddress;
