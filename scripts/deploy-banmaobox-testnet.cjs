"use strict";

const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const { assertArtifactRuntime, createBanmaoBoxCompilerInput } = require("./banmaobox-runtime.cjs");
require("dotenv").config({ path: path.resolve(".env.deploy.local") });

const CHAIN_ID = 1952;
const RPC_URL = process.env.XLAYER_TESTNET_RPC_URL || "https://xlayertestrpc.okx.com/terigon";
const TOKEN_ADDRESS = ethers.utils.getAddress(process.env.BANMAOBOX_TESTNET_TOKEN_ADDRESS || "0xE5077fD79a28B888aF33365640FDE144cf9789e3");
const EXPLORER_URL = process.env.XLAYER_TESTNET_EXPLORER_URL || "https://www.okx.com/web3/explorer/xlayer-test";
const MANIFEST = path.resolve("deployments/banmaobox-xlayer-testnet.json");
const JOURNAL = path.resolve("deployments/.banmaobox-testnet-journal.json");
const CONFIRMATIONS = Number(process.env.BANMAOBOX_TESTNET_CONFIRMATIONS || 1);
const RPC_TIMEOUT_MS = Number(process.env.BANMAOBOX_TESTNET_RPC_TIMEOUT_MS || 60_000);
const RPC_ATTEMPTS = Number(process.env.BANMAOBOX_TESTNET_RPC_ATTEMPTS || 4);
// Legacy virtual compiler source directory; this is not a physical path.
const VIRTUAL_SOURCE_DIR = "contracts/banmaobox";

function fail(message) { throw new Error(message); }
function same(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
function nonZeroAddress(value) {
  if (!value || !ethers.utils.isAddress(value) || same(value, ethers.constants.AddressZero)) return undefined;
  return ethers.utils.getAddress(value);
}
function atomicWrite(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function load(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
function errorMessage(error) {
  const messages = [error?.reason, error?.error?.message, error?.message].filter(Boolean);
  return [...new Set(messages)].join("; ") || String(error);
}
function isTransientRpcError(error) {
  const status = error?.status || error?.error?.status;
  const message = errorMessage(error).toLowerCase();
  return status === 429 || status >= 500 || error?.code === "TIMEOUT" || error?.code === "NETWORK_ERROR" ||
    message.includes("missing response") || message.includes("timeout") || message.includes("timed out") ||
    message.includes("socket hang up") || message.includes("connection reset") || message.includes("econnreset");
}
class RetryingJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  async send(method, params) {
    // Never retry a broadcast: the node may have accepted it before dropping the HTTP response.
    const attempts = method === "eth_sendRawTransaction" ? 1 : RPC_ATTEMPTS;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await super.send(method, params);
      } catch (error) {
        if (attempt === attempts || !isTransientRpcError(error)) throw error;
        const delay = 2_000 * attempt;
        console.warn(`RPC ${method} failed (${errorMessage(error)}). Retrying ${attempt + 1}/${attempts} in ${delay / 1_000}s...`);
        await sleep(delay);
      }
    }
    throw new Error(`RPC ${method} failed after ${attempts} attempts`);
  }
}
function privateKey() {
  const value = process.env.DEPLOYER_PRIVATE_KEY;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value || "")) fail("DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte key in .env.deploy.local or the shell");
  return value;
}
function compile() {
  const input = createBanmaoBoxCompilerInput();
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) fail(errors.map((item) => item.formattedMessage).join("\n"));
  const artifact = (file, name) => output.contracts[`${VIRTUAL_SOURCE_DIR}/${file}`][name];
  return {
    renderer: artifact("BanmaoBoxRenderer.sol", "BanmaoBoxRenderer"),
    factory: artifact("BanmaoBoxFactory.sol", "BanmaoBoxFactory"),
    box: artifact("BanmaoBox.sol", "BanmaoBox"),
  };
}
async function waitForArtifactRuntime(provider, address, artifact, label, attempts = 10) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const code = await provider.getCode(address);
      assertArtifactRuntime(code, artifact, label);
      return code;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(attempt * 2_000, 10_000);
      console.warn(`${label} runtime is not indexed yet. Retrying ${attempt + 1}/${attempts} in ${delay / 1_000}s...`);
      await sleep(delay);
    }
  }
  throw lastError;
}
function tokenBoxFromReceipt(factory, receipt, expectedToken) {
  for (const log of receipt.logs || []) {
    if (!same(log.address, factory.address)) continue;
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed.name !== "TokenBoxCreated" || !same(parsed.args.token, expectedToken)) continue;
      return nonZeroAddress(parsed.args.box);
    } catch {
      // Ignore unrelated logs emitted during collection construction.
    }
  }
  return undefined;
}
async function waitForFactoryBox(factory, token, expectedBox, attempts = 10) {
  let observed = ethers.constants.AddressZero;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    observed = await factory.boxForToken(token);
    if (same(observed, expectedBox)) return ethers.utils.getAddress(observed);
    if (attempt !== attempts) {
      const delay = Math.min(attempt * 2_000, 10_000);
      console.warn(`Factory registry is not indexed yet. Retrying ${attempt + 1}/${attempts} in ${delay / 1_000}s...`);
      await sleep(delay);
    }
  }
  fail(`Factory registry mismatch: expected ${expectedBox}, received ${observed}`);
}
async function deploy(provider, signer, artifact, args, label, key, journal) {
  const resumedAddress = nonZeroAddress(journal.contracts[key]);
  if (resumedAddress) {
    const address = resumedAddress;
    await waitForArtifactRuntime(provider, address, artifact, label);
    console.log(`Resuming ${label}: ${address}`);
    return new ethers.Contract(address, artifact.abi, signer);
  }
  const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
  const request = factory.getDeployTransaction(...args);
  const estimate = await provider.estimateGas({ ...request, from: await signer.getAddress() });
  const contract = await factory.deploy(...args, { gasLimit: estimate.mul(125).div(100) });
  console.log(`${label} transaction: ${contract.deployTransaction.hash}`);
  const receipt = await contract.deployTransaction.wait(CONFIRMATIONS);
  if (receipt.status !== 1) fail(`${label} deployment reverted`);
  const address = ethers.utils.getAddress(contract.address);
  await waitForArtifactRuntime(provider, address, artifact, label);
  journal.contracts[key] = address;
  journal.transactions[key] = receipt.transactionHash;
  atomicWrite(JOURNAL, journal);
  console.log(`${label}: ${address}`);
  return new ethers.Contract(address, artifact.abi, signer);
}

async function main() {
  if (!Number.isInteger(CONFIRMATIONS) || CONFIRMATIONS < 1) fail("BANMAOBOX_TESTNET_CONFIRMATIONS must be a positive integer");
  if (!Number.isInteger(RPC_TIMEOUT_MS) || RPC_TIMEOUT_MS < 1_000) fail("BANMAOBOX_TESTNET_RPC_TIMEOUT_MS must be an integer of at least 1000");
  if (!Number.isInteger(RPC_ATTEMPTS) || RPC_ATTEMPTS < 1) fail("BANMAOBOX_TESTNET_RPC_ATTEMPTS must be a positive integer");
  if (process.argv.includes("--compile-only")) {
    compile();
    console.log("BanmaoBox testnet sources compiled successfully (no transaction sent).");
    return;
  }
  const provider = new RetryingJsonRpcProvider({ url: RPC_URL, timeout: RPC_TIMEOUT_MS });
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_ID) fail(`Wrong network: expected ${CHAIN_ID}, received ${network.chainId}`);
  const signer = new ethers.Wallet(privateKey(), provider);
  const deployer = await signer.getAddress();
  const balance = await signer.getBalance();
  if (balance.isZero()) fail(`Deployer ${deployer} has no testnet OKB`);
  const tokenCode = await provider.getCode(TOKEN_ADDRESS);
  if (tokenCode === "0x") fail(`BANMAOBOX_TESTNET_TOKEN_ADDRESS has no contract bytecode: ${TOKEN_ADDRESS}`);
  const token = new ethers.Contract(TOKEN_ADDRESS, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ], provider);
  const tokenSymbol = await token.symbol();
  const tokenDecimals = Number(await token.decimals());
  if (!Number.isInteger(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 255) fail(`Token returned invalid decimals: ${tokenDecimals}`);
  console.log(`Network: X Layer Testnet (${CHAIN_ID})\nRPC: ${RPC_URL}\nDeployer: ${deployer}\nBalance: ${ethers.utils.formatEther(balance)} OKB\nToken: ${TOKEN_ADDRESS} (${tokenSymbol}, ${tokenDecimals} decimals)`);
  console.log("Compiling BanmaoBox testnet stack (optimizer=200, EVM=Shanghai)...");
  const artifacts = compile();
  const journal = fs.existsSync(JOURNAL) ? load(JOURNAL) : {
    schemaVersion: 1, chainId: CHAIN_ID, deployer, token: TOKEN_ADDRESS, contracts: {}, transactions: {}, startedAt: new Date().toISOString(),
  };
  if (journal.chainId !== CHAIN_ID || !same(journal.deployer, deployer) || !same(journal.token || TOKEN_ADDRESS, TOKEN_ADDRESS)) fail(`Existing journal does not match this network/deployer/token: ${JOURNAL}`);
  const renderer = await deploy(provider, signer, artifacts.renderer, [], "BanmaoBoxRenderer", "renderer", journal);
  const factory = await deploy(provider, signer, artifacts.factory, [renderer.address, ethers.constants.AddressZero], "BanmaoBoxFactory", "factory", journal);
  let boxAddress = nonZeroAddress(journal.contracts.box);
  if (!boxAddress) {
    boxAddress = nonZeroAddress(await factory.boxForToken(token.address));
  }
  if (!boxAddress) {
    const estimate = await factory.estimateGas.createTokenBox(token.address);
    const tx = await factory.createTokenBox(token.address, { gasLimit: estimate.mul(125).div(100) });
    console.log(`createTokenBox transaction: ${tx.hash}`);
    const receipt = await tx.wait(CONFIRMATIONS);
    if (receipt.status !== 1) fail("createTokenBox reverted");
    boxAddress = tokenBoxFromReceipt(factory, receipt, token.address);
    if (!boxAddress) fail("createTokenBox succeeded without a matching TokenBoxCreated event");
    journal.contracts.box = boxAddress;
    journal.transactions.createTokenBox = receipt.transactionHash;
    atomicWrite(JOURNAL, journal);
  }
  journal.contracts.box = boxAddress;
  atomicWrite(JOURNAL, journal);
  await waitForArtifactRuntime(provider, boxAddress, artifacts.box, "BanmaoBox");
  await waitForFactoryBox(factory, token.address, boxAddress);
  const box = new ethers.Contract(boxAddress, artifacts.box.abi, provider);
  if (!same(await factory.renderer(), renderer.address) || !(await factory.isTokenBox(boxAddress))) fail("Factory deployment invariant failed");
  if (!same(await box.underlyingToken(), token.address) || !same(await box.renderer(), renderer.address) || !same(await box.rendererAdmin(), deployer)) fail("Box deployment invariant failed");
  const runtime = {};
  for (const [key, address] of Object.entries({ token: token.address, renderer: renderer.address, factory: factory.address, box: boxAddress })) {
    const code = await provider.getCode(address);
    runtime[key] = { bytes: (code.length - 2) / 2, keccak256: ethers.utils.keccak256(code) };
  }
  atomicWrite(MANIFEST, {
    schemaVersion: 1, status: "deployed", network: "X Layer Testnet", chainId: CHAIN_ID,
    rpcUrl: RPC_URL, explorerUrl: EXPLORER_URL, deployedAt: new Date().toISOString(),
    compiler: solc.version(), optimizerRuns: 200, evmVersion: "shanghai", confirmations: CONFIRMATIONS, deployer,
    contracts: { token: token.address, renderer: renderer.address, factory: factory.address, box: boxAddress },
    transactions: journal.transactions, tokenMetadata: { symbol: tokenSymbol, decimals: tokenDecimals }, runtime,
  });
  fs.rmSync(JOURNAL, { force: true });
  console.log(`Deployment validated and saved: ${MANIFEST}`);
}

main().catch((error) => {
  console.error(`\nTestnet deployment stopped: ${errorMessage(error)}`);
  if (error?.code) console.error(`Error code: ${error.code}`);
  if (error?.status || error?.error?.status) console.error(`HTTP status: ${error.status || error.error.status}`);
  process.exitCode = 1;
});
