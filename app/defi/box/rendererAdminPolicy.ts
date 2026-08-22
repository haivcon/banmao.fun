import type { Address } from "viem";
import type { BoxChainId } from "./contracts";
import { sameAddress } from "./safety";

export type RendererAdminAccessStatus =
  | "disconnected"
  | "wrong-network"
  | "loading"
  | "authorized"
  | "unauthorized"
  | "role-mismatch"
  | "unavailable";

export function classifyRendererAdminAccess(
  wallet: Address | undefined,
  connectedChainId: number | undefined,
  requiredChainId: BoxChainId,
  factoryAdmin: Address | undefined,
  boxAdmin: Address | undefined,
): RendererAdminAccessStatus {
  if (!wallet) return "disconnected";
  if (connectedChainId !== requiredChainId) return "wrong-network";
  if (!factoryAdmin || !boxAdmin) return "unavailable";
  if (!sameAddress(factoryAdmin, boxAdmin)) return "role-mismatch";
  return sameAddress(wallet, factoryAdmin) ? "authorized" : "unauthorized";
}
