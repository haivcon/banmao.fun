import { proposePageAction } from "../../lib/ai/client/actionBridge";

const elements = [
  { id: "staking.amount", type: "input" as const, label: "Stake amount", action: "fill" as const, risk: "reversible" as const },
  { id: "staking.submit", type: "button" as const, label: "Stake BANMAO", action: "activate" as const, risk: "transaction" as const },
];

describe("allowlisted page action bridge", () => {
  test("proposes a matching bounded action and extracts a numeric value", () => {
    expect(proposePageAction("Điền stake 100", elements)).toMatchObject({ elementId: "staking.amount", kind: "fill", value: "100" });
  });
  test("proposes search and play commands for matching allowlisted controls", () => {
    expect(proposePageAction("Search cats", [{ id: "collection.search", type: "input", label: "Search collection", action: "fill", risk: "reversible" }])).toMatchObject({ elementId: "collection.search", value: "cats" });
    expect(proposePageAction("Play snake", [{ id: "gamefi.play.snake", type: "button", label: "Play Snake", action: "activate", risk: "none" }])).toMatchObject({ elementId: "gamefi.play.snake" });
  });
  test("does not propose arbitrary actions without a matching element", () => {
    expect(proposePageAction("Click the secret admin button", elements)).toBeNull();
  });
});
