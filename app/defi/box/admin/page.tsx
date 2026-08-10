"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { formatUnits, isAddress, type Address } from "viem";
import {
  Activity,
  ArrowLeft,
  Box,
  CheckCircle2,
  ExternalLink,
  Factory,
  Gift,
  LoaderCircle,
  Search,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { ConnectButton } from "../../../components/wallet/WalletConnection";
import {
  XLAYER_CHAIN_ID,
  XLAYER_TESTNET_CHAIN_ID,
} from "../../../lib/walletConfig";
import {
  BANMAO_BOX_ABI,
  BANMAO_BOX_FACTORY_ABI,
  getBoxChainConfig,
  type BoxAsset,
  type BoxChainId,
  type BoxEntry,
  type InspectedBox,
} from "../contracts";
import { useBox } from "../useBox";
import "./admin.css";

const short = (v?: string) =>
  v ? `${v.slice(0, 8)}…${v.slice(-6)}` : "Not deployed";
const metric = (v: bigint, d: number) => {
  const n = Number(formatUnits(v, d));
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : formatUnits(v, d);
};
export default function BoxOperationsPage() {
  const [network, setNetwork] = useState<BoxChainId>(XLAYER_TESTNET_CHAIN_ID),
    [tokenId, setTokenId] = useState(""),
    [wallet, setWallet] = useState(""),
    [factoryToken, setFactoryToken] = useState("");
  const [inspected, setInspected] = useState<InspectedBox | null>(null),
    [walletBoxes, setWalletBoxes] = useState<BoxEntry[]>([]),
    [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const { address } = useAccount(),
    chainId = useChainId(),
    { switchChainAsync } = useSwitchChain(),
    { writeContractAsync } = useWriteContract(),
    client = usePublicClient({ chainId: network }),
    config = getBoxChainConfig(network),
    box = useBox(network),
    explorer = config.chain.blockExplorers?.default.url;
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
  const createCollection = async (e: FormEvent) => {
    e.preventDefault();
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
      if (chainId !== network) await switchChainAsync({ chainId: network });
      const existing = (await client.readContract({
        address: config.factoryAddress,
        abi: BANMAO_BOX_FACTORY_ABI,
        functionName: "boxForToken",
        args: [factoryToken as Address],
      } as never)) as Address;
      if (existing !== "0x0000000000000000000000000000000000000000")
        throw new Error(`Collection exists: ${existing}`);
      const hash = await writeContractAsync({
        address: config.factoryAddress,
        abi: BANMAO_BOX_FACTORY_ABI,
        functionName: "createTokenBox",
        args: [factoryToken as Address],
        chainId: network,
      } as never);
      await client.waitForTransactionReceipt({ hash });
      setMessage(`Collection created: ${hash}`);
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
  const addresses = [
      ["Underlying", config.tokenAddress],
      ["BanmaoBox", config.boxAddress],
      ["Factory", config.factoryAddress],
      ["Renderer", config.rendererAddress],
    ] as const,
    healthy =
      box.isDeployed && box.isDeploymentValidated && !box.deploymentError;
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
          <div className="ops-network">
            <button
              className={network === XLAYER_CHAIN_ID ? "active" : ""}
              onClick={() => setNetwork(XLAYER_CHAIN_ID)}
            >
              Mainnet
            </button>
            <button
              className={network === XLAYER_TESTNET_CHAIN_ID ? "active" : ""}
              onClick={() => setNetwork(XLAYER_TESTNET_CHAIN_ID)}
            >
              Testnet
            </button>
          </div>
          <ConnectButton
            targetChainId={network}
            supportedChainIds={[XLAYER_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID]}
          />
        </div>
      </header>
      <section className="ops-hero">
        <div>
          <span className="ops-kicker">
            <Activity /> READ-ONLY OPERATIONS
          </span>
          <h1>
            Protocol clarity,
            <br />
            <em>without hidden control.</em>
          </h1>
          <p>
            Monitor immutable deployments and inspect every gift box. There is
            no owner, pause, upgrade or admin withdrawal.
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
          <span>Admin privileges</span>
          <strong>0</strong>
          <small>Trust minimized</small>
        </article>
      </section>
      {message ? <div className="ops-message">{message}</div> : null}
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
            <span className={config.rendererAddress ? "pass" : "fail"}>
              {config.rendererAddress ? <CheckCircle2 /> : <TriangleAlert />}{" "}
              Immutable renderer
            </span>
          </div>
          <div className="ops-addresses">
            {addresses.map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <code title={value}>{short(value)}</code>
                {value ? (
                  <a
                    href={`${explorer}/address/${value}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink />
                  </a>
                ) : null}
              </div>
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
              <div dangerouslySetInnerHTML={{ __html: inspected.svg }} />
              <strong>Box #{inspected.tokenId.toString()}</strong>
              <span>
                {metric(inspected.amount, box.tokenDecimals)} {box.tokenSymbol}
              </span>
              <code>{short(inspected.owner)}</code>
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
            <button disabled={busy || !config.factoryAddress || !address}>
              {busy ? <LoaderCircle className="spin" /> : <Factory />} Create
              collection
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
