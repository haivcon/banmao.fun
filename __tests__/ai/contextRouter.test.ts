import { resolveContext } from "../../lib/ai/server/contextRouter";

describe("context router", () => {
  test.each([["/", "landing"], ["/defi/staking", "defi"], ["/gamefi/pk", "gamefi"], ["/collection", "collection"]])("maps %s", (pathname, surface) => expect(resolveContext(pathname, surface as never).surface).toBe(surface));
  test("rejects spoofed surface", () => expect(() => resolveContext("/defi/staking", "gamefi")).toThrow("Context mismatch"));
  test("rejects unknown paths", () => expect(() => resolveContext("/admin", "landing")).toThrow("Unsupported pathname"));
});
