"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { isAddress, type Address, type Hash } from "viem";
import {
  Activity,
  ArrowLeft,
  Box,
  CheckCircle2,
  Factory,
  Gift,
  LoaderCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { ConnectButton } from "../../../components/wallet/WalletConnection";
import { XLAYER_CHAIN_ID } from "../../../lib/walletConfig";
import {
  BANMAO_BOX_ABI,
  BANMAO_BOX_FACTORY_ABI,
  BANMAO_ERC20_ABI,
  getBoxChainConfig,
  type BoxAsset,
  type BoxChainId,
  type BoxEntry,
  type InspectedBox,
} from "../contracts";
import { svgImageDataUri } from "../safety";
import { useBox } from "../useBox";
import { requestBanmaoBoxVerification } from "../requestVerification";
import { formatExactTokenAmount } from "../amountFormat";
import { resolveStoredAssetSymbol } from "../transactionPresentation";
import { ExplorerValueRow } from "../ExplorerValueRow";
import { getAdminCreationFixture } from "../adminCreationFixture";
import { useBoundedLoading } from "../useBoundedLoading";
import type { BanmaoBoxVerificationRequest } from "../requestVerification";
import "./admin.css";

const metric = (v: bigint, d: number) => formatExactTokenAmount(v, d, "en");
export default function BoxOperationsPage() {
  const [network] = useState<BoxChainId>(XLAYER_CHAIN_ID),
    [tokenId, setTokenId] = useState(""),
    [wallet, setWallet] = useState(""),
    [factoryToken, setFactoryToken] = useState(""),
    [registryToken, setRegistryToken] = useState(""),
    [registryBox, setRegistryBox] = useState(""),
    [factoryRendererInput, setFactoryRendererInput] = useState(""),
    [boxRendererInput, setBoxRendererInput] = useState("");
  const [rendererRoles, setRendererRoles] = useState<{
    factoryAdmin?: Address;
    boxAdmin?: Address;
    defaultRenderer?: Address;
    boxRenderer?: Address;
  }>({});
  const [createdCollection, setCreatedCollection] = useState<{
    token: Address;
    box: Address;
    txHash?: Hash;
    factory?: Address;
    renderer?: Address;
  } | null>(null);
  const verificationRequestRef = useRef<BanmaoBoxVerificationRequest | undefined>(undefined);
  useEffect(() => () => verificationRequestRef.current?.cancel(), []);
  useEffect(() => {
    const fixture = getAdminCreationFixture(window.location.search);
    if (fixture) setCreatedCollection(fixture);
  }, []);
  const [inspected, setInspected] = useState<InspectedBox | null>(null),
    [walletBoxes, setWalletBoxes] = useState<BoxEntry[]>([]),
    [registryResult, setRegistryResult] = useState<{
      token: Address;
      box: Address;
      registeredBox: Address;
      isRegistered: boolean;
      totalLocked: bigint;
      decimals: number;
      symbol: string;
    } | null>(null),
    [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const { address } = useAccount(),
    client = usePublicClient({ chainId: network }),
    config = getBoxChainConfig(network),
    box = useBox(network),
    explorer = config.chain.blockExplorers?.default.url;
  const { writeContractAsync } = useWriteContract();
  const connectedIsRendererAdmin = Boolean(
    address &&
    rendererRoles.factoryAdmin &&
    rendererRoles.boxAdmin &&
    address.toLowerCase() === rendererRoles.factoryAdmin.toLowerCase() &&
    address.toLowerCase() === rendererRoles.boxAdmin.toLowerCase(),
  );
  const deploymentLoading = !box.isDeploymentValidated && !box.deploymentError;
  const { timedOut: deploymentTimedOut, resetTimeout: resetDeploymentTimeout } =
    useBoundedLoading(deploymentLoading);
  const retryDeployment = () => {
    resetDeploymentTimeout();
    box.retryDeployment();
  };
  useEffect(() => {
    let active = true;
    const loadRendererRoles = async () => {
      if (!client || !config.factoryAddress || !config.boxAddress) {
        if (active) setRendererRoles({});
        return;
      }
      try {
        const [factoryAdmin, boxAdmin, defaultRenderer, boxRenderer] = await Promise.all([
          client.readContract({ address: config.factoryAddress, abi: BANMAO_BOX_FACTORY_ABI, functionName: "rendererAdmin" } as never) as Promise<Address>,
          client.readContract({ address: config.boxAddress, abi: BANMAO_BOX_ABI, functionName: "rendererAdmin" } as never) as Promise<Address>,
          client.readContract({ address: config.factoryAddress, abi: BANMAO_BOX_FACTORY_ABI, functionName: "defaultRenderer" } as never) as Promise<Address>,
          client.readContract({ address: config.boxAddress, abi: BANMAO_BOX_ABI, functionName: "renderer" } as never) as Promise<Address>,
        ]);
        if (active) {
          setRendererRoles({ factoryAdmin, boxAdmin, defaultRenderer, boxRenderer });
          setFactoryRendererInput((value) => value || defaultRenderer);
          setBoxRendererInput((value) => value || boxRenderer);
        }
      } catch {
        if (active) setRendererRoles({});
      }
    };
    void loadRendererRoles();
    return () => { active = false; };
  }, [client, config.factoryAddress, config.boxAddress]);
  const inspect = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setInspected(null);
    if (!/^\d+$/.test(tokenId)) return setMessage("Enter a valid token ID.");
    setBusy(true);
    try {
      setInspected(await box.inspectBox(BigInt(tokenId)));
    } catch {
      setMessage("Box not found or deployment unavailable.");
    } finally {
      setBusy(false);
    }
  };
  const findWallet = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setWalletBoxes([]);
    if (!isAddress(wallet) || !client || !config.boxAddress)
      return setMessage("Enter a valid wallet address.");
    setBusy(true);
    try {
      const tokenIds = (await client.readContract({
        address: config.boxAddress,
        abi: BANMAO_BOX_ABI,
        functionName: "getBoxesByOwner",
        args: [wallet as Address, 0n, 100n],
      } as never)) as readonly bigint[];
      const [details, assets] = await Promise.all([
        Promise.all(
          tokenIds.map(
            (id) =>
              client.readContract({
                address: config.boxAddress,
                abi: BANMAO_BOX_ABI,
                functionName: "boxDetails",
                args: [id],
              } as never) as Promise<readonly [bigint, Address, bigint, bigint]>,
          ),
        ),
        Promise.all(
          tokenIds.map(
            (id) =>
              client.readContract({
                address: config.boxAddress,
                abi: BANMAO_BOX_ABI,
                functionName: "getBoxAssets",
                args: [id],
              } as never) as Promise<readonly BoxAsset[]>,
          ),
        ),
      ]);
      setWalletBoxes(
        tokenIds.map((id, index) => ({
          tokenId: id,
          amount: details[index][0],
          creator: details[index][1],
          createdAt: details[index][2],
          unlockTime: details[index][3],
          canOpen: BigInt(Math.floor(Date.now() / 1000)) >= details[index][3],
          assets: assets[index].map((asset) => ({ ...asset })),
        })),
      );
    } catch {
      setMessage("Unable to load wallet portfolio.");
    } finally {
      setBusy(false);
    }
  };
  const lookupRegistry = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setRegistryResult(null);
    if (
      !isAddress(registryToken) ||
      !isAddress(registryBox) ||
      !client ||
      !config.factoryAddress
    ) {
      return setMessage("Enter valid ERC-20 and Box addresses.");
    }
    setBusy(true);
    try {
      const token = registryToken as Address;
      const candidateBox = registryBox as Address;
      const [registeredBox, isRegistered, decimalsResult, symbolResult] =
        await Promise.all([
          client.readContract({
            address: config.factoryAddress,
            abi: BANMAO_BOX_FACTORY_ABI,
            functionName: "boxForToken",
            args: [token],
          } as never) as Promise<Address>,
          client.readContract({
            address: config.factoryAddress,
            abi: BANMAO_BOX_FACTORY_ABI,
            functionName: "isTokenBox",
            args: [candidateBox],
          } as never) as Promise<boolean>,
          client
            .readContract({
              address: token,
              abi: BANMAO_ERC20_ABI,
              functionName: "decimals",
            } as never)
            .catch(() => 18),
          client
            .readContract({
              address: token,
              abi: BANMAO_ERC20_ABI,
              functionName: "symbol",
            } as never)
            .catch(() => "TOKEN"),
        ]);
      const totalLocked = isRegistered
        ? ((await client.readContract({
            address: candidateBox,
            abi: BANMAO_BOX_ABI,
            functionName: "totalLockedByToken",
            args: [token],
          } as never)) as bigint)
        : 0n;
      setRegistryResult({
        token,
        box: candidateBox,
        registeredBox,
        isRegistered,
        totalLocked,
        decimals: Number(decimalsResult),
        symbol: resolveStoredAssetSymbol("TOKEN", symbolResult, token, "TOKEN"),
      });
    } catch {
      setMessage("Unable to query the Factory registry or Box accounting.");
    } finally {
      setBusy(false);
    }
  };
  const createCollection = async (e: FormEvent) => {
    e.preventDefault();
    verificationRequestRef.current?.cancel();
    verificationRequestRef.current = undefined;
    setMessage(null);
    if (
      !address ||
      !isAddress(factoryToken) ||
      !client ||
      !config.factoryAddress
    )
      return setMessage("Connect a wallet and enter a valid ERC-20.");
    setBusy(true);
    try {
      const created = await box.createCollection(factoryToken as Address);
      setCreatedCollection({
        token: factoryToken as Address,
        box: created.address,
        txHash: created.txHash,
        factory: config.factoryAddress,
        renderer: config.defaultRendererAddress,
      });
      setMessage(`Collection ready: ${created.address}`);
      if (created.txHash) {
        verificationRequestRef.current = requestBanmaoBoxVerification(created.txHash);
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message.split("\n")[0]
          : "Transaction failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const updateRenderer = async (
    target: "factory" | "box",
    candidate: string,
  ) => {
    setMessage(null);
    if (!client || !address || !connectedIsRendererAdmin) {
      return setMessage("Connect the immutable renderer-admin wallet to use this control.");
    }
    if (!isAddress(candidate)) return setMessage("Enter a valid renderer contract address.");
    const contractAddress = target === "factory" ? config.factoryAddress : config.boxAddress;
    if (!contractAddress) return setMessage("The target contract is not deployed on this network.");
    setBusy(true);
    try {
      const renderer = candidate as Address;
      let hash: Hash;
      if (target === "factory") {
        const { request } = await client.simulateContract({
          account: address,
          address: contractAddress,
          abi: BANMAO_BOX_FACTORY_ABI,
          functionName: "setDefaultRenderer",
          args: [renderer],
        } as never);
        hash = await writeContractAsync(request as never);
      } else {
        const { request } = await client.simulateContract({
          account: address,
          address: contractAddress,
          abi: BANMAO_BOX_ABI,
          functionName: "setRenderer",
          args: [renderer],
        } as never);
        hash = await writeContractAsync(request as never);
      }
      setMessage("Transaction submitted. Waiting for confirmation…");
      await client.waitForTransactionReceipt({ hash });
      setRendererRoles((current) => target === "factory"
        ? { ...current, defaultRenderer: renderer }
        : { ...current, boxRenderer: renderer });
      setMessage(`${target === "factory" ? "Factory default" : "Collection"} renderer updated: ${renderer}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message.split("\n")[0] : "Renderer update failed.");
    } finally {
      setBusy(false);
    }
  };
  const addresses = [
      ["Underlying", config.tokenAddress],
      ["BanmaoBox", config.boxAddress],
      ["Factory", config.factoryAddress],
      ["Factory provenance Renderer", config.factoryRendererAddress],
      ["Factory default Renderer", config.defaultRendererAddress],
      ["Canonical Box Renderer", config.boxRendererAddress],
    ] as const,
    healthy =
      box.isDeployed && box.isDeploymentValidated && !box.deploymentError;
  const displayedCollection = createdCollection;
  return (
    <main className="box-ops">
      <header className="ops-header">
        <div>
          <Link href="/defi/box">
            <ArrowLeft /> User app
          </Link>
          <span>BanmaoBox / Operations</span>
        </div>
        <div className="ops-header__actions">
          <div className="ops-network" aria-label="Active network">
            <span className="active">X Layer Mainnet · 196</span>
          </div>
          <ConnectButton
            targetChainId={network}
            supportedChainIds={[XLAYER_CHAIN_ID]}
          />
        </div>
      </header>
      <section className="ops-hero">
        <div>
          <span className="ops-kicker">
            <Activity /> ON-CHAIN OPERATIONS
          </span>
          <h1>
            Protocol clarity,
            <br />
            <em>without hidden control.</em>
          </h1>
          <p>
            Monitor immutable deployments, inspect every gift box and manage metadata renderers with the immutable renderer-admin wallet. There is no pause, proxy upgrade, early unlock or admin withdrawal.
          </p>
        </div>
        <div className={`ops-health ${healthy ? "healthy" : "warning"}`}>
          {healthy ? <ShieldCheck /> : <TriangleAlert />}
          <span>
            {healthy
              ? "Deployment verified"
              : box.isDeployed
                ? "Verification pending"
                : "Not deployed"}
          </span>
          <small>
            {config.chain.name} · {network}
          </small>
        </div>
      </section>
      <section className="ops-metrics">
        <article>
          <span>Locked</span>
          <strong>{metric(box.totalLocked, box.tokenDecimals)}</strong>
          <small>{box.tokenSymbol}</small>
        </article>
        <article>
          <span>Active NFTs</span>
          <strong>{box.totalSupply.toString()}</strong>
          <small>ERC-721 boxes</small>
        </article>
        <article>
          <span>Max lock</span>
          <strong>
            {(Number(box.maxLockDuration) / 31_536_000).toFixed(0)}y
          </strong>
          <small>Immutable</small>
        </article>
        <article>
          <span>Admin scope</span>
          <strong>Renderer</strong>
          <small>Metadata only · no custody</small>
        </article>
      </section>
      {message ? <div className="ops-message">{message}</div> : null}
      {deploymentTimedOut ? (
        <div className="ops-message" role="status">
          Deployment data is taking longer than expected. Check your connection and try again.
          <button type="button" onClick={retryDeployment}>Retry</button>
        </div>
      ) : null}
      <section className="ops-grid">
        <article className="ops-panel ops-contracts">
          <header>
            <ShieldCheck />
            <span>
              <strong>Deployment registry</strong>
              <small>Manifest and runtime checks</small>
            </span>
          </header>
          <div className="ops-checks">
            <span className={healthy ? "pass" : "fail"}>
              {healthy ? <CheckCircle2 /> : <TriangleAlert />} Runtime
              invariants
            </span>
            <span className={config.factoryAddress ? "pass" : "fail"}>
              {config.factoryAddress ? <CheckCircle2 /> : <TriangleAlert />}{" "}
              Factory registry
            </span>
            <span className={config.factoryRendererAddress ? "pass" : "fail"}>
              {config.factoryRendererAddress ? <CheckCircle2 /> : <TriangleAlert />}{" "}
              Immutable renderer
            </span>
          </div>
          <div className="ops-addresses">
            {addresses.map(([name, value]) => (
              value && explorer ? (
                <ExplorerValueRow
                  key={name}
                  label={name}
                  value={value}
                  kind="address"
                  explorerBaseUrl={explorer}
                  copyLabel={`Copy ${name} address`}
                  onCopied={(label) => setMessage(`${label} copied.`)}
                  onCopyFailed={() => setMessage("Unable to copy address.")}
                />
              ) : null
            ))}
          </div>
        </article>
        <article className="ops-panel">
          <header>
            <Search />
            <span>
              <strong>Box inspector</strong>
              <small>Verify one live token</small>
            </span>
          </header>
          <form className="ops-form" onSubmit={inspect}>
            <input
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value.trim())}
              inputMode="numeric"
              placeholder="Token ID"
            />
            <button disabled={busy || !box.isDeploymentValidated}>
              {busy ? <LoaderCircle className="spin" /> : <Search />} Inspect
            </button>
          </form>
          {inspected ? (
            <div className="ops-inspected">
              <Image
                src={svgImageDataUri(inspected.svg)}
                alt={`On-chain artwork for Box #${inspected.tokenId.toString()}`}
                width={600}
                height={600}
                unoptimized
              />
              <strong>Box #{inspected.tokenId.toString()}</strong>
              <span>
                {metric(inspected.amount, box.tokenDecimals)} {box.tokenSymbol}
              </span>
              <code>{inspected.owner}</code>
            </div>
          ) : (
            <div className="ops-placeholder">
              <Gift />
              <span>On-chain NFT artwork</span>
            </div>
          )}
        </article>
        <article className="ops-panel">
          <header>
            <Wallet />
            <span>
              <strong>Wallet portfolio</strong>
              <small>Up to 100 owned boxes</small>
            </span>
          </header>
          <form className="ops-form" onSubmit={findWallet}>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              placeholder="0x wallet address"
            />
            <button disabled={busy || !box.isDeploymentValidated}>
              <Search /> Load
            </button>
          </form>
          <div className="ops-box-list">
            {walletBoxes.length ? (
              walletBoxes.map((item) => (
                <div key={item.tokenId.toString()}>
                  <Box />
                  <strong>#{item.tokenId.toString()}</strong>
                  <span>
                    {metric(item.amount, box.tokenDecimals)} {box.tokenSymbol}
                  </span>
                  <small>
                    {item.canOpen ? "READY" : "LOCKED"} · {item.assets.length} ASSET{item.assets.length === 1 ? "" : "S"}
                  </small>
                </div>
              ))
            ) : (
              <div className="ops-placeholder">
                <Wallet />
                <span>No wallet loaded</span>
              </div>
            )}
          </div>
        </article>
        <article className="ops-panel ops-registry">
          <header>
            <ShieldCheck />
            <span>
              <strong>Factory registry lookup</strong>
              <small>boxForToken · isTokenBox · totalLockedByToken</small>
            </span>
          </header>
          <form className="ops-form ops-form--stacked" onSubmit={lookupRegistry}>
            <input
              value={registryToken}
              onChange={(e) => setRegistryToken(e.target.value.trim())}
              placeholder="ERC-20 token address"
            />
            <input
              value={registryBox}
              onChange={(e) => setRegistryBox(e.target.value.trim())}
              placeholder="Candidate Box address"
            />
            <button disabled={busy || !config.factoryAddress}>
              {busy ? <LoaderCircle className="spin" /> : <Search />} Query registry
            </button>
          </form>
          {registryResult ? (
            <dl className="ops-registry__result">
              <div>
                <dt>boxForToken</dt>
                <dd>
                  {explorer ? (
                    <ExplorerValueRow
                      label="Registered Box"
                      value={registryResult.registeredBox}
                      kind="address"
                      explorerBaseUrl={explorer}
                      copyLabel="Copy registered Box address"
                      onCopied={(label) => setMessage(`${label} copied.`)}
                      onCopyFailed={() => setMessage("Unable to copy address.")}
                    />
                  ) : <code>{registryResult.registeredBox}</code>}
                </dd>
              </div>
              <div>
                <dt>isTokenBox</dt>
                <dd className={registryResult.isRegistered ? "pass" : "fail"}>
                  {registryResult.isRegistered ? "Registered" : "Not registered"}
                </dd>
              </div>
              <div>
                <dt>totalLockedByToken</dt>
                <dd>
                  {registryResult.isRegistered
                    ? `${metric(registryResult.totalLocked, registryResult.decimals)} ${registryResult.symbol}`
                    : "Not queried for an unregistered Box"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="ops-placeholder">
              <Search />
              <span>Enter a token and candidate Box address</span>
            </div>
          )}
        </article>
        <article className="ops-panel ops-renderer-admin">
          <header>
            <SlidersHorizontal />
            <span>
              <strong>Renderer administration</strong>
              <small>Immutable role · metadata and SVG only</small>
            </span>
          </header>
          <div className={`ops-access ${connectedIsRendererAdmin ? "pass" : "restricted"}`}>
            {connectedIsRendererAdmin ? <CheckCircle2 /> : <ShieldCheck />}
            <span>
              <strong>{connectedIsRendererAdmin ? "Renderer-admin wallet verified" : "Owner wallet required"}</strong>
              <small>
                {address
                  ? connectedIsRendererAdmin
                    ? address
                    : `Connected wallet has read-only access. Required: ${rendererRoles.factoryAdmin ?? "loading…"}`
                  : `Connect renderer admin: ${rendererRoles.factoryAdmin ?? "loading…"}`}
              </small>
            </span>
          </div>
          {rendererRoles.factoryAdmin && rendererRoles.boxAdmin && rendererRoles.factoryAdmin.toLowerCase() !== rendererRoles.boxAdmin.toLowerCase() ? (
            <div className="ops-warning" role="alert"><TriangleAlert /> Factory and Box renderer-admin roles do not match. Writes are disabled.</div>
          ) : null}
          <dl className="ops-renderer-state">
            <div><dt>Factory renderer admin</dt><dd>{rendererRoles.factoryAdmin ?? "Loading…"}</dd></div>
            <div><dt>Box renderer admin</dt><dd>{rendererRoles.boxAdmin ?? "Loading…"}</dd></div>
            <div><dt>Default renderer</dt><dd>{rendererRoles.defaultRenderer ?? "Loading…"}</dd></div>
            <div><dt>Canonical Box renderer</dt><dd>{rendererRoles.boxRenderer ?? "Loading…"}</dd></div>
          </dl>
          {connectedIsRendererAdmin ? (
            <div className="ops-renderer-forms">
              <form className="ops-form ops-form--renderer" onSubmit={(event) => { event.preventDefault(); void updateRenderer("factory", factoryRendererInput); }}>
                <label htmlFor="factory-renderer">Future collections</label>
                <small>Calls Factory.setDefaultRenderer. Existing collections stay unchanged.</small>
                <input id="factory-renderer" value={factoryRendererInput} onChange={(event) => setFactoryRendererInput(event.target.value.trim())} placeholder="0x renderer contract" spellCheck={false} />
                <button disabled={busy || !isAddress(factoryRendererInput)}>{busy ? <LoaderCircle className="spin" /> : <SlidersHorizontal />} Set default</button>
              </form>
              <form className="ops-form ops-form--renderer" onSubmit={(event) => { event.preventDefault(); void updateRenderer("box", boxRendererInput); }}>
                <label htmlFor="box-renderer">Current canonical collection</label>
                <small>Calls BanmaoBox.setRenderer and emits an ERC-4906 metadata refresh.</small>
                <input id="box-renderer" value={boxRendererInput} onChange={(event) => setBoxRendererInput(event.target.value.trim())} placeholder="0x renderer contract" spellCheck={false} />
                <button disabled={busy || !isAddress(boxRendererInput)}>{busy ? <LoaderCircle className="spin" /> : <SlidersHorizontal />} Set renderer</button>
              </form>
            </div>
          ) : null}
          <div className="ops-warning"><TriangleAlert /> Renderer contracts must support both required ERC-165 renderer interfaces. The transaction is simulated before the wallet prompt. This role cannot withdraw assets, pause boxes or unlock early.</div>
        </article>
        <article className="ops-panel ops-factory">
          <header>
            <Factory />
            <span>
              <strong>Permissionless Factory</strong>
              <small>Canonical collection per ERC-20</small>
            </span>
          </header>
          <div className="ops-warning">
            <TriangleAlert /> Not an admin action. Anyone can call the immutable
            Factory once per compatible token.
          </div>
          <form className="ops-form" onSubmit={createCollection}>
            <input
              value={factoryToken}
              onChange={(e) => setFactoryToken(e.target.value.trim())}
              placeholder="ERC-20 token address"
            />
            <button
              disabled={
                busy ||
                !config.factoryAddress ||
                !address ||
                !box.isDeploymentValidated
              }
            >
              {busy ? <LoaderCircle className="spin" /> : <Factory />} Create
              collection
            </button>
          </form>
          {displayedCollection && explorer ? (
            <div className="ops-created-collection">
              <ExplorerValueRow label="ERC-20 token" value={displayedCollection.token} kind="address" explorerBaseUrl={explorer} copyLabel="Copy ERC-20 token address" onCopied={(label) => setMessage(`${label} copied.`)} onCopyFailed={() => setMessage("Unable to copy value.")} />
              <ExplorerValueRow label="Collection" value={displayedCollection.box} kind="address" explorerBaseUrl={explorer} copyLabel="Copy collection address" onCopied={(label) => setMessage(`${label} copied.`)} onCopyFailed={() => setMessage("Unable to copy value.")} />
              {displayedCollection.txHash ? <ExplorerValueRow label="Creation transaction" value={displayedCollection.txHash} kind="tx" explorerBaseUrl={explorer} copyLabel="Copy creation transaction hash" onCopied={(label) => setMessage(`${label} copied.`)} onCopyFailed={() => setMessage("Unable to copy value.")} /> : null}
              {displayedCollection.factory ? <ExplorerValueRow label="Factory" value={displayedCollection.factory} kind="address" explorerBaseUrl={explorer} copyLabel="Copy Factory address" onCopied={(label) => setMessage(`${label} copied.`)} onCopyFailed={() => setMessage("Unable to copy value.")} /> : null}
              {displayedCollection.renderer ? <ExplorerValueRow label="Renderer" value={displayedCollection.renderer} kind="address" explorerBaseUrl={explorer} copyLabel="Copy Renderer address" onCopied={(label) => setMessage(`${label} copied.`)} onCopyFailed={() => setMessage("Unable to copy value.")} /> : null}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
