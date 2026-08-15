"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const solc = require("solc");
const { ethers } = require("ethers");
const { artifactFingerprint, assertArtifactRuntime } = require("./banmaobox-runtime.cjs");

const CHAIN_ID = 196;
const TOKEN = ethers.utils.getAddress("0x16d91d1615fc55b76d5f92365bd60c069b46ef78");
const RPC_URL = process.env.XLAYER_MAINNET_RPC_URL || process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const manifest = JSON.parse(fs.readFileSync(path.resolve("deployments/banmaobox-xlayer-mainnet.json"), "utf8"));
const approved = JSON.parse(fs.readFileSync(path.resolve("deployments/banmaobox-release-artifacts.json"), "utf8"));
const SOURCE_DIR = "contracts/banmaobox";
const SOURCES = ["BanmaoBoxRenderer.sol", "BanmaoBox.sol", "BanmaoBoxFactory.sol"];
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
function sha256(value) { return `0x${crypto.createHash("sha256").update(value).digest("hex")}`; }
function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
async function retryRead(label, operation, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = attempt * 1_000;
      console.warn(`${label} RPC read failed (${attempt}/${attempts}); retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  const detail = lastError?.error?.message || lastError?.reason || lastError?.message || String(lastError);
  fail(`${label} RPC read failed after ${attempts} attempts: ${detail}`);
}
function resolveImport(importPath) {
  for (const candidate of [importPath, path.join("node_modules", importPath), path.join(SOURCE_DIR, importPath.replace(/^\.\//, ""))]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return { contents: fs.readFileSync(candidate, "utf8") };
  }
  return { error: `Import not found: ${importPath}` };
}
function compile() {
  const sources = Object.fromEntries(SOURCES.map((file) => [`${SOURCE_DIR}/${file}`, { content: fs.readFileSync(path.join(SOURCE_DIR, file), "utf8") }]));
  const input = {
    language: "Solidity", sources,
    settings: {
      optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai",
      metadata: { bytecodeHash: "ipfs" },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: resolveImport }));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) fail(errors.map((item) => item.formattedMessage).join("\n"));
  const artifact = (file, name) => output.contracts[`${SOURCE_DIR}/${file}`][name];
  return {
    compilerInputHash: sha256(JSON.stringify(input)),
    artifacts: {
      renderer: artifact("BanmaoBoxRenderer.sol", "BanmaoBoxRenderer"),
      factory: artifact("BanmaoBoxFactory.sol", "BanmaoBoxFactory"),
      box: artifact("BanmaoBox.sol", "BanmaoBox"),
    },
  };
}
async function runtime(provider, address, label) {
  if (!ethers.utils.isAddress(address || "")) fail(`${label} address is missing or invalid`);
  const code = await provider.getCode(address);
  if (code === "0x") fail(`${label} has no runtime code`);
  return { bytes: (code.length - 2) / 2, keccak256: ethers.utils.keccak256(code) };
}

async function main() {
  if (manifest.status !== "deployed" || manifest.chainId !== CHAIN_ID) fail("Mainnet manifest is not in deployed state for chain 196");
  if (!same(manifest.contracts.token, TOKEN)) fail("Manifest token is not canonical production BANMAO");
  const { artifacts, compilerInputHash } = compile();
  if (manifest.compiler !== solc.version() || manifest.compilerInputHash !== compilerInputHash ||
      approved.compiler !== solc.version() || approved.compilerInputHash !== compilerInputHash) {
    fail("Manifest/release compiler fingerprint does not match this checkout");
  }
  for (const [name, artifact] of Object.entries(artifacts)) {
    const observed = artifactFingerprint(artifact);
    const expected = approved.runtime?.[name];
    if (!expected || observed.bytes !== expected.bytes || observed.normalizedKeccak256 !== expected.normalizedKeccak256) {
      fail(`${name} artifact does not match the committed release fingerprint`);
    }
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const network = await retryRead("Network detection", () => provider.getNetwork());
  if (network.chainId !== CHAIN_ID) fail(`Wrong RPC chain: ${network.chainId}`);
  const { renderer, factory, box } = manifest.contracts;
  const factoryContract = new ethers.Contract(factory, factoryAbi, provider);
  const boxContract = new ethers.Contract(box, boxAbi, provider);
  const read = (label, operation) => retryRead(label, operation);
  const tokenRuntime = await read("BANMAO runtime", () => runtime(provider, TOKEN, "BANMAO"));
  const rendererRuntime = await read("Renderer runtime", () => runtime(provider, renderer, "Renderer"));
  const factoryRuntime = await read("Factory runtime", () => runtime(provider, factory, "Factory"));
  const boxRuntime = await read("Box runtime", () => runtime(provider, box, "Box"));
  const factoryRenderer = await read("Factory renderer", () => factoryContract.renderer());
  const registryBox = await read("Factory boxForToken", () => factoryContract.boxForToken(TOKEN));
  const registered = await read("Factory isTokenBox", () => factoryContract.isTokenBox(box));
  const underlying = await read("Box underlyingToken", () => boxContract.underlyingToken());
  const boxRenderer = await read("Box renderer", () => boxContract.renderer());
  const decimals = await read("Box tokenDecimals", () => boxContract.tokenDecimals());
  const symbol = await read("Box tokenSymbol", () => boxContract.tokenSymbol());
  const maxAssets = await read("Box MAX_ASSETS_PER_BOX", () => boxContract.MAX_ASSETS_PER_BOX());
  const maxBatch = await read("Box MAX_BATCH_SIZE", () => boxContract.MAX_BATCH_SIZE());
  const maxLock = await read("Box MAX_LOCK_DURATION", () => boxContract.MAX_LOCK_DURATION());
  const supply = await read("Box totalSupply", () => boxContract.totalSupply());
  const locked = await read("Box totalTokensLocked", () => boxContract.totalTokensLocked());
  if (!same(factoryRenderer, renderer) || !same(boxRenderer, renderer)) fail("Renderer links are invalid");
  if (!same(registryBox, box) || !registered || !same(underlying, TOKEN)) fail("Factory/underlying registry is invalid");
  if (Number(decimals) !== 18 || !maxAssets.eq(5) || !maxBatch.eq(20) || !maxLock.eq(3_153_600_000)) fail("Metadata/constants mismatch");
  const runtimeCodes = [
    await read("Renderer artifact runtime", () => provider.getCode(renderer)),
    await read("Factory artifact runtime", () => provider.getCode(factory)),
    await read("Box artifact runtime", () => provider.getCode(box)),
  ];
  const artifactRuntime = {
    renderer: assertArtifactRuntime(runtimeCodes[0], artifacts.renderer, "Renderer"),
    factory: assertArtifactRuntime(runtimeCodes[1], artifacts.factory, "Factory"),
    box: assertArtifactRuntime(runtimeCodes[2], artifacts.box, "BanmaoBox"),
  };
  const observed = { token: tokenRuntime, renderer: rendererRuntime, factory: factoryRuntime, box: boxRuntime };
  for (const [name, value] of Object.entries(observed)) {
    const expected = manifest.runtime?.[name];
    if (!expected || expected.bytes !== value.bytes || expected.keccak256 !== value.keccak256) fail(`${name} runtime does not match manifest`);
  }
  console.log(JSON.stringify({ ok: true, chainId: CHAIN_ID, contracts: manifest.contracts,
    tokenMetadata: { symbol, decimals: Number(decimals) }, constants: {
      maxAssetsPerBox: maxAssets.toNumber(), maxBatchSize: maxBatch.toNumber(), maxLockDuration: maxLock.toNumber(),
    }, currentState: { totalSupply: supply.toString(), totalTokensLocked: locked.toString() }, runtime: observed,
    artifactRuntime }, null, 2));
}

main().catch((error) => { console.error(`Mainnet verification failed: ${error.reason || error.message}`); process.exitCode = 1; });
