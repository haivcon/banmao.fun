import type { Address } from "viem";
import {
  isVerifiedMainnetManifest,
  validDeploymentAddress,
  type BoxDeploymentManifest,
} from "./address";
import mainnetManifest from "../../../deployments/banmaobox-xlayer-mainnet.json";
import { XLAYER_CHAIN_ID, xLayer } from "../../lib/walletConfig";

export type BoxChainId = typeof XLAYER_CHAIN_ID;

export {
  isVerifiedMainnetManifest,
  validDeploymentAddress,
} from "./address";

const productionManifest = mainnetManifest as BoxDeploymentManifest;
const mainnetEnabled = isVerifiedMainnetManifest(productionManifest);
const mainnetAddress = (value: string | null | undefined) =>
  mainnetEnabled ? validDeploymentAddress(value) : undefined;

export const BOX_CHAIN_CONFIG = {
  [XLAYER_CHAIN_ID]: {
    chain: xLayer,
    manifest: mainnetManifest,
    tokenAddress: validDeploymentAddress(mainnetManifest.contracts.token)!,
    rendererAddress: mainnetAddress(mainnetManifest.contracts.renderer),
    factoryAddress: mainnetAddress(mainnetManifest.contracts.factory),
    boxAddress: mainnetAddress(mainnetManifest.contracts.box),
    runtime: mainnetEnabled ? productionManifest.runtime : undefined,
  },
} as const;

export function isBoxChainId(chainId: number): chainId is BoxChainId {
  return chainId === XLAYER_CHAIN_ID;
}

export function getBoxChainConfig(chainId: BoxChainId) {
  return BOX_CHAIN_CONFIG[chainId];
}

/** Mainnet Box address for the DeFi directory; undefined until deployment. */
export const BANMAO_BOX_CONTRACT_ADDRESS =
  BOX_CHAIN_CONFIG[XLAYER_CHAIN_ID].boxAddress;
