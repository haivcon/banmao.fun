import "server-only";
import { z } from "zod";
import { createPublicClient, http } from "viem";
import { xLayer } from "viem/chains";
import { ERC20_ABI, STAKING_ABI, STAKING_CONTRACT_ADDRESS } from "../../../../app/defi/staking/contracts";
import { BANMAOFOMO_ABI } from "../../../../app/gamefi/banmaofomo/lib/abis";
import { BANMAOFOMO_ADDRESS, BANMAO_ADDRESS } from "../../../../app/gamefi/banmaofomo/lib/constants";
import { okxFetch as realOkxFetch } from "../../../okx/okxClient";
import { readCollectionPrompts, readCollectionQuests, readCollectionSearch } from "../../../collection/server/readers";
import type { ToolDescriptor } from "../toolRegistry";

type Address = `0x${string}`;
type ReadContract = (parameters: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[]; blockNumber?: bigint }) => Promise<unknown>;
type OkxFetch = typeof realOkxFetch;
type InternalRead = (name: string, args: Record<string, unknown>) => Promise<unknown>;
type CollectionRead = (name: "search" | "prompts" | "quests", args: Record<string, unknown>) => Promise<unknown>;
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

export function createDomainToolDescriptors(dependencies: { readContract?: ReadContract; okxFetch?: OkxFetch; internalRead?: InternalRead; collectionRead?: CollectionRead } = {}): ToolDescriptor[] {
  const readContract: ReadContract = dependencies.readContract || ((parameters) => publicClient.readContract(parameters as never));
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
  tools.push(descriptor({ name: "defi.box", description: "Read BanmaoBox deployment availability", parameters: parameters({ chainId: { type: "integer", const: 196 } }, ["chainId"]), contexts: ["defi"], auth: "public", parse: (v) => chainSchema.parse(v), async execute() { return unavailable("deployments/banmaobox-xlayer-mainnet.json has deployed=false and address=null", "deployment:banmaobox-xlayer-mainnet"); } }));

  tools.push(descriptor({ name: "gamefi.fomo", description: "Read current BanMaoFomo round, jackpot, timers and configuration", parameters: parameters({ chainId: { type: "integer", const: 196 }, wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["chainId"]), contexts: ["gamefi"], auth: "public", parse: (v) => walletChainSchema.parse(v), async execute(args) {
    try {
      const currentRound = await readContract({ address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_ABI, functionName: "currentRound" });
      const names = ["rounds", "jackpotPool", "seedFundNextRound", "paused", "activeConfig", "getTopAttackers"] as const;
      const [round, jackpotPool, seedFundNextRound, paused, activeConfig, topAttackers, blockNumber] = await Promise.all(names.map((functionName) => readContract({ address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_ABI, functionName, ...(["rounds", "getTopAttackers"].includes(functionName) ? { args: [currentRound] } : {}) })).concat([block()]));
      const wallet = args.wallet ? await readContract({ address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_ABI, functionName: "getUserStats", args: [args.wallet] }) : undefined;
      return available({ currentRound, round, jackpotPool, seedFundNextRound, paused, activeConfig, topAttackers, contract: BANMAOFOMO_ADDRESS, ...(wallet ? { wallet: { address: args.wallet, stats: wallet } } : {}) }, "xlayer:196:banmaofomo-v11", blockNumber as bigint | undefined);
    } catch { return unavailable("BanMaoFomo RPC read failed", "xlayer:196:banmaofomo-v11"); }
  }}));
  tools.push(descriptor({ name: "gamefi.pk", description: "Report BanMaoPK mainnet capability", parameters: parameters({ chainId: { type: "integer", const: 196 } }, ["chainId"]), contexts: ["gamefi"], auth: "public", parse: (v) => chainSchema.parse(v), async execute() { return unavailable("The only PK address is explicitly labelled X Layer Testnet/keep testnet; no chain-196 deployment manifest exists", "repo:app/gamefi/banmaopk/lib/constants.ts"); } }));

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
  const collectionSearchSchema = z.object({ query: z.string().trim().min(1).max(200), folder: collectionFolderSchema.default("banmao"), limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "collection.search", description: "Search collection media using the existing deterministic Cloudinary fuzzy matcher", parameters: parameters({ query: { type: "string", minLength: 1, maxLength: 200 }, folder: { type: "string", minLength: 1, maxLength: 160, pattern: "^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["query"]), contexts: ["collection"], auth: "public", parse: (v) => collectionSearchSchema.parse(v), async execute(args) { try { return available(await collectionRead("search", args), "cloudinary:collection-search"); } catch { return unavailable("Collection search Cloudinary read unavailable or CLOUDINARY_URL is missing", "cloudinary:collection-search"); } } }));
  const collectionPromptsSchema = z.object({ folder: collectionFolderSchema, limit: z.number().int().min(1).max(20).default(10) }).strict();
  tools.push(descriptor({ name: "collection.prompts", description: "Read bounded collection prompts and share links from allowlisted Cloudinary raw resources", parameters: parameters({ folder: { type: "string", minLength: 1, maxLength: 160, pattern: "^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["folder"]), contexts: ["collection"], auth: "public", parse: (v) => collectionPromptsSchema.parse(v), async execute(args) { try { return available(await collectionRead("prompts", args), "cloudinary:collection-prompts"); } catch { return unavailable("Collection prompts Cloudinary read unavailable or CLOUDINARY_URL is missing", "cloudinary:collection-prompts"); } } }));
  const collectionQuestsSchema = z.object({ wallet: addressSchema }).strict();
  tools.push(descriptor({ name: "collection.quests", description: "Read public BanmaoHub quest progress using SELECT-only database queries", parameters: parameters({ wallet: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" } }, ["wallet"]), contexts: ["collection"], auth: "public", parse: (v) => collectionQuestsSchema.parse(v), async execute(args) { try { return available(await collectionRead("quests", args), "internal-db:hub-quests"); } catch { return unavailable("Hub quest database read unavailable", "internal-db:hub-quests"); } } }));
  return tools;
}
