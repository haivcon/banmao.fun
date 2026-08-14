import { loadAIConfig } from "../../lib/ai/server/config";
test("client cannot enable server flags",()=>{const c=loadAIConfig({NODE_ENV:"test",AI_API_KEY:"placeholder",AI_CHAT_ENABLED:"false",NEXT_PUBLIC_AI_CHAT_ENABLED:"true"} as NodeJS.ProcessEnv);expect(c.flags.chat).toBe(false);expect(c.flags.tools).toBe(false);expect(c.flags.txCopilot).toBe(false);});

describe("disabled route surfaces", () => {
  const original = { ...process.env };
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...original, AI_API_KEY: "placeholder" };
    delete process.env.AI_CHAT_ENABLED;
    delete process.env.AI_TX_COPILOT_ENABLED;
  });
  afterAll(() => { process.env = original; });

  test("models metadata is not exposed when chat is off", async () => {
    const { GET } = await import("../../app/api/ai/models/route");
    expect((await GET()).status).toBe(404);
  });

  test("models metadata exposes exactly banmao.fun when chat is on", async () => {
    process.env.AI_CHAT_ENABLED = "true";
    const { GET } = await import("../../app/api/ai/models/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const metadata = await response.json();
    expect(metadata.availableModels).toEqual(["banmao.fun"]);
    expect(metadata.models).toEqual(["banmao.fun"]);
    expect(metadata.defaultModel).toBe("banmao.fun");
    expect(metadata.availableModels).not.toEqual(expect.arrayContaining(["open9", "xenon1"]));
    expect(metadata.models).not.toEqual(expect.arrayContaining(["open9", "xenon1"]));
  });

  test("proof nonce is not issued when transaction copilot is off", async () => {
    const { POST } = await import("../../app/api/ai/auth/nonce/route");
    expect((await POST()).status).toBe(404);
  });
});
