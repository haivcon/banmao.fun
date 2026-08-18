import type { Address, Hash } from "viem";

export type AdminCreationFixture = {
  token: Address;
  box: Address;
  txHash: Hash;
  factory: Address;
  renderer: Address;
};

export const ADMIN_CREATION_FIXTURE: AdminCreationFixture = {
  token: "0x5555555555555555555555555555555555555555",
  box: "0x6666666666666666666666666666666666666666",
  txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  factory: "0x7777777777777777777777777777777777777777",
  renderer: "0x8888888888888888888888888888888888888888",
};

export function getAdminCreationFixture(search: string): AdminCreationFixture | null {
  return new URLSearchParams(search).get("banmaoboxFixture") === "admin-creation-success"
    ? ADMIN_CREATION_FIXTURE
    : null;
}
