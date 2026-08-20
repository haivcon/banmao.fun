import type { Address } from "viem";
import {
  isVerifiedMainnetManifest,
  validDeploymentAddress,
  type BoxDeploymentManifest,
} from "./address";
import mainnetManifest from "../../../deployments/banmaobox-xlayer-mainnet.json";
import testnetManifest from "../../../deployments/banmaobox-xlayer-testnet.json";
import {
  BANMAOBOX_TESTNET_UI_ENABLED,
  XLAYER_CHAIN_ID,
  XLAYER_TESTNET_CHAIN_ID,
  xLayer,
  xLayerTestnet,
} from "../../lib/walletConfig";

export type BoxChainId =
  | typeof XLAYER_CHAIN_ID
  | typeof XLAYER_TESTNET_CHAIN_ID;

export {
  isVerifiedMainnetManifest,
  validDeploymentAddress,
} from "./address";

const productionManifest = mainnetManifest as BoxDeploymentManifest;
const testDeployment = testnetManifest as BoxDeploymentManifest;
const mainnetEnabled = isVerifiedMainnetManifest(productionManifest);
const mainnetAddress = (value: string | null | undefined) =>
  mainnetEnabled ? validDeploymentAddress(value) : undefined;
const testnetEnabled =
  BANMAOBOX_TESTNET_UI_ENABLED &&
  testnetManifest.status === "deployed" &&
  testnetManifest.chainId === XLAYER_TESTNET_CHAIN_ID;
const testnetAddress = (value: string | null | undefined) =>
  testnetEnabled ? validDeploymentAddress(value) : undefined;
const testnetRuntime: BoxDeploymentManifest["runtime"] = testnetEnabled
  ? {
      ...testDeployment.runtime,
      factoryRenderer:
        testDeployment.runtime?.factoryRenderer ?? testDeployment.runtime?.renderer,
      defaultRenderer:
        testDeployment.runtime?.defaultRenderer ?? testDeployment.runtime?.renderer,
      boxRenderer:
        testDeployment.runtime?.boxRenderer ?? testDeployment.runtime?.renderer,
    }
  : undefined;

export const BOX_CHAIN_CONFIG = {
  [XLAYER_CHAIN_ID]: {
    chain: xLayer,
    manifest: mainnetManifest,
    tokenAddress: validDeploymentAddress(mainnetManifest.contracts.token)!,
    factoryRendererAddress: mainnetAddress(mainnetManifest.contracts.factoryRenderer),
    defaultRendererAddress: mainnetAddress(mainnetManifest.contracts.defaultRenderer),
    boxRendererAddress: mainnetAddress(mainnetManifest.contracts.boxRenderer),
    factoryAddress: mainnetAddress(mainnetManifest.contracts.factory),
    boxAddress: mainnetAddress(mainnetManifest.contracts.box),
    runtime: mainnetEnabled ? productionManifest.runtime : undefined,
  },
  [XLAYER_TESTNET_CHAIN_ID]: {
    chain: xLayerTestnet,
    manifest: testnetManifest,
    tokenAddress: testnetAddress(testDeployment.contracts.token)!,
    factoryRendererAddress: testnetAddress(
      testDeployment.contracts.factoryRenderer ?? testDeployment.contracts.renderer,
    ),
    defaultRendererAddress: testnetAddress(
      testDeployment.contracts.defaultRenderer ?? testDeployment.contracts.renderer,
    ),
    boxRendererAddress: testnetAddress(
      testDeployment.contracts.boxRenderer ?? testDeployment.contracts.renderer,
    ),
    factoryAddress: testnetAddress(testDeployment.contracts.factory),
    boxAddress: testnetAddress(testDeployment.contracts.box),
    runtime: testnetRuntime,
  },
} as const;

export function isBoxChainId(chainId: number): chainId is BoxChainId {
  return (
    chainId === XLAYER_CHAIN_ID ||
    (BANMAOBOX_TESTNET_UI_ENABLED && chainId === XLAYER_TESTNET_CHAIN_ID)
  );
}

export function getBoxChainConfig(chainId: BoxChainId) {
  return BOX_CHAIN_CONFIG[chainId];
}

/** Mainnet Box address for the DeFi directory; undefined until deployment. */
export const BANMAO_BOX_CONTRACT_ADDRESS =
  BOX_CHAIN_CONFIG[XLAYER_CHAIN_ID].boxAddress;
