import { createPublicClient, decodeEventLog, encodeAbiParameters, getAddress, http, keccak256, parseAbi, parseAbiItem, type Address, type Hex } from "viem";
import { db } from "../db";
import { OkxVerifierAmbiguousError, OkxXLayerVerifierApi } from "./okxVerifierApi";
import release from "./verification-releases/39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143.json";
import manifest from "../../deployments/banmaobox-xlayer-mainnet.json";

const CHAIN_ID = 196;
const RPC_URL = process.env.XLAYER_RPC_URL || manifest.rpcUrl;
const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const INDEX_DELAY_MS = positiveInteger(process.env.BANMAOBOX_VERIFY_INDEX_DELAY_MS, 60_000);
const MAX_ATTEMPTS = positiveInteger(process.env.BANMAOBOX_VERIFY_MAX_ATTEMPTS, 3);
const RECONCILIATION_DEADLINE_MS = positiveInteger(
  process.env.BANMAOBOX_VERIFY_RECONCILIATION_DEADLINE_MS,
  10 * 60_000,
);
const factoryAbi = parseAbi([
  "event TokenBoxCreated(address indexed token, address indexed box, address indexed creator)",
  "event DefaultRendererUpdated(address indexed previousRenderer, address indexed newRenderer)",
  "function boxForToken(address token) view returns (address)",
  "function isTokenBox(address box) view returns (bool)",
  "function defaultRenderer() view returns (address)",
]);
const boxAbi = parseAbi([
  "function underlyingToken() view returns (address)",
  "function renderer() view returns (address)",
  "function rendererAdmin() view returns (address)",
]);
const client = createPublicClient({ transport: http(RPC_URL, { timeout: 30_000 }) });
const api = new OkxXLayerVerifierApi();
let tableReady: Promise<void> | undefined;

type Job = { txHash: string; boxAddress: string; guid?: string; status: string; attempts: number; updatedAt: number };
export type VerificationResult =
  | { status: "already-verified" | "verified"; boxAddress: Address; guid?: string }
  | { status: "pending" | "waiting-for-indexer" | "transient-unavailable"; boxAddress: Address; guid?: string; retryAfterMs: number }
  | { status: "failed" | "retry-exhausted" | "manual-reconciliation"; boxAddress: Address; guid?: string };

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
function compilerVersion(value: string) {
  const match = value.match(/^(\d+\.\d+\.\d+\+commit\.[0-9a-fA-F]+)/);
  if (!match) throw new Error("Verification release has an unsupported compiler version");
  return `v${match[1]}`;
}
function normalizeRuntime(code: Hex): Hex {
  const bytes = Buffer.from(code.slice(2), "hex");
  const references = Object.values(release.box.immutableReferences).flat() as Array<{ start: number; length: number }>;
  for (const { start, length } of references) {
    if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || start + length > bytes.length) {
      throw new Error("Verification release contains invalid immutable references");
    }
    bytes.fill(0, start, start + length);
  }
  return `0x${bytes.toString("hex")}`;
}
function assertReleaseGate() {
  if (manifest.chainId !== CHAIN_ID || manifest.status !== "deployed") {
    throw new Error("BanmaoBox mainnet Factory deployment is invalid");
  }
  if (manifest.compilerInputHash !== release.compilerInputHash) {
    throw new Error("Factory deployment and verification release do not match");
  }
  JSON.parse(release.standardInput);
}

export function rendererAtCreationTransaction(
  previousBlockRenderer: Address,
  updates: ReadonlyArray<{ transactionIndex: number; newRenderer: Address }>,
  creationTransactionIndex: number,
): Address {
  return updates
    .filter((update) => update.transactionIndex < creationTransactionIndex)
    .sort((left, right) => left.transactionIndex - right.transactionIndex)
    .reduce((renderer, update) => getAddress(update.newRenderer), getAddress(previousBlockRenderer));
}

async function ensureTable() {
  tableReady ??= db.execute(`CREATE TABLE IF NOT EXISTS banmaobox_verification_jobs (
    tx_hash TEXT PRIMARY KEY, box_address TEXT NOT NULL, guid TEXT, status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`).then(() => undefined);
  return tableReady;
}
async function readJob(txHash: string): Promise<Job | undefined> {
  await ensureTable();
  const result = await db.execute({ sql: "SELECT tx_hash, box_address, guid, status, attempts, updated_at FROM banmaobox_verification_jobs WHERE tx_hash = ?", args: [txHash] });
  const row = result.rows[0];
  if (!row) return undefined;
  return { txHash: String(row.tx_hash), boxAddress: String(row.box_address), guid: row.guid == null ? undefined : String(row.guid), status: String(row.status), attempts: Number(row.attempts), updatedAt: Number(row.updated_at) };
}

async function saveJob(job: Job, error?: string, expectedStatus?: string) {
  await ensureTable();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO banmaobox_verification_jobs (tx_hash, box_address, guid, status, attempts, last_error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tx_hash) DO UPDATE SET
      box_address=excluded.box_address, guid=COALESCE(banmaobox_verification_jobs.guid, excluded.guid),
      status=excluded.status, attempts=MAX(banmaobox_verification_jobs.attempts, excluded.attempts),
      last_error=excluded.last_error, updated_at=excluded.updated_at
      WHERE banmaobox_verification_jobs.box_address=excluded.box_address
        AND (excluded.status='verified' OR (
          banmaobox_verification_jobs.status != 'verified'
          AND banmaobox_verification_jobs.status != 'manual-reconciliation'
          AND (? IS NULL OR banmaobox_verification_jobs.status=?)
        ))
        AND (banmaobox_verification_jobs.guid IS NULL OR excluded.guid IS NULL OR banmaobox_verification_jobs.guid=excluded.guid)`,
    args: [
      job.txHash, job.boxAddress, job.guid ?? null, job.status, job.attempts,
      error ?? null, now, now, expectedStatus ?? null, expectedStatus ?? null,
    ],
  });
}

export async function testPersistVerificationJob(job: Job, expectedStatus?: string) {
  await saveJob(job, undefined, expectedStatus);
}

export async function testReadVerificationJob(txHash: string) {
  return readJob(txHash);
}
async function acquireSubmitLock(job: Job) {
  const now = Date.now();
  await ensureTable();
  await db.execute({
    sql: `INSERT OR IGNORE INTO banmaobox_verification_jobs (tx_hash, box_address, status, attempts, created_at, updated_at)
      VALUES (?, ?, 'ready', 0, ?, ?)`, args: [job.txHash, job.boxAddress, now, now],
  });
  const result = await db.execute({
    sql: `UPDATE banmaobox_verification_jobs SET status='submitting', attempts=attempts+1, updated_at=?
      WHERE tx_hash=? AND guid IS NULL AND attempts < ? AND status IN ('ready', 'failed', 'waiting-for-indexer')`,
    args: [now, job.txHash, MAX_ATTEMPTS],
  });
  return result.rowsAffected === 1;
}

async function validateTransaction(txHash: Hex) {
  const [chainId, transaction, receipt] = await Promise.all([
    client.getChainId(), client.getTransaction({ hash: txHash }), client.getTransactionReceipt({ hash: txHash }),
  ]);
  if (chainId !== CHAIN_ID) throw new Error(`Wrong RPC chain: ${chainId}`);
  if (receipt.status !== "success") throw new Error("Factory transaction receipt is not successful");
  const factoryAddress = getAddress(manifest.contracts.factory);
  if (!transaction.to || !sameAddress(transaction.to, factoryAddress)) {
    throw new Error("Transaction was not sent to the deployed BanmaoBox Factory");
  }
  const events = receipt.logs.flatMap((log) => {
    if (!sameAddress(log.address, factoryAddress)) return [];
    try {
      const decoded = decodeEventLog({ abi: factoryAbi, eventName: "TokenBoxCreated", data: log.data, topics: log.topics });
      return [decoded.args];
    } catch { return []; }
  });
  if (events.length !== 1) throw new Error("Receipt must contain exactly one TokenBoxCreated event");
  const tokenAddress = getAddress(events[0].token);
  const boxAddress = getAddress(events[0].box);
  const [previousBlockRenderer, rendererUpdateLogs] = await Promise.all([
    client.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "defaultRenderer",
      blockNumber: receipt.blockNumber - 1n,
    } as never) as Promise<Address>,
    client.getLogs({
      address: factoryAddress,
      event: parseAbiItem("event DefaultRendererUpdated(address indexed previousRenderer, address indexed newRenderer)"),
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
      strict: true,
    }),
  ]);
  const factoryRenderer = rendererAtCreationTransaction(
    previousBlockRenderer,
    rendererUpdateLogs.map((log) => ({
      transactionIndex: log.transactionIndex ?? Number.MAX_SAFE_INTEGER,
      newRenderer: getAddress(log.args.newRenderer),
    })),
    receipt.transactionIndex,
  );
  const [
    registeredBox,
    registered,
    underlying,
    rendererAdmin,
    code,
    block,
  ] = await Promise.all([
    client.readContract({ address: factoryAddress, abi: factoryAbi, functionName: "boxForToken", args: [tokenAddress], blockNumber: receipt.blockNumber } as never) as Promise<Address>,
    client.readContract({ address: factoryAddress, abi: factoryAbi, functionName: "isTokenBox", args: [boxAddress], blockNumber: receipt.blockNumber } as never) as Promise<boolean>,
    client.readContract({ address: boxAddress, abi: boxAbi, functionName: "underlyingToken", blockNumber: receipt.blockNumber } as never) as Promise<Address>,
    client.readContract({ address: boxAddress, abi: boxAbi, functionName: "rendererAdmin", blockNumber: receipt.blockNumber } as never) as Promise<Address>,
    client.getBytecode({ address: boxAddress, blockNumber: receipt.blockNumber }), client.getBlock({ blockNumber: receipt.blockNumber }),
  ]);
  if (!registered || !sameAddress(registeredBox, boxAddress)) throw new Error("Factory registry does not contain the emitted Box");
  if (!sameAddress(rendererAdmin, manifest.deployer)) throw new Error("Renderer admin does not match the deployment manifest");
  if (!sameAddress(underlying, tokenAddress)) throw new Error("Box underlying token does not match TokenBoxCreated");
  if (!code || code === "0x") throw new Error("BanmaoBox runtime bytecode is missing");
  const fingerprint = release.box.runtime;
  if ((code.length - 2) / 2 !== fingerprint.bytes || keccak256(normalizeRuntime(code)) !== fingerprint.normalizedKeccak256) {
    throw new Error("BanmaoBox runtime does not match the verification release");
  }
  return {
    tokenAddress,
    boxAddress,
    renderer: getAddress(factoryRenderer),
    rendererAdmin,
    blockTimeMs: Number(block.timestamp) * 1000,
  };
}

export async function verifyNewBanmaoBox(txHash: Hex): Promise<VerificationResult> {
  assertReleaseGate();
  const normalizedHash = txHash.toLowerCase();
  const validated = await validateTransaction(txHash);
  const storedJob = await readJob(normalizedHash);
  let job = storedJob ?? {
    txHash: normalizedHash,
    boxAddress: validated.boxAddress.toLowerCase(),
    status: "ready",
    attempts: 0,
    updatedAt: 0,
  };
  if (!sameAddress(job.boxAddress, validated.boxAddress)) throw new Error("Stored verification job does not match receipt event");
  // Persist the validated Factory event before any Explorer call. This durable seed
  // keeps the collection discoverable even when OKX is unavailable on the first try.
  if (!storedJob) await saveJob(job);

  try {
    if (await api.isVerified(validated.boxAddress)) {
      await saveJob({ ...job, status: "verified" }, undefined, job.status);
      return { status: "already-verified", boxAddress: validated.boxAddress, guid: job.guid };
    }
  } catch {
    return { status: "transient-unavailable", boxAddress: validated.boxAddress, guid: job.guid, retryAfterMs: 30_000 };
  }
  if (job.guid) {
    if (Date.now() >= job.updatedAt + RECONCILIATION_DEADLINE_MS) {
      await saveJob(
        { ...job, status: "manual-reconciliation" },
        "Explorer did not provide verification proof before the reconciliation deadline",
        job.status,
      );
      return { status: "manual-reconciliation", boxAddress: validated.boxAddress, guid: job.guid };
    }
    try {
      const polled = await api.poll(job.guid);
      if (polled === "verified") {
        await saveJob({ ...job, status: "verified" }, undefined, job.status);
        return { status: "verified", boxAddress: validated.boxAddress, guid: job.guid };
      }
      if (polled === "pending") {
        return { status: "pending", boxAddress: validated.boxAddress, guid: job.guid, retryAfterMs: 15_000 };
      }
      await saveJob({ ...job, status: "failed" }, "Explorer returned Fail", job.status);
      return { status: "failed", boxAddress: validated.boxAddress, guid: job.guid };
    } catch (error) {
      const retryAfterMs = error instanceof OkxVerifierAmbiguousError ? 30_000 : 15_000;
      return { status: "transient-unavailable", boxAddress: validated.boxAddress, guid: job.guid, retryAfterMs };
    }
  }

  const remainingDelay = INDEX_DELAY_MS - (Date.now() - validated.blockTimeMs);
  if (remainingDelay > 0) {
    await saveJob({ ...job, status: "waiting-for-indexer" }, undefined, job.status);
    return { status: "waiting-for-indexer", boxAddress: validated.boxAddress, retryAfterMs: remainingDelay };
  }
  if (job.status === "manual-reconciliation") {
    return { status: "manual-reconciliation", boxAddress: validated.boxAddress };
  }
  if (job.status === "submitting" || job.status === "submission-unknown") {
    const deadline = job.updatedAt + RECONCILIATION_DEADLINE_MS;
    if (Date.now() >= deadline) {
      await saveJob(
        { ...job, status: "manual-reconciliation" },
        "Ambiguous Explorer submission requires manual reconciliation",
        job.status,
      );
      return { status: "manual-reconciliation", boxAddress: validated.boxAddress };
    }
    return {
      status: "transient-unavailable",
      boxAddress: validated.boxAddress,
      retryAfterMs: Math.min(30_000, Math.max(1_000, deadline - Date.now())),
    };
  }
  if (job.attempts >= MAX_ATTEMPTS) {
    return { status: "retry-exhausted", boxAddress: validated.boxAddress };
  }
  if (!await acquireSubmitLock(job)) {
    return { status: "pending", boxAddress: validated.boxAddress, retryAfterMs: 5_000 };
  }

  const lockedJob = await readJob(normalizedHash);
  if (!lockedJob || lockedJob.status !== "submitting") {
    return { status: "transient-unavailable", boxAddress: validated.boxAddress, retryAfterMs: 30_000 };
  }
  try {
    const constructorArguments = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "address" }],
      [validated.tokenAddress, validated.renderer, validated.rendererAdmin],
    ).slice(2);
    const guid = await api.submit({
      contractAddress: validated.boxAddress,
      sourceCode: release.standardInput,
      contractName: release.contractName,
      compilerVersion: compilerVersion(release.compiler),
      constructorArguments,
    });
    job = { ...lockedJob, guid, status: "pending", updatedAt: Date.now() };
    await saveJob(job, undefined, "submitting");
    return { status: "pending", boxAddress: validated.boxAddress, guid, retryAfterMs: 15_000 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OKX verifier submission outcome is unknown";
    await saveJob({ ...lockedJob, status: "submission-unknown" }, message, "submitting");
    return { status: "transient-unavailable", boxAddress: validated.boxAddress, retryAfterMs: 30_000 };
  }
}

