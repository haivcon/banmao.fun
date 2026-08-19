"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const {
  artifactFingerprint,
  createBanmaoBoxCompilerInput,
} = require("./banmaobox-runtime.cjs");

// Legacy virtual compiler source directory; this is not a physical path.
const VIRTUAL_SOURCE_DIR = "contracts/banmaobox";
const OUTPUT = path.resolve("deployments/banmaobox-release-artifacts.json");
const VERIFICATION_OUTPUT = path.resolve("lib/banmaobox/verification-release.json");
const VERSIONED_OUTPUT_DIR = path.resolve("deployments/banmaobox-releases");
const sha256 = (value) => `0x${crypto.createHash("sha256").update(value).digest("hex")}`;

const input = createBanmaoBoxCompilerInput();
const standardInput = JSON.stringify(input);
const output = JSON.parse(solc.compile(standardInput));
const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
const artifact = (file, name) => output.contracts[`${VIRTUAL_SOURCE_DIR}/${file}`][name];
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
  contractName: `${VIRTUAL_SOURCE_DIR}/BanmaoBox.sol:BanmaoBox`,
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
