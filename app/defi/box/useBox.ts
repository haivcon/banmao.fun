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
  type BasketInput,
  type BoxAsset,
  type BoxChainId,
  type BoxEntry,
  type InspectedBox,
} from "./contracts";

export type BoxTransactionPhase =
  | "idle"
  | "switching-chain"
  | "approving"
  | "creating"
  | "opening"
  | "refreshing-metadata"
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

export function useBox(
  selectedChainId: BoxChainId,
  selectedBoxAddress?: Address,
  selectedTokenAddress?: Address,
) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfig = getBoxChainConfig(selectedChainId);
  const boxAddress = selectedBoxAddress ?? chainConfig.boxAddress;
  const factoryAddress = chainConfig.factoryAddress;
  const expectedRendererAddress = chainConfig.rendererAddress;
  const tokenAddress = selectedTokenAddress ?? chainConfig.tokenAddress;
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

  const tokenSymbolQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "tokenSymbol",
    chainId: selectedChainId,
    query: {
      enabled: Boolean(boxAddress && isDeploymentValidated),
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  const maxLockDurationQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "MAX_LOCK_DURATION",
    chainId: selectedChainId,
    query: {
      enabled: Boolean(boxAddress && isDeploymentValidated),
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  const tokenSymbol = (tokenSymbolQuery.data as string | undefined) ?? "BANMAO";
  const maxLockDuration =
    (maxLockDurationQuery.data as bigint | undefined) ?? 10n * 365n * 86_400n;

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
    args: address && boxAddress ? [address, boxAddress] : undefined,
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
      if (
        !boxAddress ||
        !factoryAddress ||
        !expectedRendererAddress ||
        !publicClient
      ) {
        return;
      }

      try {
        const [
          boxCode,
          factoryCode,
          rendererCode,
          registryBox,
          registered,
          underlying,
          boxRenderer,
          factoryRenderer,
          maxAssets,
        ] = await Promise.all([
          publicClient.getCode({ address: boxAddress }),
          publicClient.getCode({ address: factoryAddress }),
          publicClient.getCode({ address: expectedRendererAddress }),
          publicClient.readContract({
            address: factoryAddress,
            abi: BANMAO_BOX_FACTORY_ABI,
            functionName: "boxForToken",
            args: [tokenAddress],
          } as never) as Promise<Address>,
          publicClient.readContract({
            address: factoryAddress,
            abi: BANMAO_BOX_FACTORY_ABI,
            functionName: "isTokenBox",
            args: [boxAddress],
          } as never) as Promise<boolean>,
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "underlyingToken",
          } as never) as Promise<Address>,
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "renderer",
          } as never) as Promise<Address>,
          publicClient.readContract({
            address: factoryAddress,
            abi: BANMAO_BOX_FACTORY_ABI,
            functionName: "renderer",
          } as never) as Promise<Address>,
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "MAX_ASSETS_PER_BOX",
          } as never) as Promise<bigint>,
        ]);
        const same = (left: Address, right: Address) =>
          left.toLowerCase() === right.toLowerCase();
        if (
          !boxCode ||
          boxCode === "0x" ||
          !factoryCode ||
          factoryCode === "0x" ||
          !rendererCode ||
          rendererCode === "0x"
        ) {
          throw new Error("Deployment bytecode is missing");
        }
        if (!registered || !same(registryBox, boxAddress))
          throw new Error("Factory registry does not match the Box manifest");
        if (!same(underlying, tokenAddress))
          throw new Error("Box underlying token does not match the selected collection");
        if (maxAssets !== 5n)
          throw new Error("Collection is not the multi-token BanmaoBox release");
        if (
          !same(boxRenderer, expectedRendererAddress) ||
          !same(factoryRenderer, expectedRendererAddress)
        ) {
          throw new Error("Renderer invariant does not match the manifest");
        }
        if (!cancelled) setIsDeploymentValidated(true);
      } catch (error) {
        if (!cancelled) setDeploymentError(getErrorMessage(error));
      }
    }

    void validateDeployment();
    return () => {
      cancelled = true;
    };
  }, [
    boxAddress,
    expectedRendererAddress,
    factoryAddress,
    publicClient,
    tokenAddress,
  ]);

  const ownedBoxCount = (ownedBoxCountQuery.data as bigint | undefined) ?? 0n;

  const loadBoxDetails = useCallback(async () => {
    if (
      !boxAddress ||
      !publicClient ||
      !address ||
      !isDeploymentValidated ||
      ownedBoxCount === 0n
    ) {
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
        Array.from(
          { length: pageCount },
          (_, page) =>
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
        {
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "boxDetails" as const,
          args: [tokenId],
        },
        {
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "canOpen" as const,
          args: [tokenId],
        },
        {
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "getBoxAssets" as const,
          args: [tokenId],
        },
      ]);
      const results = (await publicClient.multicall({
        contracts,
        allowFailure: false,
      } as never)) as readonly unknown[];
      const entries = tokenIds.map((tokenId, index): BoxEntry => {
        const details = results[index * 3] as readonly [
          bigint,
          Address,
          bigint,
          bigint,
        ];
        const assets = results[index * 3 + 2] as readonly {
          token: Address;
          amount: bigint;
        }[];
        return {
          tokenId,
          amount: details[0],
          creator: details[1],
          createdAt: details[2],
          unlockTime: details[3],
          canOpen: Boolean(results[index * 3 + 1]),
          assets: assets.map((asset) => ({ ...asset })),
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
      throw new Error("BanmaoBox is not deployed for the selected chain.");
    }
    if (!publicClient) {
      throw new Error("X Layer RPC is unavailable");
    }
    if (!isDeploymentValidated) {
      throw new Error(
        deploymentError ?? "BanmaoBox deployment validation is pending",
      );
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

        let currentAllowance =
          (allowanceQuery.data as bigint | undefined) ?? 0n;
        if (currentAllowance < amountBaseUnits) {
          setPhase("approving");
          const { request: approvalRequest } = await client.simulateContract({
            account,
            address: tokenAddress,
            abi: BANMAO_ERC20_ABI,
            functionName: "approve",
            args: [boxAddress, amountBaseUnits],
          } as never);
          const approvalHash = await writeContractAsync(
            approvalRequest as never,
          );
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

  const readAsset = useCallback(
    async (assetToken: Address) => {
      if (!publicClient) throw new Error("X Layer RPC is unavailable");
      const code = await publicClient.getCode({ address: assetToken });
      if (!code || code === "0x") throw new Error("Token contract not found");
      const [decimals, symbol, balance] = await Promise.all([
        publicClient.readContract({
          address: assetToken,
          abi: BANMAO_ERC20_ABI,
          functionName: "decimals",
        } as never) as Promise<number>,
        publicClient
          .readContract({
            address: assetToken,
            abi: BANMAO_ERC20_ABI,
            functionName: "symbol",
          } as never)
          .catch(() => "TOKEN") as Promise<string>,
        address
          ? (publicClient.readContract({
              address: assetToken,
              abi: BANMAO_ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            } as never) as Promise<bigint>)
          : Promise.resolve(0n),
      ]);
      if (Number(decimals) > 69) throw new Error("Token decimals exceed 69");
      const safeSymbol = /^[A-Za-z0-9 ._-]{1,16}$/.test(symbol) ? symbol : "TOKEN";
      return { token: assetToken, decimals: Number(decimals), symbol: safeSymbol, balance };
    },
    [address, publicClient],
  );

  const resolveCollection = useCallback(
    async (primaryToken: Address) => {
      if (!factoryAddress || !publicClient) {
        throw new Error("Factory deployment is unavailable");
      }
      return (await publicClient.readContract({
        address: factoryAddress,
        abi: BANMAO_BOX_FACTORY_ABI,
        functionName: "boxForToken",
        args: [primaryToken],
      } as never)) as Address;
    },
    [factoryAddress, publicClient],
  );

  const createCollection = useCallback(
    async (primaryToken: Address) => {
      resetTransaction();
      try {
        if (!isConnected || !address || !factoryAddress || !publicClient) {
          throw new Error("Connect wallet and select a deployed factory");
        }
        await readAsset(primaryToken);
        if (chainId !== selectedChainId) {
          setPhase("switching-chain");
          await switchChainAsync({ chainId: selectedChainId });
        }
        const existing = await resolveCollection(primaryToken);
        if (existing !== "0x0000000000000000000000000000000000000000") {
          return existing;
        }
        setPhase("creating");
        const { request } = await publicClient.simulateContract({
          account: address,
          address: factoryAddress,
          abi: BANMAO_BOX_FACTORY_ABI,
          functionName: "createTokenBox",
          args: [primaryToken],
        } as never);
        const hash = await writeContractAsync(request as never);
        await waitForHash(hash, publicClient);
        const created = await resolveCollection(primaryToken);
        if (created === "0x0000000000000000000000000000000000000000") {
          throw new Error("Factory did not register the new collection");
        }
        setPhase("success");
        return created;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [address, chainId, factoryAddress, isConnected, publicClient, readAsset,
      resetTransaction, resolveCollection, selectedChainId, switchChainAsync,
      waitForHash, writeContractAsync],
  );

  const createMultiTokenBox = useCallback(
    async (recipient: Address, assets: BasketInput[], lockDurationSec: bigint) => {
      resetTransaction();
      try {
        const { account, boxAddress, client } = await ensureReady();
        if (assets.length < 2 || assets.length > 5) {
          throw new Error("A basket must contain 2 to 5 assets");
        }
        const tokens = assets.map((asset) => asset.token);
        if (new Set(tokens.map((token) => token.toLowerCase())).size !== tokens.length) {
          throw new Error("Basket tokens must be unique");
        }
        if (tokens[0].toLowerCase() !== tokenAddress.toLowerCase()) {
          throw new Error("The primary collection token must be first");
        }
        const amounts = assets.map((asset) => parseUnits(asset.amount, asset.decimals));
        if (amounts.some((value) => value <= 0n)) throw new Error("Invalid amount");

        for (let index = 0; index < assets.length; index += 1) {
          const asset = assets[index];
          const allowance = (await client.readContract({
            address: asset.token,
            abi: BANMAO_ERC20_ABI,
            functionName: "allowance",
            args: [account, boxAddress],
          } as never)) as bigint;
          if (allowance < amounts[index]) {
            setPhase("approving");
            const { request } = await client.simulateContract({
              account,
              address: asset.token,
              abi: BANMAO_ERC20_ABI,
              functionName: "approve",
              args: [boxAddress, amounts[index]],
            } as never);
            const hash = await writeContractAsync(request as never);
            await waitForHash(hash, client);
          }
        }
        setPhase("creating");
        const { request } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "createMultiTokenBox",
          args: [recipient, tokens, amounts, lockDurationSec],
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
    [ensureReady, refetchAll, resetTransaction, tokenAddress, waitForHash,
      writeContractAsync],
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

  const inspectBox = useCallback(
    async (tokenId: bigint): Promise<InspectedBox> => {
      if (!boxAddress || !publicClient || !isDeploymentValidated) {
        throw new Error(
          deploymentError ?? "BanmaoBox deployment is unavailable",
        );
      }
      const [details, owner, canOpenValue, svg, assets] = await Promise.all([
        publicClient.readContract({
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "boxDetails",
          args: [tokenId],
        } as never) as Promise<readonly [bigint, Address, bigint, bigint]>,
        publicClient.readContract({
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "ownerOf",
          args: [tokenId],
        } as never) as Promise<Address>,
        publicClient.readContract({
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "canOpen",
          args: [tokenId],
        } as never) as Promise<boolean>,
        publicClient.readContract({
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "renderSVG",
          args: [tokenId],
        } as never) as Promise<string>,
        publicClient.readContract({
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "getBoxAssets",
          args: [tokenId],
        } as never) as Promise<readonly BoxAsset[]>,
      ]);
      return {
        tokenId,
        amount: details[0],
        creator: details[1],
        createdAt: details[2],
        unlockTime: details[3],
        canOpen: canOpenValue,
        owner,
        svg,
        assets: assets.map((asset) => ({ ...asset })),
      };
    },
    [boxAddress, deploymentError, isDeploymentValidated, publicClient],
  );

  const refreshMetadata = useCallback(
    async (tokenId: bigint) => {
      resetTransaction();
      try {
        const { account, boxAddress, client } = await ensureReady();
        setPhase("refreshing-metadata");
        const { request } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "refreshMetadata",
          args: [tokenId],
        } as never);
        const hash = await writeContractAsync(request as never);
        await waitForHash(hash, client);
        setPhase("success");
        return hash;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [ensureReady, resetTransaction, waitForHash, writeContractAsync],
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
    tokenSymbol,
    maxLockDuration,
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
    createMultiTokenBox,
    createCollection,
    resolveCollection,
    readAsset,
    openBox,
    transferBox,
    refreshMetadata,
    inspectBox,
    refetchAll,
    resetTransaction,
    phase,
    transactionHash,
    transactionError,
    isBusy: isWalletPending || !["idle", "success", "error"].includes(phase),
  };
}
