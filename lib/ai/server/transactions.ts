import "server-only";
import { encodeFunctionData, formatUnits, getAddress, keccak256, toHex } from "viem";

type Address = `0x${string}`;
type Input = {
  intent: "stake";
  amount: string;
  lockOptionId?: number;
  chainId: number;
  wallet: Address;
};
export type PreparedAction = {
  actionId: string;
  draftHash: Address;
  actionType: "stake";
  chainId: number;
  wallet: Address;
  to: Address;
  data: Address;
  value: string;
  humanSummary: string;
  risks: string[];
  expiresAt: string;
  requiresUserReviewAndSignature: true;
};

export function createDraftStore() {
  const drafts = new Map<string, PreparedAction>();
  return {
    put(action: PreparedAction) { drafts.set(action.actionId, action); },
    get(actionId: string) { return drafts.get(actionId); },
    take(actionId: string) {
      const action = drafts.get(actionId);
      if (action) drafts.delete(actionId);
      return action;
    },
  };
}

const STAKE_ABI = [{
  type: "function",
  name: "stake",
  stateMutability: "nonpayable",
  inputs: [
    { name: "amount", type: "uint256" },
    { name: "lockOptionId", type: "uint256" },
  ],
  outputs: [],
}] as const;

export function prepareAction(
  input: Input,
  policy: { chainId: number; contracts: { stake: Address }; ttlMs: number },
  store: ReturnType<typeof createDraftStore>,
  now = Date.now(),
): PreparedAction {
  const lockOptionId = input.lockOptionId ?? 0;
  if (
    input.chainId !== policy.chainId ||
    !/^\d+$/.test(input.amount) ||
    BigInt(input.amount) <= 0n ||
    !Number.isInteger(lockOptionId) ||
    lockOptionId < 0 ||
    lockOptionId > 3
  ) throw new Error("Unsupported action");

  const to = getAddress(policy.contracts.stake);
  const wallet = getAddress(input.wallet);
  const data = encodeFunctionData({
    abi: STAKE_ABI,
    functionName: "stake",
    args: [BigInt(input.amount), BigInt(lockOptionId)],
  });
  const expiresAt = new Date(now + policy.ttlMs).toISOString();
  const canonical = JSON.stringify({
    actionType: "stake",
    chainId: input.chainId,
    wallet,
    to,
    data,
    value: "0",
    expiresAt,
  });
  const draftHash = keccak256(toHex(canonical));
  const actionId = draftHash.slice(0, 34);
  const action: PreparedAction = {
    actionId,
    draftHash,
    actionType: "stake",
    chainId: input.chainId,
    wallet,
    to,
    data,
    value: "0",
    humanSummary: `Review staking ${formatUnits(BigInt(input.amount), 18)} BANMAO with lock option ${lockOptionId}`,
    risks: ["Simulation can become stale before signing"],
    expiresAt,
    requiresUserReviewAndSignature: true,
  };
  store.put(action);
  return action;
}

export async function simulateAction(
  input: { actionId: string; draftHash: string; wallet: Address },
  store: ReturnType<typeof createDraftStore>,
  reader: (action: PreparedAction) => Promise<{ success: boolean; simulationBlock: string; preflightSnapshot: unknown[]; warnings: string[] }>,
  now = Date.now(),
) {
  const action = store.get(input.actionId);
  if (!action || action.draftHash !== input.draftHash) throw new Error("Draft hash mismatch");
  if (action.wallet.toLowerCase() !== input.wallet.toLowerCase()) throw new Error("Wallet mismatch");
  if (Date.parse(action.expiresAt) <= now) throw new Error("Draft expired");
  const result = await reader(action);
  if (store.take(input.actionId) !== action) throw new Error("Draft already consumed");
  return { ...result, draftHash: action.draftHash };
}

type ReadOnlySimulationClient = {
  call(parameters: { account: Address; to: Address; data: Address; value: bigint }): Promise<unknown>;
  estimateGas(parameters: { account: Address; to: Address; data: Address; value: bigint }): Promise<bigint>;
  getBlockNumber(): Promise<bigint>;
  getBalance(parameters: { address: Address; blockNumber: bigint }): Promise<bigint>;
  readContract?(parameters: { address: Address; abi: readonly unknown[]; functionName: string; args: readonly unknown[]; blockNumber: bigint }): Promise<unknown>;
};

export async function simulatePreparedAction(
  client: ReadOnlySimulationClient,
  action: PreparedAction,
  reads?: { token: Address; stakingAbi: readonly unknown[]; erc20Abi: readonly unknown[] },
) {
  const value = BigInt(action.value);
  const simulationBlock = await client.getBlockNumber();
  const before = await client.getBalance({ address: action.wallet, blockNumber: simulationBlock });
  await client.call({ account: action.wallet, to: action.to, data: action.data, value });
  const gasEstimate = await client.estimateGas({ account: action.wallet, to: action.to, data: action.data, value });
  const preflightSnapshot = [{ field: "nativeBalance", value: before.toString() }];
  if (reads && client.readContract) {
    const [tokenBalance, allowance, summary] = await Promise.all([
      client.readContract({ address: reads.token, abi: reads.erc20Abi, functionName: "balanceOf", args: [action.wallet], blockNumber: simulationBlock }),
      client.readContract({ address: reads.token, abi: reads.erc20Abi, functionName: "allowance", args: [action.wallet, action.to], blockNumber: simulationBlock }),
      client.readContract({ address: action.to, abi: reads.stakingAbi, functionName: "userSummary", args: [action.wallet], blockNumber: simulationBlock }),
    ]);
    const stakedAmount = Array.isArray(summary) ? summary[0] : 0;
    preflightSnapshot.push(
      { field: "tokenBalance", value: String(tokenBalance) },
      { field: "allowance", value: String(allowance) },
      { field: "stakedAmount", value: String(stakedAmount) },
    );
  }
  return {
    success: true,
    gasEstimate: gasEstimate.toString(),
    simulationBlock: simulationBlock.toString(),
    preflightSnapshot,
    warnings: ["Read-only eth_call cannot guarantee execution at a later block"],
  };
}
