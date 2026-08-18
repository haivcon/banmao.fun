import { createDomainToolDescriptors } from "../../../lib/ai/server/tools/liveAdapters";

const original = process.env;
beforeEach(() => { process.env = { ...original }; });
afterAll(() => { process.env = original; });

test("domain descriptors use only read-only module sources and preserve provenance", async () => {
  const readContract = jest.fn(async ({ functionName }: { functionName: string }) => functionName === "paused" ? false : 7n);
  const okxFetch = jest.fn(async () => new Response(JSON.stringify({ code: "0", data: [{ price: "1.2" }] }), { status: 200 }));
  const descriptors = createDomainToolDescriptors({ readContract, okxFetch });
  expect(descriptors.map((tool) => tool.name)).toEqual(expect.arrayContaining(["defi.staking", "defi.portfolio", "gamefi.fomo", "gamefi.slots", "gamefi.snake", "gamefi.rps", "market.price", "collection.search"]));
  expect(descriptors.map((tool) => tool.name)).not.toContain("gamefi.pk");
  const staking = descriptors.find((tool) => tool.name === "defi.staking")!;
  const value = await staking.execute(staking.parse({ chainId: 196 }));
  expect(value).toMatchObject({ status: "available", source: expect.stringContaining("xlayer:196") });
  expect(readContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: "totalStaked" }));
  expect(okxFetch).not.toHaveBeenCalled();
});

test("market reader uses the existing server-side OKX client boundary", async () => {
  const okxFetch = jest.fn(async () => new Response(JSON.stringify({ code: "0", data: [{ price: "1.2", liquidity: "3" }] }), { status: 200 }));
  const market = createDomainToolDescriptors({ readContract: jest.fn(), okxFetch }).find((tool) => tool.name === "market.price")!;
  const value = await market.execute(market.parse({ chainId: 196, tokenAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" }));
  expect(value).toMatchObject({ status: "available", source: "okx:dex-market-price", value: [{ price: "1.2", liquidity: "3" }] });
  expect(okxFetch).toHaveBeenCalledWith("POST", "/api/v6/dex/market/price", expect.objectContaining({ body: expect.any(String) }));
});

test("portfolio aggregates approved wallet reads and preserves partial failures", async () => {
  const wallet = "0x0000000000000000000000000000000000000001";
  const readContract = jest.fn(async ({ functionName }: { functionName: string }) => {
    if (functionName === "balanceOf") throw new Error("token RPC unavailable");
    if (functionName === "getUserStakeIds") return [1n];
    return 7n;
  });
  const tool = createDomainToolDescriptors({ readContract, getBalance: jest.fn(async () => 9n), internalRead: jest.fn(async () => ({ handle: "cat" })) }).find((item) => item.name === "defi.portfolio")!;
  expect(() => tool.parse({ chainId: 196, wallet, extra: true })).toThrow();
  const result = await tool.execute(tool.parse({ chainId: 196, wallet })) as { status: string; partial: boolean; source: string; value: { wallet: string; sources: Array<{ name: string; status: string; value?: unknown }> } };
  expect(result).toMatchObject({ status: "available", partial: true, source: "aggregate:xlayer:196:wallet-portfolio", value: { wallet } });
  expect(result.value.sources).toEqual(expect.arrayContaining([expect.objectContaining({ name: "nativeBalance", status: "available", value: "9" }), expect.objectContaining({ name: "banmaoBalance", status: "unavailable" })]));
});

test("deployed Box and failed shared collection source preserve typed evidence", async () => {
  const descriptors = createDomainToolDescriptors({ readContract: jest.fn(), okxFetch: jest.fn() });
  const box = descriptors.find((tool) => tool.name === "defi.box")!;
  const collection = descriptors.find((tool) => tool.name === "collection.search")!;
  await expect(box.execute(box.parse({ chainId: 196 }))).resolves.toMatchObject({
    status: "available",
    source: "deployment:banmaobox-xlayer-mainnet",
    value: {
      chainId: 196,
      status: "deployed",
      contracts: {
        factory: "0x01E03F6eb085f4934A3A7946545b00341B95d9E9",
        box: "0xE8247C96787119A8F7E8F8C81F58BeC5BEFC999f",
      },
    },
  });
  await expect(collection.execute(collection.parse({ query: "cat" }))).resolves.toMatchObject({ status: "unavailable", source: "cloudinary:collection-search" });
});

test("wallet-aware staking and burn tools use only validated contract reads", async () => {
  const wallet = "0x0000000000000000000000000000000000000001";
  const readContract = jest.fn(async ({ functionName }: { functionName: string }) => {
    if (functionName === "getUserStakeIds") return [1n, 2n];
    if (functionName === "userSummary") return [10n, 11n, 12n, 2, 3, 4n];
    if (functionName === "pendingRewards") return 5n;
    if (functionName === "balanceOf") return 9n;
    if (functionName === "paused") return false;
    return 7n;
  });
  const descriptors = createDomainToolDescriptors({ readContract, okxFetch: jest.fn() });
  const staking = descriptors.find((tool) => tool.name === "defi.staking")!;
  const burn = descriptors.find((tool) => tool.name === "defi.burn")!;
  await expect(staking.execute(staking.parse({ chainId: 196, wallet }))).resolves.toMatchObject({ status: "available", value: { wallet: { address: wallet, stakeIds: ["1", "2"] } } });
  await expect(burn.execute(burn.parse({ chainId: 196 }))).resolves.toMatchObject({ status: "available", value: { burnedRaw: "18" }, source: "xlayer:196:banmao-burn-address-balances" });
});

test("gamefi tools expose FOMO, Slots, Snake, and RPS read state", async () => {
  const readContract = jest.fn(async ({ functionName }: { functionName: string }) => ({ currentRound: 4n, rounds: [10n, 20n, false, "0x0000000000000000000000000000000000000001", 8n, 9n], jackpotPool: 100n, seedFundNextRound: 3n, paused: false, activeConfig: [1n,2n,3n,4n,5n,6n,7n,8n,9n] } as Record<string, unknown>)[functionName]);
  const descriptors = createDomainToolDescriptors({ readContract, okxFetch: jest.fn() });
  const fomo = descriptors.find((tool) => tool.name === "gamefi.fomo")!;
  await expect(fomo.execute(fomo.parse({ chainId: 196 }))).resolves.toMatchObject({ status: "available", value: { currentRound: "4", jackpotPool: "100", paused: false } });
  for (const [name, source] of [["gamefi.slots", "xlayer:196:banmaoslots-v2"], ["gamefi.snake", "xlayer:196:banmaosnake-v6"], ["gamefi.rps", "xlayer:196:banmaorps"]] as const) {
    const tool = descriptors.find((item) => item.name === name)!;
    await expect(tool.execute(tool.parse({ chainId: 196 }))).resolves.toMatchObject({ status: "available", source });
  }
});

test("market tools use strict allowlisted OKX endpoints without mock fallback", async () => {
  const okxFetch = jest.fn(async () => new Response(JSON.stringify({ code: "0", data: [{ tokenName: "BANMAO" }] }), { status: 200 }));
  const descriptors = createDomainToolDescriptors({ readContract: jest.fn(), okxFetch });
  for (const name of ["market.tokenInfo", "market.trades", "market.holders", "market.hot"] as const) {
    const tool = descriptors.find((item) => item.name === name)!;
    const args = name === "market.hot" ? { chainId: 196, limit: 5 } : { chainId: 196, tokenAddress: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78", limit: 5 };
    await expect(tool.execute(tool.parse(args))).resolves.toMatchObject({ status: "available", source: expect.stringMatching(/^okx:/) });
  }
});

test("collection adapters call shared readers with strict args and typed failures", async () => {
  const wallet = "0x0000000000000000000000000000000000000001";
  const collectionRead = jest.fn().mockResolvedValue({ items: [1] });
  const tools = createDomainToolDescriptors({ collectionRead });
  const cases = [
    ["collection.search", { query: "cat", folder: "banmao", limit: 2 }, "cloudinary:collection-search"],
    ["collection.prompts", { folder: "banmao/a_prompt", limit: 2 }, "cloudinary:collection-prompts"],
    ["collection.quests", { wallet }, "internal-db:hub-quests"],
  ] as const;
  for (const [name, input, source] of cases) {
    const tool = tools.find((item) => item.name === name)!;
    expect(tool).toMatchObject({ timeoutMs: 8_000, maxBytes: 32_000, contexts: ["collection"] });
    await expect(tool.execute(tool.parse(input))).resolves.toMatchObject({ status: "available", source, value: { items: [1] } });
  }
  expect(collectionRead.mock.calls.map(([name]) => name)).toEqual(["search", "prompts", "quests"]);
  expect(() => tools.find((tool) => tool.name === "collection.search")!.parse({ query: "cat", unexpected: true })).toThrow();
  expect(() => tools.find((tool) => tool.name === "collection.prompts")!.parse({ folder: "https://evil.example/x" })).toThrow();
  expect(() => tools.find((tool) => tool.name === "collection.quests")!.parse({ wallet: "0x123" })).toThrow();

  const failing = createDomainToolDescriptors({ collectionRead: jest.fn().mockRejectedValue(new Error("missing config")) });
  for (const [name, input] of cases) {
    const tool = failing.find((item) => item.name === name)!;
    await expect(tool.execute(tool.parse(input))).resolves.toMatchObject({ status: "unavailable" });
  }
});
