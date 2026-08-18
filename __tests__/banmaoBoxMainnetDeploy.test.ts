const { ethers } = require("ethers");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  assertAggregateFeeCap,
  ensureArchive,
  journalComplete,
  journalMatchesReplacementSource,
  prepareRenderer,
  replacementSource,
} = require("../scripts/deploy-banmaobox-mainnet.cjs");

const RENDERER = "0xE880e364f4a71be047cF49767313381715d57db0";
const FACTORY = "0xA6bC56E67253E13554D629579A3c018871D21F9E";
const BOX = "0x95c83831a283cDC41cd552374aD1279b2375a4ee";

function rendererArtifact(runtime = "6001600055") {
  return { abi: [], evm: { deployedBytecode: { object: runtime, immutableReferences: {} } } };
}

describe("BanmaoBox mainnet replacement deployment", () => {
  test("deploys and journals Renderer, Factory and Box in release order", () => {
    const source = readFileSync("scripts/deploy-banmaobox-mainnet.cjs", "utf8");
    const main = source.slice(source.indexOf("async function main()"), source.indexOf("if (require.main === module)"));

    expect(main).toContain("const previousFactory = ethers.constants.AddressZero");
    expect(main).toContain("const renderer = await prepareRenderer({");
    expect(main).toMatch(/prepareRenderer\([\s\S]*?deployContract\([\s\S]*?artifacts\.factory,[\s\S]*?factory\.createTokenBox/);
    expect(main).toContain("factory.createTokenBox(TOKEN, { gasLimit, ...fees })");
  });

  test("replacement deploys the candidate Renderer and resumes it from the journal", async () => {
    const deployed = { address: RENDERER };
    const deployContract = jest.fn().mockResolvedValue(deployed);
    const journal: any = { contracts: {}, transactions: {} };

    await expect(prepareRenderer({
      provider: {}, signer: {}, artifact: rendererArtifact(), journal, deployContract,
    })).resolves.toBe(deployed);
    expect(deployContract).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), [],
      "BanmaoBoxRenderer", journal, "renderer",
    );
  });

  test("requires all three release transactions for journal completion", () => {
    const complete = {
      contracts: { renderer: RENDERER, factory: FACTORY, box: BOX },
      transactions: { renderer: "0xrenderer", factory: "0xfactory", createTokenBox: "0xbox" },
    };
    expect(journalComplete(complete)).toBe(true);
    expect(journalComplete({ ...complete, transactions: { factory: "0xfactory", createTokenBox: "0xbox" } })).toBe(false);
  });

  test("persists every transaction before waiting and can recover the Box address from its receipt", () => {
    const source = readFileSync("scripts/deploy-banmaobox-mainnet.cjs", "utf8");
    const deployContract = source.slice(source.indexOf("async function deployContract"), source.indexOf("function journalComplete"));
    expect(deployContract.indexOf("journal.transactions[key] = contract.deployTransaction.hash"))
      .toBeLessThan(deployContract.indexOf("contract.deployTransaction.wait(CONFIRMATIONS)"));

    const main = source.slice(source.indexOf("async function main()"), source.indexOf("if (require.main === module)"));
    expect(main.indexOf("journal.transactions.createTokenBox = tx.hash"))
      .toBeLessThan(main.indexOf("tx.wait(CONFIRMATIONS)"));
    expect(main).toMatch(/!boxAddress && journal\.transactions\.createTokenBox[\s\S]*?waitForTransaction[\s\S]*?factory\.boxForToken\(TOKEN\)[\s\S]*?journal\.contracts\.box = boxAddress/);
  });

  test("finalizes only after validation and tolerates an archive-to-manifest resume boundary", () => {
    const source = readFileSync("scripts/deploy-banmaobox-mainnet.cjs", "utf8");
    const main = source.slice(source.indexOf("async function main()"), source.indexOf("if (require.main === module)"));
    const validation = main.indexOf("const validated = await retryRead(");
    const archive = main.indexOf("ensureArchive(archive, currentManifest)");
    const manifest = main.indexOf("atomicWrite(MANIFEST, deployment)");
    const journalRemoval = main.indexOf("fs.rmSync(JOURNAL");
    expect(validation).toBeGreaterThan(-1);
    expect(archive).toBeGreaterThan(validation);
    expect(manifest).toBeGreaterThan(archive);
    expect(journalRemoval).toBeGreaterThan(manifest);
    expect(main).toContain('archiveState === "created" ? "Archived" : "Confirmed archived"');
  });

  test("binds replacement resume to the exact source manifest deployment", () => {
    const currentManifest = {
      compilerInputHash: "0xold-release",
      contracts: { renderer: RENDERER, factory: FACTORY, box: BOX },
    };
    const journal = { replacementSource: replacementSource(currentManifest) };
    expect(journalMatchesReplacementSource(journal, currentManifest)).toBe(true);
    expect(journalMatchesReplacementSource(journal, {
      ...currentManifest,
      contracts: { ...currentManifest.contracts, factory: "0x0000000000000000000000000000000000000001" },
    })).toBe(false);
    expect(journalMatchesReplacementSource(journal, { ...currentManifest, compilerInputHash: "0xanother-release" })).toBe(false);
  });

  test("keeps an equal existing archive and rejects conflicting content", () => {
    const directory = mkdtempSync(join(tmpdir(), "banmaobox-archive-"));
    const archive = join(directory, "old.json");
    const manifest = { schemaVersion: 1, contracts: { renderer: RENDERER, factory: FACTORY, box: BOX } };
    try {
      expect(ensureArchive(archive, manifest)).toBe("created");
      expect(ensureArchive(archive, JSON.parse(JSON.stringify(manifest)))).toBe("existing-equal");
      writeFileSync(archive, `${JSON.stringify({ ...manifest, schemaVersion: 2 }, null, 2)}\n`);
      expect(() => ensureArchive(archive, manifest)).toThrow("conflicts with source manifest");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("enforces a cumulative fee cap across resumed release transactions", () => {
    const estimates = [50, 75, 100];
    const gasPrice = ethers.BigNumber.from(2);
    expect(() => assertAggregateFeeCap(estimates, gasPrice, "0.000000000000000563"))
      .toThrow("exceeds approved aggregate fee cap");
    expect(assertAggregateFeeCap(estimates, gasPrice, "0.000000000000000814", 250))
      .toEqual(ethers.BigNumber.from(814));
    expect(() => assertAggregateFeeCap(estimates, gasPrice, ""))
      .toThrow("BANMAOBOX_MAX_FEE_OKB");
  });

  test("tracks only immutable release provenance while journals stay ignored", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    const hash = "9de8225e702132fedede336deb636ffa87247dc03543ea39107bf6760d096c55";
    expect(gitignore).toContain("!/deployments/banmaobox-releases/");
    expect(gitignore).toContain(`!/deployments/banmaobox-releases/${hash}.json`);
    expect(gitignore).not.toContain("!/deployments/.banmaobox-mainnet-journal.json");
    const release = require(`../deployments/banmaobox-releases/${hash}.json`);
    expect(release.compilerInputHash).toBe(`0x${hash}`);
  });
});
