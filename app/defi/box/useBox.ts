"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, getAddress, keccak256, parseAbi, parseUnits, type Address, type Hash } from "viem";
import {
  BANMAO_BOX_ABI,
  BANMAO_BOX_FACTORY_ABI,
  BANMAO_BOX_RENDERER_ABI,
  BANMAO_ERC20_ABI,
  getBoxChainConfig,
  type BasketInput,
  type BoxAsset,
  type BoxChainId,
  type BoxEntry,
  type InspectedBox,
  normalizeBoxAssets,
} from "./contracts";
import {
  isCanonicalBoxCollection,
  normalizeTokenDecimals,
  normalizeTokenSymbol,
  sameAddress,
} from "./safety";
import { resolveStoredAssetSymbol } from "./transactionPresentation";
import { buildTokenIdentity } from "./tokenIdentity";
import { validateBanmaoBoxDeployment } from "./deploymentValidation";

const ERC20_NAME_ABI = parseAbi(["function name() view returns (string)"]);

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

function assertLockDuration(lockDurationSec: bigint) {
  if (lockDurationSec < 1n || lockDurationSec > 3_153_600_000n) {
    throw new Error("Lock duration must be from 1 second to 36,500 days");
  }
}

export type BoxReleaseResult = {
  hash: Hash;
  remainingAssetCount: bigint | null;
  releasedAssetCount: number;
  failedAssetCount: number;
};

function releaseEventCounts(
  logs: readonly { address: Address; data: `0x${string}`; topics?: readonly `0x${string}`[] }[],
  boxAddress: Address,
) {
  let releasedAssetCount = 0;
  let failedAssetCount = 0;
  for (const log of logs) {
    if (log.address.toLowerCase() !== boxAddress.toLowerCase() || !log.topics?.length) continue;
    try {
      const topics = [...log.topics] as [`0x${string}`, ...`0x${string}`[]];
      const event = decodeEventLog({ abi: BANMAO_BOX_ABI, data: log.data, topics });
      if (typeof event !== "object" || event === null || !("eventName" in event)) continue;
      if (event.eventName === "BoxAssetReleased") releasedAssetCount += 1;
      if (event.eventName === "BoxAssetReleaseFailed") failedAssetCount += 1;
    } catch {
      // Ignore unrelated events emitted by the Box or token callbacks.
    }
  }
  return { releasedAssetCount, failedAssetCount };
}

export function useBox(
  selectedChainId: BoxChainId,
  selectedBoxAddress?: Address,
  selectedTokenAddress?: Address,
  genericToken = "TOKEN",
  suspended = false,
) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfig = getBoxChainConfig(selectedChainId);
  const boxAddress = selectedBoxAddress ?? chainConfig.boxAddress;
  const factoryAddress = chainConfig.factoryAddress;
  const expectedFactoryRendererAddress = chainConfig.factoryRendererAddress;
  const expectedDefaultRendererAddress = chainConfig.defaultRendererAddress;
  const expectedBoxRendererAddress = chainConfig.boxRendererAddress;
  const tokenAddress = selectedTokenAddress ?? chainConfig.tokenAddress;
  const expectedRuntime = chainConfig.runtime;
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isWalletPending } = useWriteContract();

  const [boxes, setBoxes] = useState<BoxEntry[]>([]);
  const [boxesLoading, setBoxesLoading] = useState(false);
  const [boxesError, setBoxesError] = useState<string | null>(null);
  const boxLoadGeneration = useRef(0);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentWarning, setDeploymentWarning] = useState<string | null>(null);
  const [isDiscoveryValidated, setIsDiscoveryValidated] = useState(false);
  const [isDeploymentValidated, setIsDeploymentValidated] = useState(false);
  const [deploymentAttempt, setDeploymentAttempt] = useState(0);
  const [phase, setPhase] = useState<BoxTransactionPhase>("idle");
  const [transactionHash, setTransactionHash] = useState<Hash | null>(null);
  const [approvalHash, setApprovalHash] = useState<Hash | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const isDeployed = Boolean(boxAddress);
  const isCorrectChain = chainId === selectedChainId;

  const tokenDecimalsQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "tokenDecimals",
    chainId: selectedChainId,
    query: {
      enabled: !suspended && Boolean(boxAddress && isDiscoveryValidated),
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  const liveTokenDecimalsQuery = useReadContract({
    address: tokenAddress,
    abi: BANMAO_ERC20_ABI,
    functionName: "decimals",
    chainId: selectedChainId,
    query: { enabled: !suspended && Boolean(tokenAddress), staleTime: Number.POSITIVE_INFINITY },
  });

  const tokenSymbolQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "tokenSymbol",
    chainId: selectedChainId,
    query: {
      enabled: !suspended && Boolean(boxAddress && isDiscoveryValidated),
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  const liveTokenSymbolQuery = useReadContract({
    address: tokenAddress,
    abi: BANMAO_ERC20_ABI,
    functionName: "symbol",
    chainId: selectedChainId,
    query: { enabled: !suspended && Boolean(tokenAddress), staleTime: Number.POSITIVE_INFINITY },
  });

  const liveTokenNameQuery = useReadContract({
    address: tokenAddress,
    abi: ERC20_NAME_ABI,
    functionName: "name",
    chainId: selectedChainId,
    query: { enabled: !suspended && Boolean(tokenAddress), staleTime: Number.POSITIVE_INFINITY },
  });

  const maxLockDurationQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "MAX_LOCK_DURATION",
    chainId: selectedChainId,
    query: {
      enabled: !suspended && Boolean(boxAddress && isDiscoveryValidated),
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  const tokenIdentity = buildTokenIdentity({
    address: tokenAddress,
    collectionAddress: boxAddress,
    canonicalAddress: chainConfig.tokenAddress,
    liveName: liveTokenNameQuery.data,
    liveSymbol: liveTokenSymbolQuery.data,
    storedSymbol: tokenSymbolQuery.data,
    decimals: liveTokenDecimalsQuery.data ?? tokenDecimalsQuery.data,
  }, genericToken);
  const tokenDecimals = tokenIdentity.decimals;
  const tokenSymbol = tokenIdentity.symbol;
  const maxLockDuration =
    (maxLockDurationQuery.data as bigint | undefined) ?? 100n * 365n * 86_400n;

  const balanceQuery = useReadContract({
    address: tokenAddress,
    abi: BANMAO_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: selectedChainId,
    query: {
      enabled: !suspended && Boolean(address && tokenAddress),
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
      enabled: !suspended && Boolean(address && boxAddress && tokenAddress),
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
      enabled: !suspended && Boolean(address && boxAddress && isDiscoveryValidated),
      refetchInterval: 15_000,
    },
  });

  const totalLockedQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "totalTokensLocked",
    chainId: selectedChainId,
    query: {
      enabled: !suspended && Boolean(boxAddress && isDiscoveryValidated),
      refetchInterval: 15_000,
    },
  });

  const totalSupplyQuery = useReadContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "totalSupply",
    chainId: selectedChainId,
    query: {
      enabled: !suspended && Boolean(boxAddress && isDiscoveryValidated),
      refetchInterval: 15_000,
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function validateDeployment() {
      if (suspended) return;
      setIsDeploymentValidated(false);
      setIsDiscoveryValidated(false);
      setDeploymentError(null);
      setDeploymentWarning(null);
      if (
        !boxAddress ||
        !factoryAddress ||
        !expectedFactoryRendererAddress ||
        !expectedDefaultRendererAddress ||
        !expectedBoxRendererAddress ||
        !publicClient
      ) {
        return;
      }

      try {
        const [
          boxCode,
          factoryCode,
          rendererCode,
          tokenCode,
          registryBox,
          registered,
          underlying,
          boxRenderer,
          factoryRenderer,
          defaultRenderer,
          maxAssets,
          maxBatchSize,
          maxLockDurationValue,
        ] = await Promise.all([
          publicClient.getCode({ address: boxAddress }),
          publicClient.getCode({ address: factoryAddress }),
          publicClient.getCode({ address: expectedFactoryRendererAddress }),
          publicClient.getCode({ address: tokenAddress }),
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
            address: factoryAddress,
            abi: BANMAO_BOX_FACTORY_ABI,
            functionName: "defaultRenderer",
          } as never) as Promise<Address>,
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "MAX_ASSETS_PER_BOX",
          } as never) as Promise<bigint>,
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "MAX_BATCH_SIZE",
          } as never) as Promise<bigint>,
          publicClient.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "MAX_LOCK_DURATION",
          } as never) as Promise<bigint>,
        ]);
        const [activeRendererCode, defaultRendererCode] = await Promise.all([
          publicClient.getCode({ address: boxRenderer }),
          publicClient.getCode({ address: defaultRenderer }),
        ]);
        if (
          !boxCode ||
          boxCode === "0x" ||
          !factoryCode ||
          factoryCode === "0x" ||
          !tokenCode ||
          tokenCode === "0x"
        ) {
          throw new Error("Deployment bytecode is missing");
        }
        if (!expectedRuntime) {
          throw new Error("Verified deployment runtime fingerprints are missing");
        }
        const matchesRuntime = (
          code: `0x${string}`,
          expected: { bytes?: number; keccak256?: string } | undefined,
        ) =>
          Boolean(
            expected &&
              expected.bytes === (code.length - 2) / 2 &&
              expected.keccak256?.toLowerCase() === keccak256(code).toLowerCase(),
          );
        const canonicalCollection =
          chainConfig.boxAddress &&
          isCanonicalBoxCollection(
            tokenAddress,
            boxAddress,
            chainConfig.tokenAddress,
            chainConfig.boxAddress,
          );
        if (
          !matchesRuntime(factoryCode, expectedRuntime.factory) ||
          (canonicalCollection &&
            (!matchesRuntime(tokenCode, expectedRuntime.token) ||
              !matchesRuntime(boxCode, expectedRuntime.box)))
        ) {
          throw new Error("Deployment runtime does not match the verified manifest");
        }
        const validation = validateBanmaoBoxDeployment(
          {
            token: tokenAddress,
            factory: factoryAddress,
            box: boxAddress,
            factoryRenderer: expectedFactoryRendererAddress,
            defaultRenderer: expectedDefaultRendererAddress,
            boxRenderer: expectedBoxRendererAddress,
          },
          { registryBox, registered, underlying, factoryRenderer, defaultRenderer, boxRenderer },
        );
        if (!validation.discoverySafe) throw new Error(validation.fatalError);
        if (
          maxAssets !== 5n ||
          maxBatchSize !== 20n ||
          maxLockDurationValue !== 3_153_600_000n
        ) {
          throw new Error("Collection constants do not match the production BanmaoBox release");
        }
        const runtimeWarnings = [
          !matchesRuntime(rendererCode, expectedRuntime.factoryRenderer)
            ? "Factory provenance renderer runtime does not match the manifest"
            : null,
          !matchesRuntime(defaultRendererCode, expectedRuntime.defaultRenderer)
            ? "Factory default renderer runtime does not match the manifest"
            : null,
          !matchesRuntime(activeRendererCode, expectedRuntime.boxRenderer)
            ? "Canonical Box active renderer runtime does not match the manifest"
            : null,
        ].filter((warning): warning is string => Boolean(warning));
        if (!cancelled) {
          setIsDiscoveryValidated(true);
          setDeploymentWarning([...validation.warnings, ...runtimeWarnings].join(" · ") || null);
          setIsDeploymentValidated(validation.transactionSafe && runtimeWarnings.length === 0);
        }
      } catch (error) {
        if (!cancelled) {
          setIsDiscoveryValidated(false);
          setDeploymentError(getErrorMessage(error));
        }
      }
    }

    void validateDeployment();
    return () => {
      cancelled = true;
    };
  }, [
    boxAddress,
    chainConfig.boxAddress,
    chainConfig.tokenAddress,
    expectedFactoryRendererAddress,
    expectedDefaultRendererAddress,
    expectedBoxRendererAddress,
    factoryAddress,
    publicClient,
    tokenAddress,
    expectedRuntime,
    deploymentAttempt,
    suspended,
  ]);

  const retryDeployment = useCallback(() => {
    setDeploymentAttempt((value) => value + 1);
  }, []);

  const ownedBoxCount = (ownedBoxCountQuery.data as bigint | undefined) ?? 0n;

  const readAssetDisplayMetadata = useCallback(
    async (assetToken: Address) => {
      if (!publicClient) return { decimals: 18, symbol: "TOKEN" };
      const [decimalsResult, symbolResult] = await Promise.allSettled([
        publicClient.readContract({
          address: assetToken,
          abi: BANMAO_ERC20_ABI,
          functionName: "decimals",
        } as never) as Promise<number>,
        publicClient.readContract({
          address: assetToken,
          abi: BANMAO_ERC20_ABI,
          functionName: "symbol",
        } as never) as Promise<string>,
      ]);
      return {
        decimals: normalizeTokenDecimals(
          decimalsResult.status === "fulfilled" ? decimalsResult.value : undefined,
        ),
        symbol: normalizeTokenSymbol(
          symbolResult.status === "fulfilled" ? symbolResult.value : undefined,
        ),
      };
    },
    [publicClient],
  );

  const readBoxAssets = useCallback(
    async (tokenId: bigint): Promise<BoxAsset[]> => {
      if (!publicClient || !boxAddress) return [];
      return normalizeBoxAssets(await publicClient.readContract({
        address: boxAddress,
        abi: BANMAO_BOX_ABI,
        functionName: "getBoxAssets",
        args: [tokenId],
      } as never));
    },
    [boxAddress, publicClient],
  );

  const loadBoxDetails = useCallback(async () => {
    const generation = ++boxLoadGeneration.current;
    if (
      !boxAddress ||
      !publicClient ||
      !address ||
      !isDiscoveryValidated ||
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
      ]);
      const [results, svgResults] = await Promise.all([
        publicClient.multicall({
          contracts,
          allowFailure: true,
        } as never) as Promise<readonly {
          status: "success" | "failure";
          result?: unknown;
        }[]>,
        Promise.allSettled(
          tokenIds.map((tokenId) =>
            publicClient.readContract({
              address: boxAddress,
              abi: BANMAO_BOX_ABI,
              functionName: "renderSVG",
              args: [tokenId],
            } as never) as Promise<string>,
          ),
        ),
      ]);
      const requiredResult = (index: number) => {
        const value = results[index];
        if (value?.status !== "success") {
          throw new Error("Unable to load BanmaoBox details");
        }
        return value.result;
      };
      const assetsByTokenId = await Promise.all(tokenIds.map(readBoxAssets));
      const uniqueAssetTokens = [
        ...new Set(
          assetsByTokenId.flatMap((assets) =>
            assets.map((asset) => asset.token.toLowerCase()),
          ),
        ),
      ];
      const metadataEntries = await Promise.all(
        uniqueAssetTokens.map(async (assetToken) => [
          assetToken,
          await readAssetDisplayMetadata(assetToken as Address),
        ] as const),
      );
      const metadataByToken = new Map(metadataEntries);
      const entries = tokenIds.map((tokenId, index): BoxEntry => {
        const details = requiredResult(index * 2) as readonly [
          bigint,
          Address,
          bigint,
          bigint,
        ];
        const assets = assetsByTokenId[index];
        const svgResult = svgResults[index];
        const primaryAsset = assets.find(
          (asset) => asset.token.toLowerCase() === tokenAddress.toLowerCase(),
        );
        return {
          tokenId,
          amount: primaryAsset?.amount ?? 0n,
          creator: details[1],
          createdAt: details[2],
          unlockTime: details[3],
          canOpen: Boolean(requiredResult(index * 2 + 1)),
          svg:
            svgResult?.status === "fulfilled" && typeof svgResult.value === "string"
              ? svgResult.value
              : undefined,
          assets: assets.map((asset) => {
            const fallback = metadataByToken.get(asset.token.toLowerCase());
            return {
              ...asset,
              decimals: asset.decimals ?? fallback?.decimals,
              symbol: resolveStoredAssetSymbol(asset.symbol, fallback?.symbol, asset.token, genericToken),
            };
          }),
        };
      });
      entries.sort((a, b) =>
        a.unlockTime === b.unlockTime
          ? Number(b.tokenId - a.tokenId)
          : Number(a.unlockTime - b.unlockTime),
      );
      if (generation === boxLoadGeneration.current) setBoxes(entries);
    } catch (error) {
      if (generation === boxLoadGeneration.current) {
        setBoxesError(getErrorMessage(error));
      }
    } finally {
      if (generation === boxLoadGeneration.current) setBoxesLoading(false);
    }
  }, [
    address,
    boxAddress,
    isDiscoveryValidated,
    ownedBoxCount,
    publicClient,
    readAssetDisplayMetadata,
    readBoxAssets,
    tokenAddress,
    genericToken,
  ]);

  useEffect(() => {
    void loadBoxDetails();
  }, [loadBoxDetails]);

  const resetTransaction = useCallback(() => {
    setPhase("idle");
    setTransactionHash(null);
    setApprovalHash(null);
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
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== "success") {
        throw new Error("Transaction reverted");
      }
      return receipt;
    },
    [],
  );

  const waitForApproval = useCallback(
    async (hash: Hash, client: NonNullable<typeof publicClient>) => {
      const receipt = await waitForHash(hash, client);
      setApprovalHash(hash);
      // The approval is complete. Do not present its successful hash as the
      // pending create transaction while the wallet prepares the next request.
      setTransactionHash(null);
      return receipt;
    },
    [waitForHash],
  );

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
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

  const retryBoxes = useCallback(() => {
    void loadBoxDetails();
    void refetchAll();
  }, [loadBoxDetails, refetchAll]);

  const approveToken = useCallback(
    async (amountBaseUnits: bigint) => {
      resetTransaction();
      try {
        if (amountBaseUnits <= 0n) throw new Error("Amount must be greater than zero");
        const { account, boxAddress, client } = await ensureReady();
        setPhase("approving");
        const { request } = await client.simulateContract({
          account,
          address: tokenAddress,
          abi: BANMAO_ERC20_ABI,
          functionName: "approve",
          args: [boxAddress, amountBaseUnits],
        } as never);
        const hash = await writeContractAsync(request as never);
        await waitForApproval(hash, client);
        await allowanceQuery.refetch();
        setPhase("idle");
        return hash;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    }, [
      allowanceQuery,
      ensureReady,
      resetTransaction,
      tokenAddress,
      waitForApproval,
      writeContractAsync,
    ],
  );

  const createBox = useCallback(
    async (recipient: Address, amount: string, lockDurationSec: bigint) => {
      resetTransaction();

      try {
        const { account, boxAddress, client } = await ensureReady();
        const amountBaseUnits = parseUnits(amount, tokenDecimals);
        if (amountBaseUnits <= 0n) {
          throw new Error("Amount must be greater than zero");
        }
        assertLockDuration(lockDurationSec);

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
          await waitForApproval(approvalHash, client);
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
      waitForApproval,
      waitForHash,
      writeContractAsync,
    ],
  );

  const createBoxes = useCallback(
    async (
      entries: readonly { recipient: Address; amount: string }[],
      lockDurationSec: bigint,
    ) => {
      resetTransaction();

      try {
        const { account, boxAddress, client } = await ensureReady();
        if (entries.length === 0 || entries.length > 20) {
          throw new Error("A batch must contain between 1 and 20 boxes");
        }
        const recipients = entries.map((entry) => entry.recipient);
        const amounts = entries.map((entry) => parseUnits(entry.amount, tokenDecimals));
        if (amounts.some((value) => value <= 0n)) {
          throw new Error("Every amount must be greater than zero");
        }
        assertLockDuration(lockDurationSec);
        const totalAmount = amounts.reduce((sum, value) => sum + value, 0n);

        let currentAllowance = (allowanceQuery.data as bigint | undefined) ?? 0n;
        if (currentAllowance < totalAmount) {
          setPhase("approving");
          const { request: approvalRequest } = await client.simulateContract({
            account,
            address: tokenAddress,
            abi: BANMAO_ERC20_ABI,
            functionName: "approve",
            args: [boxAddress, totalAmount],
          } as never);
          const approvalHash = await writeContractAsync(approvalRequest as never);
          await waitForApproval(approvalHash, client);
          currentAllowance = totalAmount;
        }
        if (currentAllowance < totalAmount) {
          throw new Error("Token approval was not sufficient");
        }

        setPhase("creating");
        const { request } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "createBoxes",
          args: [recipients, amounts, lockDurationSec],
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
      allowanceQuery.data,
      ensureReady,
      refetchAll,
      resetTransaction,
      tokenAddress,
      tokenDecimals,
      waitForApproval,
      waitForHash,
      writeContractAsync,
    ],
  );

  const readAsset = useCallback(
    async (assetToken: Address) => {
      if (!publicClient) throw new Error("X Layer RPC is unavailable");
      const code = await publicClient.getCode({ address: assetToken });
      if (!code || code === "0x") throw new Error("Token contract not found");
      const [metadata, balance] = await Promise.all([
        readAssetDisplayMetadata(assetToken),
        address
          ? (publicClient.readContract({
              address: assetToken,
              abi: BANMAO_ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            } as never) as Promise<bigint>)
          : Promise.resolve(0n),
      ]);
      return { token: assetToken, ...metadata, balance };
    },
    [address, publicClient, readAssetDisplayMetadata],
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
        if (!isDeploymentValidated) {
          throw new Error(
            deploymentError ?? "Factory deployment validation is pending",
          );
        }
        await readAsset(primaryToken);
        if (chainId !== selectedChainId) {
          setPhase("switching-chain");
          await switchChainAsync({ chainId: selectedChainId });
        }
        const existing = await resolveCollection(primaryToken);
        if (existing !== "0x0000000000000000000000000000000000000000") {
          return { address: existing, txHash: undefined };
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
        const receipt = await waitForHash(hash, publicClient);
        const createdEvents = receipt.logs.flatMap((log) => {
          if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) return [];
          try {
            const event = decodeEventLog({
              abi: BANMAO_BOX_FACTORY_ABI,
              eventName: "TokenBoxCreated",
              data: log.data,
              topics: [...(log as typeof log & { topics: readonly `0x${string}`[] }).topics] as [`0x${string}`, ...`0x${string}`[]],
            });
            return event.eventName === "TokenBoxCreated" ? [event.args] : [];
          } catch {
            return [];
          }
        });
        if (createdEvents.length !== 1) {
          throw new Error("Receipt must contain exactly one TokenBoxCreated event");
        }
        const event = createdEvents[0] as { token: Address; box: Address };
        if (!sameAddress(event.token, primaryToken)) {
          throw new Error("TokenBoxCreated token does not match the requested token");
        }
        // A successful Factory receipt with the canonical event is the authoritative
        // creation result. Do not turn transient post-receipt RPC reads into a false
        // transaction failure; the server verifier independently checks registry,
        // constructor state, and runtime before submitting to the Explorer.
        const created = getAddress(event.box);
        setPhase("success");
        return { address: created, txHash: hash };
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [address, chainId, deploymentError, factoryAddress, isConnected,
      isDeploymentValidated, publicClient, readAsset, resetTransaction,
      selectedChainId, switchChainAsync, waitForHash, writeContractAsync],
  );

  const createMultiTokenBox = useCallback(
    async (recipient: Address, assets: BasketInput[], lockDurationSec: bigint) => {
      resetTransaction();
      try {
        const { account, boxAddress, client } = await ensureReady();
        if (assets.length < 2 || assets.length > 5) {
          throw new Error("A basket must contain 2 to 5 assets");
        }
        assertLockDuration(lockDurationSec);
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
            await waitForApproval(hash, client);
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
    [ensureReady, refetchAll, resetTransaction, tokenAddress, waitForApproval,
      waitForHash, writeContractAsync],
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
        const receipt = await waitForHash(hash, client);
        const counts = releaseEventCounts(receipt.logs, boxAddress);
        let remainingAssetCount: bigint | null = null;
        try {
          remainingAssetCount = (await client.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "boxAssetCount",
            args: [tokenId],
          } as never)) as bigint;
        } catch {
          if (counts.releasedAssetCount > 0 && counts.failedAssetCount === 0) {
            remainingAssetCount = 0n;
          }
        }
        setPhase("success");
        await refetchAll();
        return { hash, remainingAssetCount, ...counts } satisfies BoxReleaseResult;
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

  const openAsset = useCallback(
    async (
      tokenId: bigint,
      assetIndex: bigint,
      expectedToken: Address,
      expectedAmount: bigint,
    ) => {
      resetTransaction();
      try {
        const { account, boxAddress, client } = await ensureReady();
        setPhase("opening");
        const { request } = await client.simulateContract({
          account,
          address: boxAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "openAsset",
          args: [tokenId, assetIndex, expectedToken, expectedAmount],
        } as never);
        const hash = await writeContractAsync(request as never);
        const receipt = await waitForHash(hash, client);
        const counts = releaseEventCounts(receipt.logs, boxAddress);
        let remainingAssetCount: bigint | null = null;
        try {
          remainingAssetCount = (await client.readContract({
            address: boxAddress,
            abi: BANMAO_BOX_ABI,
            functionName: "boxAssetCount",
            args: [tokenId],
          } as never)) as bigint;
        } catch {
          // One release event does not prove the Box is empty; preserve unknown state.
        }
        setPhase("success");
        await refetchAll();
        return { hash, remainingAssetCount, ...counts } satisfies BoxReleaseResult;
      } catch (error) {
        setPhase("error");
        setTransactionError(getErrorMessage(error));
        throw error;
      }
    },
    [ensureReady, refetchAll, resetTransaction, waitForHash, writeContractAsync],
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
        readBoxAssets(tokenId),
      ]);
      const primaryAsset = assets.find(
        (asset) => asset.token.toLowerCase() === tokenAddress.toLowerCase(),
      );
      const hydratedAssets = await Promise.all(
        assets.map(async (asset) => {
          const fallback = await readAssetDisplayMetadata(asset.token);
          return {
            ...asset,
            decimals: asset.decimals ?? fallback.decimals,
            symbol: resolveStoredAssetSymbol(asset.symbol, fallback.symbol, asset.token, genericToken),
          };
        }),
      );
      return {
        tokenId,
        amount: primaryAsset?.amount ?? 0n,
        creator: details[1],
        createdAt: details[2],
        unlockTime: details[3],
        canOpen: canOpenValue,
        owner,
        svg,
        assets: hydratedAssets,
      };
    },
    [
      boxAddress,
      deploymentError,
      isDeploymentValidated,
      publicClient,
      readAssetDisplayMetadata,
      readBoxAssets,
      tokenAddress,
      genericToken,
    ],
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

  const renderPreview = useCallback(async (rendererAddress: Address, renderData: unknown) => {
    if (!publicClient) throw new Error("Renderer RPC is unavailable");
    return publicClient.readContract({
      address: rendererAddress,
      abi: BANMAO_BOX_RENDERER_ABI,
      functionName: "renderSVG",
      args: [0n, renderData],
    } as never) as Promise<string>;
  }, [publicClient]);

  return {
    address,
    isConnected,
    isCorrectChain,
    isDeployed,
    tokenDecimals,
    tokenSymbol,
    tokenIdentity,
    maxLockDuration,
    tokenBalance: (balanceQuery.data as bigint | undefined) ?? 0n,
    tokenBalanceLoading:
      balanceQuery.data === undefined &&
      !balanceQuery.error &&
      (balanceQuery.isPending || balanceQuery.isFetching),
    tokenBalanceError: balanceQuery.error
      ? getErrorMessage(balanceQuery.error)
      : !tokenAddress && address
        ? "Token address unavailable"
        : null,
    refetchTokenBalance: balanceQuery.refetch,
    allowance: (allowanceQuery.data as bigint | undefined) ?? 0n,
    boxes,
    boxesLoading: boxesLoading || ownedBoxCountQuery.isLoading,
    boxesError,
    retryBoxes,
    deploymentError,
    deploymentWarning,
    isDiscoveryValidated,
    isDeploymentValidated,
    retryDeployment,
    totalLocked: (totalLockedQuery.data as bigint | undefined) ?? 0n,
    totalSupply: (totalSupplyQuery.data as bigint | undefined) ?? 0n,
    renderPreview,
    approveToken,
    createBox,
    createBoxes,
    createMultiTokenBox,
    createCollection,
    resolveCollection,
    readAsset,
    openBox,
    openAsset,
    transferBox,
    refreshMetadata,
    inspectBox,
    refetchAll,
    resetTransaction,
    phase,
    transactionHash,
    approvalHash,
    transactionError,
    isBusy: isWalletPending || !["idle", "success", "error"].includes(phase),
  };
}
