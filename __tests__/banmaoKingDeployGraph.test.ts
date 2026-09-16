const { deployKingGraph } = require("../tools/deploy-king-graph.cjs");

test("deploys each dependency once and passes the ten renderer addresses in order", async () => {
  const calls: Array<{ name: string; args: unknown[]; address: string }> = [];
  const graph = await deployKingGraph(async (name: string, args: unknown[]) => {
    const address = `0x${(calls.length + 1).toString(16).padStart(40, "0")}`;
    const known = new Set(calls.map(call => call.address));
    for (const value of args.flat()) expect(known.has(value as string)).toBe(true);
    calls.push({ name, args, address });
    return { address };
  });
  expect(new Set(calls.map(call => call.name)).size).toBe(calls.length);
  expect(calls.at(-1)?.name).toBe("BanmaoKingRenderer");
  expect(graph.rendererArgs).toEqual([
    "BanmaoKingBodyLib", "BanmaoKingExpressionLib", "BanmaoKingAccessoryLib",
    "BanmaoKingBackgroundExpansion", "BanmaoKingMotionPart0", "BanmaoKingMotionPart1",
    "BanmaoKingSecondaryMotion", "BanmaoKingArtUpgrade", "BanmaoKingBackgroundEffects",
    "BanmaoKingDiamondRays",
  ].map(name => graph.nodes[name].address));
  expect(calls.find(call => call.name === "BanmaoKingAccessoryLib")?.args).toHaveLength(2);
  expect(calls.find(call => call.name === "BanmaoKingBackgroundEffects")?.args[0]).toHaveLength(3);
  expect(calls.find(call => call.name === "BanmaoKingBackgroundExpansion")?.args[0]).toHaveLength(3);
  expect(calls.find(call => call.name === "BanmaoKingSecondaryMotion")?.args[0]).toHaveLength(21);
});

test("accepts persisted address strings from a deployment journal", async () => {
  let next = 0;
  const graph = await deployKingGraph(async () => `0x${(++next).toString(16).padStart(40, "0")}`);
  expect(typeof graph.renderer).toBe("string");
  expect(graph.rendererArgs).toHaveLength(10);
  expect(graph.rendererArgs[0]).toBe(graph.body);
});
