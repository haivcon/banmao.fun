import { POST as prepare } from "../../../app/api/ai/transactions/prepare/route";
import { POST as simulate } from "../../../app/api/ai/transactions/simulate/route";

jest.mock("../../../lib/ai/server/config", () => ({
  loadAIConfig: () => ({ flags: { txCopilot: true } }),
}));
jest.mock("../../../lib/ai/server/auth/session", () => ({
  verifySessionToken: (token: string) => token === "test-session"
    ? { address: "0x0000000000000000000000000000000000000001", chainId: 196 }
    : null,
}));
jest.mock("viem", () => ({
  ...jest.requireActual("viem"),
  createPublicClient: () => ({
    call: jest.fn(async () => ({ data: "0x" })),
    estimateGas: jest.fn(async () => 21000n),
    getBlockNumber: jest.fn(async () => 99n),
    getBalance: jest.fn(async () => 5n),
    readContract: jest.fn(async () => 0n),
  }),
}));

const request = (body: unknown, authenticated = true) => new Request("http://localhost/api/ai/transactions", {
  method: "POST",
  headers: authenticated ? { cookie: "banmao_ai_session=test-session" } : {},
  body: JSON.stringify(body),
});

test("prepare and simulate share drafts without a route-module dependency and reject replay", async () => {
  const previous = process.env.AI_SESSION_SECRET;
  process.env.AI_SESSION_SECRET = "test-only-session-secret";
  try {
    const input = { intent: "stake", amount: "1", chainId: 196, lockOptionId: 0 };
    expect((await prepare(request(input, false))).status).toBe(401);
    const prepared = await prepare(request(input));
    expect(prepared.status).toBe(200);
    expect(prepared.headers.get("cache-control")).toBe("no-store");
    const action = await prepared.json();
    const draft = { actionId: action.actionId, draftHash: action.draftHash };
    expect((await simulate(request(draft, false))).status).toBe(401);
    const simulated = await simulate(request(draft));
    expect(simulated.status).toBe(200);
    expect(await simulated.json()).toMatchObject({ success: true, draftHash: action.draftHash, simulationBlock: "99" });
    expect((await simulate(request(draft))).status).toBe(503);
  } finally {
    if (previous === undefined) delete process.env.AI_SESSION_SECRET;
    else process.env.AI_SESSION_SECRET = previous;
  }
});
