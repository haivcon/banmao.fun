"use strict";

const { ethers } = require("ethers");

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
    keccak256: ethers.utils.keccak256(code),
    normalizedKeccak256: ethers.utils.keccak256(normalized),
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
  artifactFingerprint,
  assertArtifactRuntime,
  immutableRanges,
  normalizeRuntime,
  runtimeFingerprint,
};
