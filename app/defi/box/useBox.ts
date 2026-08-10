"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits, type Address, type Hash } from "viem";
import {
  BANMAO_BOX_ABI,
  BANMAO_BOX_FACTORY_ABI,
  BANMAO_ERC20_ABI,
  getBoxChainConfig,
  type BoxChainId,
  type BoxEntry,
} from "./contracts";

export type BoxTransactionPhase =
  | "idle"
  | "switching-chain"
  | "approving"
  | "creating"
  | "opening"
  | "transferring"
  | "confirming"
  | "success"
  | "error";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const firstLine = error.message.split("\n")[0];
    return firstLine || "Transaction failed";
  }
  return "Transaction failed";
}

export function formatBanmao(
  value: bigint | undefined,
  decimals = 18,
  maximumFractionDigits = 4,
): string {
  if (value === undefined) return "0";
  const number = Number(formatUnits(value, decimals));
  if (!Number.isFinite(number)) return formatUnits(value, decimals);
  return number.toLocaleString(undefined, { maximumFractionDigits });
}

export function useBox(selectedChainId: BoxChainId) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfig = getBoxChainConfig(selectedChainId);
  const boxAddress = chainConfig.boxAddress;
  const factoryAddress = chainConfig.factoryAddress;
  const expectedRendererAddress = chainConfig.rendererAddress;
  const tokenAddress = chainConfig.tokenAddress;
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isWalletPending } = useWriteContract();

  const [boxes, setBoxes] = useState<BoxEntry[]>([]);
  const [boxesLoading, setBoxesLoading] = useState(false);
  const [boxesError, setBoxesError] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [isDeploymentValidated, setIsDeploymentValidated] = useState(false);
  const [phase, setPhase] = useState<BoxTransactionPhase>("idle");
  const [transactionHash, setTransactionHash] = useState<Hash | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const isDeployed = Boolean(boxAddress);
  const isCorrectChain = chainId === selectedChainId;

  const tokenDecimalsQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "tokenDecimals",
    chainId: selectedChainId,
    query: {
      enabled: Boolean(boxAddress && isDeploymentValidated),
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  const tokenDecimals = Number(tokenDecimalsQuery.data ?? 18);

  const balanceQuery = useReadContract({
    address: tokenAddress,
    abi: BANMAO_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: selectedChainId,
    query: {
      enabled: Boolean(address),
      refetchInterval: 15_000,
    },
  });

  const allowanceQuery = useReadContract({
    address: tokenAddress,
    abi: BANMAO_ERC20_ABI,
    functionName: "allowance",
    args:
      address && boxAddress
        ? [address, boxAddress]
        : undefined,
    chainId: selectedChainId,
    query: {
      enabled: Boolean(address && boxAddress),
      refetchInterval: 15_000,
    },
  });

  const ownedBoxCountQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: selectedChainId,
    query: {
      enabled: Boolean(address && boxAddress && isDeploymentValidated),
      refetchInterval: 15_000,
    },
  });

  const totalLockedQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "totalTokensLocked",
    chainId: selectedChainId,
    query: {
      enabled: Boolean(boxAddress && isDeploymentValidated),
      refetchInterval: 15_000,
    },
  });

  const totalSupplyQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "totalSupply",
    chainId: selectedChainId,
    query: {
      enabled: Boolean(boxAddress && isDeploymentValidated),
      refetchInterval: 15_000,
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function validateDeployment() {
      setIsDeploymentValidated(false);
      setDeploymentError(null);
      if (!boxAddress || !factoryAddress || !expectedRendererAddress || !publicClient) {
        return;
      }

      try {
        const [boxCode, factoryCode, rendererCode, registryBox, registered, underlying, boxRenderer, factoryRenderer] =
          await Promise.all([
            publicClient.getCode({ address: boxAddress }),
            publicClient.getCode({ address: factoryAddress }),
            publicClient.getCode({ address: expectedRendererAddress }),
            publicClient.readContract({ address: factoryAddress, abi: BANMAO_BOX_FACTORY_ABI, functionName: "boxForToken", args: [tokenAddress] } as never) as Promise<Address>,
            publicClient.readContract({ address: factoryAddress, abi: BANMAO_BOX_FACTORY_ABI, functionName: "isTokenBox", args: [boxAddress] } as never) as Promise<boolean>,
            publicClient.readContract({ address: boxAddress, abi: BANMAO_BOX_ABI, functionName: "underlyingToken" } as never) as Promise<Address>,
            publicClient.readContract({ address: boxAddress, abi: BANMAO_BOX_ABI, functionName: "renderer" } as never) as Promise<Address>,
            publicClient.readContract({ address: factoryAddress, abi: BANMAO_BOX_FACTORY_ABI, functionName: "renderer" } as never) as Promise<Address>,
          ]);
        const same = (left: Address, right: Address) => left.toLowerCase() === right.toLowerCase();
        if (!boxCode || boxCode === "0x" || !factoryCode || factoryCode === "0x" || !rendererCode || rendererCode === "0x") {
          throw new Error("Deployment bytecode is missing");
        }
        if (!registered || !same(registryBox, boxAddress)) throw new Error("Factory registry does not match the Box manifest");
        if (!same(underlying, tokenAddress)) throw new Error("Box underlying token does not match the manifest");
        if (!same(boxRenderer, expectedRendererAddress) || !same(factoryRenderer, expectedRendererAddress)) {
          throw new Error("Renderer invariant does not match the manifest");
        }
        if (!cancelled) setIsDeploymentValidated(true);
      } catch (error) {
        if (!cancelled) setDeploymentError(getErrorMessage(error));
      }
    }

    void validateDeployment();
    return () => { cancelled = true; };
  }, [boxAddress, expectedRendererAddress, factoryAddress, publicClient, tokenAddress]);

  const ownedBoxCount = (ownedBoxCountQuery.data as bigint | undefined) ?? 0n;

  const loadBoxDetails = useCallback(async () => {
    if (!boxAddress || !publicClient || !address || !isDeploymentValidated || ownedBoxCount === 0n) {
      setBoxes([]);
      setBoxesError(null);
      setBoxesLoading(false);
      return;
    }

    setBoxesLoading(true);
    setBoxesError(null);
    try {
      const pageSize = 100n;
      const pageCount = Number((ownedBoxCount + pageSize - 1n) / pageSize);
      const pages = await Promise.all(
        Array.from({ length: pageCount }, (_, page) =>
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "getBoxesByOwner",
            args: [address, BigInt(page) * pageSize, pageSize],
          } as never) as Promise<readonly bigint[]>,
        ),
      );
      const tokenIds = pages.flat() as bigint[];
      const contracts = tokenIds.flatMap((tokenId) => [
        { address: boxAddress, abi: BANMAO_BOX_ABI, functionName: "boxDetails" as const, args: [tokenId] },
        { address: boxAddress, abi: BANMAO_BOX_ABI, functionName: "canOpen" as const, args: [tokenId] },
      ]);
      const results = (await publicClient.multicall({
        contracts,
        allowFailure: false,
      } as never)) as readonly unknown[];
      const entries = tokenIds.map((tokenId, index): BoxEntry => {
        const details = results[index * 2] as readonly [bigint, bigint, bigint];
        return {
          tokenId,
          amount: details[0],
          createdAt: details[1],
          unlockTime: details[2],
          canOpen: Boolean(results[index * 2 + 1]),
        };
      });
      entries.sort((a, b) =>
        a.unlockTime === b.unlockTime
          ? Number(b.tokenId - a.tokenId)
          : Number(a.unlockTime - b.unlockTime),
      );
      setBoxes(entries);
    } catch (error) {
      setBoxesError(getErrorMessage(error));
    } finally {
      setBoxesLoading(false);
    }
  }, [address, boxAddress, isDeploymentValidated, ownedBoxCount, publicClient]);

  useEffect(() => {
    void loadBoxDetails();
  }, [loadBoxDetails]);

  const resetTransaction = useCallback(() => {
    setPhase("idle");
    setTransactionHash(null);
    setTransactionError(null);
  }, []);

  const ensureReady = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error("Connect your wallet first");
    }
    if (!boxAddress) {
      throw new Error(
        "BanmaoBox is not deployed for the selected chain.",
      );
    }
    if (!publicClient) {
      throw new Error("X Layer RPC is unavailable");
    }
    if (!isDeploymentValidated) {
      throw new Error(deploymentError ?? "BanmaoBox deployment validation is pending");
    }
    if (chainId !== selectedChainId) {
      setPhase("switching-chain");
      await switchChainAsync({ chainId: selectedChainId });
    }

    return {
      account: address,
      boxAddress: boxAddress,
      client: publicClient,
    };
  }, [
    address,
    boxAddress,
    chainId,
    deploymentError,
    isConnected,
    isDeploymentValidated,
    publicClient,
    selectedChainId,
    switchChainAsync,
  ]);

  const waitForHash = useCallback(
    async (hash: Hash, client: NonNullable<typeof publicClient>) => {
      setTransactionHash(hash);
      setPhase("confirming");
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Transaction reverted");
      }
      return receipt;
    },
    [],
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([
      balanceQuery.refetch(),
      allowanceQuery.refetch(),
      ownedBoxCountQuery.refetch(),
      totalLockedQuery.refetch(),
      totalSupplyQuery.refetch(),
    ]);
  }, [
    allowanceQuery,
    balanceQuery,
    ownedBoxCountQuery,
    totalLockedQuery,
    totalSupplyQuery,
  ]);

  const createBox = useCallback(
    async (recipient: Address, amount: string, lockDurationSec: bigint) => {
      resetTransaction();

      try {
        const { account, boxAddress, client } = await ensureReady();
        const amountBaseUnits = parseUnits(amount, tokenDecimals);
        if (amountBaseUnits <= 0n) {
          throw new Error("Amount must be greater than zero");
        }
        if (lockDurationSec <= 0n) {
          throw new Error("Lock duration must be greater than zero");
        }

        let currentAllowance = (allowanceQuery.data as bigint | undefined) ?? 0n;
        if (currentAllowance < amountBaseUnits) {
          setPhase("approving");
          const { request: approvalRequest } = await client.simulateContract({
            account,
            address: tokenAddress,
            abi: BANMAO_ERC20_ABI,
            functionName: "approve",
            args: [boxAddress, amountBaseUnits],
          } as never);
          const approvalHash = await writeContractAsync(approvalRequest as never);
          await waitForHash(approvalHash, client);
          currentAllowance = amountBaseUnits;
        }

        if (currentAllowance < amountBaseUnits) {
          throw new Error("Token approval was not sufficient");
        }

        setPhase("creating");
        const { request: createRequest } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "createBox",
          args: [recipient, amountBaseUnits, lockDurationSec],
        } as never);
        const createHash = await writeContractAsync(createRequest as never);
        await waitForHash(createHash, client);

        setPhase("success");
        await refetchAll();
        return createHash;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [
      allowanceQuery.data,
      ensureReady,
      refetchAll,
      resetTransaction,
      tokenAddress,
      tokenDecimals,
      waitForHash,
      writeContractAsync,
    ],
  );

  const openBox = useCallback(
    async (tokenId: bigint) => {
      resetTransaction();

      try {
        const { account, boxAddress, client } = await ensureReady();
        setPhase("opening");
        const { request } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "openBox",
          args: [tokenId],
        } as never);
        const hash = await writeContractAsync(request as never);
        await waitForHash(hash, client);
        setPhase("success");
        await refetchAll();
        return hash;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [
      ensureReady,
      refetchAll,
      resetTransaction,
      waitForHash,
      writeContractAsync,
    ],
  );

  const transferBox = useCallback(
    async (tokenId: bigint, recipient: Address) => {
      resetTransaction();

      try {
        const { account, boxAddress, client } = await ensureReady();
        setPhase("transferring");
        const { request } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "safeTransferFrom",
          args: [account, recipient, tokenId],
        } as never);
        const hash = await writeContractAsync(request as never);
        await waitForHash(hash, client);
        setPhase("success");
        await refetchAll();
        return hash;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [
      ensureReady,
      refetchAll,
      resetTransaction,
      waitForHash,
      writeContractAsync,
    ],
  );

  return {
    address,
    isConnected,
    isCorrectChain,
    isDeployed,
    tokenDecimals,
    tokenBalance: (balanceQuery.data as bigint | undefined) ?? 0n,
    allowance: (allowanceQuery.data as bigint | undefined) ?? 0n,
    boxes,
    boxesLoading: boxesLoading || ownedBoxCountQuery.isLoading,
    boxesError,
    deploymentError,
    isDeploymentValidated,
    totalLocked: (totalLockedQuery.data as bigint | undefined) ?? 0n,
    totalSupply: (totalSupplyQuery.data as bigint | undefined) ?? 0n,
    createBox,
    openBox,
    transferBox,
    refetchAll,
    resetTransaction,
    phase,
    transactionHash,
    transactionError,
    isBusy: isWalletPending || !["idle", "success", "error"].includes(phase),
  };
}
