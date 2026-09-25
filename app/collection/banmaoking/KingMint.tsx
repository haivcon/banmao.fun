"use client";
import { kingCheckoutCopy } from './i18n/checkout';
import { useKingSupply } from './useKingSupply';
import { localizedKingAttribute } from './i18n/traits';
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { metadataTraits } from "./composition";
import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { decodeEventLog, encodeFunctionData, erc20Abi, formatUnits, zeroAddress, type Hash, type PublicClient } from "viem";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT as deployment, banmaoKingMintReady } from "./deployment";
import { KING_MAX_BATCH_SIZE, kingAbi, kingAddress, paymentAddress, validateMintState, decodeKingMetadata, parseKingRecipients, kingMintCall, decodeKingBatchSummary, type KingBatchSummary } from "./mint";
import { KING_T, kingError, type Lang } from "./i18n";
import { identifiedKingImage, kingSharePath } from "./identity";
import { animatedKingImage } from "./animated-image";
import KingMetadataTools from "./KingMetadataTools";
import { Download, Share2 } from 'lucide-react';
import { Wallet, Gift, Users, Check, ShieldCheck, Copy } from "lucide-react";
import { copyKingAddress } from './king-notifications';
import { formatKingNumber } from './format-number';
import KingMintResult from './KingMintResult';
import { verifyKingReceipt, type ReceiptEvidence } from './receipt-evidence';
import { mintResultState, isMintSignatureRejected, parsePendingMint, serializePendingMint, type MintFailure, type MintOperation } from './mint-result';
import toast from 'react-hot-toast';
import { MINT_RESULT_COPY } from './i18n/mint-result';
import { RECEIPT_COPY } from './i18n/receipt';
import { RECEIPT_GUIDANCE } from './i18n/receipt-guidance';
import "./recipients.css";
import KingRecipientEditor from './KingRecipientEditor';
import KingExpandableList from './KingExpandableList';
import KingBanmaoGuide from './KingBanmaoGuide';
import { notifyKingSound } from './king-sound';

export default function KingMint({ lang, onBusyChange }: { lang: Lang; onBusyChange?: (busy: boolean) => void }) {
  const { address, chainId } = useAccount();
  const { data: publicSupply, refetch: refreshSupply } = useKingSupply();
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<{ supply: bigint; max: bigint; balance: bigint; allowance: bigint }>();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'signing' | 'confirmed' | 'failed'>('idle');
  const [failure, setFailure] = useState<MintFailure>('error');
  const [uncertain, setUncertain] = useState(false);

  const [operation, setOperation] = useState<'approve' | 'reset' | 'mint'>();
  const [pending, setPending] = useState(false);
  useEffect(() => { onBusyChange?.(busy || pending); }, [busy, pending, onBusyChange]);
  const [readFailed, setReadFailed] = useState(false);
  const [readRetry, setReadRetry] = useState(0);
  const lock = useRef(false);
  const replacement = useRef(false);
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
  const [batchSummary, setBatchSummary] = useState<KingBatchSummary>();
  const [receiptEvidence, setReceiptEvidence] = useState<ReceiptEvidence>();
  const [receiptInfo, setReceiptInfo] = useState<{ payer: string; fee: bigint }>();
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
    setReceiptEvidence(undefined); setReceiptInfo(undefined);
    setMinted([]); setBatchSummary(undefined); setDisplayImage(undefined); setPhase('idle'); setOperation(undefined);
    setFailure('error'); setUncertain(false);
    setPending(false); setState(undefined); setHash(undefined); setTokenId(undefined); setMetadata(undefined); setMessage("");
    try {
      const saved = address ? parsePendingMint(localStorage.getItem(storageKey)) : undefined;
      replacement.current = saved?.replaced ?? false;
      if (saved) { setHash(saved.hash); setOperation(saved.operation); setPending(true); }
    } catch { /* Storage is optional. */ }
  }, [address, storageKey]);
  useEffect(() => {
    let active = true;
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
    if (!hash || !client || !address || !pending) return;
    let active = true;
    let checking = false;
    const timer = setInterval(check, 5000);
    async function check() {
      if (!client || !hash || checking) return;
      checking = true;
      try {
        let replaced = replacement.current;
        const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180000, onReplaced: ({ reason, transaction }) => {
          if (!active) return;
          // Repricing preserves intent; cancellation or other replacement does not.
          replaced = replaced || reason !== 'repriced';
          replacement.current = replaced;
          try { localStorage.setItem(storageKey, serializePendingMint(transaction.hash, replaced ? undefined : operation, replaced)); } catch { /* Optional storage. */ }
          // Keep this watcher alive until its replacement receipt is classified.
        } });
        if (!active) return;
        // Resolve the FINAL hash, including repriced/restored transactions. RPC failure
        // is incomplete evidence, not a failed transaction and never a reason to remint.
        const transaction = receipt.status === 'success' && !replaced
          ? await client.getTransaction({ hash: receipt.transactionHash }).catch(() => undefined) : undefined;
        if (!active) return;
        const verified = verifyKingReceipt(receipt.logs, transaction);
        setReceiptEvidence(verified);
        setReceiptInfo({ payer: receipt.from, fee: receipt.gasUsed * receipt.effectiveGasPrice });
        clearInterval(timer);
        // A mined receipt is terminal, including a reverted approval/mint.
        // This also releases transactions restored from localStorage on reload.
        setPending(false);
        setHash(receipt.transactionHash);
        try {
          const incompleteMint = !replaced && receipt.status === 'success'
            && receipt.to?.toLowerCase() === kingAddress.toLowerCase() && verified.state !== 'complete';
          if (incompleteMint) localStorage.setItem(storageKey, serializePendingMint(receipt.transactionHash, 'mint'));
          else if (parsePendingMint(localStorage.getItem(storageKey))?.hash === receipt.transactionHash) localStorage.removeItem(storageKey);
        } catch { /* Optional storage. */ }
        setMessage(t.confirmed);
        void refreshSupply();
        setReadRetry(value => value + 1);
        setUncertain(false);
        if (replaced) { setOperation(undefined); setFailure('replaced'); setPhase('failed'); setMessage(''); return; }
        if (receipt.status === "reverted") { setFailure('reverted'); setPhase('failed'); setMessage(t.reverted); return; }
        // Only receipt evidence may identify an approval, including after reload.
        let confirmedOperation: MintOperation | undefined;
        if (!replaced) for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== paymentAddress.toLowerCase()) continue;
          try {
            const event = decodeEventLog({ abi: erc20Abi, eventName: 'Approval', data: log.data, topics: (log as typeof log & { topics: [Hash, ...Hash[]] }).topics });
            if (event.args.owner.toLowerCase() === address.toLowerCase() && event.args.spender.toLowerCase() === kingAddress.toLowerCase()) {
              confirmedOperation = event.args.value === 0n ? 'reset' : 'approve';
            }
          } catch { /* Ignore unrelated logs. */ }
        }
        // transferFrom may emit Approval too; that is not an approval transaction.
        setOperation(receipt.to?.toLowerCase() === paymentAddress.toLowerCase() ? confirmedOperation : undefined);
        setPhase('confirmed');
        const summary = decodeKingBatchSummary(receipt.logs, address);
        setBatchSummary(summary);
        setMinted(verified.minted);
        setTokenId(verified.minted[0]?.id);
      } catch { if (active) { setUncertain(true); setMessage(t.pendingWarning); } }
      finally { checking = false; }
    }
    void check(); return () => { active = false; clearInterval(timer); };
  }, [hash, client, address, storageKey, t, refreshSupply, pending, operation]);
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
    replacement.current = false;
    setReceiptEvidence(undefined); setReceiptInfo(undefined);
    lock.current = true; setBusy(true); setMessage(""); setPhase('checking'); setOperation(undefined);
    setFailure('error'); setUncertain(false); setHash(undefined); setMinted([]); setBatchSummary(undefined); setTokenId(undefined);
    let sent: Hash | undefined;
    let sentOperation: MintOperation | undefined;
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
      if (!current || current.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet changed");
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
      if (deployment.supportsBatchMint) {
        const batchLimit = await client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: 'MAX_BATCH_SIZE' });
        if (batchLimit !== BigInt(KING_MAX_BATCH_SIZE)) throw new Error('Contract configuration mismatch');
      }
      if (supply + plan.total > max) throw new Error("Not enough remaining supply / Không đủ nguồn cung");
      if (!state || (state.allowance >= price) !== (allowance >= price) || (state.allowance > 0n && state.allowance < price) !== (allowance > 0n && allowance < price)) throw new Error("Allowance updated. Wait for refresh before confirming the next step.");
      if (balance < price) throw new Error("Not enough BANMAO");
      const mintCall = kingMintCall(plan);
      const data = allowance < price
        ? encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] })
        : encodeFunctionData({ abi: kingAbi, ...mintCall });
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
        sentOperation = allowance > 0n ? 'reset' : 'approve';
        setOperation(sentOperation); setPhase('signing');
        sent = await wallet.writeContract(simulation.request);
      } else {
        setTokenId(undefined); setMetadata(undefined); setMinted([]);
        // Narrow each call so viem retains the exact ABI argument tuple.
        const simulation = mintCall.functionName === 'mint'
          ? await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, ...mintCall, value: 0n })
          : mintCall.functionName === 'mintBatch'
            ? await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, ...mintCall, value: 0n })
            : await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, ...mintCall, value: 0n });
        await verifyWallet();
        sentOperation = 'mint';
        setOperation(sentOperation); setPhase('signing');
        const request = simulation.request;
        sent = request.functionName === 'mint'
          ? await wallet.writeContract(request)
          : request.functionName === 'mintBatch'
            ? await wallet.writeContract(request)
            : await wallet.writeContract(request);
      }
      try { localStorage.setItem(storageKey, serializePendingMint(sent, sentOperation)); } catch { /* Optional storage. */ }
      // A chain change after signing must not orphan a submitted X Layer tx.
      // Still keep another account's result out of the currently connected account.
      if (session.current.address?.toLowerCase() !== address.toLowerCase()) return;
      // One receipt watcher owns terminal state, including restored transactions.
      setOperation(sentOperation); setHash(sent); setPending(true); setMessage(t.submitted);
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
  const nextAction = !address ? t.connect : chainId !== 196 ? t.switchNetwork : readFailed ? t.readError : !state ? t.waiting : !plan ? (kingCheckoutCopy(lang, "Complete valid recipient addresses and quantities.")) : state.supply + plan.total > state.max ? (kingCheckoutCopy(lang, "Not enough remaining NFTs for this quantity.")) : state.balance < price ? `${t.insufficient} · ${kingCheckoutCopy(lang, "Shortfall")}: ${formatKingNumber(formatUnits(price - state.balance, 18))} BANMAO` : state.allowance < price ? (kingCheckoutCopy(lang, "Authorize BANMAO first. After confirmation, continue to mint your NFT.")) : (kingCheckoutCopy(lang, "Ready to mint. Your wallet will show the OKB fee before signing."));
  const resultStatus = mintResultState(phase, pending, uncertain, operation, minted.length, failure);
  const resultCopy = MINT_RESULT_COPY[lang];
  useEffect(() => {
    if (['success', 'approved', 'reset'].includes(resultStatus) && phase === 'confirmed') notifyKingSound('success');
    if (['error', 'reverted'].includes(resultStatus) && phase === 'failed') notifyKingSound('error');
  }, [resultStatus, phase]);
  useEffect(() => {
    const id = 'king-mint-transaction';
    if (phase === 'idle' && !pending) { toast.dismiss(id); return; }
    const incomplete = resultStatus === 'unresolved';
    const content = <div><strong>{incomplete ? RECEIPT_GUIDANCE[lang].confirmed : resultCopy.states[resultStatus][0]}</strong>
      <p>{incomplete ? RECEIPT_COPY[lang].incomplete : resultStatus === 'error' && message ? message : resultCopy.states[resultStatus][1]}</p>
      {hash && <a href={xLayerExplorerUrl('tx', hash, lang)} target="_blank" rel="noopener noreferrer">{t.transaction} ↗</a>}
    </div>;
    const options = { id, toasterId: 'king', duration: 8000 };
    if (['checking', 'signing', 'pending'].includes(resultStatus)) toast.loading(content, { ...options, duration: Infinity });
    else if (['success', 'approved', 'reset'].includes(resultStatus)) toast.success(content, options);
    else if (['error', 'reverted'].includes(resultStatus)) toast.error(content, options);
    else toast(content, options);
  }, [resultStatus, resultCopy, phase, pending, hash, lang, t.transaction, message]);
  useEffect(() => () => { toast.dismiss('king-mint-transaction'); }, [address]);
  const checkoutStep = phase === 'confirmed' && !pending && !busy ? 2 : pending ? 1 : 0;
  return <section className="king-mint-box king-mint-premium" aria-label={t.mint}>
    <div className="king-mint-title"><h2>{t.mint}</h2></div>
    <div className="king-mint-facts"><strong>{formatKingNumber(formatUnits(BigInt(deployment.mintPrice), 18))} BANMAO / NFT</strong><span>{t.supply}: {publicSupply ? `${formatKingNumber(publicSupply.supply)} / ${formatKingNumber(publicSupply.max)}` : t.loading}</span></div>
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
        <div><strong>{plan.total.toString()} NFT · {formatKingNumber(formatUnits(price, 18))} BANMAO</strong><small>{kingCheckoutCopy(lang, "OKB gas is separate")}</small></div>
        <button type="button" className="king-recipient-tool" onClick={reviewCheckout}>{kingCheckoutCopy(lang, "Review & confirm")}</button>
      </div>}
      <div className="king-recipient-inputs">
        {mode === "self" && <div className="king-recipient-wallet"><span><Wallet size={16} aria-hidden="true" />{kingCheckoutCopy(lang, "Your receiving wallet")}</span><code>{address || t.connect}</code></div>}
        {mode === "gift" && <label className="king-recipient-field">{kingCheckoutCopy(lang, "Recipient wallet address")}<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="king-recipient-help" /><small id="king-recipient-help">{kingCheckoutCopy(lang, "Enter the recipient’s full EVM address on X Layer.")}</small></label>}
        {mode !== "multi" ? <label className="king-recipient-field king-recipient-quantity">{kingCheckoutCopy(lang, "NFT quantity")}<input type="number" inputMode="numeric" min="1" max={deployment.supportsBatchMint ? KING_MAX_BATCH_SIZE : 1} value={quantity} onChange={e => setQuantity(e.target.value)} /><small>{kingCheckoutCopy(lang, "Maximum")} {deployment.supportsBatchMint ? KING_MAX_BATCH_SIZE : 1} NFT</small></label> : <KingRecipientEditor value={rows} onChange={setRows} lang={lang} />}
      </div>
      {address && inputError && mode !== 'multi' && (mode === 'self' || recipient) && <p className="king-recipient-error" role="alert">{inputError}</p>}
      {mode === 'multi' && plan && <button type="button" className="king-recipient-tool king-mobile-disclosure" onClick={reviewCheckout}>{kingCheckoutCopy(lang, "Go to review")}</button>}
      </div><div className="king-mint-checkout" ref={checkout} tabIndex={-1} role="region" aria-label={kingCheckoutCopy(lang, "Mint summary")}>
      {plan ? <div className="king-recipient-review">
        <h3>{kingCheckoutCopy(lang, "Mint summary")}</h3>
        <dl className="king-checkout-summary">
          <div><dt>{kingCheckoutCopy(lang, "Quantity")}</dt><dd>{plan.total.toString()} NFT</dd></div>
          <div><dt>{kingCheckoutCopy(lang, "Recipients")}</dt><dd>{mode === 'self' ? (kingCheckoutCopy(lang, "Your wallet")) : `${new Set(plan.recipients.map(to => to.toLowerCase())).size} ${kingCheckoutCopy(lang, "wallet(s)")}`}
            {plan.recipients.length === 1 && <a className="king-summary-address" href={xLayerExplorerUrl('address', plan.recipients[0], lang)} target="_blank" rel="noopener noreferrer" aria-label={`${kingCheckoutCopy(lang, "View recipient")}: ${plan.recipients[0]}`} title={plan.recipients[0]}><code>{plan.recipients[0].slice(0, 6)}…{plan.recipients[0].slice(-4)}</code> ↗</a>}
          </dd></div>
        </dl>
        <details className="king-payment-recipients" open={mode !== 'self'}><summary>{kingCheckoutCopy(lang, "Full addresses")}</summary>
          {mode !== 'self' && <p className="king-recipient-payer">{kingCheckoutCopy(lang, "Payer")}<code>{address || t.connect}</code></p>}
          <KingExpandableList key={`${mode}:${rows}:${recipient}:${quantity}`} count={plan.recipients.length} className="king-recipient-list" lang={lang}>{plan.recipients.map((to, i) => <li key={i}><span className="king-recipient-number">{i + 1}</span><code>{to}</code><button type="button" className="king-address-copy" aria-label={`${t.copy}: ${to}`} title={t.copy} onClick={() => void copyKingAddress(to, lang)}><Copy size={16} aria-hidden="true" /></button>{mode === 'multi' && <strong>{plan!.quantities[i].toString()} NFT</strong>}</li>)}</KingExpandableList>
        </details>
        <div className="king-recipient-total"><span>{kingCheckoutCopy(lang, "Total payment")}</span><strong>{formatKingNumber(formatUnits(price, 18))} <small>BANMAO</small></strong></div>
        {address && <p className="king-payment-balance">{t.balance}: {state ? formatKingNumber(formatUnits(state.balance, 18), 4) : '—'} BANMAO</p>}
        {mode !== 'self' && <p className="king-payment-warning">{kingCheckoutCopy(lang, "Gifts cannot be recalled. Review the full recipient addresses before confirming.")}</p>}
      </div> : <div className="king-recipient-review king-recipient-empty"><ShieldCheck size={28} aria-hidden="true" /><h3>{kingCheckoutCopy(lang, "Mint summary")}</h3><p>{!address && mode === 'self' ? t.connect : kingCheckoutCopy(lang, "Complete the recipient details to review NFT quantity and total payment.")}</p><strong>— BANMAO</strong></div>}
    <div className="king-wallet-row">{!address && <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} label={t.connect} />}
      {address && (chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setMessage(t.switchHelp))}>{t.switchNetwork}</button> : <button type="button" disabled={!address || !state || !plan || busy || pending || state.balance < price || state.supply + (plan?.total ?? 1n) > state.max} onClick={() => void transact()}>{busy || pending ? t.processing : !state ? t.waiting : state.supply >= state.max ? t.soldOut : state.balance < price ? t.insufficient : state.allowance >= price ? mintLabel : state.allowance > 0n ? t.resetAllowance : approveLabel}</button>)}
    </div>
    {(phase !== 'idle' || pending) && <div role="status" aria-live="polite" aria-atomic="true">
      <strong>{resultCopy.states[resultStatus][0]}</strong>
      <p>{resultCopy.states[resultStatus][1]}</p>
      {hash && <a href={xLayerExplorerUrl('tx', hash, lang)} target="_blank" rel="noopener noreferrer">{t.transaction} ↗</a>}
    </div>}
    <p className="king-payment-gas">{t.gas}</p>
    <div className="king-mint-guidance" role="status" aria-live="polite" data-state={pending ? 'pending' : busy ? 'working' : phase}>
      {!busy && !pending && resultStatus !== 'unresolved' && <p>{nextAction}</p>}
    </div>
    {readFailed && <div role="status"><p>{t.readError}</p><button type="button" disabled={busy || pending} onClick={() => { setReadFailed(false); setReadRetry(n => n + 1); }}>{t.retry}</button></div>}
    </div></div>
    </fieldset>
    <p className="king-mint-note">{t.mintNote}</p>
    {(phase !== 'idle' || pending || message) && <KingMintResult key={hash ?? phase} lang={lang} status={resultStatus} evidence={receiptEvidence} payer={receiptInfo?.payer} fee={receiptInfo?.fee} onRetry={() => { if (!pending && !busy) setPending(true); }} minted={minted} batchSummary={batchSummary} hash={hash} message={message} tokenId={tokenId} onSelect={id => {
      if (tokenId !== id) { setMetadata(undefined); setDisplayImage(undefined); setTokenId(id); }
    }}>
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
        <div className="king-nft-actions">
          <a className="king-nft-action king-nft-action-featured" href={kingSharePath(tokenId)}><Share2 size={16} aria-hidden="true" /><span>{kingCheckoutCopy(lang, "Look up / share NFT")}</span></a>
          {displayImage && <a className="king-nft-action" href={displayImage} download={`BanmaoKing-${tokenId}-preview.svg`}><Download size={16} aria-hidden="true" /><span>{kingCheckoutCopy(lang, "Download preview with ID")}</span></a>}
          {metadata && <a className="king-nft-action" href={metadata.image} download={`BanmaoKing-${tokenId}.svg`}><Download size={16} aria-hidden="true" /><span>{t.download}</span></a>}
        </div>
        {metadata && <details className="king-metadata-tools"><summary>{kingCheckoutCopy(lang, "NFT traits")}</summary><p>{metadata.attributes.map(a => { const translated = localizedKingAttribute(lang, a); return `${translated.label}: ${translated.value}`; }).join(" · ")}</p></details>}
        <p>{t.postMint}</p>
        <KingMetadataTools lang={lang} tokenId={tokenId} onReload={() => setReload(n => n + 1)} />
      </div>
    )}
    </KingMintResult>}
    <KingBanmaoGuide t={t} />
    <details><summary>{t.details}</summary>
      <p>{kingCheckoutCopy(lang, "Approval and mint are separate transactions. An insufficient existing allowance must be reset to zero before a new approval. Authorize only the selected payment total.")}</p>
      <p>{t.faq1Answer}</p>
      <p>{t.payment} {paymentAddress}</p>
      <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer">NFT: {kingAddress} ↗</a>
    </details>
  </section>;
}
