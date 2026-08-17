const { ethers } = require("ethers");
const { readFileSync } = require("node:fs");
const {
  journalComplete,
  journalMatchesReplacementSource,
  prepareRenderer,
  replacementSource,
} = require("../scripts/deploy-banmaobox-mainnet.cjs");

const RENDERER = "0xE880e364f4a71be047cF49767313381715d57db0";
const FACTORY = "0xA6bC56E67253E13554D629579A3c018871D21F9E";
const BOX = "0x95c83831a283cDC41cd552374aD1279b2375a4ee";

function rendererArtifact(runtime = "6001600055") {
  return {
    abi: [],
    evm: {
      deployedBytecode: {
        object: runtime,
        immutableReferences: {},
      },
    },
  };
}

describe("BanmaoBox mainnet replacement deployment", () => {
  test("keeps the replacement transaction path to Factory deployment and createTokenBox only", () => {
    const source = readFileSync("scripts/deploy-banmaobox-mainnet.cjs", "utf8");
    const main = source.slice(source.indexOf("async function main()"), source.indexOf("if (require.main === module)"));

    expect(main).toContain("const previousFactory = ethers.constants.AddressZero");
    expect(main).toContain("const renderer = await prepareRenderer({");
    expect(main).toMatch(/deployContract\([\s\S]*?artifacts\.factory,[\s\S]*?\[renderer\.address, previousFactory\]/);
    expect(main).toContain("factory.createTokenBox(TOKEN, { gasLimit })");
    expect(main).not.toContain('deployContract(provider, signer, artifacts.renderer, [], "BanmaoBoxRenderer"');
  });

  test("reuses the manifest Renderer without deploying or journaling a Renderer transaction", async () => {
    const deployContract = jest.fn();
    const provider = { getCode: jest.fn().mockResolvedValue("0x6001600055") };
    const journal: any = { contracts: {}, transactions: {} };
    const currentManifest = {
      compilerInputHash: "0xold-release",
      contracts: { renderer: RENDERER },
      transactions: { renderer: "0xold-renderer-transaction" },
    };

    const renderer = await prepareRenderer({
      replacingDeployment: true,
      currentManifest,
      provider,
      signer: undefined,
      artifact: rendererArtifact(),
      journal,
      deployContract,
    });

    expect(renderer.address).toBe(ethers.utils.getAddress(RENDERER));
    expect(provider.getCode).toHaveBeenCalledWith(RENDERER);
    expect(deployContract).not.toHaveBeenCalled();
    expect(journal.contracts.renderer).toBe(ethers.utils.getAddress(RENDERER));
    expect(journal.transactions.renderer).toBeUndefined();
    expect(journal.reusedContracts.renderer).toEqual({
      address: ethers.utils.getAddress(RENDERER),
      sourceManifest: "deployments/banmaobox-xlayer-mainnet.json",
      sourceCompilerInputHash: "0xold-release",
      sourceTransactionHash: "0xold-renderer-transaction",
    });
  });

  test("blocks Renderer reuse when deployed runtime differs from the current artifact", async () => {
    const deployContract = jest.fn();
    const provider = { getCode: jest.fn().mockResolvedValue("0x6002600055") };

    await expect(prepareRenderer({
      replacingDeployment: true,
      currentManifest: {
        compilerInputHash: "0xold-release",
        contracts: { renderer: RENDERER },
        transactions: { renderer: "0xold-renderer-transaction" },
      },
      provider,
      signer: {},
      artifact: rendererArtifact(),
      journal: { contracts: {}, transactions: {} },
      deployContract,
    })).rejects.toThrow("Reused BanmaoBoxRenderer runtime does not match the compiled release artifact");
    expect(deployContract).not.toHaveBeenCalled();
  });

  test("treats a replacement journal as complete without a Renderer transaction", () => {
    const replacementJournal = {
      contracts: { renderer: RENDERER, factory: FACTORY, box: BOX },
      transactions: { factory: "0xfactory", createTokenBox: "0xbox" },
      reusedContracts: { renderer: { address: RENDERER } },
    };
    expect(journalComplete(replacementJournal, true)).toBe(true);
    expect(journalComplete(replacementJournal, false)).toBe(false);
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
    expect(journalMatchesReplacementSource(journal, {
      ...currentManifest,
      compilerInputHash: "0xanother-release",
    })).toBe(false);
  });

  test("rejects changed Renderer provenance instead of overwriting it on resume", async () => {
    const provider = { getCode: jest.fn().mockResolvedValue("0x6001600055") };
    const journal: any = {
      contracts: { renderer: RENDERER },
      transactions: {},
      reusedContracts: {
        renderer: {
          address: RENDERER,
          sourceManifest: "deployments/banmaobox-xlayer-mainnet.json",
          sourceCompilerInputHash: "0xdifferent-release",
          sourceTransactionHash: "0xold-renderer-transaction",
        },
      },
    };

    await expect(prepareRenderer({
      replacingDeployment: true,
      currentManifest: {
        compilerInputHash: "0xold-release",
        contracts: { renderer: RENDERER },
        transactions: { renderer: "0xold-renderer-transaction" },
      },
      provider,
      signer: undefined,
      artifact: rendererArtifact(),
      journal,
      deployContract: jest.fn(),
    })).rejects.toThrow("Existing journal Renderer provenance does not match the current deployed manifest");
    expect(provider.getCode).not.toHaveBeenCalled();
  });

  test("keeps first-ever deployment on the Renderer deployment path", async () => {
    const deployed = { address: RENDERER };
    const deployContract = jest.fn().mockResolvedValue(deployed);

    await expect(prepareRenderer({
      replacingDeployment: false,
      currentManifest: { contracts: {}, transactions: {} },
      provider: {},
      signer: {},
      artifact: rendererArtifact(),
      journal: { contracts: {}, transactions: {} },
      deployContract,
    })).resolves.toBe(deployed);
    expect(deployContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      [],
      "BanmaoBoxRenderer",
      expect.anything(),
      "renderer",
    );
  });
});
