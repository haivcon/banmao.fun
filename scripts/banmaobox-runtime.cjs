"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { keccak_256 } = require("js-sha3");

const BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES = Object.freeze({
  "contracts/BanmaoBox/Renderer/BanmaoBoxRenderer.sol": "contracts/banmaobox/BanmaoBoxRenderer.sol",
  "contracts/BanmaoBox/Box/BanmaoBox.sol": "contracts/banmaobox/BanmaoBox.sol",
  "contracts/BanmaoBox/Factory/BanmaoBoxFactory.sol": "contracts/banmaobox/BanmaoBoxFactory.sol",
  "contracts/BanmaoBox/Mock/MockBanmao.sol": "contracts/banmaobox/MockBanmao.sol",
});
const BANMAOBOX_VIRTUAL_TO_PHYSICAL_SOURCE_NAMES = Object.freeze(Object.fromEntries(
  Object.entries(BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES).map(([physical, virtual]) => [virtual, physical]),
));
const BANMAOBOX_RELEASE_SOURCE_NAMES = Object.freeze([
  "contracts/banmaobox/BanmaoBoxRenderer.sol",
  "contracts/banmaobox/BanmaoBox.sol",
  "contracts/banmaobox/BanmaoBoxFactory.sol",
]);
const BANMAOBOX_VIRTUAL_SOURCE_NAMES = Object.freeze({
  renderer: "contracts/banmaobox/BanmaoBoxRenderer.sol",
  box: "contracts/banmaobox/BanmaoBox.sol",
  factory: "contracts/banmaobox/BanmaoBoxFactory.sol",
  mock: "contracts/banmaobox/MockBanmao.sol",
});

function explorerContractName(key, contractName) {
  const sourceName = BANMAOBOX_VIRTUAL_SOURCE_NAMES[key];
  if (!sourceName) throw new Error(`Unknown BanmaoBox source key: ${key}`);
  return `${sourceName}:${contractName}`;
}

function physicalSourceName(virtualSourceName) {
  return BANMAOBOX_VIRTUAL_TO_PHYSICAL_SOURCE_NAMES[virtualSourceName] || virtualSourceName;
}

function sourceFile(virtualSourceName) {
  if (!virtualSourceName.startsWith("@")) return physicalSourceName(virtualSourceName);
  try {
    return require.resolve(virtualSourceName, { paths: [process.cwd()] });
  } catch {
    return path.join("node_modules", virtualSourceName);
  }
}

function virtualSourceContent(virtualSourceName) {
  let content = fs.readFileSync(sourceFile(virtualSourceName), "utf8");
  if (virtualSourceName === "contracts/banmaobox/BanmaoBox.sol") {
    content = content.replace('from "../Renderer/BanmaoBoxRenderer.sol";', 'from "./BanmaoBoxRenderer.sol";');
  } else if (virtualSourceName === "contracts/banmaobox/BanmaoBoxFactory.sol") {
    content = content
      .replace('from "../Box/BanmaoBox.sol";', 'from "./BanmaoBox.sol";')
      .replace('from "../Renderer/BanmaoBoxRenderer.sol";', 'from "./BanmaoBoxRenderer.sol";');
  }
  return content;
}

function collectBanmaoBoxSources(entryNames = BANMAOBOX_RELEASE_SOURCE_NAMES) {
  const collected = {};
  const visit = (virtualSourceName) => {
    if (collected[virtualSourceName]) return;
    const file = sourceFile(virtualSourceName);
    if (!fs.existsSync(file)) throw new Error(`Import not found: ${virtualSourceName}`);
    const content = virtualSourceContent(virtualSourceName);
    collected[virtualSourceName] = { content };
    for (const match of content.matchAll(/import\s+(?:[^"']*?from\s+)?["']([^"']+)["']\s*;/g)) {
      const imported = match[1].startsWith(".")
        ? path.posix.normalize(path.posix.join(path.posix.dirname(virtualSourceName), match[1]))
        : match[1];
      visit(imported);
    }
  };
  entryNames.forEach(visit);
  return collected;
}

function createBanmaoBoxCompilerInput({
  entryNames = BANMAOBOX_RELEASE_SOURCE_NAMES,
  outputSelection,
  metadata = { bytecodeHash: "ipfs" },
} = {}) {
  return {
    language: "Solidity",
    sources: collectBanmaoBoxSources(entryNames),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
      ...(metadata ? { metadata } : {}),
      outputSelection: outputSelection || {
        "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] },
      },
    },
  };
}

function keccak256(code) {
  return `0x${keccak_256(Buffer.from(code.slice(2), "hex"))}`;
}

function immutableRanges(artifact) {
  return Object.values(artifact.evm.deployedBytecode.immutableReferences || {}).flat();
}

function normalizeRuntime(code, artifact) {
  if (!/^0x[0-9a-fA-F]*$/.test(code) || code.length % 2 !== 0) {
    throw new Error("Runtime bytecode is not valid hex");
  }
  const bytes = Buffer.from(code.slice(2), "hex");
  for (const { start, length } of immutableRanges(artifact)) {
    if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 0 || start + length > bytes.length) {
      throw new Error("Compiler immutable reference is outside runtime bytecode");
    }
    bytes.fill(0, start, start + length);
  }
  return `0x${bytes.toString("hex")}`;
}

function artifactRuntime(artifact) {
  return `0x${artifact.evm.deployedBytecode.object}`;
}

function runtimeFingerprint(code, artifact) {
  const normalized = normalizeRuntime(code, artifact);
  return {
    bytes: (code.length - 2) / 2,
    keccak256: keccak256(code),
    normalizedKeccak256: keccak256(normalized),
  };
}

function artifactFingerprint(artifact) {
  return runtimeFingerprint(artifactRuntime(artifact), artifact);
}

function assertArtifactRuntime(code, artifact, label) {
  const expectedCode = artifactRuntime(artifact);
  const observed = runtimeFingerprint(code, artifact);
  const expected = runtimeFingerprint(expectedCode, artifact);
  if (observed.bytes !== expected.bytes || observed.normalizedKeccak256 !== expected.normalizedKeccak256) {
    throw new Error(`${label} runtime does not match the compiled release artifact`);
  }
  return observed;
}

module.exports = {
  BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES,
  BANMAOBOX_RELEASE_SOURCE_NAMES,
  BANMAOBOX_VIRTUAL_SOURCE_NAMES,
  artifactFingerprint,
  assertArtifactRuntime,
  collectBanmaoBoxSources,
  createBanmaoBoxCompilerInput,
  explorerContractName,
  immutableRanges,
  normalizeRuntime,
  physicalSourceName,
  runtimeFingerprint,
};
