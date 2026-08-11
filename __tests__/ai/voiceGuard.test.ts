import { inspectBanmaoVoice } from "../../lib/ai/server/voiceGuard";

describe("Banmao voice diagnostics", () => {
  test("detects corporate, leaked rubric and promotional financial language", () => {
    expect(inspectBanmaoVoice("This serves as a reminder. My emotional arc means guaranteed profit.")).toMatchObject({ corporate: 1, rubric: 1, financial: 1, total: 3 });
  });

  test("does not flag a factual risk warning", () => {
    expect(inspectBanmaoVoice("No transaction is risk-free, and simulation can become stale.").financial).toBe(0);
  });
});
