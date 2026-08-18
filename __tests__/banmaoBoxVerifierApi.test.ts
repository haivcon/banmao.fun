import { OkxXLayerVerifierApi, parsePollStatus } from "../lib/banmaobox/okxVerifierApi";

describe("X Layer verifier API adapter", () => {
  it.each([
    ["Pass", "verified"],
    ["Success", "verified"],
    ["Fail", "failed"],
    ["Fail - constructor arguments mismatch", "failed"],
    ["Pending", "pending"],
  ])("maps %s safely", (value, expected) => {
    expect(parsePollStatus([value])).toBe(expected);
  });

  it("submits Standard JSON with the probed camelCase schema", async () => {
    const fetcher = jest.fn(async (_method: string, _path: string, options: RequestInit) =>
      new Response(JSON.stringify({ code: "0", msg: "", data: ["guid-1"] }), { status: 200 })) as never;
    const api = new OkxXLayerVerifierApi(fetcher);
    await expect(api.submit({
      contractAddress: "0x0000000000000000000000000000000000000001",
      sourceCode: "{}",
      contractName: "contracts/Test.sol:Test",
      compilerVersion: "v0.8.30+commit.73712a01",
      constructorArguments: "abcd",
    })).resolves.toBe("guid-1");
    const [method, path, options] = (fetcher as jest.Mock).mock.calls[0];
    expect(method).toBe("POST");
    expect(path.endsWith("/verify-source-code")).toBe(true);
    expect(JSON.parse(options.body)).toMatchObject({
      chainShortName: "XLAYER",
      codeFormat: "solidity-standard-json-input",
      constructorArguments: "abcd",
    });
  });

  it("uses query parameters for contract info", async () => {
    const fetcher = jest.fn(async () =>
      new Response(JSON.stringify({ code: "0", msg: "", data: [{ contractName: "Test" }] }), { status: 200 })) as never;
    const api = new OkxXLayerVerifierApi(fetcher);
    await expect(api.isVerified("0x0000000000000000000000000000000000000001")).resolves.toBe(true);
    expect((fetcher as jest.Mock).mock.calls[0][0]).toBe("GET");
    expect((fetcher as jest.Mock).mock.calls[0][1]).toContain("chainShortName=XLAYER");
  });

  it("rejects an OKX error envelope even on HTTP 200", async () => {
    const fetcher = jest.fn(async () =>
      new Response(JSON.stringify({ code: "50014", msg: "bad payload", data: [] }), { status: 200 })) as never;
    await expect(new OkxXLayerVerifierApi(fetcher).poll("guid")).rejects.toThrow("bad payload");
  });
});
