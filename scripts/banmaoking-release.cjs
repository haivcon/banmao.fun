"use strict";

const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");
const root = path.resolve(__dirname, "..");
const entries = ["NFT/BanmaoKingNFT.sol", "Renderer/BanmaoKingRenderer.sol", "Lib/BanmaoKingBodyLib.sol", "Lib/BanmaoKingExpressionLib.sol", "Lib/BanmaoKingAccessoryLib.sol"];

function compile() {
  const sources = {};
  function visit(name) {
    if (sources[name]) return;
    const file = name.startsWith("@") ? require.resolve(name, { paths: [root] }) : path.join(root, name);
    const content = fs.readFileSync(file, "utf8");
    sources[name] = { content };
    for (const match of content.matchAll(/import\s+(?:[^"']*?from\s+)?["']([^"']+)["']\s*;/g)) {
      visit(match[1].startsWith(".") ? path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1])) : match[1]);
    }
  }
  entries.forEach((file) => visit(`contracts/BanmaoKing/${file}`));
  const input = { language: "Solidity", sources, settings: {
    optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } },
  } };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  const artifacts = {};
  for (const [source, contracts] of Object.entries(output.contracts)) {
    for (const [name, artifact] of Object.entries(contracts)) {
      if (!name.startsWith("BanmaoKing") || !artifact.evm.bytecode.object) continue;
      const runtimeBytes = artifact.evm.deployedBytecode.object.length / 2;
      const initcodeBytes = artifact.evm.bytecode.object.length / 2;
      console.log(`${name}: runtime=${runtimeBytes}, initcode=${initcodeBytes}`);
      if (runtimeBytes > 24576 || initcodeBytes > 49152) throw new Error(`${name} exceeds EIP-170/EIP-3860 limits`);
      artifacts[name] = { source, ...artifact };
    }
  }
  return { compilerVersion: solc.version(), compilerInputHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(input))), input, artifacts };
}

if (require.main === module) {
  try {
    const release = compile();
    const destination = process.argv[2];
    if (destination) {
      const file = path.resolve(destination);
      fs.writeFileSync(file, `${JSON.stringify(release, null, 2)}\n`, { flag: "wx" });
      console.log(`Release and explorer Standard JSON input saved: ${file}`);
    }
    console.log(`Compiler: ${release.compilerVersion}\nInput hash: ${release.compilerInputHash}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { compile };
