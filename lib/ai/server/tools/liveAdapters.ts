import "server-only";
import { z } from "zod";
import { createPublicClient, http } from "viem";
import { xLayer } from "viem/chains";
import { ERC20_ABI, STAKING_ABI, STAKING_CONTRACT_ADDRESS } from "../../../../app/defi/staking/contracts";
import { BANMAOFOMO_ABI } from "../../../../app/gamefi/banmaofomo/lib/abis";
import { BANMAOFOMO_ADDRESS, BANMAO_ADDRESS } from "../../../../app/gamefi/banmaofomo/lib/constants";
import { RPS_ABI } from "../../../../app/gamefi/banmaorps/lib/abis";
import { RPS_ADDRESS } from "../../../../app/gamefi/banmaorps/lib/constants";
import { SLOTS_ABI, SLOTS_CONTRACT_ADDRESS } from "../../../../app/gamefi/banmaoslots/lib/abis";
import { SNAKE_ABI } from "../../../../app/gamefi/banmaosnake/lib/abis";
import { SNAKE_CONTRACT_ADDRESS } from "../../../../app/gamefi/banmaosnake/lib/constants";
import { okxFetch as realOkxFetch } from "../../../okx/okxClient";
import { readCollectionPrompts, readCollectionQuests, readCollectionSearch } from "../../../collection/server/readers";
import type { ToolDescriptor } from "../toolRegistry";
import banmaoBoxDeployment from "../../../../deployments/banmaobox-xlayer-mainnet.json";

type Address = `0x${string}`;
type ReadContract = (parameters: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[]; blockNumber?: bigint }) => Promise<unknown>;
type OkxFetch = typeof realOkxFetch;
type InternalRead = (name: string, args: Record<string, unknown>) => Promise<unknown>;
type CollectionRead = (name: "search" | "prompts" | "quests", args: Record<string, unknown>) => Promise<unknown>;
type GetBalance = (parameters: { address: Address; blockNumber?: bigint }) => Promise<bigint>;
const publicClient = createPublicClient({ chain: xLayer, transport: http(process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech") });
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/).transform((value) => value.toLowerCase() as Address);
const chainSchema = z.object({ chainId: z.literal(196) }).strict();
const walletChainSchema = z.object({ chainId: z.literal(196), wallet: addressSchema.optional() }).strict();
const tokenSchema = z.object({ chainId: z.literal(196), tokenAddress: addressSchema, limit: z.number().int().min(1).max(20).default(10) }).strict();
const now = () => new Date().toISOString();
const normalize = (value: unknown): unknown => typeof value === "bigint" ? value.toString() : Array.isArray(value) ? value.map(normalize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)])) : value;
const available = (value: unknown, source: string, blockNumber?: bigint) => ({ status: "available" as const, value: normalize(value), source, observedAt: now(), asOf: blockNumber ? `block:${blockNumber}` : now(), ...(blockNumber ? { blockNumber: blockNumber.toString() } : {}) });
const unavailable = (reason: string, source: string) => ({ status: "unavailable" as const, reason, source, observedAt: now(), asOf: now() });
function descriptor<T>(input: Omit<ToolDescriptor<T>, "timeoutMs" | "maxBytes">): ToolDescriptor<T> { return { ...input, timeoutMs: 8_000, maxBytes: 32_000 }; }
function parameters(properties: Record<string, unknown>, required: string[] = []) { return { type: "object", additionalProperties: false, properties, ...(required.length ? { required } : {}) }; }
async function okx(okxFetch: OkxFetch, method: string, path: string, body?: unknown) {
  const response = await okxFetch(method, path, { cache: "no-store", signal: AbortSignal.timeout(8_000), headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  if (Buffer.byteLength(text) > 32_000) throw new Error("OKX response too large");
  const payload = JSON.parse(text);
  if (!response.ok || payload?.code !== "0" || !Array.isArray(payload.data)) throw new Error("OKX unavailable");
  return payload.data;
}
async function defaultInternalRead(name: string, args: Record<string, unknown>) {
  const db = await import("../../../db");
  if (name === "airdrop.stats") return db.getAirdropStats(typeof args.token === "string" ? args.token : undefined);
  if (name === "airdrop.history") return db.getAirdropHistory(String(args.wallet), Number(args.limit));
  if (name === "hub.profile") return db.getHubProfile(String(args.wallet));
  if (name === "hub.posts") return db.getHubPosts(Number(args.limit), 0, typeof args.wallet === "string" ? args.wallet : undefined);
  throw new Error("Internal source unavailable");
}
async function defaultCollectionRead(name: "search" | "prompts" | "quests", args: Record<string, unknown>) {
  if (name === "search") return readCollectionSearch(args);
  if (name === "prompts") return readCollectionPrompts(args);
  const { db } = await import("../../../db");
  return readCollectionQuests(args, {
    strictFailures: true,
    execute: async (query) => {
      const result = await db.execute(query);
      return { rows: result.rows as unknown as Array<Record<string, unknown>> };
    },
  });
}

export function createDomainToolDescriptors(dependencies: { readContract?: ReadContract; getBalance?: GetBalance; okxFetch?: OkxFetch; internalRead?: InternalRead; collectionRead?: CollectionRead } = {}): ToolDescriptor[] {
  const readContract: ReadContract = dependencies.readContract || ((parameters) => publicClient.readContract(parameters as never));
  const getBalance: GetBalance = dependencies.getBalance || ((parameters) => publicClient.getBalance(parameters));
  const okxFetch = dependencies.okxFetch || realOkxFetch;
  const internalRead = dependencies.internalRead || defaultInternalRead;
  const collectionRead = dependencies.collectionRead || defaultCollectionRead;
  const block = () => dependencies.readContract ? Promise.resolve(undefined) : publicClient.getBlockNumber();
  const tools: ToolDescriptor[] = [];

  tools.push(descriptor({ name: "defi.staking", description: "Read BANMAO staking protocol and optional wallet stake state", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["chainId"]), contexts: ["defi"], auth: "public", parse: (v) => walletChainSchema.parse(v), async execute(args) {
    try {
      const [totalStaked, totalShares, rewardBucket, paused, blockNumber] = await Promise.all(["totalStaked", "totalShares", "rewardBucket", "paused"].map((functionName) => readContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName })).concat([block()]));
      let wallet: unknown;
      if (args.wallet) {
        const [summary, stakeIds, pendingRewards] = await Promise.all([
          readContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "userSummary", args: [args.wallet] }),
          readContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "getUserStakeIds", args: [args.wallet] }),
          readContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pendingRewards", args: [args.wallet] }),
        ]);
        wallet = { address: args.wallet, summary, stakeIds, pendingRewards };
      }
      return available({ totalStaked, totalShares, rewardBucket, paused, contract: STAKING_CONTRACT_ADDRESS, ...(wallet ? { wallet } : {}) }, "xlayer:196:banmao-staking", blockNumber as bigint | undefined);
    } catch { return unavailable("X Layer staking RPC read failed", "xlayer:196:banmao-staking"); }
  }}));

  const portfolioSchema = z.object({ chainId: z.literal(196), wallet: addressSchema }).strict();
  tools.push(descriptor({ name: "defi.portfolio", description: "Aggregate a supplied X Layer wallet's native balance, BANMAO balance, staking position, and public Hub profile from approved read-only sources", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["chainId", "wallet"]), contexts: ["defi", "landing"], auth: "public", cacheTtlMs: 15_000, parse: (v) => portfolioSchema.parse(v), async execute(args) {
    const blockNumber = await block().catch(() => undefined);
    const reads = await Promise.allSettled([
      getBalance({ address: args.wallet, ...(blockNumber ? { blockNumber } : {}) }),
      readContract({ address: BANMAO_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [args.wallet], ...(blockNumber ? { blockNumber } : {}) }),
      Promise.all(["userSummary", "getUserStakeIds", "pendingRewards"].map((functionName) => readContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName, args: [args.wallet], ...(blockNumber ? { blockNumber } : {}) }))),
      internalRead("hub.profile", { wallet: args.wallet }),
    ]);
    const names = ["nativeBalance", "banmaoBalance", "staking", "hubProfile"] as const;
    const sources = reads.map((entry, index) => entry.status === "fulfilled" ? { name: names[index], status: "available" as const, value: normalize(entry.value) } : { name: names[index], status: "unavailable" as const, reason: "Approved source unavailable" });
    const availableCount = sources.filter((source) => source.status === "available").length;
    return { status: availableCount ? "available" as const : "unavailable" as const, value: { wallet: args.wallet, chainId: 196, sources }, partial: availableCount !== sources.length, source: "aggregate:xlayer:196:wallet-portfolio", observedAt: now(), asOf: blockNumber ? `block:${blockNumber}` : now(), ...(blockNumber ? { blockNumber: blockNumber.toString() } : {}) };
  }}));

  tools.push(descriptor({ name: "defi.burn", description: "Read BANMAO balances at the two approved burn addresses", parameters: parameters({ chainId: { type: "integer", const: 196 } }, ["chainId"]), contexts: ["defi", "landing"], auth: "public", parse: (v) => chainSchema.parse(v), async execute() {
    try {
      const burnAddresses = ["0x000000000000000000000000000000000000dead", "0x0000000000000000000000000000000000000000"] as const;
      const [balances, blockNumber] = await Promise.all([Promise.all(burnAddresses.map((address) => readContract({ address: BANMAO_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }))), block()]);
      const burnedRaw = balances.reduce<bigint>((sum, value) => sum + BigInt(String(value)), 0n);
      return available({ burnedRaw, balances: burnAddresses.map((address, index) => ({ address, balance: balances[index] })), token: BANMAO_ADDRESS }, "xlayer:196:banmao-burn-address-balances", blockNumber);
    } catch { return unavailable("BANMAO burn balance RPC read failed", "xlayer:196:banmao-burn-address-balances"); }
  }}));

  const airdropSchema = z.object({ chainId: z.literal(196), wallet: addressSchema.optional(), tokenAddress: addressSchema.optional(), limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "defi.airdrop", description: "Read stored airdrop status/statistics and optional wallet history; never sends an airdrop", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, tokenAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["chainId"]), contexts: ["defi"], auth: "public", parse: (v) => airdropSchema.parse(v), async execute(args) {
    try { return available({ stats: await internalRead("airdrop.stats", { token: args.tokenAddress }), ...(args.wallet ? { history: await internalRead("airdrop.history", { wallet: args.wallet, limit: args.limit }) } : {}) }, "internal-db:airdrop-records"); }
    catch { return unavailable("Airdrop database read unavailable", "internal-db:airdrop-records"); }
  }}));
  tools.push(descriptor({ name: "defi.box", description: "Read BanmaoBox deployment availability", parameters: parameters({ chainId: { type: "integer", const: 196 } }, ["chainId"]), contexts: ["defi"], auth: "public", parse: (v) => chainSchema.parse(v), async execute() { return available({ chainId: banmaoBoxDeployment.chainId, status: banmaoBoxDeployment.status, contracts: banmaoBoxDeployment.contracts }, "deployment:banmaobox-xlayer-mainnet"); } }));

  tools.push(descriptor({ name: "gamefi.fomo", description: "Read current BanMaoFomo round, jackpot, timers and configuration", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["chainId"]), contexts: ["gamefi"], auth: "public", parse: (v) => walletChainSchema.parse(v), async execute(args) {
    try {
      const currentRound = await readContract({ address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_ABI, functionName: "currentRound" });
      const names = ["rounds", "jackpotPool", "seedFundNextRound", "paused", "activeConfig", "getTopAttackers"] as const;
      const [round, jackpotPool, seedFundNextRound, paused, activeConfig, topAttackers, blockNumber] = await Promise.all(names.map((functionName) => readContract({ address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_ABI, functionName, ...(["rounds", "getTopAttackers"].includes(functionName) ? { args: [currentRound] } : {}) })).concat([block()]));
      const wallet = args.wallet ? await readContract({ address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_ABI, functionName: "getUserStats", args: [args.wallet] }) : undefined;
      return available({ currentRound, round, jackpotPool, seedFundNextRound, paused, activeConfig, topAttackers, contract: BANMAOFOMO_ADDRESS, ...(wallet ? { wallet: { address: args.wallet, stats: wallet } } : {}) }, "xlayer:196:banmaofomo-v11", blockNumber as bigint | undefined);
    } catch { return unavailable("BanMaoFomo RPC read failed", "xlayer:196:banmaofomo-v11"); }
  }}));
  const slotsSchema = z.object({ chainId: z.literal(196), wallet: addressSchema.optional(), poolId: z.number().int().min(0).optional() }).strict();
  tools.push(descriptor({ name: "gamefi.slots", description: "Read BanmaoSlots multi-pool state: active pools, platform config, and optional player/pool stats", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, poolId: { type: "integer", minimum: 0 } }, ["chainId"]), contexts: ["gamefi"], auth: "public", parse: (v) => slotsSchema.parse(v), async execute(args) {
    try {
      const names = ["paused", "activePoolCount", "platformPoolId", "platformEarnings"] as const;
      const [paused, activePoolCount, platformPoolId, platformEarnings, activePools, blockNumber] = await Promise.all(names.map((functionName) => readContract({ address: SLOTS_CONTRACT_ADDRESS, abi: SLOTS_ABI, functionName })).concat([
        readContract({ address: SLOTS_CONTRACT_ADDRESS, abi: SLOTS_ABI, functionName: "getActivePoolsPaginated", args: [0, 10] }),
        block(),
      ]));
      let pool: unknown;
      let poolStats: unknown;
      let playerPoolStats: unknown;
      if (args.poolId !== undefined) {
        [pool, poolStats] = await Promise.all([
          readContract({ address: SLOTS_CONTRACT_ADDRESS, abi: SLOTS_ABI, functionName: "getPool", args: [args.poolId] }),
          readContract({ address: SLOTS_CONTRACT_ADDRESS, abi: SLOTS_ABI, functionName: "getPoolStats", args: [args.poolId] }),
        ]);
        if (args.wallet) playerPoolStats = await readContract({ address: SLOTS_CONTRACT_ADDRESS, abi: SLOTS_ABI, functionName: "getPlayerPoolStats", args: [args.poolId, args.wallet] });
      }
      return available({ paused, activePoolCount, platformPoolId, platformEarnings, activePools, contract: SLOTS_CONTRACT_ADDRESS, ...(args.poolId !== undefined ? { poolId: args.poolId, pool, poolStats } : {}), ...(args.wallet && args.poolId !== undefined ? { wallet: { address: args.wallet, playerPoolStats } } : {}) }, "xlayer:196:banmaoslots-v2", blockNumber as bigint | undefined);
    } catch { return unavailable("BanmaoSlots RPC read failed", "xlayer:196:banmaoslots-v2"); }
  }}));

  tools.push(descriptor({ name: "gamefi.snake", description: "Read BanmaoSnake reward contract state: caps, paused status, and optional wallet claim data", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["chainId"]), contexts: ["gamefi"], auth: "public", parse: (v) => walletChainSchema.parse(v), async execute(args) {
    try {
      const names = ["paused", "dailyPlayerCap", "hourlySignerCap", "hourlySignedAmount", "minClaimAmount", "maxClaimPerGame", "minDonationForListing", "totalDonatedAmount", "getTotalDonors"] as const;
      const [paused, dailyPlayerCap, hourlySignerCap, hourlySignedAmount, minClaimAmount, maxClaimPerGame, minDonationForListing, totalDonatedAmount, totalDonors, blockNumber] = await Promise.all(names.map((functionName) => readContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName })).concat([block()]));
      const wallet = args.wallet ? await Promise.all(["nonces", "userWithdrawals", "donatedAmount"].map((functionName) => readContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName, args: [args.wallet] }))) : undefined;
      return available({ paused, dailyPlayerCap, hourlySignerCap, hourlySignedAmount, minClaimAmount, maxClaimPerGame, minDonationForListing, totalDonatedAmount, totalDonors, contract: SNAKE_CONTRACT_ADDRESS, ...(wallet ? { wallet: { address: args.wallet, nonce: wallet[0], withdrawals: wallet[1], donatedAmount: wallet[2] } } : {}) }, "xlayer:196:banmaosnake-v6", blockNumber as bigint | undefined);
    } catch { return unavailable("BanmaoSnake RPC read failed", "xlayer:196:banmaosnake-v6"); }
  }}));

  const rpsSchema = z.object({ chainId: z.literal(196), roomId: z.number().int().min(1).optional() }).strict();
  tools.push(descriptor({ name: "gamefi.rps", description: "Read BanmaoRPS on-chain game state: total rooms, fee config, and optional room detail by roomId", parameters: parameters({ chainId: { type: "integer", const: 196 }, roomId: { type: "integer", minimum: 1 } }, ["chainId"]), contexts: ["gamefi"], auth: "public", parse: (v) => rpsSchema.parse(v), async execute(args) {
    try {
      const names = ["nextRoomId", "communityWallet", "deadWallet", "token"] as const;
      const [nextRoomId, communityWallet, deadWallet, token, blockNumber] = await Promise.all(names.map((functionName) => readContract({ address: RPS_ADDRESS, abi: RPS_ABI, functionName })).concat([block()]));
      let room: unknown;
      if (args.roomId !== undefined) {
        room = await readContract({ address: RPS_ADDRESS, abi: RPS_ABI, functionName: "rooms", args: [BigInt(args.roomId)] });
      }
      return available({ nextRoomId, totalRoomsCreated: nextRoomId ? Number(nextRoomId as bigint) - 1 : 0, communityWallet, deadWallet, token, feeBp: 200, contract: RPS_ADDRESS, ...(room ? { room: { roomId: args.roomId, ...normalize(room) as object } } : {}) }, "xlayer:196:banmaorps", blockNumber as bigint | undefined);
    } catch { return unavailable("BanmaoRPS RPC read failed", "xlayer:196:banmaorps"); }
  }}));

  const marketDefinitions = [
    ["market.price", "POST", "/api/v6/dex/market/price", "okx:dex-market-price"],
    ["market.tokenInfo", "POST", "/api/v6/dex/market/token/basic-info", "okx:dex-token-basic-info"],
    ["market.trades", "GET", "/api/v6/dex/market/trades", "okx:dex-market-trades"],
    ["market.holders", "GET", "/api/v6/dex/market/token/holder", "okx:dex-token-holder"],
  ] as const;
  for (const [name, method, endpoint, source] of marketDefinitions) tools.push(descriptor({ name, description: `Read ${name.slice(7)} from the existing server-side OKX client`, parameters: parameters({ chainId: { type: "integer", const: 196 }, tokenAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["chainId", "tokenAddress"]), contexts: ["landing", "defi", "gamefi", "collection"], auth: "public", parse: (v) => tokenSchema.parse(v), async execute(args) {
    try {
      const query = `?chainIndex=196&tokenContractAddress=${args.tokenAddress}&limit=${args.limit}`;
      const data = method === "POST" ? await okx(okxFetch, method, endpoint, [{ chainIndex: "196", tokenContractAddress: args.tokenAddress }]) : await okx(okxFetch, method, endpoint + query);
      return available(data.slice(0, args.limit), source);
    } catch { return unavailable("OKX DEX market read failed", source); }
  }}));
  const hotSchema = z.object({ chainId: z.literal(196), limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "market.hot", description: "Read X Layer hot tokens from OKX", parameters: parameters({ chainId: { type: "integer", const: 196 }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["chainId"]), contexts: ["landing", "defi", "gamefi", "collection"], auth: "public", parse: (v) => hotSchema.parse(v), async execute(args) { try { return available((await okx(okxFetch, "GET", "/api/v6/dex/market/token/hot-token?chainIndex=196")).slice(0, args.limit), "okx:dex-hot-token"); } catch { return unavailable("OKX hot-token read failed", "okx:dex-hot-token"); } } }));
  tools.push(descriptor({ name: "market.discovery", description: "Read X Layer token discovery inventory from the approved OKX all-tokens endpoint", parameters: parameters({ chainId: { type: "integer", const: 196 }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["chainId"]), contexts: ["landing", "defi", "gamefi", "collection"], auth: "public", parse: (v) => hotSchema.parse(v), async execute(args) { try { return available((await okx(okxFetch, "GET", "/api/v6/dex/aggregator/all-tokens?chainIndex=196")).slice(0, args.limit), "okx:dex-all-tokens"); } catch { return unavailable("OKX token discovery read failed", "okx:dex-all-tokens"); } } }));

  const hubProfileSchema = z.object({ wallet: addressSchema }).strict();
  tools.push(descriptor({ name: "collection.hubProfile", description: "Read a public BanmaoHub profile for a supplied wallet", parameters: parameters({ wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["wallet"]), contexts: ["collection"], auth: "public", parse: (v) => hubProfileSchema.parse(v), async execute(args) { try { return available(await internalRead("hub.profile", args), "internal-db:hub-profile"); } catch { return unavailable("Hub profile database read unavailable", "internal-db:hub-profile"); } } }));
  const postsSchema = z.object({ wallet: addressSchema.optional(), limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "collection.hubPosts", description: "Read public BanmaoHub posts", parameters: parameters({ wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }), contexts: ["collection"], auth: "public", parse: (v) => postsSchema.parse(v), async execute(args) { try { return available(await internalRead("hub.posts", args), "internal-db:hub-posts"); } catch { return unavailable("Hub posts database read unavailable", "internal-db:hub-posts"); } } }));
  const collectionFolderSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/);
  const collectionSearchSchema = z.object({ query: z.string().trim().min(1).max(200), folder: collectionFolderSchema.optional(), limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "collection.search", description: "Deterministic metadata-semantic Collection search over filenames, folders, tags, and context; it does not inspect image pixels", parameters: parameters({ query: { type: "string", minLength: 1, maxLength: 200 }, folder: { type: "string", minLength: 1, maxLength: 160, pattern: "^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["query"]), contexts: ["collection"], auth: "public", parse: (v) => collectionSearchSchema.parse(v), async execute(args) { try { return available(await collectionRead("search", args), "cloudinary:collection-search"); } catch { return unavailable("Collection search Cloudinary read unavailable or CLOUDINARY_URL is missing", "cloudinary:collection-search"); } } }));
  const collectionPromptsSchema = z.object({ folder: collectionFolderSchema, limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "collection.prompts", description: "Read bounded collection prompts and share links from allowlisted Cloudinary raw resources", parameters: parameters({ folder: { type: "string", minLength: 1, maxLength: 160, pattern: "^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["folder"]), contexts: ["collection"], auth: "public", parse: (v) => collectionPromptsSchema.parse(v), async execute(args) { try { return available(await collectionRead("prompts", args), "cloudinary:collection-prompts"); } catch { return unavailable("Collection prompts Cloudinary read unavailable or CLOUDINARY_URL is missing", "cloudinary:collection-prompts"); } } }));
  const collectionQuestsSchema = z.object({ wallet: addressSchema }).strict();
  tools.push(descriptor({ name: "collection.quests", description: "Read public BanmaoHub quest progress using SELECT-only database queries", parameters: parameters({ wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["wallet"]), contexts: ["collection"], auth: "public", parse: (v) => collectionQuestsSchema.parse(v), async execute(args) { try { return available(await collectionRead("quests", args), "internal-db:hub-quests"); } catch { return unavailable("Hub quest database read unavailable", "internal-db:hub-quests"); } } }));
  return tools;
}
