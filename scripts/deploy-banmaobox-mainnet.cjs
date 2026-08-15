"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const solc = require("solc");
const { ethers } = require("ethers");
const { artifactFingerprint, assertArtifactRuntime } = require("./banmaobox-runtime.cjs");
require("dotenv").config({ path: path.resolve(".env.deploy.local") });

const CHAIN_ID = 196;
const TOKEN = ethers.utils.getAddress("0x16d91d1615fc55b76d5f92365bd60c069b46ef78");
const RPC_URL = process.env.XLAYER_MAINNET_RPC_URL || process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const EXPLORER_URL = "https://web3.okx.com/explorer/x-layer/evm";
const MANIFEST = path.resolve("deployments/banmaobox-xlayer-mainnet.json");
const JOURNAL = path.resolve("deployments/.banmaobox-mainnet-journal.json");
const RELEASE = path.resolve("deployments/banmaobox-release-artifacts.json");
const SOURCE_DIR = "contracts/banmaobox";
const SOURCES = ["BanmaoBoxRenderer.sol", "BanmaoBox.sol", "BanmaoBoxFactory.sol"];
const CONFIRMATION = "DEPLOY_BANMAOBOX_XLAYER_196";
const CONFIRMATIONS = Number(process.env.BANMAOBOX_DEPLOY_CONFIRMATIONS || 2);
const GAS_BUFFER_PERCENT = 125;

function fail(message) { throw new Error(message); }
function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }
function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function sha256(value) { return `0x${crypto.createHash("sha256").update(value).digest("hex")}`; }
function keccakCode(code) { return ethers.utils.keccak256(code); }
function loadJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
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
  const artifacts = {
    renderer: artifact("BanmaoBoxRenderer.sol", "BanmaoBoxRenderer"),
    factory: artifact("BanmaoBoxFactory.sol", "BanmaoBoxFactory"),
    box: artifact("BanmaoBox.sol", "BanmaoBox"),
  };
  for (const [name, value] of Object.entries(artifacts)) {
    const runtimeBytes = value.evm.deployedBytecode.object.length / 2;
    if (runtimeBytes > 24_576) fail(`${name} runtime is ${runtimeBytes} bytes and exceeds EIP-170`);
  }
  return { artifacts, compilerInputHash: sha256(JSON.stringify(input)) };
}

function privateKey() {
  const value = process.env.DEPLOYER_PRIVATE_KEY;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value || "")) fail("DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte key in .env.deploy.local or the shell");
  return value;
}

async function code(provider, address, label) {
  const value = await provider.getCode(address);
  if (value === "0x") fail(`${label} has no runtime code at ${address}`);
  return value;
}

async function feeData(provider) {
  const value = await provider.getFeeData();
  const gasPrice = value.maxFeePerGas || value.gasPrice;
  if (!gasPrice) fail("RPC did not return a usable gas price");
  return gasPrice;
}

async function requireFunds(provider, signer, estimate, label) {
  const gasPrice = await retryRead(`${label} gas price`, () => feeData(provider));
  const bufferedGas = estimate.mul(GAS_BUFFER_PERCENT).div(100);
  const required = bufferedGas.mul(gasPrice);
  const balance = await retryRead(`${label} deployer balance`, () => signer.getBalance());
  console.log(`${label} gas estimate: ${estimate.toString()} (buffered ${bufferedGas.toString()}); max estimated cost ${ethers.utils.formatEther(required)} OKB`);
  if (balance.lt(required)) fail(`Insufficient OKB for ${label}: have ${ethers.utils.formatEther(balance)}, need at least ${ethers.utils.formatEther(required)}`);
  return bufferedGas;
}


async function deployContract(provider, signer, artifact, args, label, journal, key) {
  if (journal.contracts[key]) {
    const address = ethers.utils.getAddress(journal.contracts[key]);
    const runtimeCode = await retryRead(`Journal ${label} bytecode`, () => code(provider, address, `Journal ${label}`));
    assertArtifactRuntime(runtimeCode, artifact, `Journal ${label}`);
    console.log(`Resuming verified ${label}: ${address}`);
    return new ethers.Contract(address, artifact.abi, signer);
  }
  const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
  const request = factory.getDeployTransaction(...args);
  const from = await signer.getAddress();
  const estimate = await retryRead(`${label} gas estimate`, () => provider.estimateGas({ ...request, from }));
  const gasLimit = await requireFunds(provider, signer, estimate, label);
  const contract = await factory.deploy(...args, { gasLimit });
  console.log(`${label} transaction: ${contract.deployTransaction.hash}`);
  const receipt = await contract.deployTransaction.wait(CONFIRMATIONS);
  if (receipt.status !== 1) fail(`${label} deployment reverted`);
  const address = ethers.utils.getAddress(receipt.contractAddress || contract.address);
  const runtimeCode = await code(provider, address, label);
  assertArtifactRuntime(runtimeCode, artifact, label);
  journal.contracts[key] = address;
  journal.transactions[key] = receipt.transactionHash;
  atomicWrite(JOURNAL, journal);
  console.log(`${label}: ${address}`);
  return new ethers.Contract(address, artifact.abi, signer);
}

async function validate(provider, artifacts, addresses) {
  const factory = new ethers.Contract(addresses.factory, artifacts.factory.abi, provider);
  const box = new ethers.Contract(addresses.box, artifacts.box.abi, provider);
  const values = await Promise.all([
    code(provider, addresses.renderer, "Renderer"), code(provider, addresses.factory, "Factory"),
    code(provider, addresses.box, "Box"), code(provider, TOKEN, "BANMAO"),
    factory.renderer(), factory.boxForToken(TOKEN), factory.isTokenBox(addresses.box),
    box.underlyingToken(), box.renderer(), box.tokenDecimals(), box.tokenSymbol(),
    box.MAX_ASSETS_PER_BOX(), box.MAX_BATCH_SIZE(), box.MAX_LOCK_DURATION(),
    box.totalSupply(), box.totalTokensLocked(),
  ]);
  const [rendererCode, factoryCode, boxCode, tokenCode, factoryRenderer, registryBox,
    registered, underlying, boxRenderer, decimals, symbol, maxAssets, maxBatch,
    maxLock, supply, locked] = values;
  if (!same(factoryRenderer, addresses.renderer) || !same(boxRenderer, addresses.renderer)) fail("Renderer immutable invariant failed");
  if (!same(registryBox, addresses.box) || !registered) fail("Factory registry invariant failed");
  if (!same(underlying, TOKEN)) fail("Underlying token invariant failed");
  if (Number(decimals) !== 18) fail(`Expected BANMAO decimals 18, received ${decimals.toString()}`);
  if (!maxAssets.eq(5) || !maxBatch.eq(20) || !maxLock.eq(3_153_600_000)) fail("Production constant invariant failed");
  if (!supply.isZero() || !locked.isZero()) fail("New collection unexpectedly has supply or locked tokens");
  const rendererRuntime = assertArtifactRuntime(rendererCode, artifacts.renderer, "Renderer");
  const factoryRuntime = assertArtifactRuntime(factoryCode, artifacts.factory, "Factory");
  const boxRuntime = assertArtifactRuntime(boxCode, artifacts.box, "BanmaoBox");
  return {
    tokenMetadata: { symbol, decimals: Number(decimals) },
    runtime: {
      token: { bytes: (tokenCode.length - 2) / 2, keccak256: keccakCode(tokenCode) },
      renderer: rendererRuntime,
      factory: factoryRuntime,
      box: boxRuntime,
    },
    constants: { maxAssetsPerBox: 5, maxBatchSize: 20, maxLockDuration: 3_153_600_000 },
  };
}


async function main() {
  if (!process.argv.includes("--confirm-mainnet") || process.env.BANMAOBOX_MAINNET_CONFIRM !== CONFIRMATION) {
    fail(`Mainnet is locked. Pass --confirm-mainnet and set BANMAOBOX_MAINNET_CONFIRM=${CONFIRMATION}`);
  }
  if (!Number.isInteger(CONFIRMATIONS) || CONFIRMATIONS < 1) fail("BANMAOBOX_DEPLOY_CONFIRMATIONS must be a positive integer");
  const currentManifest = loadJson(MANIFEST);
  if (currentManifest.chainId !== CHAIN_ID || !same(currentManifest.contracts.token, TOKEN)) fail("Mainnet manifest chain/token preflight failed");
  if (currentManifest.status === "deployed") fail("Mainnet manifest is already deployed; refusing a duplicate deployment");

  console.log("Compiling production sources (optimizer=200, EVM=Shanghai)...");
  const { artifacts, compilerInputHash } = compile();
  const approved = loadJson(RELEASE);
  if (approved.compiler !== solc.version() || approved.compilerInputHash !== compilerInputHash) {
    fail("Compiled sources do not match the committed release fingerprint");
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
  if (network.chainId !== CHAIN_ID) fail(`Wrong network: expected ${CHAIN_ID}, received ${network.chainId}`);
  await retryRead("Production BANMAO bytecode", () => code(provider, TOKEN, "Production BANMAO"));
  const token = new ethers.Contract(TOKEN, ["function decimals() view returns (uint8)", "function symbol() view returns (string)"], provider);
  const tokenDecimals = await retryRead("Production BANMAO decimals", () => token.decimals());
  const tokenSymbol = await retryRead("Production BANMAO symbol", () => token.symbol());
  if (Number(tokenDecimals) !== 18) fail(`Production token decimals mismatch: ${tokenDecimals}`);

  const signer = new ethers.Wallet(privateKey(), provider);
  const deployer = await signer.getAddress();
  console.log(`Network: X Layer Mainnet (${network.chainId})`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Production token: ${TOKEN} (${tokenSymbol}, ${tokenDecimals} decimals)`);
  console.log(`Deployer: ${deployer}`);
  const deployerBalance = await retryRead("Deployer balance", () => signer.getBalance());
  console.log(`Balance: ${ethers.utils.formatEther(deployerBalance)} OKB`);

  const journal = fs.existsSync(JOURNAL) ? loadJson(JOURNAL) : {
    schemaVersion: 1, chainId: CHAIN_ID, token: TOKEN, deployer, compilerInputHash,
    contracts: {}, transactions: {}, startedAt: new Date().toISOString(),
  };
  if (journal.chainId !== CHAIN_ID || !same(journal.token, TOKEN) || journal.compilerInputHash !== compilerInputHash) {
    fail(`Existing journal does not match this chain/token/source. Inspect or remove ${JOURNAL}`);
  }
  const journalComplete = Boolean(
    journal.contracts.renderer && journal.contracts.factory && journal.contracts.box &&
    journal.transactions.renderer && journal.transactions.factory && journal.transactions.createTokenBox
  );
  if (!same(journal.deployer, deployer)) {
    if (!journalComplete) fail(`Existing incomplete journal belongs to a different deployer. Restore that key; do not remove ${JOURNAL}`);
    console.warn(`Current signer differs from original deployer ${journal.deployer}; performing read-only finalization of the complete journal.`);
  }

  const renderer = await deployContract(provider, signer, artifacts.renderer, [], "BanmaoBoxRenderer", journal, "renderer");
  const factory = await deployContract(provider, signer, artifacts.factory, [renderer.address], "BanmaoBoxFactory", journal, "factory");
  let boxAddress = journal.contracts.box;
  if (!boxAddress) {
    const existing = await factory.boxForToken(TOKEN);
    if (existing !== ethers.constants.AddressZero) fail(`Factory already maps BANMAO to unjournaled box ${existing}; inspect before continuing`);
    const estimate = await retryRead("createTokenBox(BANMAO) gas estimate", () => factory.estimateGas.createTokenBox(TOKEN));
    const gasLimit = await requireFunds(provider, signer, estimate, "createTokenBox(BANMAO)");
    const tx = await factory.createTokenBox(TOKEN, { gasLimit });
    console.log(`createTokenBox transaction: ${tx.hash}`);
    const receipt = await tx.wait(CONFIRMATIONS);
    if (receipt.status !== 1) fail("createTokenBox reverted");
    boxAddress = ethers.utils.getAddress(await factory.boxForToken(TOKEN));
    if (boxAddress === ethers.constants.AddressZero) fail("Factory did not register a box");
    journal.contracts.box = boxAddress;
    journal.transactions.createTokenBox = receipt.transactionHash;
    atomicWrite(JOURNAL, journal);
  }
  const boxCode = await retryRead("BanmaoBox bytecode", () => code(provider, boxAddress, "BanmaoBox"));
  assertArtifactRuntime(boxCode, artifacts.box, "BanmaoBox");
  const validated = await retryRead(
    "Deployment invariants",
    () => validate(provider, artifacts, { renderer: renderer.address, factory: factory.address, box: boxAddress }),
  );
  const deployment = {
    schemaVersion: 1, status: "deployed", frontendEnabled: false, network: "X Layer Mainnet", chainId: CHAIN_ID,
    rpcUrl: RPC_URL, explorerUrl: EXPLORER_URL, deployedAt: new Date().toISOString(),
    compiler: solc.version(), compilerInputHash, optimizerRuns: 200, evmVersion: "shanghai",
    confirmations: CONFIRMATIONS, deployer: journal.deployer,
    contracts: { token: TOKEN, renderer: renderer.address, factory: factory.address, box: boxAddress },
    transactions: journal.transactions, ...validated,
  };
  atomicWrite(MANIFEST, deployment);
  fs.rmSync(JOURNAL, { force: true });
  console.log(`\nDeployment validated and saved atomically: ${MANIFEST}`);
  console.log("Run npm run verify:banmaobox:mainnet before enabling frontend writes.");
}

main().catch((error) => {
  console.error(`\nMainnet deployment stopped: ${error.reason || error.message}`);
  process.exitCode = 1;
});
