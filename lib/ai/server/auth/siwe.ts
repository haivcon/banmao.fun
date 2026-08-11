import "server-only";
import { getAddress } from "viem";

export function parseAndValidateSiwe(
  message: string,
  policy: {
    domain: string;
    uri: string;
    chainIds: number[];
    nonce: string;
    now: Date;
  },
) {
  const lines = message.split(/\r?\n/);
  const domain = lines[0]?.split(" wants you")[0];
  const address = lines[1];
  const fields = Object.fromEntries(
    lines.map((line) => {
      const separator = line.indexOf(": ");
      return separator > 0
        ? [line.slice(0, separator), line.slice(separator + 2)]
        : ["", ""];
    }),
  );
  if (domain !== policy.domain) throw new Error("Invalid domain");
  if (fields.URI !== policy.uri) throw new Error("Invalid uri");
  if (!policy.chainIds.includes(Number(fields["Chain ID"]))) {
    throw new Error("Invalid chain");
  }
  if (fields.Nonce !== policy.nonce) throw new Error("Invalid nonce");
  const issuedAt = new Date(fields["Issued At"]);
  const expirationTime = new Date(fields["Expiration Time"]);
  const issuedAgeMs = policy.now.valueOf() - issuedAt.valueOf();
  if (!Number.isFinite(issuedAt.valueOf()) || issuedAt > policy.now || issuedAgeMs > 10 * 60_000) {
    throw new Error("Invalid Issued At");
  }
  if (
    !Number.isFinite(expirationTime.valueOf()) ||
    expirationTime <= policy.now ||
    expirationTime.valueOf() - issuedAt.valueOf() > 30 * 60_000
  ) {
    throw new Error("Invalid proof lifetime");
  }
  return {
    address: getAddress(address),
    chainId: Number(fields["Chain ID"]),
    issuedAt,
    expirationTime,
  };
}
