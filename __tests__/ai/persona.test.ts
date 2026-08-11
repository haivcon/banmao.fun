import { buildBanmaoSystemPrompt, directResponseMode } from "../../lib/ai/server/persona";

function prompt(surface: "landing" | "defi" | "gamefi" | "collection", message = "hello") {
  return buildBanmaoSystemPrompt({ surface, pathname: `/${surface}`, message, locale: "vi", evidence: [], recentMotifs: ["market inspection"] });
}

describe("Banmao layered persona", () => {
  test("keeps identity, safety, language, evidence and novelty layers", () => {
    const value = prompt("landing");
    expect(value).toContain("orange tabby banana-cat");
    expect(value).toContain("Never promise profit");
    expect(value).toContain("Reply in natural Vietnamese");
    expect(value).toContain("No retrieved evidence matched");
    expect(value).toContain("market inspection");
    expect(value).toContain("🐱");
    expect(value).toContain("🍌");
  });

  test.each([
    ["defi", "cautious DeFi explorer"],
    ["gamefi", "playful but precise GameFi coach"],
    ["collection", "curious community curator"],
  ] as const)("applies %s surface guidance", (surface, expected) => {
    expect(prompt(surface)).toContain(expected);
  });

  test("directs response emotion from bounded surface signals", () => {
    expect(directResponseMode("I am confused about staking")).toBe("reassuring");
    expect(directResponseMode("This failed again")).toBe("repair");
    expect(directResponseMode("urgent: help now")).toBe("urgent");
  });
});
