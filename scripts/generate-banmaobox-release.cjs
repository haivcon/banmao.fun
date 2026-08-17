"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { artifactFingerprint } = require("./banmaobox-runtime.cjs");

const SOURCE_DIR = "contracts/banmaobox";
const SOURCES = ["BanmaoBoxRenderer.sol", "BanmaoBox.sol", "BanmaoBoxFactory.sol"];
const OUTPUT = path.resolve("deployments/banmaobox-release-artifacts.json");
const VERIFICATION_OUTPUT = path.resolve("lib/banmaobox/verification-release.json");
const VERSIONED_OUTPUT_DIR = path.resolve("deployments/banmaobox-releases");
const sha256 = (value) => `0x${crypto.createHash("sha256").update(value).digest("hex")}`;

function sourceFile(sourceName) {
  return sourceName.startsWith("@")
    ? path.join("node_modules", sourceName)
    : sourceName;
}

function collectSources(entryNames) {
  const collected = {};
  const visit = (sourceName) => {
    if (collected[sourceName]) return;
    const file = sourceFile(sourceName);
    if (!fs.existsSync(file)) throw new Error(`Import not found: ${sourceName}`);
    const content = fs.readFileSync(file, "utf8");
    collected[sourceName] = { content };
    const imports = content.matchAll(/import\s+(?:[^"']*?from\s+)?["']([^"']+)["']\s*;/g);
    for (const match of imports) {
      const imported = match[1].startsWith(".")
        ? path.posix.normalize(path.posix.join(path.posix.dirname(sourceName), match[1]))
        : match[1];
      visit(imported);
    }
  };
  entryNames.forEach(visit);
  return collected;
}

const entryNames = SOURCES.map((file) => `${SOURCE_DIR}/${file}`);
const sources = collectSources(entryNames);
const input = {
  language: "Solidity", sources,
  settings: {
    optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai",
    metadata: { bytecodeHash: "ipfs" },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } },
  },
};
const standardInput = JSON.stringify(input);
const output = JSON.parse(solc.compile(standardInput));
const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
const artifact = (file, name) => output.contracts[`${SOURCE_DIR}/${file}`][name];
const artifacts = {
  renderer: artifact("BanmaoBoxRenderer.sol", "BanmaoBoxRenderer"),
  factory: artifact("BanmaoBoxFactory.sol", "BanmaoBoxFactory"),
  box: artifact("BanmaoBox.sol", "BanmaoBox"),
};
const release = {
  schemaVersion: 1,
  compiler: solc.version(),
  compilerInputHash: sha256(standardInput),
  optimizerRuns: 200,
  evmVersion: "shanghai",
  runtime: Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, artifactFingerprint(value)])),
};
const verificationRelease = {
  schemaVersion: 1,
  compiler: solc.version(),
  compilerInputHash: release.compilerInputHash,
  contractName: `${SOURCE_DIR}/BanmaoBox.sol:BanmaoBox`,
  standardInput,
  box: {
    runtime: release.runtime.box,
    immutableReferences: artifacts.box.evm.deployedBytecode.immutableReferences,
  },
};
fs.mkdirSync(path.dirname(VERIFICATION_OUTPUT), { recursive: true });
fs.mkdirSync(VERSIONED_OUTPUT_DIR, { recursive: true });
const releaseName = `${release.compilerInputHash.slice(2)}.json`;
const versionedOutput = path.join(VERSIONED_OUTPUT_DIR, releaseName);
fs.writeFileSync(OUTPUT, `${JSON.stringify(release, null, 2)}\n`);
fs.writeFileSync(versionedOutput, `${JSON.stringify(release, null, 2)}\n`);
fs.writeFileSync(VERIFICATION_OUTPUT, `${JSON.stringify(verificationRelease)}\n`);
console.log(`Generated candidate ${OUTPUT}, immutable release ${versionedOutput}, and ${VERIFICATION_OUTPUT}`);
