import { redactSensitiveText } from "../../lib/ai/server/security/redact";

describe("redactSensitiveText", () => {
  test("removes bearer values and configured sentinels", () => {
    const value = redactSensitiveText(
      "Authorization: Bearer test-secret-value upstream failed",
      ["test-secret-value"],
    );
    expect(value).not.toContain("test-secret-value");
    expect(value).toContain("[REDACTED]");
  });

  test("does not serialize upstream payloads", () => {
    expect(redactSensitiveText(new Error("Bearer private-value"), ["private-value"]))
      .toBe("Bearer [REDACTED]");
  });
});
