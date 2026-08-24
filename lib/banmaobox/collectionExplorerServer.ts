import "server-only";

import { createPublicClient, decodeEventLog, getAddress, http, isAddress, parseAbi, parseAbiItem, zeroAddress, type Address, type Hash, type Hex } from "viem";
import mainnetManifest from "../../deployments/banmaobox-xlayer-mainnet.json";
import testnetManifest from "../../deployments/banmaobox-xlayer-testnet.json";
import collectionSeeds from "./collection-seeds.json";
import { buildCollectionVerification, runtimeMatchesBanmaoBoxRelease } from "../../app/defi/box/explorer/verification";
import type { BanmaoBoxActivity, BanmaoBoxCollection, CollectionDetailResponse, CollectionExplorerResponse, CollectionSort, FactoryLineageEntry } from "../../app/defi/box/explorer/types";
import { buildTokenIdentity } from "../../app/defi/box/tokenIdentity";
import { db } from "../db";

const factoryAbi = parseAbi([
  "event TokenBoxCreated(address indexed token, address indexed box, address indexed creator)",
  "function previousFactory() view returns (address)", "function rendererAdmin() view returns (address)",
  "function boxForToken(address token) view returns (address)", "function isTokenBox(address box) view returns (bool)",
]);
const boxAbi = parseAbi([
  "function underlyingToken() view returns (address)", "function renderer() view returns (address)",
  "function rendererAdmin() view returns (address)", "function tokenSymbol() view returns (string)",
  "function tokenDecimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)", "function totalTokensLocked() view returns (uint256)",
]);
const erc20MetadataAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);
const creationEvent = parseAbiItem("event TokenBoxCreated(address indexed token, address indexed box, address indexed creator)");
const mintEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)");
const CACHE_TTL_MS = 60_000;
const BLOCK_CHUNK = BigInt(process.env.BANMAOBOX_LOG_BLOCK_CHUNK || "100");
const INITIAL_SCAN_BLOCKS = BigInt(process.env.BANMAOBOX_INITIAL_SCAN_BLOCKS || "2000");
const SCAN_CONCURRENCY = 8;
const REORG_WINDOW = 12n, MAX_FACTORIES = 16, MAX_ACTIVITY = 12;

type SupportedChain = 196 | 1952;
type Manifest = { chainId: number; rpcUrl: string; status: string; contracts: { factory?: string }; transactions?: { factory?: string; createTokenBox?: string } };
type Creation = { token: Address; box: Address; creator: Address; factory: FactoryLineageEntry; transactionHash: Hash; blockNumber: bigint; logIndex: number };
type MintLog = { args: { tokenId: bigint; to: Address }; transactionHash: Hash; blockNumber: bigint };
type Snapshot = { observedAt: string; latestBlock: bigint; lineage: FactoryLineageEntry[]; collections: BanmaoBoxCollection[] };
const manifests: Record<SupportedChain, Manifest> = { 196: mainnetManifest as Manifest, 1952: testnetManifest as Manifest };
const cache = new Map<number, { expiresAt: number; value: Promise<Snapshot> }>();

export function isCollectionExplorerChain(value: number): value is SupportedChain { return value === 196 || value === 1952; }
function config(chainId: SupportedChain) {
  const manifest = manifests[chainId];
  if (manifest.status !== "deployed" || !manifest.contracts.factory || !isAddress(manifest.contracts.factory)) throw new Error("BanmaoBox Factory is not deployed on this network");
  const rpcUrl = chainId === 196
    ? process.env.XLAYER_MAINNET_RPC_URL || process.env.XLAYER_RPC_URL || process.env.NEXT_PUBLIC_XLAYER_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || manifest.rpcUrl
    : process.env.XLAYER_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_URL || manifest.rpcUrl;
  return { manifest, rpcUrl, factory: getAddress(manifest.contracts.factory) };
}
function publicClient(chainId: SupportedChain) {
  return createPublicClient({ transport: http(config(chainId).rpcUrl, { batch: false, retryCount: 2, timeout: 20_000 }) });
}
type ExplorerClient = ReturnType<typeof publicClient>;
async function deploymentBlock(client: ExplorerClient, manifest: Manifest): Promise<bigint> {
  const hash = manifest.transactions?.factory;
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return 0n;
  return (await client.getTransactionReceipt({ hash: hash as Hash })).blockNumber;
}
async function readLineage(client: ExplorerClient, root: Address): Promise<FactoryLineageEntry[]> {
  const lineage: FactoryLineageEntry[] = [], seen = new Set<string>();
  let current = root;
  for (let depth = 0; depth < MAX_FACTORIES; depth += 1) {
    const key = current.toLowerCase();
    if (seen.has(key)) throw new Error("BanmaoBox Factory lineage contains a cycle");
    seen.add(key);
    const [admin, predecessor] = await Promise.all([
      client.readContract({ address: current, abi: factoryAbi, functionName: "rendererAdmin" } as never) as Promise<Address>,
      client.readContract({ address: current, abi: factoryAbi, functionName: "previousFactory" } as never) as Promise<Address>,
    ]);
    const previous = getAddress(predecessor);
    lineage.push({ address: current, depth, source: depth === 0 ? "current" : "predecessor", rendererAdmin: getAddress(admin), ...(previous !== zeroAddress ? { previousFactory: previous } : {}) });
    if (previous === zeroAddress) return lineage;
    current = previous;
  }
  throw new Error("BanmaoBox Factory lineage exceeds the supported depth");
}


function uniqueCreations(creations: Creation[]) {
  const unique = new Map<string, Creation>();
  for (const creation of creations) unique.set(`${creation.transactionHash}:${creation.logIndex}`, creation);
  return [...unique.values()];
}

async function receiptCreations(client: ExplorerClient, hash: Hash, lineage: FactoryLineageEntry[], expectedBox?: string) {
  const receipt = await client.getTransactionReceipt({ hash });
  const creations: Creation[] = [];
  for (const log of receipt.logs) {
    const factory = lineage.find((entry) => entry.address.toLowerCase() === log.address.toLowerCase());
    if (!factory) continue;
    try {
      const decoded = decodeEventLog({ abi: [creationEvent], data: log.data, topics: log.topics, strict: true }) as {
        eventName: "TokenBoxCreated";
        args: { token: Address; box: Address; creator: Address };
      };
      const box = getAddress(decoded.args.box);
      if (expectedBox && box.toLowerCase() !== expectedBox.toLowerCase()) continue;
      creations.push({
        token: getAddress(decoded.args.token), box, creator: getAddress(decoded.args.creator),
        factory, transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber, logIndex: log.logIndex ?? 0,
      });
    } catch { /* The receipt can contain unrelated logs. */ }
  }
  return creations;
}

async function manifestCreations(client: ExplorerClient, chainId: SupportedChain, manifest: Manifest, lineage: FactoryLineageEntry[]) {
  const configured = collectionSeeds[String(chainId) as keyof typeof collectionSeeds] ?? [];
  const hashes = new Set<string>([manifest.transactions?.createTokenBox ?? "", ...configured]);
  const valid = [...hashes].filter((hash): hash is Hash => /^0x[0-9a-fA-F]{64}$/.test(hash));
  const receipts = await Promise.allSettled(valid.map((hash) => receiptCreations(client, hash, lineage)));
  return uniqueCreations(receipts.flatMap((result) => result.status === "fulfilled" ? result.value : []));
}

async function verifiedJobCreations(client: ExplorerClient, chainId: SupportedChain, lineage: FactoryLineageEntry[]) {
  if (chainId !== 196) return [];
  try {
    const result = await db.execute("SELECT tx_hash, box_address FROM banmaobox_verification_jobs");
    const jobs = result.rows.flatMap((row) => {
      const hash = String(row.tx_hash ?? ""), box = String(row.box_address ?? "");
      return /^0x[0-9a-fA-F]{64}$/.test(hash) && isAddress(box) ? [{ hash: hash as Hash, box }] : [];
    });
    const receipts = await Promise.allSettled(jobs.map((job) => receiptCreations(client, job.hash, lineage, job.box)));
    return uniqueCreations(receipts.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  } catch (error) {
    console.warn("BanmaoBox verified collection seed unavailable", error);
    return [];
  }
}

async function scanCreations(client: ExplorerClient, lineage: FactoryLineageEntry[], fromBlock: bigint, toBlock: bigint) {
  if (fromBlock > toBlock) return [];
  const jobs: Array<{ factory: FactoryLineageEntry; start: bigint; end: bigint }> = [];
  for (const factory of lineage) {
    for (let start = fromBlock; start <= toBlock; start += BLOCK_CHUNK) {
      jobs.push({ factory, start, end: start + BLOCK_CHUNK - 1n > toBlock ? toBlock : start + BLOCK_CHUNK - 1n });
    }
  }
  const creations: Creation[] = [];
  let failedChunks = 0;
  for (let offset = 0; offset < jobs.length; offset += SCAN_CONCURRENCY) {
    const batches = await Promise.allSettled(jobs.slice(offset, offset + SCAN_CONCURRENCY).map(async ({ factory, start, end }) => {
      const logs = await client.getLogs({ address: factory.address, event: creationEvent, fromBlock: start, toBlock: end, strict: true });
      return logs.flatMap((log): Creation[] => !log.transactionHash || log.blockNumber === null ? [] : [{
        token: getAddress(log.args.token), box: getAddress(log.args.box), creator: getAddress(log.args.creator), factory,
        transactionHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.logIndex ?? 0,
      }]);
    }));
    for (const batch of batches) {
      if (batch.status === "fulfilled") creations.push(...batch.value);
      else failedChunks += 1;
    }
  }
  if (failedChunks) console.warn(`BanmaoBox collection scan will retry ${failedChunks} RPC chunk(s)`);
  return uniqueCreations(creations);
}

async function readLiveTokenMetadata(client: ExplorerClient, token: Address) {
  const results = await Promise.allSettled([
    client.readContract({ address: token, abi: erc20MetadataAbi, functionName: "name" } as never) as Promise<string>,
    client.readContract({ address: token, abi: erc20MetadataAbi, functionName: "symbol" } as never) as Promise<string>,
    client.readContract({ address: token, abi: erc20MetadataAbi, functionName: "decimals" } as never) as Promise<number>,
  ]);
  return {
    name: results[0].status === "fulfilled" ? results[0].value : undefined,
    symbol: results[1].status === "fulfilled" ? results[1].value : undefined,
    decimals: results[2].status === "fulfilled" ? results[2].value : undefined,
  };
}

async function hydrateCollection(client: ExplorerClient, chainId: SupportedChain, rootFactory: Address, creation: Creation, attempt = 0): Promise<BanmaoBoxCollection | null> {
  try {
    const [underlying, renderer, rendererAdmin, symbol, decimals, liveMetadata, totalSupply, totalLocked, registryBox, registered, factoryAdmin, code, block] = await Promise.all([
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "underlyingToken" } as never) as Promise<Address>,
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "renderer" } as never) as Promise<Address>,
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "rendererAdmin" } as never) as Promise<Address>,
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "tokenSymbol" } as never) as Promise<string>,
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "tokenDecimals" } as never) as Promise<number>,
      readLiveTokenMetadata(client, creation.token),
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "totalSupply" } as never) as Promise<bigint>,
      client.readContract({ address: creation.box, abi: boxAbi, functionName: "totalTokensLocked" } as never) as Promise<bigint>,
      client.readContract({ address: rootFactory, abi: factoryAbi, functionName: "boxForToken", args: [creation.token] } as never) as Promise<Address>,
      client.readContract({ address: rootFactory, abi: factoryAbi, functionName: "isTokenBox", args: [creation.box] } as never) as Promise<boolean>,
      client.readContract({ address: creation.factory.address, abi: factoryAbi, functionName: "rendererAdmin" } as never) as Promise<Address>,
      client.getBytecode({ address: creation.box }) as Promise<Hex | undefined>, client.getBlock({ blockNumber: creation.blockNumber }),
    ]);
    const verification = buildCollectionVerification({ emittedToken: creation.token, underlying: getAddress(underlying), emittedBox: creation.box, registryBox: getAddress(registryBox), registered, rendererAdmin: getAddress(rendererAdmin), factoryRendererAdmin: getAddress(factoryAdmin), runtimeMatchesRelease: runtimeMatchesBanmaoBoxRelease(code), factorySource: creation.factory.source });
    const identity = buildTokenIdentity({
      address: creation.token,
      collectionAddress: creation.box,
      canonicalAddress: creation.token,
      liveName: liveMetadata.name,
      liveSymbol: liveMetadata.symbol,
      storedSymbol: symbol,
      decimals: liveMetadata.decimals ?? decimals,
    }, "TOKEN");
    return {
      chainId, tokenAddress: creation.token, boxAddress: creation.box, creator: creation.creator,
      factoryAddress: creation.factory.address, factoryDepth: creation.factory.depth, transactionHash: creation.transactionHash,
      blockNumber: creation.blockNumber.toString(), logIndex: creation.logIndex, createdAt: new Date(Number(block.timestamp) * 1000).toISOString(),
      name: identity.name, symbol: identity.symbol, decimals: identity.decimals,
      totalSupply: totalSupply.toString(), totalLocked: totalLocked.toString(), renderer: getAddress(renderer), rendererAdmin: getAddress(rendererAdmin), verification,
    };
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      return hydrateCollection(client, chainId, rootFactory, creation, attempt + 1);
    }
    console.error("BanmaoBox collection hydration failed", creation.box, error);
    return null;
  }
}

async function buildSnapshot(chainId: SupportedChain, previous?: Snapshot): Promise<Snapshot> {
  const client = publicClient(chainId), { manifest, factory } = config(chainId);
  const [latestBlock, firstBlock, lineage] = await Promise.all([client.getBlockNumber(), deploymentBlock(client, manifest), readLineage(client, factory)]);
  const rewindBlock = previous && previous.latestBlock > REORG_WINDOW ? previous.latestBlock - REORG_WINDOW : latestBlock > INITIAL_SCAN_BLOCKS ? latestBlock - INITIAL_SCAN_BLOCKS : firstBlock;
  const scanFrom = rewindBlock > firstBlock ? rewindBlock : firstBlock;
  const [manifestSeeded, verifiedSeeded, scanned] = await Promise.all([
    previous ? Promise.resolve([]) : manifestCreations(client, chainId, manifest, lineage),
    verifiedJobCreations(client, chainId, lineage),
    scanCreations(client, lineage, scanFrom, latestBlock),
  ]);
  const creations = uniqueCreations([...manifestSeeded, ...verifiedSeeded, ...scanned]);
  const hydrated = await Promise.all(creations.map((creation) => hydrateCollection(client, chainId, factory, creation)));
  const merged = new Map<string, BanmaoBoxCollection>();
  for (const collection of previous?.collections ?? []) {
    if (BigInt(collection.blockNumber) < scanFrom) merged.set(`${collection.transactionHash}:${collection.logIndex}`, collection);
  }
  for (const collection of hydrated) {
    if (collection) merged.set(`${collection.transactionHash}:${collection.logIndex}`, collection);
  }
  return { observedAt: new Date().toISOString(), latestBlock, lineage, collections: [...merged.values()] };
}
async function snapshot(chainId: SupportedChain, refresh = false) {
  const existing = cache.get(chainId);
  if (!refresh && existing && existing.expiresAt > Date.now()) return existing.value;
  const value = existing ? existing.value.then((previous) => buildSnapshot(chainId, previous)) : buildSnapshot(chainId);
  cache.set(chainId, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  value.catch(() => cache.delete(chainId));
  return value;
}


function compare(sort: CollectionSort) {
  return (left: BanmaoBoxCollection, right: BanmaoBoxCollection) => {
    if (sort === "supply") return left.totalSupply === right.totalSupply ? 0 : BigInt(left.totalSupply) > BigInt(right.totalSupply) ? -1 : 1;
    if (sort === "locked") return left.totalLocked === right.totalLocked ? 0 : BigInt(left.totalLocked) > BigInt(right.totalLocked) ? -1 : 1;
    const order = BigInt(right.blockNumber) - BigInt(left.blockNumber);
    return Number(sort === "oldest" ? -order : order);
  };
}

export async function listBanmaoBoxCollections(input: { chainId: SupportedChain; page: number; pageSize: number; search: string; sort: CollectionSort; refresh?: boolean; prioritizeToken?: Address }): Promise<CollectionExplorerResponse> {
  const data = await snapshot(input.chainId, input.refresh), query = input.search.trim().toLowerCase();
  const prioritizedToken = input.prioritizeToken?.toLowerCase();
  const filtered = data.collections.filter((collection) => !query || [collection.tokenAddress, collection.boxAddress, collection.creator, collection.name, collection.symbol].some((value) => value.toLowerCase().includes(query))).sort((left, right) => {
    const priority = Number(right.tokenAddress.toLowerCase() === prioritizedToken) - Number(left.tokenAddress.toLowerCase() === prioritizedToken);
    return priority || compare(input.sort)(left, right);
  });
  const pageSize = Math.min(Math.max(input.pageSize, 1), 50), totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(input.page, 1), totalPages), collections = filtered.slice((page - 1) * pageSize, page * pageSize);
  return {
    chainId: input.chainId, observedAt: data.observedAt, latestBlock: data.latestBlock.toString(), total: filtered.length, page, pageSize, totalPages,
    totals: {
      nfts: filtered.reduce((sum, item) => sum + BigInt(item.totalSupply), 0n).toString(),
      locked: filtered.reduce((sum, item) => sum + BigInt(item.totalLocked), 0n).toString(),
      verified: filtered.filter((item) => item.verification.status === "verified").length,
    }, lineage: data.lineage, collections,
  };
}

export async function getBanmaoBoxCollection(chainId: SupportedChain, address: Address, refresh = false): Promise<CollectionDetailResponse | null> {
  const data = await snapshot(chainId, refresh);
  const collection = data.collections.find((item) => item.boxAddress.toLowerCase() === address.toLowerCase());
  if (!collection) return null;
  const client = publicClient(chainId), logs: MintLog[] = [];
  const collectionBlock = BigInt(collection.blockNumber);
  const activityFrom = data.latestBlock > INITIAL_SCAN_BLOCKS ? data.latestBlock - INITIAL_SCAN_BLOCKS : collectionBlock;
  let failedActivityChunks = 0;
  for (let start = activityFrom > collectionBlock ? activityFrom : collectionBlock; start <= data.latestBlock; start += BLOCK_CHUNK) {
    const end = start + BLOCK_CHUNK - 1n > data.latestBlock ? data.latestBlock : start + BLOCK_CHUNK - 1n;
    try {
      const chunk = await client.getLogs({ address: collection.boxAddress, event: mintEvent, args: { from: zeroAddress }, fromBlock: start, toBlock: end, strict: true });
      logs.push(...chunk.map((log) => ({ args: { tokenId: log.args.tokenId, to: getAddress(log.args.to) }, transactionHash: log.transactionHash!, blockNumber: log.blockNumber! })));
      if (logs.length > MAX_ACTIVITY * 2) logs.splice(0, logs.length - MAX_ACTIVITY);
    } catch { failedActivityChunks += 1; }
  }
  if (failedActivityChunks) console.warn(`BanmaoBox activity scan will retry ${failedActivityChunks} RPC chunk(s)`);
  const recent = logs.slice(-MAX_ACTIVITY).reverse(), blocks = new Map<string, ReturnType<typeof client.getBlock>>();
  const activity: BanmaoBoxActivity[] = await Promise.all(recent.map(async (log) => {
    const number = log.blockNumber!, key = number.toString();
    if (!blocks.has(key)) blocks.set(key, client.getBlock({ blockNumber: number }));
    const block = await blocks.get(key)!;
    return { tokenId: log.args.tokenId.toString(), transactionHash: log.transactionHash!, blockNumber: key, createdAt: new Date(Number(block.timestamp) * 1000).toISOString(), to: getAddress(log.args.to) };
  }));
  return { observedAt: data.observedAt, collection, activity };
}
