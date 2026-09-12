"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const { compile } = require("./banmaoking-release.cjs");
const { assertArtifactRuntime } = require("./banmaobox-runtime.cjs");

function validateConfig(config) {
  if (![196, 1952].includes(config.chainId)) throw new Error("chainId must be 196 or 1952");
  const address = (value) => {
    const normalized = ethers.utils.getAddress(value);
    if (normalized === ethers.constants.AddressZero) throw new Error("Zero address is not allowed");
    return normalized;
  };
  const price = (value) => {
    if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) throw new Error("Prices must be positive base-unit decimal strings");
    if (ethers.BigNumber.from(value).gt(ethers.constants.MaxUint256)) throw new Error("Price exceeds uint256");
    return value;
  };
  if (!Number.isInteger(config.maxSupply) || config.maxSupply < 1 || config.maxSupply > 9216) throw new Error("maxSupply must be 1..9216");
  if (!Number.isInteger(config.royaltyBps) || config.royaltyBps < 0 || config.royaltyBps > 10000) throw new Error("royaltyBps must be 0..10000");
  if (!ethers.utils.isHexString(config.collectionSeed, 32)) throw new Error("collectionSeed must be 32 bytes");
  if (!Array.isArray(config.payments)) throw new Error("payments must be an explicit array");
  const payments = config.payments.map((item) => ({ token: address(item.token), price: price(item.price) }));
  if (new Set(payments.map((item) => item.token)).size !== payments.length) throw new Error("Duplicate payment tokens");
  return { chainId: config.chainId, treasury: address(config.treasury), maxSupply: config.maxSupply,
    nativePrice: price(config.nativePrice), payments, royaltyReceiver: address(config.royaltyReceiver),
    royaltyBps: config.royaltyBps, collectionSeed: config.collectionSeed };
}
function write(file, value) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}
async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || !args[1]) throw new Error("Usage: node scripts/deploy-banmaoking.cjs CONFIG.json OUTPUT_DIRECTORY [--broadcast]");
  if (args.slice(2).some((arg) => arg !== "--broadcast")) throw new Error("Unknown option");
  const config = validateConfig(JSON.parse(fs.readFileSync(path.resolve(args[0]), "utf8")));
  const release = compile();
  console.log(JSON.stringify(config, null, 2));
  if (!args.includes("--broadcast")) { console.log("Configuration/compile check only; no RPC or transactions."); return; }
  if (process.env.BANMAOKING_DEPLOY_CONFIRM !== `DEPLOY_BANMAOKING_${config.chainId}`) throw new Error("Missing matching BANMAOKING_DEPLOY_CONFIRM");
  if (!process.env.BANMAOKING_RPC_URL) throw new Error("BANMAOKING_RPC_URL is required");
  const provider = new ethers.providers.JsonRpcProvider(process.env.BANMAOKING_RPC_URL);
  if ((await provider.getNetwork()).chainId !== config.chainId) throw new Error("RPC chain mismatch");
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  for (const item of config.payments) {
    if (await provider.getCode(item.token) === "0x") throw new Error(`Payment token has no code: ${item.token}`);
  }
  const directory = path.resolve(args[1]);
  // Refuse existing directories: never silently redeploy after an interrupted broadcast.
  fs.mkdirSync(directory);
  write(path.join(directory, "release.json"), release);
  const manifest = { chainId: config.chainId, deployer: signer.address, compilerInputHash: release.compilerInputHash, config, contracts: {} };
  const manifestFile = path.join(directory, "manifest.json");
  write(manifestFile, manifest);
  async function deploy(name, constructorArgs = []) {
    const artifact = release.artifacts[name];
    const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
    const request = factory.getDeployTransaction(...constructorArgs);
    if (ethers.utils.arrayify(request.data).length > 49152) throw new Error(`${name} initcode plus arguments exceeds EIP-3860`);
    const gasLimit = (await signer.estimateGas(request)).mul(125).div(100);
    const populated = await signer.populateTransaction({ ...request, gasLimit });
    const raw = await signer.signTransaction(populated);
    const address = ethers.utils.getContractAddress({ from: signer.address, nonce: populated.nonce });
    manifest.contracts[name] = { address, constructorArgs, transactionHash: ethers.utils.keccak256(raw), status: "pending" };
    write(manifestFile, manifest); // Persist identity BEFORE broadcast, including ambiguous RPC failures.
    const tx = await provider.sendTransaction(raw);
    const receipt = await tx.wait(config.chainId === 196 ? 2 : 1);
    if (receipt.status !== 1) throw new Error(`${name} deployment reverted`);
    assertArtifactRuntime(await provider.getCode(address), artifact, name);
    manifest.contracts[name].status = "confirmed";
    write(manifestFile, manifest);
    console.log(`${name}: ${address}`);
    return address;
  }
  const body = await deploy("BanmaoKingBodyLib");
  const expression = await deploy("BanmaoKingExpressionLib");
  const accessory = await deploy("BanmaoKingAccessoryLib");
  const renderer = await deploy("BanmaoKingRenderer", [body, expression, accessory]);
  await deploy("BanmaoKingNFT", [renderer, config.treasury, config.maxSupply, config.nativePrice,
    config.payments.map((item) => item.token), config.payments.map((item) => item.price),
    config.royaltyReceiver, config.royaltyBps, config.collectionSeed]);
  console.log(`Deployment saved at ${directory}. Run verify-banmaoking.cjs before enabling any frontend.`);
}
if (require.main === module) main().catch((error) => { console.error(error.reason || error.message); process.exitCode = 1; });
module.exports = { validateConfig };
