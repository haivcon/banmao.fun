"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ethers } = require("ethers");
const { buildTargets, publish, preflight } = require("./publish-banmaoking-explorer.cjs");
function fixture() {
  const names = ["BanmaoKingBodyLib", "BanmaoKingExpressionLib", "BanmaoKingAccessoryLib", "BanmaoKingRenderer", "BanmaoKingNFT", "BanmaoKingMotionPart0", "BanmaoKingMotionPart1"];
  const input = { language: "Solidity", sources: {}, settings: {} };
  const compilerInputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(input)));
  const release = { input, compilerInputHash, compilerVersion: "0.8.30+commit.73712a01.Emscripten.clang", artifacts: {} };
  const manifest = { chainId: 196, compilerInputHash, contracts: {} };
  const motionAddresses = {};
  names.forEach((name, i) => {
    const address = ethers.utils.getAddress(`0x${(i + 1).toString(16).padStart(40, "0")}`);
    release.artifacts[name] = { source: `contracts/${name}.sol`, abi: i === 4 ? ["constructor(address[],uint256[])"] : [] };
    if (i < 5) manifest.contracts[name] = { address, status: "confirmed", constructorArgs: i === 4 ? [[address], ["123"]] : [] };
    else motionAddresses[name] = address;
  });
  return { manifest, release, motionAddresses };
}
test("builds all seven fully qualified targets and ABI-encodes dynamic constructor arguments", () => {
  const f = fixture();
  const targets = buildTargets(f.manifest, f.release, f.motionAddresses);
  assert.equal(targets.length, 7);
  assert.equal(targets[4].constructorArguments, ethers.utils.defaultAbiCoder.encode(["address[]", "uint256[]"], f.manifest.contracts.BanmaoKingNFT.constructorArgs).slice(2));
  assert.equal(targets[6].constructorArguments, "");
  assert.equal(targets[0].compilerVersion, "v0.8.30+commit.73712a01");
  assert.equal(targets[0].contractName, "contracts/BanmaoKingBodyLib.sol:BanmaoKingBodyLib");
  assert.equal(typeof targets[0].sourceCode, "string");
  assert.deepEqual(JSON.parse(targets[0].sourceCode), f.release.input);
});
test("rejects testnet, modified release and pending deployment", () => {
  assert.throws(() => preflight(1952), /mainnet/);
  const f = fixture();
  assert.throws(() => buildTargets({ ...f.manifest, chainId: 1952 }, f.release, f.motionAddresses), /196/);
  assert.throws(() => buildTargets(f.manifest, { ...f.release, input: {} }, f.motionAddresses), /hash/);
  f.manifest.contracts.BanmaoKingNFT.status = "pending";
  assert.throws(() => buildTargets(f.manifest, f.release, f.motionAddresses), /confirmed/);
});
test("persists GUID on timeout, resumes without resubmission, and skips verified contracts", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "king-explorer-"));
  try {
    const f = { ...fixture(), directory };
    const verified = new Set();
    const submitted = new Map();
    let timeout = true;
    let count = 0;
    const api = {
      isVerified: async (address) => verified.has(address),
      submit: async (target) => { const guid = `guid-${++count}`; submitted.set(guid, target.contractAddress); return guid; },
      poll: async (guid) => {
        if (timeout) throw new Error("timeout");
        verified.add(submitted.get(guid));
        return { status: "verified" };
      },
    };
    await assert.rejects(publish(f, api), /timeout/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "explorer-verification.json"))).contracts.BanmaoKingBodyLib.guid, "guid-1");
    timeout = false;
    await publish(f, api);
    assert.equal(count, 7);
    await publish(f, api);
    assert.equal(count, 7);
    assert.equal(verified.size, 7);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});


test("records failed verification and refuses success before indexing", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "king-explorer-fail-"));
  try {
    const f = { ...fixture(), directory };
    let count = 0;
    const api = {
      isVerified: async () => false,
      submit: async () => `guid-${++count}`,
      poll: async () => ({ status: "failed" }),
    };
    await assert.rejects(publish(f, api), /verification failed/);
    const file = path.join(directory, "explorer-verification.json");
    assert.equal(JSON.parse(fs.readFileSync(file)).contracts.BanmaoKingBodyLib.status, "failed");
    api.poll = async () => ({ status: "verified" });
    await assert.rejects(publish(f, api), /not indexed/);
    assert.equal(count, 2);
    await assert.rejects(publish(f, api), /not indexed/);
    assert.equal(count, 2);
    const state = JSON.parse(fs.readFileSync(file));
    state.chainId = 1952;
    fs.writeFileSync(file, JSON.stringify(state));
    await assert.rejects(publish(f, api), /journal release\/chain mismatch/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
