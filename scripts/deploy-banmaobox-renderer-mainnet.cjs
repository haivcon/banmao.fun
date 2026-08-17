"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const { artifactFingerprint, assertArtifactRuntime } = require("./banmaobox-runtime.cjs");


const CHAIN_ID = 196;
const BOX = ethers.utils.getAddress("0x95c83831a283cDC41cd552374aD1279b2375a4ee");
const OLD_RENDERER = ethers.utils.getAddress("0xE880e364f4a71be047cF49767313381715d57db0");
const ADMIN = ethers.utils.getAddress("0x92809f2837f708163d375960063C8A3156fCeACb");
const TOKEN_ID = 4;
const RPC_URL = process.env.XLAYER_MAINNET_RPC_URL || process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const RELEASE = path.resolve("deployments/banmaobox-renderer-release-artifacts.json");
const MANIFEST = path.resolve("deployments/banmaobox-xlayer-mainnet.json");
const JOURNAL = path.resolve("deployments/.banmaobox-renderer-mainnet-journal.json");
const SOURCE_DIR = "contracts/banmaobox";
const SOURCES = ["BanmaoBoxRenderer.sol"];
const CONFIRMATION = "UPDATE_BANMAOBOX_RENDERER_XLAYER_196";
const CONFIRMATIONS = Number(process.env.BANMAOBOX_DEPLOY_CONFIRMATIONS || 2);
const GAS_BUFFER_PERCENT = 125;
const UPDATE_GAS_PREFLIGHT_CEILING = ethers.BigNumber.from(150_000);
const SVG_INTERFACE_ID = ethers.utils.hexDataSlice(
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes("renderSVG(uint256,(address,address,uint256,uint128,uint8,uint8,bytes16,bytes))")),
  0,
  4,
);
const BOX_ABI = [
  "function renderer() view returns (address)",
  "function metadataRenderer() view returns (address)",
  "function rendererAdmin() view returns (address)",
  "function ownerOf(uint256) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function totalTokensLocked() view returns (uint256)",
  "function boxDetails(uint256) view returns (uint256 amount,address creator,uint64 createdAt,uint64 unlockTime)",
  "function getBoxAssets(uint256) view returns (tuple(address token,uint256 amount,uint8 decimals,bytes16 symbol)[])",
  "function renderSVG(uint256) view returns (string)",
  "function renderAttributes(uint256) view returns (string)",
  "function tokenURI(uint256) view returns (string)",
  "function setRenderer(address)",
  "event RendererUpdated(address indexed previousRenderer,address indexed newRenderer)",
  "event BatchMetadataUpdate(uint256 indexed fromTokenId,uint256 indexed toTokenId)",
];

function fail(message) { throw new Error(message); }
function same(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
function sha256(value) { return `0x${crypto.createHash("sha256").update(value).digest("hex")}`; }
function loadJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function stringify(value) {
  if (ethers.BigNumber.isBigNumber(value)) return value.toString();
  if (Array.isArray(value)) return value.map(stringify);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !/^\d+$/.test(key)).map(([key, item]) => [key, stringify(item)]));
  }
  return value;
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
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
      metadata: { bytecodeHash: "ipfs" },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } },
    },
  };
  const standardInput = JSON.stringify(input);
  const output = JSON.parse(solc.compile(standardInput));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) fail(errors.map((item) => item.formattedMessage).join("\n"));
  const artifact = output.contracts[`${SOURCE_DIR}/BanmaoBoxRenderer.sol`].BanmaoBoxRenderer;
  const runtimeBytes = artifact.evm.deployedBytecode.object.length / 2;
  if (runtimeBytes > 24_576) fail(`Renderer runtime is ${runtimeBytes} bytes and exceeds EIP-170`);
  return { artifact, compilerInputHash: sha256(standardInput) };
}

function verifyRelease(artifact, compilerInputHash) {
  const approved = loadJson(RELEASE);
  if (approved.compiler !== solc.version() || approved.compilerInputHash !== compilerInputHash) {
    fail("Compiled sources do not match the committed release fingerprint");
  }
  const observed = artifactFingerprint(artifact);
  const expected = approved.runtime?.renderer;
  if (!expected || observed.bytes !== expected.bytes || observed.normalizedKeccak256 !== expected.normalizedKeccak256) {
    fail("Renderer artifact does not match the committed release fingerprint");
  }
  return observed;
}

function writeRelease(artifact, compilerInputHash) {
  const release = {
    schemaVersion: 1,
    compiler: solc.version(),
    compilerInputHash,
    optimizerRuns: 200,
    evmVersion: "shanghai",
    runtime: { renderer: artifactFingerprint(artifact) },
  };
  atomicWrite(RELEASE, release);
  return release;
}

function assertAggregateFeeCap(estimates, gasPrice, capOkb, incurredCost = ethers.constants.Zero) {
  if (!/^\d+(?:\.\d{1,18})?$/.test(capOkb || "")) {
    fail("BANMAOBOX_RENDERER_MAX_FEE_OKB must be an explicit non-negative OKB amount with at most 18 decimals");
  }
  const approved = ethers.utils.parseEther(capOkb);
  const bufferedGas = estimates.reduce(
    (total, estimate) => total.add(ethers.BigNumber.from(estimate).mul(GAS_BUFFER_PERCENT).add(99).div(100)),
    ethers.constants.Zero,
  );
  const maximum = ethers.BigNumber.from(incurredCost).add(bufferedGas.mul(gasPrice));
  if (maximum.gt(approved)) {
    fail(`Live cumulative max cost ${ethers.utils.formatEther(maximum)} OKB exceeds approved aggregate fee cap ${capOkb} OKB`);
  }
  return maximum;
}

function assertNormalizedSvg(svg) {
  const root = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="BanmaoBox sealed treasury">';
  if (!svg.startsWith(root) || !svg.endsWith("</g></svg>")) fail("SVG does not have the approved normalized root");
  if (!svg.includes('<g transform="scale(0.75)"><rect width="800" height="800"')) fail("SVG does not preserve the 800-unit artwork through one 0.75 scale transform");
  const openingTag = svg.slice(0, svg.indexOf(">") + 1);
  const body = svg.replace('xmlns="http://www.w3.org/2000/svg"', "");
  if (/\s(?:width|height|aria-labelledby)=/i.test(openingTag) || /\s(?:textLength|lengthAdjust|href|xlink:href)=|<(?:title|desc|script|foreignObject)\b|https?:\/\/|url\((?!#)/i.test(body)) {
    fail("SVG contains a construct excluded by the compatibility experiment");
  }
  return svg;
}

function selectRefreshAction(batchMetadataUpdateEmitted) {
  if (!batchMetadataUpdateEmitted) fail("setRenderer receipt did not emit required BatchMetadataUpdate; stop for inspection before any optional refresh");
  return "none";
}

function journalComplete(journal) {
  return Boolean(journal?.contracts?.renderer && journal?.transactions?.renderer && journal?.transactions?.setRenderer);
}

function receiptCost(receipt) {
  const gasPrice = receipt.effectiveGasPrice || receipt.gasPrice;
  if (!receipt.gasUsed || !gasPrice) fail("Transaction receipt is missing gas cost fields");
  return ethers.BigNumber.from(receipt.gasUsed).mul(gasPrice);
}

async function confirmedReceipt(provider, transactionHash, label) {
  let receipt = await provider.getTransactionReceipt(transactionHash);
  if (!receipt || Number(receipt.confirmations || 0) < CONFIRMATIONS) {
    receipt = await provider.waitForTransaction(transactionHash, CONFIRMATIONS);
  }
  if (!receipt || receipt.status !== 1) fail(`${label} reverted or was not confirmed`);
  return receipt;
}

async function snapshot(box) {
  return {
    renderer: ethers.utils.getAddress(await box.renderer()),
    metadataRenderer: ethers.utils.getAddress(await box.metadataRenderer()),
    rendererAdmin: ethers.utils.getAddress(await box.rendererAdmin()),
    owner: ethers.utils.getAddress(await box.ownerOf(TOKEN_ID)),
    totalSupply: (await box.totalSupply()).toString(),
    totalTokensLocked: (await box.totalTokensLocked()).toString(),
    boxDetails: stringify(await box.boxDetails(TOKEN_ID)),
    assets: stringify(await box.getBoxAssets(TOKEN_ID)),
    attributes: await box.renderAttributes(TOKEN_ID),
  };
}

function assertStableState(before, after, newRenderer) {
  if (!same(after.renderer, newRenderer)) fail("Collection renderer readback does not equal the new Renderer");
  if (!same(before.metadataRenderer, OLD_RENDERER) || !same(after.metadataRenderer, OLD_RENDERER)) fail("Immutable metadataRenderer changed or did not match the expected original Renderer");
  if (!same(before.rendererAdmin, ADMIN) || !same(after.rendererAdmin, ADMIN)) fail("Renderer admin invariant failed");
  for (const key of ["owner", "totalSupply", "totalTokensLocked", "boxDetails", "assets", "attributes"]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) fail(`${key} changed during renderer-only update`);
  }
}

function decodeTokenUri(uri, expectedSvg) {
  if (!uri.startsWith("data:application/json;base64,")) fail("tokenURI(4) is not base64 JSON");
  let metadata;
  try { metadata = JSON.parse(Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64").toString("utf8")); } catch { fail("tokenURI(4) JSON is invalid"); }
  if (!metadata.image?.startsWith("data:image/svg+xml;base64,")) fail("tokenURI(4) does not contain embedded base64 SVG");
  const embedded = Buffer.from(metadata.image.slice(metadata.image.indexOf(",") + 1), "base64").toString("utf8");
  if (embedded !== expectedSvg) fail("tokenURI(4) SVG differs from renderSVG(4)");
  return metadata;
}

async function liveGasPrice(provider) {
  const fee = await provider.getFeeData();
  const gasPrice = fee.maxFeePerGas || fee.gasPrice;
  if (!gasPrice) fail("RPC did not return a usable live gas price");
  return gasPrice;
}

async function deployRenderer(provider, signer, artifact, journal, feeCap) {
  if (journal.transactions.renderer) {
    const receipt = await confirmedReceipt(provider, journal.transactions.renderer, "Renderer deployment");
    const receiptAddress = ethers.utils.getAddress(receipt.contractAddress || ethers.constants.AddressZero);
    if (journal.contracts.renderer && !same(journal.contracts.renderer, receiptAddress)) {
      fail("Journal Renderer does not match its deployment receipt");
    }
    journal.contracts.renderer = receiptAddress;
    journal.costs.renderer = receiptCost(receipt).toString();
    assertArtifactRuntime(await provider.getCode(receiptAddress), artifact, "Journal Renderer");
    atomicWrite(JOURNAL, journal);
    return new ethers.Contract(receiptAddress, artifact.abi, signer);
  }
  if (journal.contracts.renderer) fail("Journal Renderer address is missing its deployment transaction");
  const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, signer);
  const request = factory.getDeployTransaction();
  const from = await signer.getAddress();
  const estimate = await provider.estimateGas({ ...request, from });
  const gasPrice = await liveGasPrice(provider);
  const maximum = assertAggregateFeeCap([estimate, UPDATE_GAS_PREFLIGHT_CEILING], gasPrice, feeCap);
  console.log(`Approved cumulative pre-broadcast maximum: ${ethers.utils.formatEther(maximum)} OKB`);
  const gasLimit = estimate.mul(GAS_BUFFER_PERCENT).add(99).div(100);
  const contract = await factory.deploy({ gasLimit });
  journal.transactions.renderer = contract.deployTransaction.hash;
  atomicWrite(JOURNAL, journal);
  const receipt = await contract.deployTransaction.wait(CONFIRMATIONS);
  if (receipt.status !== 1) fail("Renderer deployment reverted");
  const address = ethers.utils.getAddress(receipt.contractAddress || contract.address);
  assertArtifactRuntime(await provider.getCode(address), artifact, "Deployed Renderer");
  journal.contracts.renderer = address;
  journal.costs.renderer = receiptCost(receipt).toString();
  atomicWrite(JOURNAL, journal);
  return new ethers.Contract(address, artifact.abi, signer);
}

async function main() {
  require("dotenv").config({ path: path.resolve(".env.deploy.local"), quiet: true });
  const { artifact, compilerInputHash } = compile();
  if (process.argv.includes("--write-release")) {
    const release = writeRelease(artifact, compilerInputHash);
    console.log(`Generated ${RELEASE}: ${release.runtime.renderer.bytes} runtime bytes, ${release.runtime.renderer.normalizedKeccak256}`);
    return;
  }
  const preflight = process.argv.includes("--preflight");
  if (!preflight && (process.argv.includes("--confirm-mainnet") === false || process.env.BANMAOBOX_RENDERER_MAINNET_CONFIRM !== CONFIRMATION)) {
    fail(`Mainnet update is locked. Pass --confirm-mainnet and set BANMAOBOX_RENDERER_MAINNET_CONFIRM=${CONFIRMATION}`);
  }
  if (!Number.isInteger(CONFIRMATIONS) || CONFIRMATIONS < 1) fail("BANMAOBOX_DEPLOY_CONFIRMATIONS must be a positive integer");

  const releaseRuntime = verifyRelease(artifact, compilerInputHash);
  const manifest = loadJson(MANIFEST);
  const existingJournal = fs.existsSync(JOURNAL) ? loadJson(JOURNAL) : null;
  if (manifest.chainId !== CHAIN_ID || !same(manifest.contracts.box, BOX) || !same(manifest.contracts.renderer, OLD_RENDERER) || !same(manifest.deployer, ADMIN)) {
    fail("Active manifest chain/Box/Renderer/admin preflight failed");
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_ID) fail(`Wrong network: expected ${CHAIN_ID}, received ${network.chainId}`);
  const oldCode = await provider.getCode(OLD_RENDERER);
  if (oldCode === "0x" || ethers.utils.keccak256(oldCode) !== manifest.runtime.renderer.keccak256) fail("Current Renderer runtime does not match the active manifest");
  const box = new ethers.Contract(BOX, BOX_ABI, provider);
  const before = await snapshot(box);
  const rendererUpdateSubmitted = Boolean(existingJournal?.transactions?.setRenderer);
  if ((!same(before.renderer, OLD_RENDERER) && !rendererUpdateSubmitted) || !same(before.metadataRenderer, OLD_RENDERER) || !same(before.rendererAdmin, ADMIN)) {
    fail("Live collection renderer/admin preflight failed");
  }

  const nonce = await provider.getTransactionCount(ADMIN, "pending");
  const candidate = ethers.utils.getContractAddress({ from: ADMIN, nonce });
  const deployFactory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`);
  const deployEstimate = await provider.estimateGas({ ...deployFactory.getDeployTransaction(), from: ADMIN });
  const gasPrice = await liveGasPrice(provider);
  const cap = process.env.BANMAOBOX_RENDERER_MAX_FEE_OKB || "";
  const preflightMaximum = assertAggregateFeeCap([deployEstimate, UPDATE_GAS_PREFLIGHT_CEILING], gasPrice, cap);
  console.log(`Preflight: chain=${CHAIN_ID} box=${BOX} admin=${ADMIN}`);
  console.log(`Candidate Renderer at current pending nonce ${nonce}: ${candidate}`);
  console.log(`Renderer runtime: ${releaseRuntime.bytes} bytes; normalized keccak256=${releaseRuntime.normalizedKeccak256}`);
  console.log(`Live gas price: ${gasPrice.toString()}; aggregate buffered maximum: ${ethers.utils.formatEther(preflightMaximum)} OKB`);
  if (preflight) {
    console.log("READ-ONLY PREFLIGHT COMPLETE: no transaction was signed or broadcast.");
    return;
  }

  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key || "")) fail("DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte key");
  const signer = new ethers.Wallet(key, provider);
  if (!same(await signer.getAddress(), ADMIN)) fail("Signer is not the immutable Renderer admin");
  const journal = existingJournal || {
    schemaVersion: 1,
    chainId: CHAIN_ID,
    box: BOX,
    oldRenderer: OLD_RENDERER,
    admin: ADMIN,
    compilerInputHash,
    baseline: before,
    contracts: {},
    transactions: {},
    costs: {},
  };
  if (journal.schemaVersion !== 1 || journal.chainId !== CHAIN_ID || !same(journal.box, BOX) || !same(journal.oldRenderer, OLD_RENDERER) || !same(journal.admin, ADMIN) || journal.compilerInputHash !== compilerInputHash || JSON.stringify(journal.baseline) !== JSON.stringify(before) && !journal.transactions.setRenderer) {
    fail(`Existing journal does not match this release or live baseline; inspect ${JOURNAL}`);
  }
  journal.contracts ||= {};
  journal.transactions ||= {};
  journal.costs ||= {};

  const renderer = await deployRenderer(provider, signer, artifact, journal, cap);
  const supportsSvg = await renderer.supportsInterface(SVG_INTERFACE_ID);
  if (!supportsSvg) fail("New Renderer does not advertise IBanmaoBoxSVGRenderer");
  assertNormalizedSvg(await renderer.renderSVG(TOKEN_ID, {
    token: before.assets[0].token,
    creator: before.boxDetails.creator,
    amount: before.boxDetails.amount,
    timestamps: ethers.BigNumber.from(before.boxDetails.createdAt).shl(64).or(before.boxDetails.unlockTime),
    tokenDecimals: before.assets[0].decimals,
    assetCount: before.assets.length,
    tokenSymbol: before.assets[0].symbol,
    renderAssets: ethers.utils.hexConcat(before.assets.map((asset) => ethers.utils.solidityPack(["address", "uint256", "uint8", "bytes16"], [asset.token, asset.amount, asset.decimals, asset.symbol]))),
  }));

  if (!journal.transactions.setRenderer) {
    const writableBox = box.connect(signer);
    const estimate = await writableBox.estimateGas.setRenderer(renderer.address);
    const updateGasPrice = await liveGasPrice(provider);
    const deploymentCost = journal.costs.renderer
      ? ethers.BigNumber.from(journal.costs.renderer)
      : receiptCost(await confirmedReceipt(provider, journal.transactions.renderer, "Renderer deployment"));
    const maximum = assertAggregateFeeCap([estimate], updateGasPrice, cap, deploymentCost);
    console.log(`Remaining live cumulative maximum: ${ethers.utils.formatEther(maximum)} OKB`);
    const tx = await writableBox.setRenderer(renderer.address, { gasLimit: estimate.mul(GAS_BUFFER_PERCENT).add(99).div(100) });
    journal.transactions.setRenderer = tx.hash;
    atomicWrite(JOURNAL, journal);
    const receipt = await tx.wait(CONFIRMATIONS);
    if (receipt.status !== 1) fail("setRenderer reverted");
    const batchEvent = receipt.events?.some((event) => event.event === "BatchMetadataUpdate");
    selectRefreshAction(Boolean(batchEvent));
    journal.costs.setRenderer = receiptCost(receipt).toString();
    atomicWrite(JOURNAL, journal);
  } else {
    const receipt = await confirmedReceipt(provider, journal.transactions.setRenderer, "setRenderer");
    const parsedEvents = receipt.logs
      .filter((log) => same(log.address, BOX))
      .map((log) => { try { return box.interface.parseLog(log); } catch { return null; } })
      .filter(Boolean);
    const updated = parsedEvents.find((event) => event.name === "RendererUpdated");
    const batchEvent = parsedEvents.some((event) => event.name === "BatchMetadataUpdate");
    if (!updated || !same(updated.args?.previousRenderer, OLD_RENDERER) || !same(updated.args?.newRenderer, renderer.address)) {
      fail("Journal setRenderer receipt does not contain the expected RendererUpdated event");
    }
    selectRefreshAction(Boolean(batchEvent));
  }

  if (!journalComplete(journal)) fail("Renderer update journal is incomplete");
  assertArtifactRuntime(await provider.getCode(renderer.address), artifact, "Final Renderer");
  const after = await snapshot(box);
  assertStableState(journal.baseline, after, renderer.address);
  const svg = assertNormalizedSvg(await box.renderSVG(TOKEN_ID));
  decodeTokenUri(await box.tokenURI(TOKEN_ID), svg);
  console.log(`Renderer-only update verified: ${renderer.address}`);
  console.log("setRenderer emitted BatchMetadataUpdate; no refreshMetadata transaction was needed or sent.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nRenderer mainnet workflow stopped: ${error.reason || error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertAggregateFeeCap,
  assertNormalizedSvg,
  journalComplete,
  selectRefreshAction,
};
