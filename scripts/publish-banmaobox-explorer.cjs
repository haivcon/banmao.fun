"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const API_ORIGIN = "https://web3.okx.com";
const API_ROOT = "/api/v5/xlayer/contract";
const CHAIN_SHORT_NAME = "XLAYER";
const PROJECT_ROOT = path.resolve(__dirname, "..");

function compilerVersion(value) {
  const match = String(value).match(/(\d+\.\d+\.\d+\+commit\.[0-9a-f]+)/i);
  if (!match) throw new Error(`Unsupported compiler version: ${value}`);
  return `v${match[1]}`;
}
function encodeConstructorArguments(types, values) {
  return types.length ? ethers.utils.defaultAbiCoder.encode(types, values).slice(2) : "";
}
function buildTargets(manifest, release) {
  const renderer = ethers.utils.getAddress(manifest.contracts.renderer);
  const factory = ethers.utils.getAddress(manifest.contracts.factory);
  const token = ethers.utils.getAddress(manifest.contracts.token);
  const box = ethers.utils.getAddress(manifest.contracts.box);
  const rendererAdmin = ethers.utils.getAddress(manifest.deployer);
  const previousFactory = ethers.utils.getAddress(
    manifest.contracts.previousFactory || ethers.constants.AddressZero,
  );
  const shared = { sourceCode: release.standardInput, compilerVersion: compilerVersion(release.compiler) };
  return [
    { key: "renderer", contractAddress: renderer, contractName: "contracts/banmaobox/BanmaoBoxRenderer.sol:BanmaoBoxRenderer", constructorArguments: "", ...shared },
    { key: "factory", contractAddress: factory, contractName: "contracts/banmaobox/BanmaoBoxFactory.sol:BanmaoBoxFactory", constructorArguments: encodeConstructorArguments(["address", "address"], [renderer, previousFactory]), ...shared },
    { key: "box", contractAddress: box, contractName: "contracts/banmaobox/BanmaoBox.sol:BanmaoBox", constructorArguments: encodeConstructorArguments(["address", "address", "address"], [token, renderer, rendererAdmin]), ...shared },
  ];
}
function parsePollStatus(data) {
  const value = Array.isArray(data) && typeof data[0] === "string" ? data[0].trim().toLowerCase() : "";
  if (["pass", "success", "verified"].some((status) => value === status || value.startsWith(`${status} -`))) return "verified";
  if (["fail", "failed"].some((status) => value === status || value.startsWith(`${status} -`))) return "failed";
  return "pending";
}
function loadEnvironment() {
  require("@next/env").loadEnvConfig(PROJECT_ROOT, false);
  const deployEnv = path.join(PROJECT_ROOT, ".env.deploy.local");
  if (fs.existsSync(deployEnv)) require("dotenv").config({ path: deployEnv, override: false, quiet: true });
}
function credentials() {
  for (const suffix of ["", ...Array.from({ length: 20 }, (_, index) => `_${index + 1}`)]) {
    const apiKey = process.env[`OKX_API_KEY${suffix}`];
    const secretKey = process.env[`OKX_SECRET_KEY${suffix}`];
    const passphrase = process.env[`OKX_PASSPHRASE${suffix}`] || process.env[`OKX_API_PASSPHRASE${suffix}`];
    if (apiKey && secretKey && passphrase) return { apiKey, secretKey, passphrase };
  }
  throw new Error("No complete OKX API credential triplet is configured");
}
async function okxRequest(method, requestPath, body) {
  const creds = credentials();
  const bodyString = body === undefined ? "" : JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const signature = crypto.createHmac("sha256", creds.secretKey)
    .update(timestamp + method + requestPath + bodyString).digest("base64");
  const headers = {
    "Content-Type": "application/json", "OK-ACCESS-KEY": creds.apiKey,
    "OK-ACCESS-SIGN": signature, "OK-ACCESS-PASSPHRASE": creds.passphrase,
    "OK-ACCESS-TIMESTAMP": timestamp,
  };
  if (process.env.OKX_PROJECT_ID) headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
  const signal = AbortSignal.timeout(Number(process.env.BANMAOBOX_PUBLISH_REQUEST_TIMEOUT_MS || 20000));
  let response;
  try {
    response = await fetch(`${API_ORIGIN}${requestPath}`, { method, headers, body: bodyString || undefined, signal });
  } catch (error) {
    if (error?.name === "TimeoutError") throw new Error(`OKX verifier request timed out: ${requestPath}`);
    throw error;
  }
  let envelope;
  try { envelope = await response.json(); }
  catch { throw new Error(`OKX verifier returned non-JSON HTTP ${response.status} for ${method} ${requestPath}`); }
  if (!response.ok || envelope.code !== "0") {
    const detail = JSON.stringify({ httpStatus: response.status, code: envelope.code, msg: envelope.msg, data: envelope.data });
    throw new Error(`OKX verifier request failed for ${method} ${requestPath}: ${detail}`);
  }
  return envelope.data;
}
async function isVerified(address) {
  const query = new URLSearchParams({ chainShortName: CHAIN_SHORT_NAME, contractAddress: address });
  const data = await okxRequest("GET", `${API_ROOT}/verify-contract-info?${query}`);
  return Array.isArray(data) && data.length > 0;
}
async function submit(target) {
  const data = await okxRequest("POST", `${API_ROOT}/verify-source-code`, {
    chainShortName: CHAIN_SHORT_NAME, contractAddress: target.contractAddress,
    sourceCode: target.sourceCode, codeFormat: "solidity-standard-json-input",
    contractName: target.contractName, compilerVersion: target.compilerVersion,
    constructorArguments: target.constructorArguments,
  });
  if (!Array.isArray(data) || typeof data[0] !== "string" || !data[0]) throw new Error("OKX verifier did not return a GUID");
  return data[0];
}

async function poll(guid, timeoutMs, intervalMs) {
  const deadline = Date.now() + timeoutMs;
  let lastData;
  while (Date.now() < deadline) {
    lastData = await okxRequest("POST", `${API_ROOT}/check-verify-result`, { chainShortName: CHAIN_SHORT_NAME, guid });
    const status = parsePollStatus(lastData);
    if (status !== "pending") return { status, data: lastData };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for verification GUID ${guid}; last response: ${JSON.stringify(lastData)}`);
}
function targetSummary(target) {
  return JSON.stringify({
    contract: target.key,
    address: target.contractAddress,
    contractName: target.contractName,
    compilerVersion: target.compilerVersion,
    constructorArguments: target.constructorArguments || "<none>",
  });
}
async function publishExplorerVerification(options = {}) {
  loadEnvironment();
  const manifest = options.manifest || JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "deployments/banmaobox-xlayer-mainnet.json"), "utf8"));
  const release = options.release || JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "lib/banmaobox/verification-release.json"), "utf8"));
  if (manifest.compilerInputHash !== release.compilerInputHash) throw new Error("Manifest and verification release compiler input hashes differ");
  const timeoutMs = Number(process.env.BANMAOBOX_PUBLISH_TIMEOUT_MS || 300000);
  const intervalMs = Number(process.env.BANMAOBOX_PUBLISH_POLL_MS || 15000);
  for (const target of buildTargets(manifest, release)) {
    console.log(`${target.key}: checking Explorer status ${targetSummary(target)}`);
    if (await isVerified(target.contractAddress)) {
      console.log(`${target.key}: already verified (${target.contractAddress})`);
      continue;
    }
    let guid;
    try {
      guid = await submit(target);
    } catch (error) {
      throw new Error(`${target.key}: source submission failed; target=${targetSummary(target)}; ${error.message}`, { cause: error });
    }
    console.log(`${target.key}: submitted (${target.contractAddress}), GUID ${guid}`);
    const result = await poll(guid, timeoutMs, intervalMs);
    if (result.status !== "verified") {
      throw new Error(`${target.key}: verification failed (GUID ${guid}); response=${JSON.stringify(result.data)}; target=${targetSummary(target)}`);
    }
    if (!await isVerified(target.contractAddress)) {
      throw new Error(`${target.key}: verifier passed but contract info is not indexed yet (GUID ${guid}); rerun this command to recheck safely`);
    }
    console.log(`${target.key}: verified`);
  }
  console.log("All BanmaoBox contracts are verified on X Layer Explorer.");
}
module.exports = { buildTargets, compilerVersion, encodeConstructorArguments, parsePollStatus, publishExplorerVerification };
if (require.main === module) publishExplorerVerification().catch((error) => { console.error(error.message); process.exitCode = 1; });
