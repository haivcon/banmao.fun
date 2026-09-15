"use client";
import { metadataTraits } from "./composition";
import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { decodeEventLog, erc20Abi, formatUnits, zeroAddress, type Hash, type PublicClient } from "viem";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT as deployment, banmaoKingMintReady } from "./deployment";
import { kingAbi, kingAddress, paymentAddress, validateMintState, decodeKingMetadata } from "./mint";
import { KING_T, kingError, type Lang } from "./i18n";
import { identifiedKingImage, kingSharePath } from "./identity";
import { animatedKingImage } from "./animated-image";

export default function KingMint({ lang }: { lang: Lang }) {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<{ supply: bigint; max: bigint; balance: bigint; allowance: bigint }>();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [readRetry, setReadRetry] = useState(0);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [tokenId, setTokenId] = useState<bigint>();
  const [metadata, setMetadata] = useState<ReturnType<typeof decodeKingMetadata>>();
  const [displayImage, setDisplayImage] = useState<string>();
  const [reload, setReload] = useState(0);
  const t = KING_T[lang];
  const price = BigInt(deployment.mintPrice);
  const storageKey = `king:196:${kingAddress}:${address}`;
  useEffect(() => {
    let active = true;
    setPending(false); setState(undefined); setHash(undefined); setTokenId(undefined); setMetadata(undefined); setMessage("");
    try { const saved = localStorage.getItem(storageKey); if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) { setHash(saved as Hash); setPending(true); } } catch { /* Storage is optional. */ }
    async function refresh() {
      if (!client) return;
      try {
        const [supply, max, balance, allowance] = await Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
          address ? client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] }) : 0n,
          address ? client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address, kingAddress] }) : 0n,
        ]);
        if (active) { setState({ supply, max, balance, allowance }); setReadFailed(false); }
      } catch { if (active) { setState(undefined); setReadFailed(true); } }
    }
    void refresh(); const timer = setInterval(refresh, 12000);
    return () => { active = false; clearInterval(timer); };
  }, [client, address, storageKey, readRetry]);
  useEffect(() => {
    if (!hash || !client || !address) return;
    let active = true;
    const timer = setInterval(check, 5000);
    async function check() {
      if (!client || !hash) return;
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (!active) return;
        clearInterval(timer);
        // A mined receipt is terminal, including a reverted approval/mint.
        // This also releases transactions restored from localStorage on reload.
        setPending(false);
        setMessage(t.confirmed);
        void Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address!] }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address!, kingAddress] }),
        ]).then(([supply, max, balance, allowance]) => {
          if (active) setState({ supply, max, balance, allowance });
        }).catch(() => { /* Regular balance polling retries failed reads. */ });
        if (receipt.status === "reverted") { setMessage(t.reverted); return; }
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== kingAddress.toLowerCase()) continue;
          try {
            const event = decodeEventLog({ abi: kingAbi, eventName: "KingMinted", data: log.data, topics: (log as typeof log & { topics: [Hash, ...Hash[]] }).topics });
            if (event.args.to.toLowerCase() === address?.toLowerCase()) setTokenId(event.args.tokenId);
          } catch { /* Ignore other logs. */ }
        }
      } catch { /* Receipt may still be pending; keep polling. */ }
    }
    void check(); return () => { active = false; clearInterval(timer); };
  }, [hash, client, address, t]);
  useEffect(() => {
    let active = true;
    setMetadata(undefined);
    setDisplayImage(undefined);
    if (tokenId !== undefined && client) client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "tokenURI", args: [tokenId] }).then(uri => {
      if (!active) return;
      const decoded = decodeKingMetadata(uri);
      const image = identifiedKingImage(animatedKingImage(decoded.image), metadataTraits(decoded.attributes));
      setMetadata(decoded);
      setDisplayImage(image);
    }).catch(() => { if (active) setMessage(t.imageError); });
    return () => { active = false; };
  }, [tokenId, client, t, reload]);
  async function transact() {
    if (pending || lock.current || !client || !wallet || !address || !banmaoKingMintReady()) return;
    lock.current = true; setBusy(true); setMessage("");
    let sent: Hash | undefined;
    try {
      if (chainId !== 196 || await wallet.getChainId() !== 196) throw new Error("Switch to X Layer");
      const [current] = await wallet.getAddresses();
      if (current.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet changed");
      const [actualPrice, accepted, supply, max, native, balance, allowance, gas] = await Promise.all([
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "mintPrice", args: [paymentAddress] }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "isPaymentToken", args: [paymentAddress] }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "isPaymentToken", args: [zeroAddress] }),
        client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
        client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address, kingAddress] }),
        client.getBalance({ address }),
      ]);
      validateMintState(actualPrice, accepted && !native, supply, max);
      if (!state || (state.allowance >= price) !== (allowance >= price) || (state.allowance > 0n && state.allowance < price) !== (allowance > 0n && allowance < price)) throw new Error("Allowance updated. Wait for refresh before confirming the next step.");
      if (balance < price) throw new Error("Not enough BANMAO");
      if (gas === 0n) throw new Error("Need OKB for network gas");
      if (allowance < price) {
        const simulation = await client.simulateContract({ account: address, address: paymentAddress, abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] });
        sent = await wallet.writeContract(simulation.request);
      } else {
        setTokenId(undefined); setMetadata(undefined);
        const simulation = await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, functionName: "mint", args: [address, paymentAddress], value: 0n });
        sent = await wallet.writeContract(simulation.request);
      }
      setHash(sent); setPending(true);
      try { localStorage.setItem(storageKey, sent); } catch { /* Optional storage. */ }
      setMessage(t.submitted);
      const receipt = await client.waitForTransactionReceipt({ hash: sent, timeout: 180000, onReplaced: ({ transaction }) => { setHash(transaction.hash); try { localStorage.setItem(storageKey, transaction.hash); } catch { /* Optional storage. */ } } });
      setPending(false);
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setMessage(t.confirmed);
    } catch (error) {
      setMessage(sent ? t.pendingWarning : kingError(error, t));
    } finally { setBusy(false); lock.current = false; }
  }
  return <section className="king-mint-box" aria-label={t.mint}>
    <div className="king-mint-title"><h2>{t.mint} · Banmao King</h2><span className="king-preview-badge">{t.verified}</span></div>
    <p><strong>{new Intl.NumberFormat(lang).format(6666)} BANMAO / NFT</strong> · {state ? `${new Intl.NumberFormat(lang).format(state.supply)} / ${new Intl.NumberFormat(lang).format(state.max)}` : t.loading}</p>
    <p>{t.mintNote}</p><p className="king-chip">{t.gas}</p>{state && <progress aria-label={t.supply} value={Number(state.supply)} max={Number(state.max)} />}
    {address && <p>{t.balance} · BANMAO: {state ? formatUnits(state.balance, 18) : "—"}</p>}
    <div className="king-wallet-row"><ConnectButton accountStatus="address" chainStatus="none" showBalance={false} label={t.connect} />
      {address && chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setMessage(t.switchHelp))}>{t.switchNetwork}</button> : <button type="button" disabled={!address || !state || busy || pending || state.balance < price || state.supply >= state.max} onClick={() => void transact()}>{busy || pending ? t.processing : !state ? t.waiting : state.supply >= state.max ? t.soldOut : state.balance < price ? t.insufficient : state.allowance >= price ? t.mintAction : state.allowance > 0n ? t.resetAllowance : t.approve}</button>}
    </div>
    {readFailed && <div role="status"><p>{t.readError}</p><button type="button" disabled={busy || pending} onClick={() => { setReadFailed(false); setReadRetry(n => n + 1); }}>{t.retry}</button></div>}
    <p role="status" aria-live="polite">{message}</p>
    {hash && <a href={`https://www.oklink.com/xlayer/tx/${hash}`} target="_blank" rel="noopener noreferrer">{t.transaction}</a>}
    {tokenId !== undefined && (
      <div>
        <h3>{t.success} #{tokenId.toString()}</h3>
        <p><a href={kingSharePath(tokenId)}>{lang === "vi" ? "Tra cứu / chia sẻ NFT" : "Look up / share NFT"}</a></p>
        {displayImage && <a href={displayImage} download={`BanmaoKing-${tokenId}-preview.svg`}>{lang === "vi" ? "Tải bản xem thử có mã số" : "Download preview with ID"}</a>}
        {metadata ? (
          <>
            {/* On-chain SVG data URI: render the original without an image optimization proxy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImage} onError={() => { setMetadata(undefined); setDisplayImage(undefined); setMessage(t.imageError); }} alt={metadata.name} width={320} height={320} style={{ maxWidth: "100%", height: "auto" }} />
            <p>{metadata.attributes.map(a => `${a.trait_type}: ${a.value}`).join(" · ")}</p>
          </>
        ) : (
          <button type="button" onClick={() => setReload(n => n + 1)}>{t.reloadImage}</button>
        )}
      </div>
    )}
    <p>{t.postMint}</p>
    {metadata && <a href={metadata.image} download={`BanmaoKing-${tokenId}.svg`}>{t.download}</a>}
    <details><summary>{t.details}</summary>
      <p>{t.step2Desc}</p>
      <p>{t.faq1Answer}</p>
      <p>{t.payment} {paymentAddress}</p>
      <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer">NFT: {kingAddress} ↗</a>
    </details>
  </section>;
}
