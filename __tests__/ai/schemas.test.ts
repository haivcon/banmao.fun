import { validateChatRequest } from "../../lib/ai/server/schemas";

const request = {
  message: "Explain staking",
  model: "xenon1",
  context: { surface: "defi", pathname: "/defi/staking" },
};

describe("AI chat request validation", () => {
  test("preserves an allowlisted user model", () => {
    expect(validateChatRequest(request, "open9").model).toBe("xenon1");
  });

  test("uses the configured default only when model is omitted", () => {
    const { model: _model, ...withoutModel } = request;
    expect(validateChatRequest(withoutModel, "open9").model).toBe("open9");
  });

  test("rejects invalid models instead of falling back", () => {
    expect(() => validateChatRequest({ ...request, model: "other" }, "open9")).toThrow(
      "Invalid model",
    );
  });

  test("rejects unknown fields", () => {
    expect(() => validateChatRequest({ ...request, extra: true }, "open9")).toThrow(
      "Unknown field",
    );
  });

  test("rejects oversized messages", () => {
    expect(() => validateChatRequest({ ...request, message: "x".repeat(8001) }, "open9")).toThrow(
      "Message is too long",
    );
  });
});
