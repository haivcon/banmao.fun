import { getAddress, keccak256, type Address, type Hex } from "viem";
import release from "../../../../lib/banmaobox/verification-release.json";
import type { CollectionFactorySource, CollectionVerification } from "./types";

const same = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

type RuntimeRelease = {
  runtime: { bytes: number; normalizedKeccak256?: Hex };
  immutableReferences: Record<string, Array<{ start: number; length: number }>>;
};

export function normalizeBanmaoBoxRuntime(code: Hex, artifact: RuntimeRelease = release.box as RuntimeRelease): Hex {
  const bytes = Buffer.from(code.slice(2), "hex");
  for (const references of Object.values(artifact.immutableReferences)) {
    for (const { start, length } of references) {
      if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || start + length > bytes.length) {
        throw new Error("Invalid BanmaoBox immutable reference");
      }
      bytes.fill(0, start, start + length);
    }
  }
  return `0x${bytes.toString("hex")}`;
}

export function runtimeMatchesBanmaoBoxRelease(code: Hex | undefined): boolean {
  if (!code || code === "0x") return false;
  const artifact = release.box as RuntimeRelease;
  return (
    (code.length - 2) / 2 === artifact.runtime.bytes &&
    Boolean(artifact.runtime.normalizedKeccak256) &&
    keccak256(normalizeBanmaoBoxRuntime(code, artifact)) === artifact.runtime.normalizedKeccak256
  );
}

export function buildCollectionVerification(input: {
  emittedToken: Address;
  underlying: Address;
  emittedBox: Address;
  registryBox: Address;
  registered: boolean;
  rendererAdmin: Address;
  factoryRendererAdmin: Address;
  runtimeMatchesRelease: boolean;
  factorySource: CollectionFactorySource;
}): CollectionVerification {
  const canonicalForToken = same(input.emittedBox, input.registryBox);
  const underlyingMatchesEvent = same(input.emittedToken, input.underlying);
  const rendererAdminMatchesFactory = same(input.rendererAdmin, input.factoryRendererAdmin);
  const checks = [
    { id: "registry", passed: input.registered, label: "Registered by Factory" },
    { id: "canonical", passed: canonicalForToken, label: "Canonical collection for token" },
    { id: "underlying", passed: underlyingMatchesEvent, label: "Underlying token matches creation event" },
    { id: "admin", passed: rendererAdminMatchesFactory, label: "Renderer admin matches Factory" },
    { id: "runtime", passed: input.runtimeMatchesRelease, label: "Runtime matches reviewed release" },
  ];
  const warnings = checks.filter((check) => !check.passed).map((check) => check.label);
  const critical = input.registered && canonicalForToken && underlyingMatchesEvent && rendererAdminMatchesFactory;
  return {
    status: critical && input.runtimeMatchesRelease ? "verified" : critical ? "warning" : "unverified",
    registered: input.registered,
    canonicalForToken,
    underlyingMatchesEvent,
    rendererAdminMatchesFactory,
    runtimeMatchesRelease: input.runtimeMatchesRelease,
    factorySource: input.factorySource,
    checks,
    warnings,
  };
}

export function safeAddress(value: string): Address {
  return getAddress(value);
}
