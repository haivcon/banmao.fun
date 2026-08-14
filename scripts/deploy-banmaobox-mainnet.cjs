"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const solc = require("solc");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.resolve(".env.deploy.local") });

const CHAIN_ID = 196;
const TOKEN = ethers.utils.getAddress("0x16d91d1615fc55b76d5f92365bd60c069b46ef78");
const RPC_URL = process.env.XLAYER_MAINNET_RPC_URL || process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const EXPLORER_URL = "https://web3.okx.com/explorer/x-layer/evm";
const MANIFEST = path.resolve("deployments/banmaobox-xlayer-mainnet.json");
const JOURNAL = path.resolve("deployments/.banmaobox-mainnet-journal.json");
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
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
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
  const gasPrice = await feeData(provider);
  const bufferedGas = estimate.mul(GAS_BUFFER_PERCENT).div(100);
  const required = bufferedGas.mul(gasPrice);
  const balance = await signer.getBalance();
  console.log(`${label} gas estimate: ${estimate.toString()} (buffered ${bufferedGas.toString()}); max estimated cost ${ethers.utils.formatEther(required)} OKB`);
  if (balance.lt(required)) fail(`Insufficient OKB for ${label}: have ${ethers.utils.formatEther(balance)}, need at least ${ethers.utils.formatEther(required)}`);
  return bufferedGas;
}


async function deployContract(provider, signer, artifact, args, label, journal, key) {
  if (journal.contracts[key]) {
    const address = ethers.utils.getAddress(journal.contracts[key]);
    await code(provider, address, `Journal ${label}`);
    console.log(`Resuming ${label}: ${address}`);
    return new ethers.Contract(address, artifact.abi, signer);
  }
  const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
  const request = factory.getDeployTransaction(...args);
  const estimate = await provider.estimateGas({ ...request, from: await signer.getAddress() });
  const gasLimit = await requireFunds(provider, signer, estimate, label);
  const contract = await factory.deploy(...args, { gasLimit });
  console.log(`${label} transaction: ${contract.deployTransaction.hash}`);
  const receipt = await contract.deployTransaction.wait(CONFIRMATIONS);
  if (receipt.status !== 1) fail(`${label} deployment reverted`);
  const address = ethers.utils.getAddress(receipt.contractAddress || contract.address);
  await code(provider, address, label);
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
  if (!decimals.eq(18)) fail(`Expected BANMAO decimals 18, received ${decimals.toString()}`);
  if (!maxAssets.eq(5) || !maxBatch.eq(20) || !maxLock.eq(3_153_600_000)) fail("Production constant invariant failed");
  if (!supply.isZero() || !locked.isZero()) fail("New collection unexpectedly has supply or locked tokens");
  return {
    tokenMetadata: { symbol, decimals: decimals.toNumber() },
    runtime: {
      token: { bytes: (tokenCode.length - 2) / 2, keccak256: keccakCode(tokenCode) },
      renderer: { bytes: (rendererCode.length - 2) / 2, keccak256: keccakCode(rendererCode) },
      factory: { bytes: (factoryCode.length - 2) / 2, keccak256: keccakCode(factoryCode) },
      box: { bytes: (boxCode.length - 2) / 2, keccak256: keccakCode(boxCode) },
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
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_ID) fail(`Wrong network: expected ${CHAIN_ID}, received ${network.chainId}`);
  await code(provider, TOKEN, "Production BANMAO");
  const token = new ethers.Contract(TOKEN, ["function decimals() view returns (uint8)", "function symbol() view returns (string)"], provider);
  const [tokenDecimals, tokenSymbol] = await Promise.all([token.decimals(), token.symbol()]);
  if (Number(tokenDecimals) !== 18) fail(`Production token decimals mismatch: ${tokenDecimals}`);

  const signer = new ethers.Wallet(privateKey(), provider);
  const deployer = await signer.getAddress();
  console.log(`Network: X Layer Mainnet (${network.chainId})`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Production token: ${TOKEN} (${tokenSymbol}, ${tokenDecimals} decimals)`);
  console.log(`Deployer: ${deployer}`);
  console.log(`Balance: ${ethers.utils.formatEther(await signer.getBalance())} OKB`);

  const journal = fs.existsSync(JOURNAL) ? loadJson(JOURNAL) : {
    schemaVersion: 1, chainId: CHAIN_ID, token: TOKEN, deployer, compilerInputHash,
    contracts: {}, transactions: {}, startedAt: new Date().toISOString(),
  };
  if (journal.chainId !== CHAIN_ID || !same(journal.token, TOKEN) || !same(journal.deployer, deployer) || journal.compilerInputHash !== compilerInputHash) {
    fail(`Existing journal does not match this chain/token/deployer/source. Inspect or remove ${JOURNAL}`);
  }

  const renderer = await deployContract(provider, signer, artifacts.renderer, [], "BanmaoBoxRenderer", journal, "renderer");
  const factory = await deployContract(provider, signer, artifacts.factory, [renderer.address], "BanmaoBoxFactory", journal, "factory");
  let boxAddress = journal.contracts.box;
  if (!boxAddress) {
    const existing = await factory.boxForToken(TOKEN);
    if (existing !== ethers.constants.AddressZero) fail(`Factory already maps BANMAO to unjournaled box ${existing}; inspect before continuing`);
    const estimate = await factory.estimateGas.createTokenBox(TOKEN);
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
  await code(provider, boxAddress, "BanmaoBox");
  const validated = await validate(provider, artifacts, { renderer: renderer.address, factory: factory.address, box: boxAddress });
  const deployment = {
    schemaVersion: 1, status: "deployed", network: "X Layer Mainnet", chainId: CHAIN_ID,
    rpcUrl: RPC_URL, explorerUrl: EXPLORER_URL, deployedAt: new Date().toISOString(),
    compiler: solc.version(), compilerInputHash, optimizerRuns: 200, evmVersion: "shanghai",
    confirmations: CONFIRMATIONS, deployer,
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
