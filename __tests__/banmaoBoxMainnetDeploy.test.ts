const { ethers } = require("ethers");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  assertAggregateFeeCap,
  ensureArchive,
  journalComplete,
  journalMatchesActiveManifest,
  journalMatchesReplacementSource,
  prepareRenderer,
  replacementSource,
} = require("../scripts/deploy-banmaobox-mainnet.cjs");

const RENDERER = "0xE19c875dBfa80171819E443e46Fc7839a9290769";
const FACTORY = "0x55E0c4eDF6c542e7FeD04a6f0c914d8F24bFCCf8";
const BOX = "0x19d3b0C4f1276D37772269f5Ce01179Db2D70559";

function rendererArtifact(runtime = "6001600055") {
  return { abi: [], evm: { deployedBytecode: { object: runtime, immutableReferences: {} } } };
}

describe("BanmaoBox mainnet replacement deployment", () => {
  test("reuses Renderer and journals only Factory and Box transactions in release order", () => {
    const source = readFileSync("scripts/deploy-banmaobox-mainnet.cjs", "utf8");
    const main = source.slice(source.indexOf("async function main()"), source.indexOf("if (require.main === module)"));

    expect(main).toContain("const previousFactory = ethers.constants.AddressZero");
    expect(main).toContain("const renderer = await prepareRenderer({");
    expect(main).toMatch(/prepareRenderer\([\s\S]*?deployContract\([\s\S]*?artifacts\.factory,[\s\S]*?factory\.createTokenBox/);
    expect(main).toContain("factory.createTokenBox(TOKEN, { gasLimit, ...fees })");
  });

  test("replacement reuses the manifest Renderer only after runtime and interface readback", async () => {
    const artifact = rendererArtifact();
    const provider = {
      getCode: jest.fn().mockResolvedValue(`0x${artifact.evm.deployedBytecode.object}`),
    };
    const renderer = { supportsInterface: jest.fn().mockResolvedValue(true) };
    const contract = jest.fn().mockReturnValue(renderer);
    const journal: any = { deploymentMode: "replacement", contracts: {}, transactions: {} };
    const writeJournal = jest.fn();

    await expect(prepareRenderer({
      provider, signer: {}, artifact, journal, reuse: true, rendererAddress: RENDERER,
      contract, writeJournal,
    })).resolves.toBe(renderer);
    expect(provider.getCode).toHaveBeenCalledWith(RENDERER);
    expect(renderer.supportsInterface).toHaveBeenCalledTimes(3);
    expect(journal.contracts.renderer).toBe(RENDERER);
    expect(journal.transactions.renderer).toBeUndefined();
    expect(writeJournal).toHaveBeenCalledWith(journal);
  });

  test("requires exactly the two replacement transactions for journal completion", () => {
    const complete = {
      deploymentMode: "replacement",
      contracts: { renderer: RENDERER, factory: FACTORY, box: BOX },
      transactions: { factory: "0xfactory", createTokenBox: "0xbox" },
    };
    expect(journalComplete(complete)).toBe(true);
    expect(journalComplete({ ...complete, transactions: { factory: "0xfactory" } })).toBe(false);
    expect(journalComplete({ ...complete, transactions: { ...complete.transactions, renderer: "0xunexpected" } })).toBe(false);
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

  test("recognizes a completed journal after the active manifest was already written", () => {
    const journal = {
      deploymentMode: "replacement",
      compilerInputHash: "0xnew-release",
      contracts: { renderer: RENDERER, factory: FACTORY, box: BOX },
      transactions: { factory: "0xfactory", createTokenBox: "0xbox" },
    };
    const manifest = {
      compilerInputHash: "0xnew-release",
      contracts: { renderer: RENDERER, factory: FACTORY, box: BOX },
      transactions: { factory: "0xfactory", createTokenBox: "0xbox" },
    };
    expect(journalMatchesActiveManifest(journal, manifest)).toBe(true);
    expect(journalMatchesActiveManifest(journal, {
      ...manifest,
      contracts: { ...manifest.contracts, box: "0x0000000000000000000000000000000000000001" },
    })).toBe(false);
  });

  test("keeps an equal existing archive and rejects conflicting content", () => {
    const directory = mkdtempSync(join(tmpdir(), "banmaobox-archive-"));
    const archive = join(directory, "old.json");
    const manifest = { schemaVersion: 1, contracts: { renderer: RENDERER, factory: FACTORY, box: BOX } };
    try {
      expect(ensureArchive(archive, manifest)).toBe("created");
      expect(ensureArchive(archive, JSON.parse(JSON.stringify(manifest)))).toBe("existing-equal");
      writeFileSync(archive, '{"contracts":{"box":"0x19d3b0C4f1276D37772269f5Ce01179Db2D70559","factory":"0x55E0c4eDF6c542e7FeD04a6f0c914d8F24bFCCf8","renderer":"0xE19c875dBfa80171819E443e46Fc7839a9290769"},"schemaVersion":1}\n');
      expect(ensureArchive(archive, manifest)).toBe("existing-equal");
      writeFileSync(archive, `${JSON.stringify({ ...manifest, schemaVersion: 2 }, null, 2)}\n`);
      expect(() => ensureArchive(archive, manifest)).toThrow("conflicts with source manifest");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("enforces cumulative fee and live gas-price caps", () => {
    const estimates = [50, 75, 100];
    const gasPrice = ethers.BigNumber.from(2);
    expect(() => assertAggregateFeeCap(estimates, gasPrice, "0.000000000000000563"))
      .toThrow("exceeds approved aggregate fee cap");
    expect(assertAggregateFeeCap(estimates, gasPrice, "0.000000000000000814", 250))
      .toEqual(ethers.BigNumber.from(814));
    expect(() => assertAggregateFeeCap(estimates, gasPrice, ""))
      .toThrow("BANMAOBOX_MAX_FEE_OKB");

    const source = readFileSync("scripts/deploy-banmaobox-mainnet.cjs", "utf8");
    expect(source).toContain('if (!maximumGasPriceGwei) fail("BANMAOBOX_MAX_GAS_GWEI is required")');
    expect(source).toContain("if (price.gt(maximumGasPrice))");
    expect(source).toContain("exceeds approved cap");
  });

  test("tracks only immutable release provenance while journals stay ignored", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    const hashes = [
      "9de8225e702132fedede336deb636ffa87247dc03543ea39107bf6760d096c55",
      "65287404e198cceb2b9dc76cb7eacb6b263d38120e147614470598e4fc0e861f",
      "39e47f551ed420c27970a6e4b492121ccac445f53eb872899415d33c8f7cf143",
    ];
    expect(gitignore).toContain("!/deployments/banmaobox-releases/");
    for (const hash of hashes) {
      expect(gitignore).toContain(`!/deployments/banmaobox-releases/${hash}.json`);
      const release = require(`../deployments/banmaobox-releases/${hash}.json`);
      expect(release.compilerInputHash).toBe(`0x${hash}`);
    }
    expect(gitignore).not.toContain("!/deployments/.banmaobox-mainnet-journal.json");
  });
});
