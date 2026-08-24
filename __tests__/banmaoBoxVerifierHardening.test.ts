import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import {
  parseVerificationRequest,
  verificationHttpResponse,
  type VerificationRateLimiter,
} from "../lib/banmaobox/verificationHttp";
import {
  OkxVerifierAmbiguousError,
  OkxXLayerVerifierApi,
  parsePollStatus,
} from "../lib/banmaobox/okxVerifierApi";
import {
  rendererAtCreationTransaction,
  testPersistVerificationJob,
  testReadVerificationJob,
} from "../lib/banmaobox/verifyNewCollection";

const TX = `0x${"a".repeat(64)}`;

describe("BanmaoBox verifier HTTP boundary", () => {
  test("requires application/json and a bounded body containing only txHash", async () => {
    await expect(parseVerificationRequest(new Request("http://test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ txHash: TX }),
    }))).rejects.toMatchObject({ status: 415 });

    await expect(parseVerificationRequest(new Request("http://test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(513),
    }))).rejects.toMatchObject({ status: 413 });

    await expect(parseVerificationRequest(new Request("http://test", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ txHash: TX, boxAddress: "0x1" }),
    }))).rejects.toMatchObject({ status: 400 });

    await expect(parseVerificationRequest(new Request("http://test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txHash: TX.toUpperCase().replace("0X", "0x") }),
    }))).resolves.toEqual({ txHash: TX });
  });

  test("applies both per-IP and per-transaction controls with Retry-After", async () => {
    const limiter: VerificationRateLimiter = {
      take: jest.fn(async (key) => key.startsWith("ip:")
        ? { allowed: false, retryAfterMs: 12_100 }
        : { allowed: true, retryAfterMs: 0 }),
    };
    const request = new Request("http://test", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.8" },
      body: JSON.stringify({ txHash: TX }),
    });
    const response = await verificationHttpResponse(request, jest.fn(), limiter);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("13");
    expect(limiter.take).toHaveBeenCalledWith("ip:anonymous");
    expect(limiter.take).toHaveBeenCalledWith(`tx:${TX}`);
  });

  test.each([
    ["waiting-for-indexer", 202, "60"],
    ["pending", 202, "15"],
    ["transient-unavailable", 503, "30"],
    ["retry-exhausted", 422, null],
    ["manual-reconciliation", 422, null],
    ["failed", 422, null],
    ["verified", 200, null],
  ])("maps %s to honest HTTP semantics", async (status, expectedStatus, retryAfter) => {
    const limiter: VerificationRateLimiter = { take: jest.fn(async () => ({ allowed: true, retryAfterMs: 0 })) };
    const verify = jest.fn(async () => ({
      status,
      boxAddress: "0x0000000000000000000000000000000000000001",
      ...(status === "waiting-for-indexer" ? { retryAfterMs: 60_000 } : {}),
      ...(status === "pending" ? { retryAfterMs: 15_000 } : {}),
      ...(status === "transient-unavailable" ? { retryAfterMs: 30_000 } : {}),
    })) as never;
    const response = await verificationHttpResponse(new Request("http://test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txHash: TX }),
    }), verify, limiter);
    expect(response.status).toBe(expectedStatus);
    expect(response.headers.get("retry-after")).toBe(retryAfter);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("BanmaoBox verifier durable state and exact renderer provenance", () => {
  test("applies only same-block renderer updates before collection creation", () => {
    const initial = "0x0000000000000000000000000000000000000001";
    const before = "0x0000000000000000000000000000000000000002";
    const after = "0x0000000000000000000000000000000000000003";
    expect(rendererAtCreationTransaction(initial, [
      { transactionIndex: 8, newRenderer: after },
      { transactionIndex: 3, newRenderer: before },
    ], 5)).toBe(before);
    expect(rendererAtCreationTransaction(initial, [
      { transactionIndex: 8, newRenderer: after },
    ], 5)).toBe(initial);
  });

  test("uses conditional monotonic job transitions and a bounded manual terminal", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/banmaobox/verifyNewCollection.ts"), "utf8");
    expect(source).toContain("BANMAOBOX_VERIFY_MAX_ATTEMPTS, 3");
    expect(source).toContain("banmaobox_verification_jobs.status != 'verified'");
    expect(source).toContain("banmaobox_verification_jobs.status != 'manual-reconciliation'");
    expect(source).toContain("banmaobox_verification_jobs.status=?)");
    expect(source).toContain("attempts=MAX(banmaobox_verification_jobs.attempts, excluded.attempts)");
    expect(source).toContain("RECONCILIATION_DEADLINE_MS");
    expect(source).toContain("if (!storedJob) await saveJob(job)");
    expect(source.indexOf("if (!storedJob) await saveJob(job)")).toBeLessThan(
      source.indexOf("await api.isVerified(validated.boxAddress)"),
    );
  });

  test("concurrent stale writers cannot overwrite the winning or verified state", async () => {
    const txHash = `0x${randomBytes(32).toString("hex")}`;
    const boxAddress = "0x0000000000000000000000000000000000000011";
    const ready = { txHash, boxAddress, status: "ready", attempts: 0, updatedAt: 1 };
    await testPersistVerificationJob(ready);
    await Promise.all([
      testPersistVerificationJob({ ...ready, status: "waiting-for-indexer" }, "ready"),
      testPersistVerificationJob({ ...ready, status: "failed" }, "ready"),
    ]);
    const winner = await testReadVerificationJob(txHash);
    expect(["waiting-for-indexer", "failed"]).toContain(winner?.status);

    await testPersistVerificationJob({ ...ready, status: "verified" }, "ready");
    await Promise.all([
      testPersistVerificationJob({ ...ready, status: "pending" }, "waiting-for-indexer"),
      testPersistVerificationJob({ ...ready, status: "failed" }, "failed"),
      testPersistVerificationJob({ ...ready, status: "submitting" }, "ready"),
    ]);
    expect((await testReadVerificationJob(txHash))?.status).toBe("verified");
  });

  test("bounds expired rate cleanup and resists spoofed forwarding headers", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/banmaobox/verificationHttp.ts"), "utf8");
    expect(source).toContain("LIMIT ?");
    expect(source).toContain("CLEANUP_BATCH_SIZE");
    expect(source).not.toContain('headers.get("x-forwarded-for")');
    expect(source).not.toContain('headers.get("x-real-ip")');
    expect(source).toContain('process.env.VERCEL !== "1"');
    expect(source).toContain('headers.get("x-vercel-forwarded-for")');
  });
});

describe("BanmaoBox OKX verifier ambiguity and non-proxy invariant", () => {
  test.each(["Queued", "Unknown explorer response", undefined])("does not silently treat %s as pending", (value) => {
    expect(() => parsePollStatus(value === undefined ? [] : [value])).toThrow(OkxVerifierAmbiguousError);
  });

  test("uses a non-retrying, timeout-bounded submission request", async () => {
    const fetcher = jest.fn(async () => new Response(
      JSON.stringify({ code: "0", msg: "", data: ["guid-1"] }),
      { status: 200 },
    )) as never;
    await new OkxXLayerVerifierApi(fetcher).submit({
      contractAddress: "0x0000000000000000000000000000000000000001",
      sourceCode: "{}",
      contractName: "contracts/Test.sol:Test",
      compilerVersion: "v0.8.30+commit.73712a01",
      constructorArguments: "",
    });
    const call = (fetcher as jest.Mock).mock.calls[0];
    expect(call[3]).toBe(0);
    expect(call[2].signal).toBeInstanceOf(AbortSignal);
  });

  test("production verifier source never references proxy verification endpoints", () => {
    const files = [
      "lib/banmaobox/okxVerifierApi.ts",
      "lib/banmaobox/verifyNewCollection.ts",
      "app/api/banmaobox/verify/route.ts",
      "app/defi/box/requestVerification.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toContain("verify-proxy-contract");
    expect(source).not.toContain("check-proxy-verify-result");
  });
});
