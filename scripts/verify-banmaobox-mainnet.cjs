"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const CHAIN_ID = 196;
const TOKEN = ethers.utils.getAddress("0x16d91d1615fc55b76d5f92365bd60c069b46ef78");
const RPC_URL = process.env.XLAYER_MAINNET_RPC_URL || process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const manifest = JSON.parse(fs.readFileSync(path.resolve("deployments/banmaobox-xlayer-mainnet.json"), "utf8"));
const factoryAbi = [
  "function renderer() view returns (address)",
  "function boxForToken(address) view returns (address)",
  "function isTokenBox(address) view returns (bool)",
];
const boxAbi = [
  "function underlyingToken() view returns (address)", "function renderer() view returns (address)",
  "function tokenDecimals() view returns (uint8)", "function tokenSymbol() view returns (string)",
  "function MAX_ASSETS_PER_BOX() view returns (uint256)", "function MAX_BATCH_SIZE() view returns (uint256)",
  "function MAX_LOCK_DURATION() view returns (uint256)", "function totalSupply() view returns (uint256)",
  "function totalTokensLocked() view returns (uint256)",
];

function fail(message) { throw new Error(message); }
function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }
async function runtime(provider, address, label) {
  if (!ethers.utils.isAddress(address || "")) fail(`${label} address is missing or invalid`);
  const code = await provider.getCode(address);
  if (code === "0x") fail(`${label} has no runtime code`);
  return { bytes: (code.length - 2) / 2, keccak256: ethers.utils.keccak256(code) };
}

async function main() {
  if (manifest.status !== "deployed" || manifest.chainId !== CHAIN_ID) fail("Mainnet manifest is not in deployed state for chain 196");
  if (!same(manifest.contracts.token, TOKEN)) fail("Manifest token is not canonical production BANMAO");
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_ID) fail(`Wrong RPC chain: ${network.chainId}`);
  const { renderer, factory, box } = manifest.contracts;
  const factoryContract = new ethers.Contract(factory, factoryAbi, provider);
  const boxContract = new ethers.Contract(box, boxAbi, provider);
  const [tokenRuntime, rendererRuntime, factoryRuntime, boxRuntime, factoryRenderer,
    registryBox, registered, underlying, boxRenderer, decimals, symbol, maxAssets,
    maxBatch, maxLock, supply, locked] = await Promise.all([
    runtime(provider, TOKEN, "BANMAO"), runtime(provider, renderer, "Renderer"),
    runtime(provider, factory, "Factory"), runtime(provider, box, "Box"),
    factoryContract.renderer(), factoryContract.boxForToken(TOKEN), factoryContract.isTokenBox(box),
    boxContract.underlyingToken(), boxContract.renderer(), boxContract.tokenDecimals(), boxContract.tokenSymbol(),
    boxContract.MAX_ASSETS_PER_BOX(), boxContract.MAX_BATCH_SIZE(), boxContract.MAX_LOCK_DURATION(),
    boxContract.totalSupply(), boxContract.totalTokensLocked(),
  ]);
  if (!same(factoryRenderer, renderer) || !same(boxRenderer, renderer)) fail("Renderer links are invalid");
  if (!same(registryBox, box) || !registered || !same(underlying, TOKEN)) fail("Factory/underlying registry is invalid");
  if (Number(decimals) !== 18 || !maxAssets.eq(5) || !maxBatch.eq(20) || !maxLock.eq(3_153_600_000)) fail("Metadata/constants mismatch");
  const observed = { token: tokenRuntime, renderer: rendererRuntime, factory: factoryRuntime, box: boxRuntime };
  for (const [name, value] of Object.entries(observed)) {
    const expected = manifest.runtime?.[name];
    if (!expected || expected.bytes !== value.bytes || expected.keccak256 !== value.keccak256) fail(`${name} runtime does not match manifest`);
  }
  console.log(JSON.stringify({ ok: true, chainId: CHAIN_ID, contracts: manifest.contracts,
    tokenMetadata: { symbol, decimals: Number(decimals) }, constants: {
      maxAssetsPerBox: maxAssets.toNumber(), maxBatchSize: maxBatch.toNumber(), maxLockDuration: maxLock.toNumber(),
    }, currentState: { totalSupply: supply.toString(), totalTokensLocked: locked.toString() }, runtime: observed }, null, 2));
}

main().catch((error) => { console.error(`Mainnet verification failed: ${error.reason || error.message}`); process.exitCode = 1; });
