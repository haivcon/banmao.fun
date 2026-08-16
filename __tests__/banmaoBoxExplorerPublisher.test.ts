const { buildTargets, compilerVersion, parsePollStatus } = require("../scripts/publish-banmaobox-explorer.cjs");

const manifest = {
  deployer: "0x92809f2837f708163d375960063C8A3156fCeACb",
  contracts: {
    token: "0x16d91d1615fC55b76d5F92365BD60C069b46eF78",
    renderer: "0x262A8c66990F7A651D545F65645E2A045ff1a728",
    factory: "0xCBF869A6C50aB86129BfA92D63CD6A74e7992b1e",
    box: "0x0488cF5D6e44719A98BF6F676826e94f026587eC",
  },
};
const release = { standardInput: "{\"language\":\"Solidity\"}", compiler: "0.8.30+commit.73712a01.Emscripten.clang" };

describe("BanmaoBox Explorer publisher", () => {
  it("formats the solc version for the verifier", () => {
    expect(compilerVersion(release.compiler)).toBe("v0.8.30+commit.73712a01");
  });

  it("builds exact targets and constructor arguments", () => {
    const [renderer, factory, box] = buildTargets(manifest, release);
    expect(renderer).toMatchObject({ key: "renderer", constructorArguments: "" });
    expect(factory.contractName).toBe("contracts/banmaobox/BanmaoBoxFactory.sol:BanmaoBoxFactory");
    expect(factory.constructorArguments).toBe("000000000000000000000000262a8c66990f7a651d545f65645e2a045ff1a728");
    expect(box.contractName).toBe("contracts/banmaobox/BanmaoBox.sol:BanmaoBox");
    expect(box.constructorArguments).toBe(
      "00000000000000000000000016d91d1615fc55b76d5f92365bd60c069b46ef78" +
      "000000000000000000000000262a8c66990f7a651d545f65645e2a045ff1a728" +
      "00000000000000000000000092809f2837f708163d375960063c8a3156fceacb",
    );
    expect(box.sourceCode).toBe(release.standardInput);
  });

  it.each([["Pass", "verified"], ["Success", "verified"], ["Fail", "failed"], ["Fail - constructor arguments mismatch", "failed"], ["Pending", "pending"]])(
    "maps %s to %s", (input, expected) => expect(parsePollStatus([input])).toBe(expected),
  );
});
