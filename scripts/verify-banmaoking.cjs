"use strict";
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const { assertArtifactRuntime } = require("./banmaobox-runtime.cjs");
async function verifyDeployment(directory, { skipExplorer = false } = {}) {
  require("./publish-banmaobox-explorer.cjs").loadEnvironment();
  if (!directory || !process.env.BANMAOKING_RPC_URL) throw new Error("Provide deployment directory and BANMAOKING_RPC_URL");
  directory = path.resolve(directory);
  const release = JSON.parse(fs.readFileSync(path.join(directory, "release.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(release.input)));
  if (hash !== release.compilerInputHash || hash !== manifest.compilerInputHash) throw new Error("Compiler input hash mismatch");
  if (solc.version() !== release.compilerVersion) throw new Error("Install the exact release compiler version");
  const output = JSON.parse(solc.compile(JSON.stringify(release.input)));
  if ((output.errors || []).some((item) => item.severity === "error")) throw new Error("Release compilation failed");
  const provider = new ethers.providers.JsonRpcProvider(process.env.BANMAOKING_RPC_URL);
  if ((await provider.getNetwork()).chainId !== manifest.chainId) throw new Error("RPC chain mismatch");
  const contracts = {};
  for (const name of ["BanmaoKingBodyLib", "BanmaoKingExpressionLib", "BanmaoKingAccessoryLib", "BanmaoKingRenderer", "BanmaoKingNFT"]) {
    const entry = manifest.contracts[name];
    if (!entry || entry.status !== "confirmed") throw new Error(`${name} missing or pending; inspect its transaction before continuing`);
    const artifact = output.contracts[release.artifacts[name].source][name];
    assertArtifactRuntime(await provider.getCode(entry.address), artifact, name);
    const transaction = await provider.getTransaction(entry.transactionHash);
    const receipt = await provider.getTransactionReceipt(entry.transactionHash);
    const expectedData = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`).getDeployTransaction(...entry.constructorArgs).data;
    if (!transaction || transaction.to !== null || transaction.data !== expectedData || !receipt || receipt.status !== 1 || receipt.contractAddress.toLowerCase() !== entry.address.toLowerCase()) throw new Error(`${name} deployment transaction mismatch`);
    contracts[name] = new ethers.Contract(entry.address, artifact.abi, provider);
    console.log(`Verified runtime and constructor transaction: ${name}`);
  }
  const same = (actual, expected, label) => {
    if (String(actual).toLowerCase() !== String(expected).toLowerCase()) throw new Error(`${label} mismatch`);
  };
  const king = contracts.BanmaoKingNFT;
  const renderer = contracts.BanmaoKingRenderer;
  const config = manifest.config;
  for (const [method, expected] of Object.entries({ renderer: renderer.address, treasury: config.treasury, maxSupply: config.maxSupply, collectionSeed: config.collectionSeed })) same(await king[method](), expected, method);
  for (const [method, name] of Object.entries({ bodyLib: "BanmaoKingBodyLib", expressionLib: "BanmaoKingExpressionLib", accessoryLib: "BanmaoKingAccessoryLib" })) same(await renderer[method](), contracts[name].address, method);
  for (const item of [{ token: ethers.constants.AddressZero, price: config.nativePrice }, ...config.payments]) {
    same(await king.isPaymentToken(item.token), item.token !== ethers.constants.AddressZero || config.nativePrice !== "0", "accepted payment");
    same(await king.mintPrice(item.token), item.price, "mint price");
  }
  const royalty = await king.royaltyInfo(1, 10000);
  same(royalty[0], config.royaltyReceiver, "royalty receiver");
  same(royalty[1], config.royaltyBps, "royalty bps");
  const motionAddresses = {};
  for (let index = 0; index < 2; index++) {
    const name = `BanmaoKingMotionPart${index}`;
    const artifact = output.contracts[release.artifacts[name].source][name];
    motionAddresses[name] = await renderer[`motionPart${index}`]();
    assertArtifactRuntime(await provider.getCode(motionAddresses[name]), artifact, name);
  }
  const uri = await renderer.tokenURI(1, [0, 0, 0, 0]);
  const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
  if (metadata.name !== "Banmao King #1" || !metadata.image.startsWith("data:image/svg+xml;base64,")) throw new Error("Metadata smoke check failed");
  console.log("Read-only runtime/configuration verification passed.");
  if (!skipExplorer) {
    const publisher = require("./publish-banmaoking-explorer.cjs");
    publisher.preflight(manifest.chainId);
    // Publish ABIs from the archived input recompiled above, not mutable working sources.
    const artifacts = Object.fromEntries(Object.entries(release.artifacts).map(([name, item]) => [name, { source: item.source, ...output.contracts[item.source][name] }]));
    await publisher.publish({ directory, manifest, release: { ...release, artifacts }, motionAddresses });
  } else console.log("Explorer publication explicitly skipped; source verification is not claimed.");
}
async function main() {
  const [directory, ...flags] = process.argv.slice(2);
  if (flags.some((flag) => flag !== "--skip-explorer")) throw new Error("Unknown option");
  await verifyDeployment(directory, { skipExplorer: flags.includes("--skip-explorer") });
}
module.exports = { verifyDeployment };
if (require.main === module) main().catch((error) => { console.error(error.reason || error.message); process.exitCode = 1; });
