const mockReadContract = jest.fn();

class MockContractFunctionRevertedError extends Error {}

class MockBaseError extends Error {
  constructor(
    message: string,
    private readonly causeToWalk?: Error,
  ) {
    super(message);
  }

  walk(predicate: (cause: Error) => boolean) {
    return this.causeToWalk && predicate(this.causeToWalk)
      ? this.causeToWalk
      : undefined;
  }
}

jest.mock("viem", () => ({
  BaseError: MockBaseError,
  ContractFunctionRevertedError: MockContractFunctionRevertedError,
  createPublicClient: () => ({ readContract: mockReadContract }),
  http: jest.fn(),
}));

jest.mock(
  "@/app/defi/box/generated/abis",
  () => ({ BANMAO_BOX_ABI: [] }),
  { virtual: true },
);
jest.mock(
  "@/deployments/banmaobox-xlayer-mainnet.json",
  () => ({ contracts: { box: "0x0000000000000000000000000000000000000001" } }),
  { virtual: true },
);

import { GET } from "../app/api/banmaobox/nft/[tokenId]/metadata/route";

const embeddedImage = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><text>canonical</text></svg>',
).toString("base64")}`;

function metadataUri(image: unknown = embeddedImage) {
  return `data:application/json;base64,${Buffer.from(
    JSON.stringify({ name: "BanmaoBox #1", image }),
  ).toString("base64")}`;
}

async function requestToken(tokenId = "1") {
  return GET(new Request(`https://www.banmao.fun/metadata/${tokenId}`), {
    params: Promise.resolve({ tokenId }),
  });
}

describe("BanmaoBox metadata proxy", () => {
  beforeEach(() => {
    mockReadContract.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns the exact embedded SVG image from onchainTokenURI", async () => {
    mockReadContract.mockResolvedValueOnce(metadataUri());

    const response = await requestToken();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ image: embeddedImage });
    expect(mockReadContract).toHaveBeenCalledTimes(1);
    expect(mockReadContract.mock.calls[0][0]).toMatchObject({
      functionName: "onchainTokenURI",
      args: [BigInt(1)],
    });
  });

  test.each([
    ["an HTTPS image", "https://www.banmao.fun/api/banmaobox/nft/1/image.svg"],
    ["a non-SVG data image", "data:image/png;base64,aW52YWxpZA=="],
  ])("fails safely for %s", async (_description, image) => {
    mockReadContract.mockResolvedValueOnce(metadataUri(image));

    const response = await requestToken();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to load BanmaoBox metadata",
    });
  });

  test("falls back to legacy tokenURI when onchainTokenURI is unavailable", async () => {
    mockReadContract
      .mockRejectedValueOnce(new Error("function unavailable"))
      .mockResolvedValueOnce(metadataUri());

    const response = await requestToken();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ image: embeddedImage });
    expect(mockReadContract.mock.calls.map(([call]) => call.functionName)).toEqual([
      "onchainTokenURI",
      "tokenURI",
    ]);
  });

  test("preserves nonexistent-token behavior", async () => {
    const nonexistent = new MockBaseError(
      "not found",
      new MockContractFunctionRevertedError(),
    );
    mockReadContract.mockRejectedValue(nonexistent);

    const response = await requestToken();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "BanmaoBox token not found",
    });
  });

  test("preserves upstream error behavior", async () => {
    mockReadContract.mockRejectedValue(new Error("RPC unavailable"));

    const response = await requestToken();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to load BanmaoBox metadata",
    });
  });
});
