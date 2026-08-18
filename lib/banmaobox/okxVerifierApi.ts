import { okxFetch } from "../okx/okxClient";

const API_ROOT = "/api/v5/xlayer/contract";
export const XLAYER_SHORT_NAME = "XLAYER";

type OkxEnvelope = { code?: unknown; msg?: unknown; data?: unknown };
type Fetcher = typeof okxFetch;

export type VerifyPollStatus = "pending" | "verified" | "failed";

export class OkxVerifierAmbiguousError extends Error {}

async function call(
  fetcher: Fetcher,
  method: string,
  path: string,
  body?: unknown,
  maxRetries = 2,
) {
  const response = await fetcher(method, path, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, maxRetries);
  let envelope: OkxEnvelope;
  try {
    envelope = await response.json() as OkxEnvelope;
  } catch {
    throw new Error(`OKX verifier returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok || envelope.code !== "0") {
    const message = typeof envelope.msg === "string" && envelope.msg
      ? envelope.msg
      : `HTTP ${response.status}`;
    throw new Error(`OKX verifier request failed: ${message}`);
  }
  return envelope.data;
}

export function firstString(data: unknown): string | undefined {
  return Array.isArray(data) && typeof data[0] === "string" ? data[0] : undefined;
}

export function parsePollStatus(data: unknown): VerifyPollStatus {
  const value = firstString(data)?.trim().toLowerCase();
  if (["pass", "success", "verified"].some(
    (status) => value === status || value?.startsWith(`${status} -`),
  )) return "verified";
  if (["fail", "failed"].some(
    (status) => value === status || value?.startsWith(`${status} -`),
  )) return "failed";
  if (["pending", "in progress", "in-progress"].some(
    (status) => value === status || value?.startsWith(`${status} -`),
  )) return "pending";
  throw new OkxVerifierAmbiguousError("OKX verifier returned an ambiguous poll result");
}

export class OkxXLayerVerifierApi {
  constructor(private readonly fetcher: Fetcher = okxFetch) {}

  async isVerified(contractAddress: string): Promise<boolean> {
    const query = new URLSearchParams({
      chainShortName: XLAYER_SHORT_NAME,
      contractAddress,
    });
    const data = await call(
      this.fetcher,
      "GET",
      `${API_ROOT}/verify-contract-info?${query.toString()}`,
    );
    return Array.isArray(data) && data.length > 0;
  }

  async submit(input: {
    contractAddress: string;
    sourceCode: string;
    contractName: string;
    compilerVersion: string;
    constructorArguments: string;
  }): Promise<string> {
    const data = await call(this.fetcher, "POST", `${API_ROOT}/verify-source-code`, {
      chainShortName: XLAYER_SHORT_NAME,
      contractAddress: input.contractAddress,
      sourceCode: input.sourceCode,
      codeFormat: "solidity-standard-json-input",
      contractName: input.contractName,
      compilerVersion: input.compilerVersion,
      constructorArguments: input.constructorArguments,
    }, 0);
    const guid = firstString(data);
    if (!guid) throw new Error("OKX verifier did not return a GUID");
    return guid;
  }

  async poll(guid: string): Promise<VerifyPollStatus> {
    const data = await call(this.fetcher, "POST", `${API_ROOT}/check-verify-result`, {
      chainShortName: XLAYER_SHORT_NAME,
      guid,
    });
    return parsePollStatus(data);
  }
}
