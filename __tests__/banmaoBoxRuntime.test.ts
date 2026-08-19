const {
  BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES,
  artifactFingerprint,
  assertArtifactRuntime,
  normalizeRuntime,
  runtimeFingerprint,
} = require("../scripts/banmaobox-runtime.cjs");

function artifact(runtime: string, references: Array<{ start: number; length: number }> = []) {
  return {
    evm: {
      deployedBytecode: {
        object: runtime,
        immutableReferences: references.length ? { slot: references } : {},
      },
    },
  };
}

describe("BanmaoBox runtime artifact verification", () => {
  test("keeps legacy virtual source names separate from physical paths", () => {
    expect(BANMAOBOX_PHYSICAL_TO_VIRTUAL_SOURCE_NAMES["contracts/BanmaoBox/Box/BanmaoBox.sol"]).toBe(
      "contracts/banmaobox/BanmaoBox.sol",
    );
  });

  test("normalizes compiler-declared immutable ranges only", () => {
    const compiled = artifact("6000000055", [{ start: 1, length: 3 }]);
    const observed = "0x60aabbcc55";
    expect(normalizeRuntime(observed, compiled)).toBe("0x6000000055");
    expect(artifactFingerprint(compiled).normalizedKeccak256).toBe(
      runtimeFingerprint(observed, compiled).normalizedKeccak256,
    );
    expect(assertArtifactRuntime(observed, compiled, "Box")).toEqual(runtimeFingerprint(observed, compiled));
  });

  test("rejects changes outside immutable ranges and invalid references", () => {
    const compiled = artifact("6000000055", [{ start: 1, length: 3 }]);
    expect(() => assertArtifactRuntime("0x61aabbcc55", compiled, "Box")).toThrow(
      "Box runtime does not match the compiled release artifact",
    );
    expect(() => normalizeRuntime("0x6000", artifact("6000", [{ start: 2, length: 1 }]))).toThrow(
      "Compiler immutable reference is outside runtime bytecode",
    );
  });
});
