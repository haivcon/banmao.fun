"use client";
import { kingCheckoutCopy } from './i18n/checkout';
import { localizedKingAttribute } from './i18n/traits';
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { metadataTraits } from "./composition";
import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { decodeEventLog, encodeFunctionData, erc20Abi, formatUnits, zeroAddress, type Hash, type PublicClient } from "viem";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT as deployment, banmaoKingMintReady } from "./deployment";
import { kingAbi, kingAddress, paymentAddress, validateMintState, decodeKingMetadata, parseKingRecipients } from "./mint";
import { KING_T, kingError, type Lang } from "./i18n";
import { identifiedKingImage, kingSharePath } from "./identity";
import { animatedKingImage } from "./animated-image";
import KingMetadataRefresh from "./KingMetadataRefresh";
import { Wallet, Gift, Users, Check, ShieldCheck } from "lucide-react";
import KingMintResult from './KingMintResult';
import { mintResultState, isMintSignatureRejected, type MintFailure } from './mint-result';
import { MINT_RESULT_COPY } from './i18n/mint-result';
import "./recipients.css";
import KingRecipientEditor from './KingRecipientEditor';
import KingExpandableList from './KingExpandableList';
import KingBanmaoGuide from './KingBanmaoGuide';
import { notifyKingSound } from './king-sound';

export default function KingMint({ lang, onBusyChange }: { lang: Lang; onBusyChange?: (busy: boolean) => void }) {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<{ supply: bigint; max: bigint; balance: bigint; allowance: bigint }>();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'signing' | 'confirmed' | 'failed'>('idle');
  const [failure, setFailure] = useState<MintFailure>('error');
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    if (phase === 'confirmed') notifyKingSound('success');
    if (phase === 'failed' && failure !== 'cancelled') notifyKingSound('error');
  }, [phase, failure]);
  const [operation, setOperation] = useState<'approve' | 'reset' | 'mint'>();
  const [pending, setPending] = useState(false);
  useEffect(() => { onBusyChange?.(busy || pending); }, [busy, pending, onBusyChange]);
  const [readFailed, setReadFailed] = useState(false);
  const [readRetry, setReadRetry] = useState(0);
  const lock = useRef(false);
  const checkout = useRef<HTMLDivElement>(null);
  function reviewCheckout() {
    checkout.current?.focus({ preventScroll: true });
    checkout.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [tokenId, setTokenId] = useState<bigint>();
  const [metadata, setMetadata] = useState<ReturnType<typeof decodeKingMetadata>>();
  const [displayImage, setDisplayImage] = useState<string>();
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const t = KING_T[lang];
  const [mode, setMode] = useState("self");
  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rows, setRows] = useState("");
  const [minted, setMinted] = useState<{ to: string; id: bigint }[]>([]);
  let plan: ReturnType<typeof parseKingRecipients> | undefined;
  let inputError = "";
  try {
    plan = parseKingRecipients(mode === "multi" ? rows : `${mode === "self" ? address || "" : recipient},${quantity}`);
    if (!deployment.supportsBatchMint && plan.total > 1n) throw new Error(kingCheckoutCopy(lang, "This deployment only supports single mint."));
  } catch (error) {
    inputError = error instanceof Error && error.message === kingCheckoutCopy(lang, 'This deployment only supports single mint.')
      ? error.message : kingCheckoutCopy(lang, 'Complete valid recipient addresses and quantities.');
    plan = undefined;
  }
  const price = BigInt(deployment.mintPrice) * (plan?.total ?? 1n);

  const storageKey = `king:196:${kingAddress}:${address}`;
  const session = useRef({ address, chainId });
  if (session.current.address !== address || session.current.chainId !== chainId) session.current = { address, chainId };
  useEffect(() => {
    session.current = { address, chainId };
    return () => { session.current = { address: undefined, chainId: undefined }; };
  }, [address, chainId]);
  useEffect(() => {
    let active = true;
    setMinted([]); setDisplayImage(undefined); setPhase('idle'); setOperation(undefined);
    setFailure('error'); setUncertain(false);
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
    let checking = false;
    const timer = setInterval(check, 5000);
    async function check() {
      if (!client || !hash || checking) return;
      checking = true;
      try {
        const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180000, onReplaced: ({ transaction }) => {
          if (!active) return;
          try { localStorage.setItem(storageKey, transaction.hash); } catch { /* Optional storage. */ }
          setHash(transaction.hash);
        } });
        if (!active) return;
        clearInterval(timer);
        // A mined receipt is terminal, including a reverted approval/mint.
        // This also releases transactions restored from localStorage on reload.
        setPending(false);
        try { if (localStorage.getItem(storageKey) === receipt.transactionHash) localStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
        setMessage(t.confirmed);
        void Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address!] }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address!, kingAddress] }),
        ]).then(([supply, max, balance, allowance]) => {
          if (active) setState({ supply, max, balance, allowance });
        }).catch(() => { /* Regular balance polling retries failed reads. */ });
        setUncertain(false);
        if (receipt.status === "reverted") { setFailure('reverted'); setPhase('failed'); setMessage(t.reverted); return; }
        setPhase('confirmed');
        const results: { to: string; id: bigint }[] = [];
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== kingAddress.toLowerCase()) continue;
          try {
            const event = decodeEventLog({ abi: kingAbi, eventName: "KingMinted", data: log.data, topics: (log as typeof log & { topics: [Hash, ...Hash[]] }).topics });
            if (event.args.payer.toLowerCase() === address?.toLowerCase()) results.push({ to: event.args.to, id: event.args.tokenId });
          } catch { /* Ignore other logs. */ }
        }
        setMinted(results);
        setTokenId(results[0]?.id);
      } catch { if (active) { setUncertain(true); setMessage(t.pendingWarning); } }
      finally { checking = false; }
    }
    void check(); return () => { active = false; clearInterval(timer); };
  }, [hash, client, address, storageKey, t]);
  useEffect(() => {
    let active = true;
    setMetadata(undefined);
    setDisplayImage(undefined);
    setImageStatus('loading');
    if (tokenId === undefined) return;
    if (!client) { setImageStatus('error'); return; }
    // Bound metadata loading; late responses cannot revive a timed-out request.
    const timeout = setTimeout(() => { active = false; setImageStatus('error'); }, 30000);
    void client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "tokenURI", args: [tokenId] }).then(uri => {
      if (!active) return;
      const decoded = decodeKingMetadata(uri);
      const image = identifiedKingImage(animatedKingImage(decoded.image), metadataTraits(decoded.attributes));
      setMetadata(decoded);
      setDisplayImage(image);
      clearTimeout(timeout);
    }).catch(() => { if (active) { clearTimeout(timeout); setImageStatus('error'); } });
    return () => { active = false; clearTimeout(timeout); };
  }, [tokenId, client, t, reload]);
  useEffect(() => {
    if (!displayImage || imageStatus !== 'loading') return;
    const timer = setTimeout(() => setImageStatus('error'), 20000);
    return () => clearTimeout(timer);
  }, [displayImage, imageStatus]);
  async function transact() {
    if (pending || lock.current || !client || !wallet || !address || !plan || !banmaoKingMintReady()) return;
    lock.current = true; setBusy(true); setMessage(""); setPhase('checking'); setOperation(undefined);
    setFailure('error'); setUncertain(false); setHash(undefined); setMinted([]); setTokenId(undefined);
    let sent: Hash | undefined;
    const started = session.current;
    const isCurrent = () => session.current === started;
    async function verifyWallet() {
      if (!wallet || !isCurrent() || await wallet.getChainId() !== 196) throw new Error("Wallet or network changed");
      const [current] = await wallet.getAddresses();
      if (!current || current.toLowerCase() !== address?.toLowerCase() || !isCurrent()) throw new Error("Wallet changed");
    }
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
      if (supply + plan.total > max) throw new Error("Not enough remaining supply / Không đủ nguồn cung");
      if (!state || (state.allowance >= price) !== (allowance >= price) || (state.allowance > 0n && state.allowance < price) !== (allowance > 0n && allowance < price)) throw new Error("Allowance updated. Wait for refresh before confirming the next step.");
      if (balance < price) throw new Error("Not enough BANMAO");
      const data = allowance < price
        ? encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] })
        : plan.total === 1n
          ? encodeFunctionData({ abi: kingAbi, functionName: "mint", args: [plan.recipients[0], paymentAddress] })
          : encodeFunctionData({ abi: kingAbi, functionName: "mintBatchTo", args: [plan.recipients, plan.quantities, paymentAddress] });
      const [units, fees] = await Promise.all([
        client.estimateGas({ account: address, to: allowance < price ? paymentAddress : kingAddress, data, value: 0n }),
        client.estimateFeesPerGas(),
      ]);
      const estimatedFee = units * fees.maxFeePerGas;
      if (gas < estimatedFee * 120n / 100n) throw new Error("Not enough OKB for estimated gas plus 20% buffer");
      await verifyWallet();
      if (allowance < price) {
        const simulation = await client.simulateContract({ account: address, address: paymentAddress, abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] });
        await verifyWallet();
        setOperation(allowance > 0n ? 'reset' : 'approve'); setPhase('signing');
        sent = await wallet.writeContract(simulation.request);
      } else {
        setTokenId(undefined); setMetadata(undefined); setMinted([]);
        if (plan.total === 1n) {
          const simulation = await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, functionName: "mint", args: [plan.recipients[0], paymentAddress], value: 0n });
          await verifyWallet();
          setOperation('mint'); setPhase('signing');
          sent = await wallet.writeContract(simulation.request);
        } else {
          if (!deployment.supportsBatchMint) throw new Error("Batch deployment not verified");
          const simulation = await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, functionName: "mintBatchTo", args: [plan.recipients, plan.quantities, paymentAddress], value: 0n });
          await verifyWallet();
          setOperation('mint'); setPhase('signing');
          sent = await wallet.writeContract(simulation.request);
        }
      }
      try { localStorage.setItem(storageKey, sent); } catch { /* Optional storage. */ }
      if (!isCurrent()) return;
      // One receipt watcher owns terminal state, including restored transactions.
      setHash(sent); setPending(true); setMessage(t.submitted);
    } catch (error) {
      if (isCurrent()) {
        if (!sent) { setFailure(isMintSignatureRejected(error) ? 'cancelled' : 'error'); setPhase('failed'); }
        else setUncertain(true);
        setMessage(sent ? t.pendingWarning : kingError(error, t));
      }
    } finally { setBusy(false); lock.current = false; }
  }
  const approveLabel = kingCheckoutCopy(lang, "Authorize BANMAO");
  const mintLabel = t.mint;
  const nextAction = !address ? t.connect : chainId !== 196 ? t.switchNetwork : readFailed ? t.readError : !state ? t.waiting : !plan ? (kingCheckoutCopy(lang, "Complete valid recipient addresses and quantities.")) : state.supply + plan.total > state.max ? (kingCheckoutCopy(lang, "Not enough remaining NFTs for this quantity.")) : state.balance < price ? `${t.insufficient} · ${kingCheckoutCopy(lang, "Shortfall")}: ${formatUnits(price - state.balance, 18)} BANMAO` : state.allowance < price ? (kingCheckoutCopy(lang, "Authorize BANMAO first. After confirmation, continue to mint your NFT.")) : (kingCheckoutCopy(lang, "Ready to mint. Your wallet will show the OKB fee before signing."));
  const resultStatus = mintResultState(phase, pending, uncertain, operation, minted.length, failure);
  const resultCopy = MINT_RESULT_COPY[lang];
  const checkoutStep = phase === 'confirmed' && !pending && !busy ? 2 : pending ? 1 : 0;
  return <section className="king-mint-box king-mint-premium" aria-label={t.mint}>
    <div className="king-mint-title"><h2>{t.mint}</h2></div>
    <div className="king-mint-facts"><strong>{formatUnits(BigInt(deployment.mintPrice), 18)} BANMAO / NFT</strong><span>{t.supply}: {state ? `${new Intl.NumberFormat(lang).format(state.supply)} / ${new Intl.NumberFormat(lang).format(state.max)}` : t.loading}</span></div>
    {(busy || pending || phase === 'confirmed') && <ol className="king-checkout-steps" aria-label={kingCheckoutCopy(lang, "Transaction progress")}>{[kingCheckoutCopy(lang, "Wallet confirmation"), kingCheckoutCopy(lang, "Blockchain confirmation"), kingCheckoutCopy(lang, "Transaction complete")].map((label, index) => <li key={index} aria-current={index === checkoutStep ? 'step' : undefined}><span aria-hidden="true">0{index + 1}</span>{label}</li>)}</ol>}
    <fieldset className="king-recipients" disabled={busy || pending}>
      <legend>{kingCheckoutCopy(lang, "NFT recipients")}</legend>
      <div className="king-mint-workspace"><div className="king-mint-config">
      <div className="king-recipient-modes">
        {[
          { value: "self", icon: Wallet, title: kingCheckoutCopy(lang, "Mint for me"), description: kingCheckoutCopy(lang, "Receive in your connected wallet") },
          { value: "gift", icon: Gift, title: kingCheckoutCopy(lang, "Gift to a wallet"), description: kingCheckoutCopy(lang, "Send the collection to someone") },
          { value: "multi", icon: Users, title: kingCheckoutCopy(lang, "Multiple wallets"), description: kingCheckoutCopy(lang, "Distribute in one transaction") },
        ].map(({ value, icon: Icon, title, description }) => <label className="king-recipient-mode" key={value}>
          <input type="radio" name="king-recipient-mode" value={value} checked={mode === value} disabled={value === "multi" && !deployment.supportsBatchMint} onChange={() => setMode(value)} />
          <span className="king-recipient-mode-card"><Icon size={22} aria-hidden="true" /><strong>{title}</strong><small className="king-mode-description" hidden={mode !== value}>{description}</small><Check className="king-recipient-selected" size={16} aria-hidden="true" /></span>
        </label>)}
      </div>
      {!deployment.supportsBatchMint && <p>{kingCheckoutCopy(lang, "Current collection supports one NFT per transaction. Batch requires a verified new deployment.")}</p>}
      {plan && <div className="king-mobile-summary">
        <div><strong>{plan.total.toString()} NFT · {formatUnits(price, 18)} BANMAO</strong><small>{kingCheckoutCopy(lang, "OKB gas is separate")}</small></div>
        <button type="button" className="king-recipient-tool" onClick={reviewCheckout}>{kingCheckoutCopy(lang, "Review & confirm")}</button>
      </div>}
      <div className="king-recipient-inputs">
        {mode === "self" && <div className="king-recipient-wallet"><span><Wallet size={16} aria-hidden="true" />{kingCheckoutCopy(lang, "Your receiving wallet")}</span><code>{address || t.connect}</code></div>}
        {mode === "gift" && <label className="king-recipient-field">{kingCheckoutCopy(lang, "Recipient wallet address")}<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="king-recipient-help" /><small id="king-recipient-help">{kingCheckoutCopy(lang, "Enter the recipient’s full EVM address on X Layer.")}</small></label>}
        {mode !== "multi" ? <label className="king-recipient-field king-recipient-quantity">{kingCheckoutCopy(lang, "NFT quantity")}<input type="number" inputMode="numeric" min="1" max={deployment.supportsBatchMint ? 50 : 1} value={quantity} onChange={e => setQuantity(e.target.value)} /><small>{kingCheckoutCopy(lang, "Maximum")} {deployment.supportsBatchMint ? 50 : 1} NFT</small></label> : <KingRecipientEditor value={rows} onChange={setRows} lang={lang} />}
      </div>
      {address && inputError && mode !== 'multi' && (mode === 'self' || recipient) && <p className="king-recipient-error" role="alert">{inputError}</p>}
      {mode === 'multi' && plan && <button type="button" className="king-recipient-tool king-mobile-disclosure" onClick={reviewCheckout}>{kingCheckoutCopy(lang, "Go to review")}</button>}
      </div><div className="king-mint-checkout" ref={checkout} tabIndex={-1} role="region" aria-label={kingCheckoutCopy(lang, "Mint summary")}>
      {plan ? <div className="king-recipient-review">
        <h3>{kingCheckoutCopy(lang, "Mint summary")}</h3>
        <dl className="king-checkout-summary">
          <div><dt>{kingCheckoutCopy(lang, "Quantity")}</dt><dd>{plan.total.toString()} NFT</dd></div>
          <div><dt>{kingCheckoutCopy(lang, "Recipients")}</dt><dd>{mode === 'self' ? (kingCheckoutCopy(lang, "Your wallet")) : `${plan.recipients.length} ${kingCheckoutCopy(lang, "wallet(s)")}`}
            {plan.recipients.length === 1 && <a className="king-summary-address" href={xLayerExplorerUrl('address', plan.recipients[0], lang)} target="_blank" rel="noopener noreferrer" aria-label={`${kingCheckoutCopy(lang, "View recipient")}: ${plan.recipients[0]}`} title={plan.recipients[0]}><code>{plan.recipients[0].slice(0, 6)}…{plan.recipients[0].slice(-4)}</code> ↗</a>}
          </dd></div>
        </dl>
        <details className="king-payment-recipients" open={mode !== 'self'}><summary>{kingCheckoutCopy(lang, "Full addresses")}</summary>
          {mode !== 'self' && <p className="king-recipient-payer">{kingCheckoutCopy(lang, "Payer")}<code>{address || t.connect}</code></p>}
          <KingExpandableList key={`${mode}:${rows}:${recipient}:${quantity}`} count={plan.recipients.length} className="king-recipient-list" lang={lang}>{plan.recipients.map((to, i) => <li key={i}><span className="king-recipient-number">{i + 1}</span><code>{to}</code>{mode === 'multi' && <strong>{plan!.quantities[i].toString()} NFT</strong>}</li>)}</KingExpandableList>
        </details>
        <div className="king-recipient-total"><span>{kingCheckoutCopy(lang, "Total payment")}</span><strong>{formatUnits(price, 18)} <small>BANMAO</small></strong></div>
        {address && <p className="king-payment-balance">{t.balance}: {state ? formatUnits(state.balance, 18) : '—'} BANMAO</p>}
        {mode !== 'self' && <p className="king-payment-warning">{kingCheckoutCopy(lang, "Gifts cannot be recalled. Review the full recipient addresses before confirming.")}</p>}
      </div> : <div className="king-recipient-review king-recipient-empty"><ShieldCheck size={28} aria-hidden="true" /><h3>{kingCheckoutCopy(lang, "Mint summary")}</h3><p>{!address && mode === 'self' ? t.connect : kingCheckoutCopy(lang, "Complete the recipient details to review NFT quantity and total payment.")}</p><strong>— BANMAO</strong></div>}
    <div className="king-wallet-row">{!address && <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} label={t.connect} />}
      {address && (chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setMessage(t.switchHelp))}>{t.switchNetwork}</button> : <button type="button" disabled={!address || !state || !plan || busy || pending || state.balance < price || state.supply + (plan?.total ?? 1n) > state.max} onClick={() => void transact()}>{busy || pending ? t.processing : !state ? t.waiting : state.supply >= state.max ? t.soldOut : state.balance < price ? t.insufficient : state.allowance >= price ? mintLabel : state.allowance > 0n ? t.resetAllowance : approveLabel}</button>)}
    </div>
    <p className="king-payment-gas">{t.gas}</p>
    <div className="king-mint-guidance" role="status" aria-live="polite" data-state={pending ? 'pending' : busy ? 'working' : phase}>
      {!busy && !pending && resultStatus !== 'unresolved' && <p>{nextAction}</p>}
    </div>
    {readFailed && <div role="status"><p>{t.readError}</p><button type="button" disabled={busy || pending} onClick={() => { setReadFailed(false); setReadRetry(n => n + 1); }}>{t.retry}</button></div>}
    </div></div>
    </fieldset>
    <p className="king-mint-note">{t.mintNote}</p>
    <KingBanmaoGuide t={t} />
    {(phase !== 'idle' || pending || message) && <KingMintResult key={hash ?? phase} lang={lang} status={resultStatus} minted={minted} hash={hash} message={message} tokenId={tokenId} onSelect={id => {
      if (tokenId !== id) { setMetadata(undefined); setDisplayImage(undefined); setTokenId(id); }
    }} />}
    {tokenId !== undefined && (
      <div className="king-mint-detail">
        <h3>{metadata?.name || `Banmao King #${tokenId.toString()}`}</h3>
        {minted.length === 1 && <p className="king-result-recipient">{kingCheckoutCopy(lang, "Recipient")}: <code>{minted[0].to}</code></p>}
        <div className="king-mint-artwork" aria-busy={imageStatus === 'loading'}>
          {imageStatus !== 'ready' && <div className="king-image-placeholder" role="status" aria-live="polite">
            <ShieldCheck size={36} aria-hidden="true" />
            <strong>{resultCopy.artwork}</strong>
            <span>{imageStatus === 'loading' ? resultCopy.loading : resultCopy.imageError}</span>
            {imageStatus === 'loading' ? <span className="king-image-progress" aria-hidden="true" /> : <button type="button" onClick={() => { setImageStatus('loading'); setReload(n => n + 1); }}>{t.reloadImage}</button>}
            <small>{resultCopy.noRemint}</small>
          </div>}
          {displayImage && imageStatus !== 'error' && <>
            {/* On-chain SVG data URI: no image optimization proxy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={`${tokenId}:${reload}:${displayImage}`} src={displayImage} onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')} alt={metadata?.name || `Banmao King #${tokenId}`} width={320} height={320} style={{ visibility: imageStatus === 'ready' ? 'visible' : 'hidden' }} />
          </>}
        </div>
        <details className="king-metadata-tools"><summary>{kingCheckoutCopy(lang, "Metadata & additional options")}</summary><KingMetadataRefresh tokenId={tokenId} lang={lang} />
        <button type="button" onClick={() => setReload(n => n + 1)}>{kingCheckoutCopy(lang, "Reload metadata (free)")}</button></details>
        <p><a href={kingSharePath(tokenId)}>{kingCheckoutCopy(lang, "Look up / share NFT")}</a></p>
        {displayImage && <a href={displayImage} download={`BanmaoKing-${tokenId}-preview.svg`}>{kingCheckoutCopy(lang, "Download preview with ID")}</a>}
        {metadata && <a href={metadata.image} download={`BanmaoKing-${tokenId}.svg`}>{t.download}</a>}
        {metadata && <details className="king-metadata-tools"><summary>{kingCheckoutCopy(lang, "NFT traits")}</summary><p>{metadata.attributes.map(a => { const translated = localizedKingAttribute(lang, a); return `${translated.label}: ${translated.value}`; }).join(" · ")}</p></details>}
      </div>
    )}
    {tokenId !== undefined && <p>{t.postMint}</p>}
    <details><summary>{t.details}</summary>
      <p>{kingCheckoutCopy(lang, "Approval and mint are separate transactions. An insufficient existing allowance must be reset to zero before a new approval. Authorize only the selected payment total.")}</p>
      <p>{t.faq1Answer}</p>
      <p>{t.payment} {paymentAddress}</p>
      <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer">NFT: {kingAddress} ↗</a>
    </details>
  </section>;
}
