"use strict";
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const { BANMAOBOX_VIRTUAL_SOURCE_NAMES, assertArtifactRuntime } = require("./banmaobox-runtime.cjs");
require("dotenv").config({ path: path.resolve(".env.deploy.local"), quiet: true });
const CHAIN_ID = 196;
const RPC_URL = process.env.XLAYER_MAINNET_RPC_URL || "https://xlayerrpc.okx.com";
const MANIFEST_PATH = path.resolve("deployments/banmaobox-xlayer-mainnet.json");
const RELEASE_PATH = path.resolve("lib/banmaobox/verification-release.json");
const JOURNAL_PATH = path.resolve("deployments/.banmaobox-renderer-mainnet-journal.json");
const CONFIRMATION = "DEPLOY_BANMAOBOX_RENDERER_XLAYER_196";
const CONFIRMATIONS = Number(process.env.BANMAOBOX_DEPLOY_CONFIRMATIONS || 2);
const INTERFACES = ["0x01ffc9a7", "0xb96dea8a", "0xf3412491"];
const factoryAbi = ["function rendererAdmin() view returns(address)", "function defaultRenderer() view returns(address)", "function setDefaultRenderer(address)"];
const boxAbi = ["function rendererAdmin() view returns(address)", "function renderer() view returns(address)", "function setRenderer(address)"];
const rendererAbi = ["function supportsInterface(bytes4) view returns(bool)"];
function atomicWrite(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function same(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
function loadArtifact() {
  const release = JSON.parse(fs.readFileSync(RELEASE_PATH, "utf8"));
  const input = JSON.parse(release.standardInput);
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter(({ severity }) => severity === "error");
  if (errors.length) throw new Error(errors.map(({ formattedMessage }) => formattedMessage).join("\n"));
  return { release, artifact: output.contracts[BANMAOBOX_VIRTUAL_SOURCE_NAMES.renderer].BanmaoBoxRenderer };
}
async function wait(provider, hash) {
  const receipt = await provider.waitForTransaction(hash, CONFIRMATIONS, 300_000);
  if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${hash}`);
  return receipt;
}
async function main() {
  if (process.env.BANMAOBOX_RENDERER_MAINNET_CONFIRM !== CONFIRMATION) throw new Error(`Set BANMAOBOX_RENDERER_MAINNET_CONFIRM=${CONFIRMATION}`);
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error("DEPLOYER_PRIVATE_KEY is required");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const { release, artifact } = loadArtifact();
  const provider = new ethers.providers.StaticJsonRpcProvider({ url: RPC_URL, timeout: 30_000 }, { chainId: CHAIN_ID, name: "xlayer" });
  if ((await provider.getNetwork()).chainId !== CHAIN_ID) throw new Error("Wrong chain");
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const factory = new ethers.Contract(manifest.contracts.factory, factoryAbi, signer);
  const box = new ethers.Contract(manifest.contracts.box, boxAbi, signer);
  const [factoryAdmin, boxAdmin] = await Promise.all([factory.rendererAdmin(), box.rendererAdmin()]);
  if (![manifest.deployer, factoryAdmin, boxAdmin].every((value) => same(value, signer.address))) throw new Error("Signer is not the manifest, Factory, and Box renderer admin");
  const journal = fs.existsSync(JOURNAL_PATH) ? JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8")) : {
    schemaVersion: 1, chainId: CHAIN_ID, compilerInputHash: release.compilerInputHash,
    previousRenderer: manifest.contracts.boxRenderer, transactions: {},
  };
  if (journal.compilerInputHash !== release.compilerInputHash || !same(journal.previousRenderer, manifest.contracts.boxRenderer)) throw new Error("Renderer journal does not match active release/manifest");
  let rendererAddress = journal.renderer;
  if (!rendererAddress) {
    const deploy = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
    const estimate = await signer.estimateGas({ data: deploy.getDeployTransaction().data });
    const renderer = await deploy.deploy({ gasLimit: estimate.mul(125).div(100) });
    journal.renderer = renderer.address; journal.transactions.renderer = renderer.deployTransaction.hash;
    atomicWrite(JOURNAL_PATH, journal); console.log(`Renderer deployment: ${renderer.deployTransaction.hash}`);
    await wait(provider, renderer.deployTransaction.hash); rendererAddress = renderer.address;
  } else await wait(provider, journal.transactions.renderer);

  const runtime = assertArtifactRuntime(await provider.getCode(rendererAddress), artifact, "Renderer");
  const renderer = new ethers.Contract(rendererAddress, rendererAbi, provider);
  if ((await Promise.all(INTERFACES.map((id) => renderer.supportsInterface(id)))).some((value) => !value)) throw new Error("Renderer interface validation failed");
  if (!journal.transactions.setDefaultRenderer) {
    const tx = await factory.setDefaultRenderer(rendererAddress);
    journal.transactions.setDefaultRenderer = tx.hash; atomicWrite(JOURNAL_PATH, journal);
    console.log(`Factory default renderer update: ${tx.hash}`); await wait(provider, tx.hash);
  } else await wait(provider, journal.transactions.setDefaultRenderer);
  if (!journal.transactions.setRenderer) {
    const tx = await box.setRenderer(rendererAddress);
    journal.transactions.setRenderer = tx.hash; atomicWrite(JOURNAL_PATH, journal);
    console.log(`Box renderer update: ${tx.hash}`); await wait(provider, tx.hash);
  } else await wait(provider, journal.transactions.setRenderer);
  const [defaultRenderer, boxRenderer] = await Promise.all([factory.defaultRenderer(), box.renderer()]);
  if (!same(defaultRenderer, rendererAddress) || !same(boxRenderer, rendererAddress)) throw new Error("Renderer links did not update");
  manifest.updatedAt = new Date().toISOString();
  manifest.rendererRelease = { compiler: release.compiler, compilerInputHash: release.compilerInputHash };
  manifest.contracts.defaultRenderer = rendererAddress; manifest.contracts.boxRenderer = rendererAddress;
  manifest.transactions.renderer = journal.transactions.renderer;
  manifest.transactions.setDefaultRenderer = journal.transactions.setDefaultRenderer;
  manifest.transactions.setRenderer = journal.transactions.setRenderer;
  manifest.runtime.defaultRenderer = runtime; manifest.runtime.boxRenderer = runtime;
  atomicWrite(MANIFEST_PATH, manifest); fs.rmSync(JOURNAL_PATH, { force: true });
  console.log(JSON.stringify({ renderer: rendererAddress, transactions: journal.transactions, runtime }, null, 2));
}
module.exports = { main };
if (require.main === module) main().catch((error) => { console.error(`Renderer deployment failed: ${error.reason || error.message}`); process.exitCode = 1; });
