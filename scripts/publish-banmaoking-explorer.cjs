"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const explorer = require("./publish-banmaobox-explorer.cjs");

function preflight(chainId) {
  if (chainId !== 196) throw new Error("Automatic explorer publication supports X Layer mainnet (196) only; use --skip-explorer for testnet.");
  explorer.credentials();
}
function buildTargets(manifest, release, motionAddresses) {
  if (manifest.chainId !== 196) throw new Error("Explorer chain must be 196");
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(release.input)));
  if (hash !== release.compilerInputHash || hash !== manifest.compilerInputHash) throw new Error("Compiler input hash mismatch");
  return ["BanmaoKingBodyLib", "BanmaoKingExpressionLib", "BanmaoKingAccessoryLib", "BanmaoKingRenderer", "BanmaoKingNFT", "BanmaoKingMotionPart0", "BanmaoKingMotionPart1"].map((name) => {
    const artifact = release.artifacts[name];
    const motion = name.startsWith("BanmaoKingMotionPart");
    const entry = manifest.contracts[name];
    if (!motion && entry?.status !== "confirmed") throw new Error(`${name} is not confirmed`);
    const iface = new ethers.utils.Interface(artifact.abi);
    return {
      key: name, contractAddress: ethers.utils.getAddress(motion ? motionAddresses[name] : entry.address),
      contractName: `${artifact.source}:${name}`, sourceCode: JSON.stringify(release.input),
      compilerVersion: explorer.compilerVersion(release.compilerVersion),
      constructorArguments: iface.encodeDeploy(motion ? [] : entry.constructorArgs).slice(2),
    };
  });
}
function write(file, state) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporary, file);
}
async function publish({ directory, manifest, release, motionAddresses }, api = explorer) {
  const targets = buildTargets(manifest, release, motionAddresses);
  const file = path.join(directory, "explorer-verification.json");
  const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { compilerInputHash: release.compilerInputHash, chainId: manifest.chainId, contracts: {} };
  if (state.compilerInputHash !== release.compilerInputHash || state.chainId !== manifest.chainId) throw new Error("Explorer journal release/chain mismatch");
  for (const target of targets) {
    let entry = state.contracts[target.key];
    if (entry && entry.address !== target.contractAddress) throw new Error(`${target.key}: explorer journal address mismatch`);
    if (await api.isVerified(target.contractAddress)) {
      state.contracts[target.key] = { ...entry, address: target.contractAddress, status: "verified" };
      write(file, state);
      console.log(`${target.key}: already verified`);
      continue;
    }
    if (!entry?.guid || entry.status === "failed") {
      const guid = await api.submit(target);
      entry = { address: target.contractAddress, guid, status: "pending" };
      state.contracts[target.key] = entry;
      write(file, state);
    }
    console.log(`${target.key}: checking GUID ${entry.guid}`);
    const result = await api.poll(entry.guid, 300000, 15000);
    entry.status = result.status;
    write(file, state);
    if (result.status !== "verified") throw new Error(`${target.key}: explorer verification failed; inspect GUID ${entry.guid}`);
    if (!await api.isVerified(target.contractAddress)) throw new Error(`${target.key}: passed but not indexed yet; rerun verification (do not redeploy)`);
    console.log(`${target.key}: verified`);
  }
  console.log("All seven BanmaoKing contracts are verified on X Layer Explorer.");
}
module.exports = { preflight, buildTargets, publish };
