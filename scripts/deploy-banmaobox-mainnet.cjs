"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
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
const DEPLOYMENT_HISTORY = path.resolve("deployments/banmaobox-mainnet-history");
const SOURCE_DIR = "contracts/banmaobox";
const SOURCES = ["BanmaoBoxRenderer.sol", "BanmaoBox.sol", "BanmaoBoxFactory.sol"];
const CONFIRMATION = "DEPLOY_BANMAOBOX_XLAYER_196";
const REPLACEMENT_CONFIRMATION = "REPLACE_BANMAOBOX_XLAYER_196";
const CONFIRMATIONS = Number(process.env.BANMAOBOX_DEPLOY_CONFIRMATIONS || 2);
const GAS_BUFFER_PERCENT = 125;
const ERC165_INTERFACE_ID = "0x01ffc9a7";
const SVG_RENDERER_INTERFACE_ID = "0xb96dea8a";
const FULL_RENDERER_INTERFACE_ID = "0xf3412491";

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
async function retryRead(label, operation, attempts = 10) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(attempt * 2_000, 20_000);
      console.warn(`${label} RPC read failed (${attempt}/${attempts}); retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  const detail = lastError?.error?.message || lastError?.reason || lastError?.message || String(lastError);
  fail(`${label} RPC read failed after ${attempts} attempts: ${detail}`);
}

function collectSources(entryNames) {
  const collected = {};
  const visit = (sourceName) => {
    if (collected[sourceName]) return;
    const file = sourceName.startsWith("@") ? path.join("node_modules", sourceName) : sourceName;
    if (!fs.existsSync(file)) fail(`Import not found: ${sourceName}`);
    const content = fs.readFileSync(file, "utf8");
    collected[sourceName] = { content };
    for (const match of content.matchAll(/import\s+(?:[^"']*?from\s+)?["']([^"']+)["']\s*;/g)) {
      const imported = match[1].startsWith(".")
        ? path.posix.normalize(path.posix.join(path.posix.dirname(sourceName), match[1]))
        : match[1];
      visit(imported);
    }
  };
  entryNames.forEach(visit);
  return collected;
}

function compile() {
  const sources = collectSources(SOURCES.map((file) => `${SOURCE_DIR}/${file}`));
  const input = {
    language: "Solidity", sources,
    settings: {
      optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai",
      metadata: { bytecodeHash: "ipfs" },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
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
  if (value.maxFeePerGas) {
    return {
      maxFeePerGas: value.maxFeePerGas,
      ...(value.maxPriorityFeePerGas ? { maxPriorityFeePerGas: value.maxPriorityFeePerGas } : {}),
    };
  }
  if (value.gasPrice) return { gasPrice: value.gasPrice };
  fail("RPC did not return usable explicit fee fields");
}

function bufferedGas(estimate) {
  return ethers.BigNumber.from(estimate).mul(GAS_BUFFER_PERCENT).add(99).div(100);
}

function assertAggregateFeeCap(estimates, gasPrice, maximumFeeOkb, existingMaximumWei = 0) {
  if (!maximumFeeOkb) fail("BANMAOBOX_MAX_FEE_OKB is required");
  const cap = ethers.utils.parseEther(maximumFeeOkb);
  const total = estimates.reduce(
    (sum, estimate) => sum.add(bufferedGas(estimate).mul(gasPrice)),
    ethers.BigNumber.from(existingMaximumWei),
  );
  if (total.gt(cap)) {
    fail(`Required release transactions cost up to ${ethers.utils.formatEther(total)} OKB, which exceeds approved aggregate fee cap ${maximumFeeOkb} OKB`);
  }
  return total;
}

async function transactionBudget(provider, signer, estimate, label, journal, key) {
  const fees = await retryRead(`${label} fee data`, () => feeData(provider));
  const price = fees.maxFeePerGas || fees.gasPrice;
  const maximumGasPriceGwei = process.env.BANMAOBOX_MAX_GAS_GWEI;
  if (!maximumGasPriceGwei) fail("BANMAOBOX_MAX_GAS_GWEI is required");
  const maximumGasPrice = ethers.utils.parseUnits(maximumGasPriceGwei, "gwei");
  if (price.gt(maximumGasPrice)) {
    fail(`Live ${label} fee ${ethers.utils.formatUnits(price, "gwei")} Gwei exceeds approved cap ${maximumGasPriceGwei} Gwei`);
  }
  const gasLimit = bufferedGas(estimate);
  const previous = Object.entries(journal.feeBudget || {})
    .filter(([entryKey]) => entryKey !== key)
    .reduce((sum, [, entry]) => sum.add(entry.maximumWei), ethers.BigNumber.from(0));
  const aggregate = assertAggregateFeeCap(
    [estimate], price, process.env.BANMAOBOX_MAX_FEE_OKB, previous,
  );
  const required = gasLimit.mul(price);
  const balance = await retryRead(`${label} deployer balance`, () => signer.getBalance());
  console.log(`${label} gas estimate: ${estimate.toString()} (buffered ${gasLimit.toString()}); aggregate max ${ethers.utils.formatEther(aggregate)} OKB`);
  if (balance.lt(required)) fail(`Insufficient OKB for ${label}: have ${ethers.utils.formatEther(balance)}, need at least ${ethers.utils.formatEther(required)}`);
  journal.feeBudget = {
    ...(journal.feeBudget || {}),
    [key]: { gasLimit: gasLimit.toString(), maximumWei: required.toString() },
  };
  atomicWrite(JOURNAL, journal);
  return { gasLimit, fees };
}


async function deployContract(provider, signer, artifact, args, label, journal, key) {
  if (journal.contracts[key] || journal.transactions[key]) {
    if (!journal.contracts[key] || !journal.transactions[key]) {
      fail(`Journal ${label} must contain both contract address and transaction hash`);
    }
    const address = ethers.utils.getAddress(journal.contracts[key]);
    const receipt = await retryRead(
      `Journal ${label} receipt`,
      () => provider.waitForTransaction(journal.transactions[key], CONFIRMATIONS),
    );
    if (!receipt || receipt.status !== 1 || !same(receipt.contractAddress, address)) {
      fail(`Journal ${label} deployment receipt is invalid`);
    }
    const runtimeCode = await retryRead(`Journal ${label} bytecode`, () => code(provider, address, `Journal ${label}`));
    assertArtifactRuntime(runtimeCode, artifact, `Journal ${label}`);
    console.log(`Resuming verified ${label}: ${address}`);
    return new ethers.Contract(address, artifact.abi, signer);
  }
  const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
  const request = factory.getDeployTransaction(...args);
  const from = await signer.getAddress();
  const estimate = await retryRead(`${label} gas estimate`, () => provider.estimateGas({ ...request, from }));
  const { gasLimit, fees } = await transactionBudget(provider, signer, estimate, label, journal, key);
  const contract = await factory.deploy(...args, { gasLimit, ...fees });
  journal.contracts[key] = ethers.utils.getAddress(contract.address);
  journal.transactions[key] = contract.deployTransaction.hash;
  atomicWrite(JOURNAL, journal);
  console.log(`${label} transaction: ${contract.deployTransaction.hash}`);
  const receipt = await contract.deployTransaction.wait(CONFIRMATIONS);
  if (receipt.status !== 1 || !same(receipt.contractAddress, journal.contracts[key])) {
    fail(`${label} deployment receipt is invalid`);
  }
  const runtimeCode = await code(provider, journal.contracts[key], label);
  assertArtifactRuntime(runtimeCode, artifact, label);
  console.log(`${label}: ${journal.contracts[key]}`);
  return new ethers.Contract(journal.contracts[key], artifact.abi, signer);
}

function journalComplete(journal) {
  const rendererComplete = journal.deploymentMode === "replacement"
    ? Boolean(journal.contracts.renderer && !journal.transactions.renderer)
    : Boolean(journal.contracts.renderer && journal.transactions.renderer);
  return Boolean(
    rendererComplete && journal.contracts.factory && journal.contracts.box &&
    journal.transactions.factory && journal.transactions.createTokenBox
  );
}

function replacementSource(currentManifest) {
  return {
    renderer: ethers.utils.getAddress(currentManifest.contracts.boxRenderer),
    factory: ethers.utils.getAddress(currentManifest.contracts.factory),
    box: ethers.utils.getAddress(currentManifest.contracts.box),
    compilerInputHash: currentManifest.compilerInputHash,
  };
}

function journalMatchesReplacementSource(journal, currentManifest) {
  if (!journal.replacementSource) return false;
  const expected = replacementSource(currentManifest);
  return (
    same(journal.replacementSource.renderer, expected.renderer) &&
    same(journal.replacementSource.factory, expected.factory) &&
    same(journal.replacementSource.box, expected.box) &&
    journal.replacementSource.compilerInputHash === expected.compilerInputHash
  );
}

function journalMatchesActiveManifest(journal, currentManifest) {
  if (!journalComplete(journal)) return false;
  return (
    journal.compilerInputHash === currentManifest.compilerInputHash &&
    same(journal.contracts.renderer, currentManifest.contracts.boxRenderer) &&
    same(journal.contracts.factory, currentManifest.contracts.factory) &&
    same(journal.contracts.box, currentManifest.contracts.box) &&
    journal.transactions.factory === currentManifest.transactions?.factory &&
    journal.transactions.createTokenBox === currentManifest.transactions?.createTokenBox
  );
}

async function prepareRenderer({
  provider,
  signer,
  artifact,
  journal,
  reuse,
  rendererAddress,
  contract = (address, abi, runner) => new ethers.Contract(address, abi, runner),
  deploy = deployContract,
  writeJournal = (value) => atomicWrite(JOURNAL, value),
}) {
  if (!reuse) {
    return deploy(provider, signer, artifact, [], "BanmaoBoxRenderer", journal, "renderer");
  }
  const address = ethers.utils.getAddress(rendererAddress);
  if (journal.transactions.renderer) fail("Renderer reuse journal must not contain a deployment transaction");
  if (journal.contracts.renderer && !same(journal.contracts.renderer, address)) {
    fail("Journal Renderer does not match the replacement source manifest");
  }
  const runtimeCode = await retryRead(
    "Reused Renderer bytecode",
    () => code(provider, address, "Reused Renderer"),
  );
  assertArtifactRuntime(runtimeCode, artifact, "Reused Renderer");
  const renderer = contract(address, artifact.abi, signer);
  for (const interfaceId of [ERC165_INTERFACE_ID, SVG_RENDERER_INTERFACE_ID, FULL_RENDERER_INTERFACE_ID]) {
    const supported = await retryRead(
      `Reused Renderer interface ${interfaceId}`,
      () => renderer.supportsInterface(interfaceId),
    );
    if (!supported) fail(`Reused Renderer does not support interface ${interfaceId}`);
  }
  journal.contracts.renderer = address;
  writeJournal(journal);
  console.log(`Reusing verified BanmaoBoxRenderer: ${address}`);
  return renderer;
}

function ensureArchive(file, sourceManifest) {
  if (!fs.existsSync(file)) {
    atomicWrite(file, sourceManifest);
    return "created";
  }
  const existing = loadJson(file);
  if (!isDeepStrictEqual(existing, sourceManifest)) {
    fail(`Previous deployment archive conflicts with source manifest: ${file}`);
  }
  return "existing-equal";
}

async function validate(provider, artifacts, addresses) {
  const factory = new ethers.Contract(addresses.factory, artifacts.factory.abi, provider);
  const box = new ethers.Contract(addresses.box, artifacts.box.abi, provider);
  const read = (label, operation) => retryRead(`Deployment invariant: ${label}`, operation);

  // Keep validation reads sequential. The public X Layer RPC may reset
  // connections when a large group of eth_call requests arrives concurrently.
  const rendererCode = await read("Renderer bytecode", () => code(provider, addresses.renderer, "Renderer"));
  const factoryCode = await read("Factory bytecode", () => code(provider, addresses.factory, "Factory"));
  const boxCode = await read("Box bytecode", () => code(provider, addresses.box, "Box"));
  const tokenCode = await read("BANMAO bytecode", () => code(provider, TOKEN, "BANMAO"));
  const factoryRenderer = await read("Factory renderer", () => factory.renderer());
  const defaultRenderer = await read("Factory default renderer", () => factory.defaultRenderer());
  const previousFactory = await read("Factory predecessor", () => factory.previousFactory());
  const registryBox = await read("Factory boxForToken", () => factory.boxForToken(TOKEN));
  const registered = await read("Factory isTokenBox", () => factory.isTokenBox(addresses.box));
  const underlying = await read("Box underlyingToken", () => box.underlyingToken());
  const boxRenderer = await read("Box renderer", () => box.renderer());
  const rendererAdmin = await read("Box renderer admin", () => box.rendererAdmin());
  const factoryAdmin = await read("Factory renderer admin", () => factory.rendererAdmin());
  const decimals = await read("Box tokenDecimals", () => box.tokenDecimals());
  const symbol = await read("Box tokenSymbol", () => box.tokenSymbol());
  const maxAssets = await read("Box MAX_ASSETS_PER_BOX", () => box.MAX_ASSETS_PER_BOX());
  const maxBatch = await read("Box MAX_BATCH_SIZE", () => box.MAX_BATCH_SIZE());
  const maxLock = await read("Box MAX_LOCK_DURATION", () => box.MAX_LOCK_DURATION());
  const supply = await read("Box totalSupply", () => box.totalSupply());
  const locked = await read("Box totalTokensLocked", () => box.totalTokensLocked());

  if (
    !same(factoryRenderer, addresses.renderer) ||
    !same(defaultRenderer, addresses.renderer) ||
    !same(previousFactory, addresses.previousFactory) ||
    !same(boxRenderer, addresses.renderer)
  ) fail("Initial renderer invariant failed");
  if (!same(rendererAdmin, addresses.deployer) || !same(factoryAdmin, addresses.deployer)) fail("Renderer admin invariant failed");
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
  const replacingDeployment = currentManifest.status === "deployed";
  if (replacingDeployment && (
    !process.argv.includes("--replace-deployment") ||
    process.env.BANMAOBOX_REPLACE_CONFIRM !== REPLACEMENT_CONFIRMATION
  )) {
    fail(`A mainnet deployment already exists. Replacement requires --replace-deployment and BANMAOBOX_REPLACE_CONFIRM=${REPLACEMENT_CONFIRMATION}`);
  }

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

  // A metadata release replacement must deploy a fresh collection. Linking the
  // previous Factory would make boxForToken(TOKEN) inherit the immutable old Box
  // and createTokenBox(TOKEN) revert with TokenBoxAlreadyExists. Likewise, never
  // seed a new release journal with old runtime addresses: resume is valid only
  // for contracts deployed from this exact compiler input.
  const previousFactory = ethers.constants.AddressZero;
  const journal = fs.existsSync(JOURNAL) ? loadJson(JOURNAL) : {
    schemaVersion: 1, chainId: CHAIN_ID, token: TOKEN, deployer, compilerInputHash,
    deploymentMode: replacingDeployment ? "replacement" : "initial",
    ...(replacingDeployment ? { replacementSource: replacementSource(currentManifest) } : {}),
    previousFactory,
    contracts: {},
    transactions: {},
    startedAt: new Date().toISOString(),
  };
  const activeManifestAlreadyFinalized = journalMatchesActiveManifest(journal, currentManifest);
  if (
    journal.chainId !== CHAIN_ID ||
    !same(journal.token, TOKEN) ||
    journal.compilerInputHash !== compilerInputHash ||
    journal.deploymentMode !== (replacingDeployment ? "replacement" : "initial") ||
    (replacingDeployment && !activeManifestAlreadyFinalized &&
      !journalMatchesReplacementSource(journal, currentManifest)) ||
    !same(journal.previousFactory || ethers.constants.AddressZero, previousFactory)
  ) {
    fail(`Existing journal does not match this chain/token/source/predecessor. Inspect or remove ${JOURNAL}`);
  }
  const completeJournal = journalComplete(journal);
  if (!same(journal.deployer, deployer)) {
    if (!completeJournal) fail(`Existing incomplete journal belongs to a different deployer. Restore that key; do not remove ${JOURNAL}`);
    console.warn(`Current signer differs from original deployer ${journal.deployer}; performing read-only finalization of the complete journal.`);
  }

  const renderer = await prepareRenderer({
    provider,
    signer,
    artifact: artifacts.renderer,
    journal,
    reuse: replacingDeployment,
    rendererAddress: currentManifest.contracts.boxRenderer,
  });
  const factory = await deployContract(
    provider,
    signer,
    artifacts.factory,
    [renderer.address, previousFactory],
    "BanmaoBoxFactory",
    journal,
    "factory",
  );
  if (journal.contracts.box && !journal.transactions.createTokenBox) {
    fail("Journal BanmaoBox must contain its createTokenBox transaction hash");
  }
  let boxAddress = journal.contracts.box;
  if (!boxAddress && journal.transactions.createTokenBox) {
    const receipt = await retryRead(
      "Journal createTokenBox receipt",
      () => provider.waitForTransaction(journal.transactions.createTokenBox, CONFIRMATIONS),
    );
    if (!receipt || receipt.status !== 1) fail("Journal createTokenBox receipt is invalid");
    boxAddress = ethers.utils.getAddress(await factory.boxForToken(TOKEN));
    if (boxAddress === ethers.constants.AddressZero) {
      fail("Journal createTokenBox transaction did not register a BanmaoBox");
    }
    journal.contracts.box = boxAddress;
    atomicWrite(JOURNAL, journal);
  }
  if (!boxAddress) {
    const existing = await factory.boxForToken(TOKEN);
    if (existing !== ethers.constants.AddressZero) fail(`Factory already maps BANMAO to unjournaled box ${existing}; inspect before continuing`);
    const estimate = await retryRead("createTokenBox(BANMAO) gas estimate", () => factory.estimateGas.createTokenBox(TOKEN));
    const { gasLimit, fees } = await transactionBudget(
      provider, signer, estimate, "createTokenBox(BANMAO)", journal, "createTokenBox",
    );
    const tx = await factory.createTokenBox(TOKEN, { gasLimit, ...fees });
    journal.transactions.createTokenBox = tx.hash;
    atomicWrite(JOURNAL, journal);
    console.log(`createTokenBox transaction: ${tx.hash}`);
    const receipt = await tx.wait(CONFIRMATIONS);
    if (receipt.status !== 1) fail("createTokenBox reverted");
    boxAddress = ethers.utils.getAddress(await factory.boxForToken(TOKEN));
    if (boxAddress === ethers.constants.AddressZero) fail("Factory did not register a box");
    journal.contracts.box = boxAddress;
    atomicWrite(JOURNAL, journal);
  } else {
    const receipt = await retryRead(
      "Journal createTokenBox receipt",
      () => provider.waitForTransaction(journal.transactions.createTokenBox, CONFIRMATIONS),
    );
    if (!receipt || receipt.status !== 1) fail("Journal createTokenBox receipt is invalid");
    const registeredBox = ethers.utils.getAddress(await factory.boxForToken(TOKEN));
    if (!same(registeredBox, boxAddress)) fail("Journal BanmaoBox does not match Factory registry");
  }
  const boxCode = await retryRead("BanmaoBox bytecode", () => code(provider, boxAddress, "BanmaoBox"));
  assertArtifactRuntime(boxCode, artifacts.box, "BanmaoBox");
  const validated = await retryRead(
    "Deployment invariants",
    () => validate(provider, artifacts, {
      renderer: renderer.address,
      factory: factory.address,
      box: boxAddress,
      deployer: journal.deployer,
      previousFactory,
    }),
  );
  const deployment = {
    schemaVersion: 1, status: "deployed", network: "X Layer Mainnet", chainId: CHAIN_ID,
    rpcUrl: RPC_URL, explorerUrl: EXPLORER_URL, deployedAt: new Date().toISOString(),
    compiler: solc.version(), compilerInputHash, optimizerRuns: 200, evmVersion: "shanghai",
    confirmations: CONFIRMATIONS, deployer: journal.deployer,
    contracts: {
      token: TOKEN,
      factoryRenderer: renderer.address,
      defaultRenderer: renderer.address,
      boxRenderer: renderer.address,
      factory: factory.address,
      previousFactory,
      box: boxAddress,
    },
    transactions: journal.transactions,
    ...validated,
    runtime: {
      ...validated.runtime,
      factoryRenderer: validated.runtime.renderer,
      defaultRenderer: validated.runtime.renderer,
      boxRenderer: validated.runtime.renderer,
      renderer: undefined,
    },
  };
  if (replacingDeployment && !activeManifestAlreadyFinalized) {
    const previousBox = String(currentManifest.contracts.box).toLowerCase().replace(/^0x/, "");
    const previousHash = String(currentManifest.compilerInputHash || "unknown").replace(/^0x/, "");
    const archive = path.join(DEPLOYMENT_HISTORY, `${previousBox}-${previousHash}.json`);
    const archiveState = ensureArchive(archive, currentManifest);
    console.log(`${archiveState === "created" ? "Archived" : "Confirmed archived"} previous deployment manifest: ${archive}`);
  }
  if (!activeManifestAlreadyFinalized) atomicWrite(MANIFEST, deployment);
  fs.rmSync(JOURNAL, { force: true });
  console.log(`\nDeployment validated and saved atomically: ${MANIFEST}`);
  console.log("Run npm run verify:banmaobox:mainnet before using the deployment in production.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nMainnet deployment stopped: ${error.reason || error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertAggregateFeeCap,
  ensureArchive,
  journalComplete,
  journalMatchesActiveManifest,
  journalMatchesReplacementSource,
  prepareRenderer,
  replacementSource,
};
