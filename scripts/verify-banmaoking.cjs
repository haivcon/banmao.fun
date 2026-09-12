"use strict";
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const { assertArtifactRuntime } = require("./banmaobox-runtime.cjs");
async function main() {
  if (!process.argv[2] || !process.env.BANMAOKING_RPC_URL) throw new Error("Provide deployment directory and BANMAOKING_RPC_URL (read-only)");
  const directory = path.resolve(process.argv[2]);
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
    same(await king.isPaymentToken(item.token), true, "accepted payment");
    same(await king.mintPrice(item.token), item.price, "mint price");
  }
  const royalty = await king.royaltyInfo(1, 10000);
  same(royalty[0], config.royaltyReceiver, "royalty receiver");
  same(royalty[1], config.royaltyBps, "royalty bps");
  for (let index = 0; index < 2; index++) {
    const name = `BanmaoKingMotionPart${index}`;
    const artifact = output.contracts[release.artifacts[name].source][name];
    assertArtifactRuntime(await provider.getCode(await renderer[`motionPart${index}`]()), artifact, name);
  }
  const uri = await renderer.tokenURI(1, [0, 0, 0, 0]);
  const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
  if (metadata.name !== "Banmao King #1" || !metadata.image.startsWith("data:image/svg+xml;base64,")) throw new Error("Metadata smoke check failed");
  console.log("Read-only verification passed. Explorer publication remains a separate step using release.input and recorded constructor arguments.");
}
if (require.main === module) main().catch((error) => { console.error(error.reason || error.message); process.exitCode = 1; });
