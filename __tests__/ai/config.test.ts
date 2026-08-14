import { loadAIConfig } from "../../lib/ai/server/config";

describe("AI server config", () => {
  const validEnv = {
    NODE_ENV: "test",
    AI_API_KEY: "unit-test-placeholder",
    AI_DEFAULT_MODEL: "banmao.fun",
  } as NodeJS.ProcessEnv;

  test("uses the fixed HTTPS upstream and exact model allowlist", () => {
    const config = loadAIConfig(validEnv);
    expect(config.baseUrl).toBe("https://xlayerbot.fun/v1");
    expect(config.models).toEqual(["banmao.fun", "open9", "xenon1"]);
    expect(config.defaultModel).toBe("banmao.fun");
    expect(Object.isFrozen(config)).toBe(true);
  });

  test("fails closed when credential is missing", () => {
    expect(() => loadAIConfig({ NODE_ENV: "test", AI_DEFAULT_MODEL: "banmao.fun" } as NodeJS.ProcessEnv)).toThrow(
      "AI_API_KEY is required",
    );
  });

  test("fails closed when default model is outside allowlist", () => {
    expect(() =>
      loadAIConfig({ ...validEnv, AI_DEFAULT_MODEL: "other" } as NodeJS.ProcessEnv),
    ).toThrow("AI_DEFAULT_MODEL must be allowlisted");
  });

  test("feature flags default off", () => {
    const config = loadAIConfig(validEnv);
    expect(config.flags).toEqual({
      chat: false,
      tools: false,
      rag: false,
      txCopilot: false,
      defiAdvisor: false,
      gamefiCoach: false,
      collectionAdvisor: false,
      marketNarrator: false,
      onchainosReadOnly: false,
    });
  });

  test("fails closed when production transaction copilot lacks distributed state readiness", () => {
    expect(() => loadAIConfig({
      ...validEnv,
      NODE_ENV: "production",
      AI_TX_COPILOT_ENABLED: "true",
    } as NodeJS.ProcessEnv)).toThrow("AI transaction copilot requires distributed state readiness in production");
  });

  test("allows production transaction copilot after distributed state readiness is attested", () => {
    const config = loadAIConfig({
      ...validEnv,
      NODE_ENV: "production",
      AI_TX_COPILOT_ENABLED: "true",
      AI_DISTRIBUTED_STATE_READY: "true",
    } as NodeJS.ProcessEnv);
    expect(config.flags.txCopilot).toBe(true);
  });
});
